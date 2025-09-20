import { useState } from "react";
import { StickyNote, Plus, Trash2, Edit3 } from "lucide-react";
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
import { useNotes, UserNote } from "@/hooks/useNotes";
import { useNavigate } from "react-router-dom";
import { translations } from "@/lib/translations";
import { useSettings } from "@/contexts/SettingsContext";
import { formatDistanceToNow } from "date-fns";

const NotesListPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const t = translations[settings.language];
  const { notes, deleteNote } = useNotes();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<UserNote | null>(null);
  const [editingNote, setEditingNote] = useState<UserNote | null>(null);

  const handleNoteClick = (note: UserNote) => {
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
    }
  };

  const handleCreateNote = () => {
    setEditingNote(null);
    setShowCreateDialog(true);
  };

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
      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card
              key={note.id}
              className="glass border-border/50 hover:border-primary/30 transition-smooth cursor-pointer"
              onClick={() => handleNoteClick(note)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">
                      {note.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {note.artist}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleEditNote(note, e)}
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
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="inline-flex p-4 bg-muted/30 rounded-2xl mb-4">
            <StickyNote className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t.noNotesFound}</h3>
          <p className="text-muted-foreground mb-4">
            {t.noNotesFoundSubtitle}
          </p>
          <Button
            onClick={handleCreateNote}
            className="bg-gradient-primary hover:bg-gradient-accent"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t.createNote}
          </Button>
        </div>
      )}

      {/* Floating Action Button */}
      {notes.length > 0 && (
        <div className="fixed bottom-24 right-4 z-40">
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
            onSave={() => setShowCreateDialog(false)}
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
    </div>
  );
};

// Note Editor Modal Component
const NoteEditorModal = ({
  note,
  onSave,
  onCancel,
}: {
  note: UserNote | null;
  onSave: () => void;
  onCancel: () => void;
}) => {
  const { settings } = useSettings();
  const t = translations[settings.language];
  const { createNote, updateNote } = useNotes();
  
  const [artistName, setArtistName] = useState(note?.artist || "");
  const [songName, setSongName] = useState(note?.title || "");
  const [noteLyrics, setNoteLyrics] = useState(note?.lyrics || "");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ artist?: string; song?: string }>({});

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
        await updateNote(note.id, {
          title: songName.trim(),
          artist: artistName.trim(),
          lyrics: noteLyrics,
        });
      } else {
        await createNote({
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
          type="text"
          value={artistName}
          onChange={(e) => {
            setArtistName(e.target.value);
            if (errors.artist) setErrors({ ...errors, artist: undefined });
          }}
          placeholder={t.artistName}
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
          className="w-full p-3 rounded-lg bg-card/50 border border-border/50 focus:border-primary focus:outline-none resize-none"
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
