import { useState, useEffect } from "react";
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

export const useLikedSongs = () => {
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load liked songs from localStorage only (no Musixmatch data caching)
  useEffect(() => {
    const loadLikedSongs = async () => {
      try {
        // Only load from localStorage - no caching of Musixmatch data allowed
        const saved = localStorage.getItem(LIKED_SONGS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setLikedSongs(parsed);
        }
      } catch (error) {
        console.error("Error loading liked songs:", error);
        setLikedSongs([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadLikedSongs();
  }, []);

  const toggleLike = async (song: Song) => {
    const isLiked = likedSongs.some((s) => s.id === song.id);

    if (isLiked) {
      // Unlike song - only store basic metadata, no lyrics
      const updatedSongs = likedSongs.filter((s) => s.id !== song.id);
      setLikedSongs(updatedSongs);
      localStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(updatedSongs));
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
