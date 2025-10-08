import { useState, useEffect, useMemo, useRef } from "react";
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

export const useAllFavorites = (likedSongs?: any[]) => {
  const likedSongsFromHook = useLikedSongs();
  const songsToUse = likedSongs || likedSongsFromHook.likedSongs;
  const { notes } = useNotes();
  
  // Debug what we're receiving
  console.log('🟡 useAllFavorites render - received likedSongs:', {
    count: songsToUse.length,
    ids: songsToUse.map(s => s.id),
    source: likedSongs ? 'passed from parent' : 'from hook'
  });
  
  // Use a ref to track the latest likedSongs and force updates
  const likedSongsRef = useRef(songsToUse);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Update ref and force re-render when songsToUse changes
  useEffect(() => {
    console.log('🟠 songsToUse changed, updating ref and forcing update:', {
      oldCount: likedSongsRef.current.length,
      newCount: songsToUse.length,
      oldIds: likedSongsRef.current.map(s => s.id),
      newIds: songsToUse.map(s => s.id)
    });
    likedSongsRef.current = songsToUse;
    setForceUpdate(prev => prev + 1);
  }, [songsToUse]);
  
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
      likedSongsCount: likedSongsRef.current.length,
      notesCount: notes.length,
      likedNotesCount: likedNotes.length,
      likedSongsIds: likedSongsRef.current.map(s => s.id),
      forceUpdate
    });
    
    const result = [
      // Add liked songs
      ...likedSongsRef.current.map(song => ({
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
  }, [forceUpdate, notes, likedNotes]); // Use forceUpdate to trigger recomputation

  return {
    allFavorites,
    toggleNoteLike,
    isNoteLiked,
    isLoading,
  };
};
