import { useState, useEffect, useCallback } from "react";
import { userDataApi } from "@/services/userDataApi";
import { syncLayer } from "@/services/syncLayer";
import { syncDebug } from "@/lib/syncDebug";

export interface UserNote {
  id: string;
  title: string;
  artist: string;
  lyrics: string;
  createdAt: number;
  updatedAt: number;
  isLiked?: boolean;
}

const NOTES_KEY = "userNotes";
const LAST_SYNC_KEY = "userNotes_lastSync";
const NOTES_UPDATED_EVENT = "mletras-notes-updated";

export const useNotes = () => {
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotesFromStorage = useCallback((): UserNote[] => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(NOTES_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved) as UserNote[];
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Error parsing saved notes:", error);
      }
      return [];
    }
  }, []);

  const persistNotes = useCallback((updatedNotes: UserNote[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  }, []);

  const broadcastNotesUpdate = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(NOTES_UPDATED_EVENT));
  }, []);

  const applyNotesUpdate = useCallback(
    (updater: (previous: UserNote[]) => UserNote[]) => {
      setNotes((prev) => {
        const updated = updater(prev);
        persistNotes(updated);
        broadcastNotesUpdate();
        return updated;
      });
    },
    [persistNotes, broadcastNotesUpdate],
  );

  // Migrate local notes to server (for first-time login)
  const migrateLocalNotesToServer = useCallback(async (localNotes: UserNote[]): Promise<void> => {
    if (localNotes.length === 0) return;
    
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) return;

      // Check if server has any notes
      const response = await userDataApi.getNotes();
      
      // If server is empty but local has data, migrate local to server
      if (response.success && (!response.notes || response.notes.length === 0) && localNotes.length > 0) {
        if (process.env.NODE_ENV !== "production") {
          console.log(`🔄 Migrating ${localNotes.length} local notes to server...`);
        }
        
        // Migrate each local note to server
        for (const note of localNotes) {
          try {
            // Create note on server
            const createResponse = await userDataApi.createNote(
              note.title,
              note.lyrics,
              note.artist || undefined,
              undefined // song_name
            );
            
            if (createResponse.success && createResponse.note) {
              // Update local note with server ID
              applyNotesUpdate((prevNotes) => {
                return prevNotes.map((n) =>
                  n.id === note.id
                    ? {
                        ...n,
                        id: createResponse.note.id,
                        createdAt: new Date(createResponse.note.created_at).getTime(),
                        updatedAt: new Date(createResponse.note.updated_at).getTime(),
                      }
                    : n
                );
              });
            }
          } catch (error) {
            if (process.env.NODE_ENV !== "production") {
              console.warn(`Failed to migrate note ${note.title} to server:`, error);
            }
          }
        }
        
        if (process.env.NODE_ENV !== "production") {
          console.log("✅ Local notes migrated to server");
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to migrate local notes to server:", error);
      }
    }
  }, [applyNotesUpdate]);

  // Load and sync notes from both localStorage and server
  useEffect(() => {
    const loadAndSyncNotes = async () => {
      try {
        // Step 1: Load from localStorage immediately (instant UX)
        const localNotes = loadNotesFromStorage();
        if (localNotes.length > 0) {
          applyNotesUpdate(() => localNotes);
        }
        setIsLoading(false);

        // Step 2: Fetch from server in background
        try {
          const sessionToken = localStorage.getItem('sessionToken');
          if (sessionToken) {
            const response = await userDataApi.getNotes();
            if (response.success && response.notes) {
              // Convert server notes to UserNote format
              const serverNotes: UserNote[] = response.notes.map(note => ({
                id: note.id,
                title: note.note_title,
                artist: note.artist_name || '',
                lyrics: note.note_content,
                createdAt: new Date(note.created_at).getTime(),
                updatedAt: new Date(note.updated_at).getTime(),
              }));

              if (serverNotes.length > 0) {
                // Merge server notes with local notes (keep both, deduplicate)
                // Create a map of server notes by title+artist for deduplication
                const serverNotesMap = new Map<string, UserNote>();
                serverNotes.forEach(note => {
                  const key = `${note.title}|${note.artist}`;
                  serverNotesMap.set(key, note);
                });
                
                // Keep local notes that don't exist on server (by title+artist)
                const localOnlyNotes = localNotes.filter(localNote => {
                  const key = `${localNote.title}|${localNote.artist}`;
                  return !serverNotesMap.has(key);
                });
                
                // Merge: server notes (source of truth) + local-only notes
                const mergedNotes = [...serverNotes, ...localOnlyNotes];
                
                applyNotesUpdate(() => mergedNotes);
                
                // Migrate local-only notes to server in background
                if (localOnlyNotes.length > 0) {
                  migrateLocalNotesToServer(localOnlyNotes).catch(err => {
                    if (process.env.NODE_ENV !== 'production') {
                      console.warn('Failed to migrate local-only notes:', err);
                    }
                  });
                }
                
                syncDebug.log(`Notes merged successfully`, {
                  operation: 'useNotes.mergeNotes',
                  data: {
                    serverNotesCount: serverNotes.length,
                    localOnlyNotesCount: localOnlyNotes.length,
                    totalNotesCount: mergedNotes.length,
                  },
                  status: 'success',
                });
              } else if (localNotes.length > 0) {
                // Server is empty but local has data - migrate local to server
                await migrateLocalNotesToServer(localNotes);
                // After migration, fetch again to get updated data with server IDs
                const updatedResponse = await userDataApi.getNotes();
                if (updatedResponse.success && updatedResponse.notes && updatedResponse.notes.length > 0) {
                  const updatedServerNotes: UserNote[] = updatedResponse.notes.map(note => ({
                    id: note.id,
                    title: note.note_title,
                    artist: note.artist_name || '',
                    lyrics: note.note_content,
                    createdAt: new Date(note.created_at).getTime(),
                    updatedAt: new Date(note.updated_at).getTime(),
                  }));
                  applyNotesUpdate(() => updatedServerNotes);
                }
              }
            } else if (response.success && (!response.notes || response.notes.length === 0) && localNotes.length > 0) {
              // Server is empty but local has data - migrate local to server
              await migrateLocalNotesToServer(localNotes);
              // After migration, fetch again to get updated data with server IDs
              const updatedResponse = await userDataApi.getNotes();
              if (updatedResponse.success && updatedResponse.notes && updatedResponse.notes.length > 0) {
                const updatedServerNotes: UserNote[] = updatedResponse.notes.map(note => ({
                  id: note.id,
                  title: note.note_title,
                  artist: note.artist_name || '',
                  lyrics: note.note_content,
                  createdAt: new Date(note.created_at).getTime(),
                  updatedAt: new Date(note.updated_at).getTime(),
                }));
                applyNotesUpdate(() => updatedServerNotes);
              }
            }
          }
        } catch (syncError) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Server sync failed, using local data:', syncError);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error("Error loading notes:", error);
        }
        applyNotesUpdate(() => []);
      } finally {
        setIsLoading(false);
      }
    };

    loadAndSyncNotes();
  }, [applyNotesUpdate, loadNotesFromStorage, migrateLocalNotesToServer]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const storedNotes = loadNotesFromStorage();
      setNotes(storedNotes);
    };

    window.addEventListener(NOTES_UPDATED_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(NOTES_UPDATED_EVENT, handler as EventListener);
    };
  }, [loadNotesFromStorage]);

  const createNote = async (noteData: Omit<UserNote, "id" | "createdAt" | "updatedAt">) => {
    const newNote: UserNote = {
      ...noteData,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Update localStorage immediately (instant UX)
    applyNotesUpdate((prevNotes) => [newNote, ...prevNotes]);
    
    // Queue server sync (batched, rate-limited)
    syncLayer.queueSync({
      type: 'note',
      action: 'create',
      data: {
        note_title: newNote.title,
        note_content: newNote.lyrics,
        artist_name: newNote.artist,
        song_name: undefined
      }
    });
    
    return newNote;
  };

  const updateNote = async (id: string, noteData: Partial<Omit<UserNote, "id" | "createdAt">>) => {
    // Update localStorage immediately (instant UX)
    let updatedNote: UserNote | undefined;
    applyNotesUpdate((prevNotes) =>
      prevNotes.map((note) => {
        if (note.id === id) {
          updatedNote = {
            ...note,
            ...noteData,
            updatedAt: Date.now(),
          };
          return updatedNote;
        }
        return note;
      }),
    );
    
    // Queue server sync (batched, rate-limited)
    if (updatedNote) {
      syncLayer.queueSync({
        type: 'note',
        action: 'update',
        data: {
          id: updatedNote.id,
          note_title: updatedNote.title,
          note_content: updatedNote.lyrics,
          artist_name: updatedNote.artist,
          song_name: undefined
        }
      });
    }
    
    return updatedNote;
  };

  const deleteNote = async (id: string) => {
    // Update localStorage immediately (instant UX)
    applyNotesUpdate((prevNotes) => prevNotes.filter((note) => note.id !== id));
    
    // Queue server sync (batched, rate-limited)
    syncLayer.queueSync({
      type: 'note',
      action: 'delete',
      data: { id }
    });
  };

  const getNoteById = (id: string): UserNote | null => {
    return notes.find((note) => note.id === id) || null;
  };

  const toggleNoteLike = async (note: UserNote) => {
    // Update the liked notes list in localStorage
    const likedNotesKey = "likedNotes";
    const likedNotes = JSON.parse(localStorage.getItem(likedNotesKey) || "[]");
    const isLiked = likedNotes.includes(note.id);
    
    if (isLiked) {
      // Remove from liked notes
      const newLikedNotes = likedNotes.filter((id: string) => id !== note.id);
      localStorage.setItem(likedNotesKey, JSON.stringify(newLikedNotes));
    } else {
      // Add to liked notes
      const newLikedNotes = [...likedNotes, note.id];
      localStorage.setItem(likedNotesKey, JSON.stringify(newLikedNotes));
    }
  };

  const isNoteLiked = (noteId: string) => {
    const likedNotes = JSON.parse(localStorage.getItem("likedNotes") || "[]");
    return likedNotes.includes(noteId);
  };

  const refreshNotes = useCallback(() => {
    const loadNotes = () => {
      const storedNotes = loadNotesFromStorage();
      applyNotesUpdate(() => storedNotes);
    };
    loadNotes();
  }, [applyNotesUpdate, loadNotesFromStorage]);

  return {
    notes,
    createNote,
    updateNote,
    deleteNote,
    getNoteById,
    toggleNoteLike,
    isNoteLiked,
    refreshNotes,
    isLoading,
  };
};
