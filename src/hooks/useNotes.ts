import { useState, useEffect } from "react";
import { userDataApi } from "@/services/userDataApi";
import { syncLayer } from "@/services/syncLayer";

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

export const useNotes = () => {
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load and sync notes from both localStorage and server
  useEffect(() => {
    const loadAndSyncNotes = async () => {
      try {
        // Step 1: Load from localStorage immediately (instant UX)
        const saved = localStorage.getItem(NOTES_KEY);
        let localNotes: UserNote[] = [];
        if (saved) {
          localNotes = JSON.parse(saved);
          setNotes(localNotes);
          setIsLoading(false);
        }

        // Step 2: Fetch from server in background
        try {
          const sessionToken = localStorage.getItem('sessionToken');
          if (sessionToken && !sessionToken.startsWith('dev-bypass')) {
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

              // Merge: Server data is source of truth
              const mergedNotes = serverNotes;
              
              // Save merged data to localStorage
              localStorage.setItem(NOTES_KEY, JSON.stringify(mergedNotes));
              localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
              setNotes(mergedNotes);
              
              console.log('✅ Notes synced from server');
            }
          }
        } catch (syncError) {
          console.warn('Server sync failed, using local data:', syncError);
        }
      } catch (error) {
        console.error("Error loading notes:", error);
        setNotes([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAndSyncNotes();
  }, []);

  const createNote = async (noteData: Omit<UserNote, "id" | "createdAt" | "updatedAt">) => {
    const newNote: UserNote = {
      ...noteData,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Update localStorage immediately (instant UX)
    const newNotes = [newNote, ...notes];
    setNotes(newNotes);
    localStorage.setItem(NOTES_KEY, JSON.stringify(newNotes));
    
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
    const updatedNotes = notes.map((note) =>
      note.id === id
        ? {
            ...note,
            ...noteData,
            updatedAt: Date.now(),
          }
        : note,
    );

    setNotes(updatedNotes);
    localStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));
    
    // Queue server sync (batched, rate-limited)
    const updatedNote = updatedNotes.find((note) => note.id === id);
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
    const updatedNotes = notes.filter((note) => note.id !== id);
    setNotes(updatedNotes);
    localStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));
    
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

  const refreshNotes = () => {
    const loadNotes = async () => {
      try {
        const saved = localStorage.getItem(NOTES_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setNotes(parsed);
        } else {
          setNotes([]);
        }
      } catch (error) {
        console.error("Error refreshing notes:", error);
        setNotes([]);
      }
    };
    loadNotes();
  };

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
