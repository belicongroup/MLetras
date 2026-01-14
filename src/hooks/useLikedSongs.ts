import { useState, useEffect, useCallback } from "react";
import { userDataApi } from "@/services/userDataApi";
import type { Bookmark } from "@/services/userDataApi";
import { syncLayer } from "@/services/syncLayer";
import { syncDebug } from "@/lib/syncDebug";

interface Song {
  id: string;
  title: string;
  artist: string;
  lyrics?: string;
  imageUrl?: string;
  url?: string;
  bookmarkId?: string;
}

const LIKED_SONGS_KEY = "likedSongs";
const LAST_SYNC_KEY = "likedSongs_lastSync";
const FREE_SONGS_LIMIT = 5;

interface UseLikedSongsOptions {
  isPro?: boolean;
  onLimitReached?: () => void;
  getTotalSongCount?: () => number; // Function to get total songs (liked + folders)
}

export const useLikedSongs = (options?: UseLikedSongsOptions) => {
  const { isPro = false, onLimitReached, getTotalSongCount } = options || {};
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchServerBookmarks = useCallback(async (): Promise<Bookmark[] | null> => {
    try {
      const response = await userDataApi.getBookmarks();
      if (!response.success || !response.bookmarks) {
        return null;
      }
      return response.bookmarks;
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to fetch server bookmarks:", error);
      }
      return null;
    }
  }, []);

  const fetchServerLikedSongs = useCallback(async (): Promise<Song[] | null> => {
    const bookmarks = await fetchServerBookmarks();
    if (!bookmarks) {
      return null;
    }

    // Only treat bookmarks without a folder as "liked songs"
    const serverSongs: Song[] = bookmarks
      .filter((bookmark) => !bookmark.folder_id && bookmark.track_id !== null)
      .map((bookmark) => ({
        id: String(bookmark.track_id),
        title: bookmark.song_title,
        artist: bookmark.artist_name,
        bookmarkId: bookmark.id,
      }));

    const deduped = serverSongs.filter(
      (song, index, self) =>
        index === self.findIndex((candidate) => candidate.id === song.id),
    );

    return deduped;
  }, [fetchServerBookmarks]);

  const updateStateFromServer = useCallback(
    (serverSongs: Song[] | null) => {
      if (!serverSongs) {
        return;
      }

      setLikedSongs(serverSongs);
      localStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(serverSongs));
      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    },
    [],
  );

  const deleteServerLikesForTrack = useCallback(
    async (songId: string): Promise<boolean> => {
      try {
        const response = await userDataApi.deleteBookmarksByTrack(songId);
        if (response.success) {
          return true;
        }
        return false;
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `Failed to delete bookmarks by track via API for ${songId}`,
            error,
          );
        }
        return false;
      }
    },
    [],
  );

  const ensureServerLikeExists = useCallback(
    async (song: Song): Promise<boolean> => {
      const bookmarks = await fetchServerBookmarks();
      if (!bookmarks) {
        return false;
      }

      const existing = bookmarks.find(
        (bookmark) =>
          !bookmark.folder_id &&
          bookmark.track_id !== null &&
          String(bookmark.track_id) === song.id,
      );

      if (existing) {
        setLikedSongs((prevSongs) => {
          const updated = prevSongs.map((likedSong) =>
            likedSong.id === song.id
              ? { ...likedSong, bookmarkId: existing.id }
              : likedSong,
          );
          localStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(updated));
          return updated;
        });
        return true;
      }

      return false;
    },
    [fetchServerBookmarks],
  );

  // Migrate local liked songs to server (for first-time login)
  const migrateLocalLikedSongsToServer = useCallback(async (localSongs: Song[]): Promise<void> => {
    if (localSongs.length === 0) return;
    
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) return;

      // Check if server has any liked songs
      const serverSongs = await fetchServerLikedSongs();
      
      // If server is empty but local has data, migrate local to server
      if ((!serverSongs || serverSongs.length === 0) && localSongs.length > 0) {
        if (process.env.NODE_ENV !== "production") {
          console.log(`🔄 Migrating ${localSongs.length} local liked songs to server...`);
        }
        
        // Migrate each local song to server
        for (const song of localSongs) {
          try {
            // Check if already exists on server
            const exists = await ensureServerLikeExists(song);
            if (!exists) {
              // Create bookmark on server
              const response = await userDataApi.createBookmark(
                song.title,
                song.artist,
                undefined, // no folder_id for liked songs
                song.id
              );
              
              if (response.success && response.bookmark) {
                // Update local song with bookmarkId
                setLikedSongs((prevSongs) => {
                  const updated = prevSongs.map((s) =>
                    s.id === song.id ? { ...s, bookmarkId: response.bookmark.id } : s
                  );
                  localStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(updated));
                  return updated;
                });
              }
            }
          } catch (error) {
            if (process.env.NODE_ENV !== "production") {
              console.warn(`Failed to migrate song ${song.title} to server:`, error);
            }
          }
        }
        
        if (process.env.NODE_ENV !== "production") {
          console.log("✅ Local liked songs migrated to server");
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to migrate local liked songs to server:", error);
      }
    }
  }, [fetchServerLikedSongs, ensureServerLikeExists]);

  // Load and sync liked songs from both localStorage and server
  useEffect(() => {
    const loadAndSyncLikedSongs = async () => {
      try {
        // Step 1: Load from localStorage immediately (instant UX)
        const saved = localStorage.getItem(LIKED_SONGS_KEY);
        let localSongs: Song[] = [];
        if (saved) {
          const parsedSongs = JSON.parse(saved);
          // Remove duplicates based on song ID
          localSongs = parsedSongs.filter((song: Song, index: number, self: Song[]) => 
            index === self.findIndex(s => s.id === song.id)
          );
          setLikedSongs(localSongs);
          setIsLoading(false);
        }

        // Step 2: Fetch from server in background
        try {
          const sessionToken = localStorage.getItem('sessionToken');
          if (sessionToken) {
            const remote = await fetchServerLikedSongs();
            if (remote && remote.length > 0) {
              // Merge server songs with local songs (keep both, deduplicate by track ID)
              const serverSongsMap = new Map<string, Song>();
              remote.forEach(song => {
                serverSongsMap.set(song.id, song);
              });
              
              // Keep local songs that don't exist on server (by track ID)
              const localOnlySongs = localSongs.filter(localSong => {
                return !serverSongsMap.has(localSong.id);
              });
              
              // Merge: server songs (source of truth) + local-only songs
              const mergedSongs = [...remote, ...localOnlySongs];
              
              setLikedSongs(mergedSongs);
              localStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(mergedSongs));
              localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
              
              // Migrate local-only songs to server in background
              if (localOnlySongs.length > 0) {
                migrateLocalLikedSongsToServer(localOnlySongs).catch(err => {
                  if (process.env.NODE_ENV !== "production") {
                    console.warn("Failed to migrate local-only liked songs:", err);
                  }
                });
              }
              
              syncDebug.log(`Liked songs merged successfully`, {
                operation: 'useLikedSongs.mergeSongs',
                data: {
                  serverSongsCount: remote.length,
                  localOnlySongsCount: localOnlySongs.length,
                  totalSongsCount: mergedSongs.length,
                },
                status: 'success',
              });
            } else if (remote && remote.length === 0 && localSongs.length > 0) {
              // Server is empty but local has data - migrate local to server
              await migrateLocalLikedSongsToServer(localSongs);
              // After migration, fetch again to get updated data with bookmarkIds
              const updatedRemote = await fetchServerLikedSongs();
              if (updatedRemote && updatedRemote.length > 0) {
                updateStateFromServer(updatedRemote);
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
          console.error("Error loading liked songs:", error);
        }
        setLikedSongs([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAndSyncLikedSongs();
  }, [fetchServerLikedSongs, updateStateFromServer, migrateLocalLikedSongsToServer]);

  const syncStateFromServer = useCallback(async () => {
    const remote = await fetchServerLikedSongs();
    if (remote) {
      updateStateFromServer(remote);
    }
  }, [fetchServerLikedSongs, updateStateFromServer]);

  const enhancedToggleLike = useCallback(
    async (song: Song) => {
      const isLiked = likedSongs.some((s) => s.id === song.id);
      const sessionToken =
        typeof window !== "undefined"
          ? localStorage.getItem("sessionToken")
          : null;
      const hasServerSession = !!sessionToken;

      // Check limit before adding a new song (only for non-Pro users)
      if (!isLiked && !isPro) {
        const totalSongCount = getTotalSongCount ? getTotalSongCount() : likedSongs.length;
        if (totalSongCount >= FREE_SONGS_LIMIT) {
          if (onLimitReached) {
            onLimitReached();
          }
          return;
        }
      }

      if (isLiked) {
        const updatedSongs = likedSongs.filter((s) => s.id !== song.id);

        setLikedSongs((prevSongs) =>
          prevSongs.filter((entry) => entry.id !== song.id),
        );
        localStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(updatedSongs));

        let serverSynced = false;

        if (hasServerSession) {
          try {
            const deleted = await deleteServerLikesForTrack(song.id);
            if (!deleted) {
              throw new Error("Failed to delete all server bookmarks");
            }
            serverSynced = true;
            await syncStateFromServer();
          } catch (error) {
            serverSynced = false;
            if (process.env.NODE_ENV !== "production") {
              console.warn(
                "Immediate bookmark delete failed, falling back to sync layer",
                error,
              );
            }
          }
        }

        if (!serverSynced) {
          syncLayer.queueSync({
            type: "bookmark",
            action: "delete",
            data: {
              id: song.bookmarkId || song.id,
              bookmarkId: song.bookmarkId || null,
              track_id: song.id,
            },
          });
          await syncLayer.forceSyncNow();
          await syncStateFromServer();
        }
      } else {
        const songMetadata: Song = {
          id: song.id,
          title: song.title,
          artist: song.artist,
          imageUrl: song.imageUrl,
          url: song.url,
          bookmarkId: song.bookmarkId,
        };

        const newLikedSongs = [...likedSongs, songMetadata];
        const deduplicatedSongs = newLikedSongs.filter(
          (candidate, index, self) =>
            index === self.findIndex((entry) => entry.id === candidate.id),
        );

        setLikedSongs(deduplicatedSongs);
        localStorage.setItem(
          LIKED_SONGS_KEY,
          JSON.stringify(deduplicatedSongs),
        );

        let serverSynced = false;

        if (hasServerSession) {
          try {
            const exists = await ensureServerLikeExists(song);

            if (exists) {
              serverSynced = true;
            } else {
              const response = await userDataApi.createBookmark(
                song.title,
                song.artist,
                undefined,
                song.id,
              );

              if (response.success && response.bookmark) {
                serverSynced = true;
                await syncStateFromServer();
              } else {
                throw new Error("Failed to create bookmark on server");
              }
            }
          } catch (error) {
            serverSynced = false;
            if (process.env.NODE_ENV !== "production") {
              console.warn(
                "Immediate bookmark create failed, falling back to sync layer",
                error,
              );
            }
          }
        }

        if (!serverSynced) {
          const alreadyExists = await ensureServerLikeExists(song);

          if (!alreadyExists) {
            syncLayer.queueSync({
              type: "bookmark",
              action: "create",
              data: {
                song_title: song.title,
                artist_name: song.artist,
                folder_id: undefined,
                track_id: song.id,
              },
            });
            await syncLayer.forceSyncNow();
            await syncStateFromServer();
          } else {
            await syncStateFromServer();
          }
        }
      }
    },
    [
      likedSongs,
      deleteServerLikesForTrack,
      syncStateFromServer,
      ensureServerLikeExists,
    ],
  );

  const isLiked = (songId: string) => {
    return likedSongs.some((s) => s.id === songId);
  };

  const getLikedSongWithLyrics = async (
    songId: string,
  ): Promise<Song | null> => {
    // Note: Cannot return cached lyrics per Musixmatch terms of service
    // Return basic song metadata only
    try {
      const likedSong = likedSongs.find((song) => song.id === songId);
      return likedSong || null;
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Error getting liked song:", error);
      }
      return null;
    }
  };

  return {
    likedSongs,
    toggleLike: enhancedToggleLike,
    isLiked,
    getLikedSongWithLyrics,
    isLoading,
  };
};
