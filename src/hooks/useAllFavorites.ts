import { useState, useEffect } from "react";
import { useLikedSongs } from "./useLikedSongs";
import { useNotes } from "./useNotes";

export interface FavoriteItem {
  id: string;
  title: string;
  artist: string;
  type: "song" | "note";
  createdAt: number;
  updatedAt?: number;
  imageUrl?: string;
  url?: string;
  lyrics?: string;
}

const LIKED_NOTES_KEY = "likedNotes";

export const useAllFavorites = () => {
  const { likedSongs } = useLikedSongs();
  const { notes } = useNotes();
  const [likedNotes, setLikedNotes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load liked notes from localStorage
  useEffect(() => {
    const loadLikedNotes = async () => {
      try {
        const saved = localStorage.getItem(LIKED_NOTES_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setLikedNotes(parsed);
        }
      } catch (error) {
        console.error("Error loading liked notes:", error);
        setLikedNotes([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadLikedNotes();
  }, []);

  const toggleNoteLike = (noteId: string) => {
    const isLiked = likedNotes.includes(noteId);
    
    if (isLiked) {
      const updatedLikedNotes = likedNotes.filter(id => id !== noteId);
      setLikedNotes(updatedLikedNotes);
      localStorage.setItem(LIKED_NOTES_KEY, JSON.stringify(updatedLikedNotes));
    } else {
      const updatedLikedNotes = [...likedNotes, noteId];
      setLikedNotes(updatedLikedNotes);
      localStorage.setItem(LIKED_NOTES_KEY, JSON.stringify(updatedLikedNotes));
    }
  };

  const isNoteLiked = (noteId: string) => {
    return likedNotes.includes(noteId);
  };

  // Combine all favorites
  const allFavorites: FavoriteItem[] = [
    // Add liked songs
    ...likedSongs.map(song => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      type: "song" as const,
      createdAt: Date.now(), // Songs don't have createdAt, using current time
      imageUrl: song.imageUrl,
      url: song.url,
    })),
    // Add liked notes
    ...notes
      .filter(note => likedNotes.includes(note.id))
      .map(note => ({
        id: note.id,
        title: note.title,
        artist: note.artist,
        type: "note" as const,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        lyrics: note.lyrics,
      })),
  ].sort((a, b) => b.createdAt - a.createdAt); // Sort by creation date, newest first

  return {
    allFavorites,
    toggleNoteLike,
    isNoteLiked,
    isLoading,
  };
};
