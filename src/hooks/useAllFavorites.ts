import { useState, useEffect, useMemo } from "react";
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
  
  // Debug what we're receiving from useLikedSongs
  console.log('🟡 useAllFavorites render - received likedSongs:', {
    count: likedSongs.length,
    ids: likedSongs.map(s => s.id)
  });
  
  // Force re-render when likedSongs changes by using a local state
  const [likedSongsSnapshot, setLikedSongsSnapshot] = useState(likedSongs);
  
  useEffect(() => {
    console.log('🟠 likedSongs changed, updating snapshot:', {
      oldCount: likedSongsSnapshot.length,
      newCount: likedSongs.length,
      oldIds: likedSongsSnapshot.map(s => s.id),
      newIds: likedSongs.map(s => s.id)
    });
    setLikedSongsSnapshot(likedSongs);
  }, [likedSongs, likedSongsSnapshot]);
  
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

  // Combine all favorites - memoized to update when dependencies change
  const allFavorites: FavoriteItem[] = useMemo(() => {
    console.log('🟢 useAllFavorites recomputing with:', {
      likedSongsCount: likedSongsSnapshot.length,
      notesCount: notes.length,
      likedNotesCount: likedNotes.length,
      likedSongsIds: likedSongsSnapshot.map(s => s.id)
    });
    
    const result = [
      // Add liked songs
      ...likedSongsSnapshot.map(song => ({
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
    ].sort((a, b) => b.createdAt - a.createdAt);
    
    console.log('🟢 allFavorites result count:', result.length);
    return result;
  }, [likedSongsSnapshot, notes, likedNotes]); // Use snapshot instead of direct likedSongs

  return {
    allFavorites,
    toggleNoteLike,
    isNoteLiked,
    isLoading,
  };
};
