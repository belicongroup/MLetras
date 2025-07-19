import { useState, useEffect } from 'react';
import { lyricsCache, CachedLyrics } from '@/services/lyricsCache';

interface Song {
  id: string;
  title: string;
  artist: string;
  lyrics?: string;
  imageUrl?: string;
  url?: string;
}

const LIKED_SONGS_KEY = 'likedSongs';

export const useLikedSongs = () => {
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load liked songs from cache on mount
  useEffect(() => {
    const loadLikedSongs = async () => {
      try {
        // First try to load from cache
        const cachedLikedSongs = await lyricsCache.getAllLikedSongs();
        if (cachedLikedSongs.length > 0) {
          setLikedSongs(cachedLikedSongs);
        } else {
          // Fallback to localStorage for backward compatibility
          const saved = localStorage.getItem(LIKED_SONGS_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            setLikedSongs(parsed);
            
            // Migrate to cache
            for (const song of parsed) {
              await lyricsCache.updateLikedStatus(song.id, true);
            }
          }
        }
      } catch (error) {
        console.error('Error loading liked songs:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem(LIKED_SONGS_KEY);
        if (saved) {
          try {
            setLikedSongs(JSON.parse(saved));
          } catch (e) {
            console.error('Error parsing liked songs:', e);
            setLikedSongs([]);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadLikedSongs();
  }, []);

  const toggleLike = async (song: Song) => {
    const isLiked = likedSongs.some(s => s.id === song.id);
    
    if (isLiked) {
      // Unlike song
      setLikedSongs(prev => prev.filter(s => s.id !== song.id));
      await lyricsCache.updateLikedStatus(song.id, false);
      localStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(likedSongs.filter(s => s.id !== song.id)));
    } else {
      // Like song
      const newLikedSongs = [...likedSongs, song];
      setLikedSongs(newLikedSongs);
      await lyricsCache.updateLikedStatus(song.id, true);
      localStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(newLikedSongs));
    }
  };

  const isLiked = (songId: string) => {
    return likedSongs.some(s => s.id === songId);
  };

  const getLikedSongWithLyrics = async (songId: string): Promise<CachedLyrics | null> => {
    try {
      return await lyricsCache.getCachedLyrics(songId);
    } catch (error) {
      console.error('Error getting cached lyrics:', error);
      return null;
    }
  };

  return {
    likedSongs,
    toggleLike,
    isLiked,
    getLikedSongWithLyrics,
    isLoading
  };
};