import { useState, useEffect } from 'react';

interface Song {
  id: string;
  title: string;
  artist: string;
}

const LIKED_SONGS_KEY = 'likedSongs';

export const useLikedSongs = () => {
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(LIKED_SONGS_KEY);
    if (saved) {
      try {
        setLikedSongs(JSON.parse(saved));
      } catch (error) {
        console.error('Error parsing liked songs:', error);
        setLikedSongs([]);
      }
    }
  }, []);

  const toggleLike = (song: Song) => {
    setLikedSongs(prev => {
      const isLiked = prev.some(s => s.id === song.id);
      let newLikedSongs;
      
      if (isLiked) {
        newLikedSongs = prev.filter(s => s.id !== song.id);
      } else {
        newLikedSongs = [...prev, song];
      }
      
      localStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(newLikedSongs));
      return newLikedSongs;
    });
  };

  const isLiked = (songId: string) => {
    return likedSongs.some(s => s.id === songId);
  };

  return {
    likedSongs,
    toggleLike,
    isLiked
  };
};