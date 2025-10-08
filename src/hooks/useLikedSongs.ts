import { useState, useEffect } from "react";
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
          localSongs = JSON.parse(saved);
          setLikedSongs(localSongs);
          setIsLoading(false);
        }

        // TEMPORARILY DISABLED: Step 2: Fetch from server in background
        // try {
        //   const sessionToken = localStorage.getItem('sessionToken');
        //   if (sessionToken && !sessionToken.startsWith('dev-bypass')) {
        //     const response = await userDataApi.getBookmarks();
        //     if (response.success && response.bookmarks) {
        //       // Convert server bookmarks to Song format
        //       const serverSongs: Song[] = response.bookmarks.map(bookmark => ({
        //         id: bookmark.track_id || bookmark.id,  // Use track_id for Musixmatch API
        //         title: bookmark.song_title,
        //         artist: bookmark.artist_name,
        //       }));

        //       // Merge: Server data is source of truth
        //       const mergedSongs = serverSongs;
        //       
        //       // Save merged data to localStorage
        //       localStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(mergedSongs));
        //       localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
        //       setLikedSongs(mergedSongs);
        //       
        //       console.log('✅ Bookmarks synced from server');
        //     }
        //   }
        // } catch (syncError) {
        //   console.warn('Server sync failed, using local data:', syncError);
        // }
        console.log('🔧 Server sync temporarily disabled for troubleshooting');
      } catch (error) {
        console.error("Error loading liked songs:", error);
        setLikedSongs([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAndSyncLikedSongs();
  }, []);

  const toggleLike = async (song: Song) => {
    const isLiked = likedSongs.some((s) => s.id === song.id);

    if (isLiked) {
      // Unlike song - update localStorage immediately (instant UX)
      const updatedSongs = likedSongs.filter((s) => s.id !== song.id);
      setLikedSongs(updatedSongs);
      localStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(updatedSongs));
      
      // TEMPORARILY DISABLED: Queue server sync (batched, rate-limited)
      // syncLayer.queueSync({
      //   type: 'bookmark',
      //   action: 'delete',
      //   data: { id: song.id }
      // });
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
      setLikedSongs(newLikedSongs);
      localStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(newLikedSongs));
      
      // TEMPORARILY DISABLED: Queue server sync (batched, rate-limited)
      // syncLayer.queueSync({
      //   type: 'bookmark',
      //   action: 'create',
      //   data: { 
      //     song_title: song.title,
      //     artist_name: song.artist,
      //     folder_id: undefined,
      //     track_id: song.id  // Pass Musixmatch track ID
      //   }
      // });
    }
  };

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
