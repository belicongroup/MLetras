import { useState, useEffect, useCallback, useReducer } from "react";
import { userDataApi } from "@/services/userDataApi";
import { syncLayer } from "@/services/syncLayer";
// Note: No caching of Musixmatch API data per terms of service

interface Song {
  id: string;
  title: string;
  artist: string;
  lyrics?: string;
  imageUrl?: string;
  url?: string;
}

const LIKED_SONGS_KEY = "likedSongs";
const LAST_SYNC_KEY = "likedSongs_lastSync";

export const useLikedSongs = () => {
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
          if (sessionToken && !sessionToken.startsWith('dev-bypass')) {
            const response = await userDataApi.getBookmarks();
            if (response.success && response.bookmarks) {
              // Convert server bookmarks to Song format - only include bookmarks with track_id (real songs, not notes)
              const serverSongs: Song[] = response.bookmarks
                .filter(bookmark => bookmark.track_id) // Only include bookmarks with track_id (excludes notes)
                .map(bookmark => ({
                  id: bookmark.track_id,  // Use track_id for Musixmatch API
                  title: bookmark.song_title,
                  artist: bookmark.artist_name,
                }));

              // Merge: Server data is source of truth, remove duplicates
              const mergedSongs = serverSongs.filter((song, index, self) => 
                index === self.findIndex(s => s.id === song.id)
              );
              
              // Save merged data to localStorage
              localStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(mergedSongs));
              localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
              setLikedSongs(mergedSongs);
              
              console.log('✅ Bookmarks synced from server');
            }
          }
        } catch (syncError) {
          console.warn('Server sync failed, using local data:', syncError);
        }
      } catch (error) {
        console.error("Error loading liked songs:", error);
        setLikedSongs([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAndSyncLikedSongs();
  }, []);

  const toggleLike = useCallback(async (song: Song) => {
    const isLiked = likedSongs.some((s) => s.id === song.id);

    // console.log('🔵 toggleLike called:', { songId: song.id, songTitle: song.title, isLiked });

    if (isLiked) {
      // Unlike song - update localStorage immediately (instant UX)
      const updatedSongs = likedSongs.filter((s) => s.id !== song.id);
      // Use functional update to ensure we get the latest state
      setLikedSongs(prevSongs => prevSongs.filter((s) => s.id !== song.id));
      localStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(updatedSongs));
      
      // Queue server sync (batched, rate-limited)
      syncLayer.queueSync({
        type: 'bookmark',
        action: 'delete',
        data: { id: song.id }
      });
    } else {
      // Like song - only store basic metadata, no lyrics per Musixmatch terms
      const songMetadata = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        imageUrl: song.imageUrl,
        url: song.url,
        // Note: No lyrics stored per Musixmatch terms of service
      };
      const newLikedSongs = [...likedSongs, songMetadata];
      // Remove duplicates based on song ID
      const deduplicatedSongs = newLikedSongs.filter((song, index, self) => 
        index === self.findIndex(s => s.id === song.id)
      );
      setLikedSongs(deduplicatedSongs);
      localStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(deduplicatedSongs));
      
      // Queue server sync (batched, rate-limited)
      syncLayer.queueSync({
        type: 'bookmark',
        action: 'create',
        data: { 
          song_title: song.title,
          artist_name: song.artist,
          folder_id: undefined,
          track_id: song.id  // Pass Musixmatch track ID
        }
      });
    }
  }, [likedSongs]); // Add dependency array for useCallback

  const isLiked = (songId: string) => {
    return likedSongs.some((s) => s.id === songId);
  };

  const getLikedSongWithLyrics = async (
    songId: string,
  ): Promise<Song | null> => {
    // Note: Cannot return cached lyrics per Musixmatch terms of service
    // Return basic song metadata only
    try {
      const likedSong = likedSongs.find(song => song.id === songId);
      return likedSong || null;
    } catch (error) {
      console.error("Error getting liked song:", error);
      return null;
    }
  };

  return {
    likedSongs,
    toggleLike,
    isLiked,
    getLikedSongWithLyrics,
    isLoading,
  };
};
