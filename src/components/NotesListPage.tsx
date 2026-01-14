import { useState, useEffect, useMemo, useRef } from "react";
import { StickyNote, Plus, Trash2, Edit3, User, Loader2, Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNotes, UserNote } from "@/hooks/useNotes";
import { useAuth } from "@/contexts/AuthContext";
import { useProStatus } from "@/hooks/useProStatus";
import { useNavigate } from "react-router-dom";
import { translations } from "@/lib/translations";
import { useSettings } from "@/contexts/SettingsContext";
import { UpgradeModal } from "@/components/UpgradeModal";
import {
  isNoteLocked,
  updateUnlockedNotes,
  onNoteOpened,
  getUnlockedNotes,
} from "@/services/freeTierLimits";

interface NotesListPageProps {
  onOpenAuth?: () => void;
}

const NotesListPage = ({ onOpenAuth }: NotesListPageProps = {}) => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { user, isAuthenticated } = useAuth();
  const { isPro, isLoading: isProLoading } = useProStatus();
  const t = translations[settings.language];
  const {
    notes,
    createNote,
    updateNote,
    deleteNote,
    refreshNotes,
    isLoading,
  } = useNotes();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<UserNote | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [editingNote, setEditingNote] = useState<UserNote | null>(null);

  // Free tier limits
  const FREE_NOTES_LIMIT = 3;

  // Compute unlocked notes synchronously during render to ensure correct lock state on first render
  // This prevents the issue where all notes show as locked when logged out
  const unlockedNoteIds = useMemo(() => {
    // Don't compute until Pro status is determined
    if (isProLoading || notes.length === 0) {
      // Return empty set while loading - notes will show as unlocked to prevent flash
      return new Set<string>();
    }
    
    const noteIds = notes.map(n => n.id);
    // Create a map of note IDs to creation timestamps for fallback
    const notesWithTimestamps = new Map<string, number>();
    notes.forEach(note => {
      notesWithTimestamps.set(note.id, note.createdAt);
    });
    const unlocked = updateUnlockedNotes(noteIds, isPro, notesWithTimestamps);
    return new Set(unlocked);
  }, [notes, isPro, isProLoading]);

  // Refresh notes when component mounts to ensure we have the latest data
  useEffect(() => {
    refreshNotes();
  }, []);

  // Note: unlockedNoteIds is now computed synchronously in useMemo above
  // This ensures correct lock state on first render without waiting for useEffect

  const handleNoteClick = (note: UserNote) => {
    // Check if note is locked before opening
    if (isNoteLocked(note.id, isPro)) {
      setShowUpgradeModal(true);
      return;
    }
    
    // Record note usage and update unlocked set
    const allNoteIds = notes.map(n => n.id);
    onNoteOpened(note.id, allNoteIds, isPro);
    
    navigate("/note-detail", {
      state: { note },
    });
  };

  const handleEditNote = (note: UserNote, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNote(note);
    setShowCreateDialog(true);
  };

  const handleDeleteNote = (note: UserNote, e: React.MouseEvent) => {
    e.stopPropagation();
    setNoteToDelete(note);
  };

  const confirmDelete = async () => {
    if (noteToDelete) {
      await deleteNote(noteToDelete.id);
      setNoteToDelete(null);
      refreshNotes();
    }
  };

  const handleCreateNote = () => {
    // Free users can create notes, but if they're already at the limit of usable notes,
    // show upgrade modal. However, we allow creation - the new note will be locked if over limit.
    // But if they already have more than the limit, block creating more.
    if (!isPro) {
      const totalNotes = notes.length;
      // If they already have more than the limit, block creating more
      if (totalNotes >= FREE_NOTES_LIMIT) {
        setShowUpgradeModal(true);
        return;
      }
    }
    
    setEditingNote(null);
    // Defer dialog opening to prevent iOS constraint conflicts with keyboard toolbar
    // This allows the UI to settle before showing the dialog and keyboard
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShowCreateDialog(true);
      });
    });
  };

  // Show loading state while checking Pro status (prevents flash of upgrade prompt)
  if (isProLoading) {
    return (
      <div className="p-4 space-y-6 tablet-container tablet-spacing relative min-h-[calc(100vh-120px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 tablet-container tablet-spacing">
      {/* Header */}
      <div className="text-center py-4">
        <div className="inline-flex p-3 bg-gradient-primary rounded-2xl shadow-glow mb-4">
          <StickyNote className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-mobile-hero mb-2">
          {t.myNotes.split(" ").map((word, index) =>
            word === "Notes" || word === "Notas" ? (
              <span
                key={index}
                className="bg-gradient-primary bg-clip-text text-transparent"
              >
                {" "}
                {word}
              </span>
            ) : (
              <span key={index}>
                {index > 0 ? " " : ""}
                {word}
              </span>
            ),
          )}
        </h2>
      </div>

      {/* Notes List */}
      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading your notes...</p>
        </div>
      ) : notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => {
            // Compute lock state: unlockedNoteIds is computed synchronously in useMemo
            // If Pro status is loading or unlocked set is empty, show as unlocked to prevent flash
            // Once Pro status loads, the correct lock state will be computed
            const noteIsLocked = isProLoading || unlockedNoteIds.size === 0
              ? false // Don't show as locked while loading to prevent flash
              : !unlockedNoteIds.has(note.id) && !isPro;
            return (
              <Card
                key={note.id}
                className={`glass border-border/50 hover:border-primary/30 transition-smooth cursor-pointer ${
                  noteIsLocked ? 'opacity-60' : ''
                }`}
                onClick={() => {
                  handleNoteClick(note);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground mb-1">
                          {note.title}
                        </h4>
                        {noteIsLocked && (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {note.artist || t.generalNote}
                        {noteIsLocked && ' • Locked'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (noteIsLocked) {
                            setShowUpgradeModal(true);
                          } else {
                            handleEditNote(note, e);
                          }
                        }}
                        className="transition-smooth text-muted-foreground hover:text-primary"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteNote(note, e)}
                        className="transition-smooth text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="inline-flex p-4 bg-muted/30 rounded-2xl mb-4">
            <StickyNote className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t.noNotesYet}</h3>
          <p className="text-muted-foreground mb-4">
            {t.createFirstNote}
          </p>
          <Button
            onClick={handleCreateNote}
            className="bg-gradient-primary hover:bg-gradient-accent"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Note
          </Button>
        </div>
      )}

      {/* Floating Action Button */}
      {notes.length > 0 && (
        <div className="fixed bottom-28 right-4 z-40 safe-bottom">
          <Button
            onClick={handleCreateNote}
            size="lg"
            className="bg-gradient-primary hover:bg-gradient-accent shadow-glow rounded-full w-14 h-14"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Create/Edit Note Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[90%] glass border-border/50 max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? t.editNote : t.createNote}
            </DialogTitle>
            <DialogDescription>
              {editingNote
                ? "Update your note details"
                : "Create a new note with your lyrics or thoughts"}
            </DialogDescription>
          </DialogHeader>
          <NoteEditorModal
            note={editingNote}
            onCreate={createNote}
            onUpdate={updateNote}
            onSave={() => {
              setShowCreateDialog(false);
              refreshNotes();
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!noteToDelete} onOpenChange={() => setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmDeleteNote}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteNoteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNoteToDelete(null)}>
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />
    </div>
  );
};

// Note Editor Modal Component
const NoteEditorModal = ({
  note,
  onCreate,
  onUpdate,
  onSave,
  onCancel,
}: {
  note: UserNote | null;
  onCreate: (note: { title: string; artist: string; lyrics: string }) => Promise<UserNote | undefined>;
  onUpdate: (id: string, note: Partial<Omit<UserNote, "id" | "createdAt">>) => Promise<UserNote | undefined>;
  onSave: () => void;
  onCancel: () => void;
}) => {
  const { settings } = useSettings();
  const t = translations[settings.language];

  const [artistName, setArtistName] = useState(note?.artist || "");
  const [songName, setSongName] = useState(note?.title || "");
  const [noteLyrics, setNoteLyrics] = useState(note?.lyrics || "");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ artist?: string; song?: string }>({});
  const artistInputRef = useRef<HTMLInputElement>(null);
  const dialogMountedRef = useRef(false);

  // Delay auto-focus to prevent iOS keyboard toolbar constraint conflicts
  // Only auto-focus when creating a new note, not when editing
  useEffect(() => {
    // Skip auto-focus when editing an existing note
    if (note) {
      return;
    }
    
    if (!dialogMountedRef.current) {
      dialogMountedRef.current = true;
      // Use multiple requestAnimationFrame calls to ensure dialog is fully rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Only auto-focus if dialog is visible and input exists
          if (artistInputRef.current) {
            // Small additional delay to let iOS layout settle and prevent constraint conflicts
            setTimeout(() => {
              artistInputRef.current?.focus();
            }, 150);
          }
        });
      });
    }
    return () => {
      dialogMountedRef.current = false;
    };
  }, [note]);

  const handleSave = async () => {
    // Validation
    const newErrors: { artist?: string; song?: string } = {};
    if (!artistName.trim()) {
      newErrors.artist = t.artistNameRequired;
    }
    if (!songName.trim()) {
      newErrors.song = t.songNameRequired;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      if (note) {
        await onUpdate(note.id, {
          title: songName.trim(),
          artist: artistName.trim(),
          lyrics: noteLyrics,
        });
      } else {
        await onCreate({
          title: songName.trim(),
          artist: artistName.trim(),
          lyrics: noteLyrics,
        });
      }
      onSave();
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">{t.artistName}</label>
        <input
          ref={artistInputRef}
          type="text"
          value={artistName}
          onChange={(e) => {
            setArtistName(e.target.value);
            if (errors.artist) setErrors({ ...errors, artist: undefined });
          }}
          placeholder={t.artistName}
          autoFocus={false}
          className="w-full p-3 rounded-lg bg-card/50 border border-border/50 focus:border-primary focus:outline-none"
        />
        {errors.artist && (
          <p className="text-sm text-destructive">{errors.artist}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t.songName}</label>
        <input
          type="text"
          value={songName}
          onChange={(e) => {
            setSongName(e.target.value);
            if (errors.song) setErrors({ ...errors, song: undefined });
          }}
          placeholder={t.songName}
          autoFocus={false}
          className="w-full p-3 rounded-lg bg-card/50 border border-border/50 focus:border-primary focus:outline-none"
        />
        {errors.song && (
          <p className="text-sm text-destructive">{errors.song}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t.noteLyrics}</label>
        <textarea
          value={noteLyrics}
          onChange={(e) => setNoteLyrics(e.target.value)}
          placeholder={t.noteLyricsPlaceholder}
          rows={8}
          autoFocus={false}
          className="w-full p-3 rounded-lg bg-card/50 border border-border/50 focus:border-primary focus:outline-none resize-none font-mono"
          style={{
            whiteSpace: 'pre',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
            overflowWrap: 'normal',
          }}
          spellCheck={false}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
          {t.cancel}
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-gradient-primary hover:bg-gradient-accent"
        >
          {isSaving ? "Saving..." : t.save}
        </Button>
      </div>
    </div>
  );
};

export default NotesListPage;
