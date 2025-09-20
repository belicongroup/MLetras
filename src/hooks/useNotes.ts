import { useState, useEffect } from "react";

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

export const useNotes = () => {
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load notes from localStorage
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const saved = localStorage.getItem(NOTES_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setNotes(parsed);
        }
      } catch (error) {
        console.error("Error loading notes:", error);
        setNotes([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotes();
  }, []);

  const createNote = async (noteData: Omit<UserNote, "id" | "createdAt" | "updatedAt">) => {
    const newNote: UserNote = {
      ...noteData,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newNotes = [newNote, ...notes];
    setNotes(newNotes);
    localStorage.setItem(NOTES_KEY, JSON.stringify(newNotes));
    return newNote;
  };

  const updateNote = async (id: string, noteData: Partial<Omit<UserNote, "id" | "createdAt">>) => {
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
    return updatedNotes.find((note) => note.id === id);
  };

  const deleteNote = async (id: string) => {
    const updatedNotes = notes.filter((note) => note.id !== id);
    setNotes(updatedNotes);
    localStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));
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

  return {
    notes,
    createNote,
    updateNote,
    deleteNote,
    getNoteById,
    toggleNoteLike,
    isNoteLiked,
    isLoading,
  };
};
