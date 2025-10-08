import { useState, useEffect, useCallback } from "react";
import {
  Heart,
  FolderPlus,
  Music2,
  ArrowLeft,
  Plus,
  Search,
  GripVertical,
  Trash2,
  StickyNote,
  Loader2,
  X,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useAllFavorites } from "@/hooks/useAllFavorites";
import { useNotes } from "@/hooks/useNotes";
import { useAuth } from "@/contexts/AuthContext";
import { userDataApi, Folder, Bookmark } from "@/services/userDataApi";
import { useNavigate } from "react-router-dom";
import { musixmatchApi, Song } from "@/services/musixmatchApi";
import { translations } from "@/lib/translations";
import { useSettings } from "@/contexts/SettingsContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Folder {
  id: string;
  name: string;
  songCount: number;
  color: string;
  songs: Song[];
}

// Sortable Folder Item Component
const SortableFolderItem = ({
  folder,
  onDelete,
  onClick,
  deleteText,
  songText,
  songsText,
}: {
  folder: Folder;
  onDelete: (id: string) => void;
  onClick: () => void;
  deleteText: string;
  songText: string;
  songsText: string;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id });

  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchCurrentX, setTouchCurrentX] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    setTouchCurrentX(currentX);
    const diff = touchStartX - currentX;

    if (diff > 50) {
      setShowDeleteButton(true);
    } else if (diff < 20) {
      setShowDeleteButton(false);
    }
  };

  const handleTouchEnd = () => {
    // Don't auto-delete, just keep the delete button visible if swiped far enough
    const diff = touchStartX - touchCurrentX;
    if (diff < 50) {
      setShowDeleteButton(false);
    }
    setTouchStartX(0);
    setTouchCurrentX(0);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(folder.id);
    setShowDeleteButton(false);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div className="relative overflow-hidden">
      <Card
        ref={setNodeRef}
        style={style}
        className="glass border-border/50 hover:border-primary/30 transition-smooth cursor-pointer hover-scale sortable-item"
        onClick={onClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-3">
            <div {...attributes} {...listeners} className="p-1 drag-handle">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            <div
              className={`p-2 bg-gradient-to-br ${folder.color} rounded-lg shadow-sm`}
            >
              <Music2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold">{folder.name}</h4>
              <p className="text-sm text-muted-foreground">
                {folder.songs.length}{" "}
                {folder.songs.length === 1 ? songText : songsText}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Delete button */}
      {showDeleteButton && (
        <div className="absolute right-0 top-0 h-full bg-destructive flex items-center justify-center px-4">
          <button
            onClick={handleDeleteClick}
            className="text-white font-medium text-sm hover:bg-destructive/80 px-2 py-1 rounded"
          >
            {deleteText}
          </button>
        </div>
      )}
    </div>
  );
};

const BookmarksPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { user, isAuthenticated } = useAuth();
  const t = translations[settings.language];
  const { likedSongs, toggleLike } = useLikedSongs();
  const { allFavorites, toggleNoteLike } = useAllFavorites(likedSongs);
  const { notes } = useNotes();
  const [showLikedSongs, setShowLikedSongs] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [showAddSongDialog, setShowAddSongDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // User data state
  const [userFolders, setUserFolders] = useState<Folder[]>([]);
  const [userBookmarks, setUserBookmarks] = useState<Bookmark[]>([]);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Default folders
  const defaultFolders: Folder[] = [
    {
      id: "1",
      name: "Corridos",
      songCount: 0,
      color: "from-red-500 to-pink-500",
      songs: [],
    },
    {
      id: "2",
      name: "Tumbado",
      songCount: 0,
      color: "from-yellow-500 to-orange-500",
      songs: [],
    },
    {
      id: "3",
      name: "Para Bailar",
      songCount: 0,
      color: "from-green-500 to-emerald-500",
      songs: [],
    },
  ];

  // Load folders from localStorage on component mount
  const [folders, setFolders] = useState<Folder[]>(() => {
    const savedFolders = localStorage.getItem("mletras-folders");
    if (savedFolders) {
      try {
        return JSON.parse(savedFolders);
      } catch (error) {
        console.error("Error parsing saved folders:", error);
        return defaultFolders;
      }
    }
    return defaultFolders;
  });

  const [isCreating, setIsCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Force re-render when likedSongs count changes
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [likedSongs.length]);

  // Save folders to localStorage whenever folders change
  useEffect(() => {
    localStorage.setItem("mletras-folders", JSON.stringify(folders));
  }, [folders]);

  // Load user data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated]);

  // Reload bookmarks when likedSongs changes (when songs are liked/unliked)
  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [likedSongs.length, isAuthenticated]);

  // Load user folders and bookmarks
  const loadUserData = async () => {
    setIsLoadingUserData(true);
    try {
      const [foldersResponse, bookmarksResponse] = await Promise.all([
        userDataApi.getFolders(),
        userDataApi.getBookmarks()
      ]);
      
      setUserFolders(foldersResponse.folders);
      setUserBookmarks(bookmarksResponse.bookmarks);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoadingUserData(false);
    }
  };

  // Create new folder (server + local)
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    if (isAuthenticated) {
      // Authenticated user - create on server
      try {
        const response = await userDataApi.createFolder(newFolderName.trim());
        if (response.success) {
          setUserFolders(prev => [...prev, response.folder]);
          setNewFolderName("");
          setShowCreateFolderDialog(false);
        }
      } catch (error: any) {
        console.error('Failed to create folder:', error);
        // Handle folder limit error
        if (error.message.includes('Folder limit reached')) {
          // Show upgrade prompt
        }
      }
    } else {
      // Local user - create locally
      handleCreateFolder();
    }
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const colors = [
    "from-purple-500 to-blue-500",
    "from-pink-500 to-rose-500",
    "from-cyan-500 to-teal-500",
    "from-orange-500 to-red-500",
    "from-green-500 to-lime-500",
    "from-indigo-500 to-purple-500",
  ];

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newFolder: Folder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      songCount: 0,
      color: randomColor,
      songs: [],
    };

    setFolders((prev) => [...prev, newFolder]);
    setNewFolderName("");
    setIsCreating(false);
  };

  // Delete folder (server + local)
  const deleteFolder = async (folderId: string) => {
    if (isAuthenticated) {
      // Authenticated user - delete from server
      try {
        const response = await userDataApi.deleteFolder(folderId);
        if (response.success) {
          setUserFolders(prev => prev.filter(folder => folder.id !== folderId));
        }
      } catch (error) {
        console.error('Failed to delete folder:', error);
      }
    } else {
      // Local user - delete locally
      handleDeleteFolder(folderId);
    }
  };

  const handleDeleteFolder = (folderId: string) => {
    setFolders((prev) => prev.filter((folder) => folder.id !== folderId));
  };

  const handleSongSelect = async (song: any) => {
    // Navigate to lyrics page with loading state
    navigate("/lyrics", {
      state: {
        song: { ...song, lyrics: "Loading..." },
        isLoadingLyrics: true,
      },
    });

    // Fetch lyrics and update the page
    try {
      const lyrics = await musixmatchApi.getSongLyrics(song.id, song);
      navigate("/lyrics", {
        state: {
          song: { ...song, lyrics },
          isLoadingLyrics: false,
        },
      });
    } catch (error) {
      console.error("Failed to fetch lyrics:", error);
      navigate("/lyrics", {
        state: {
          song: { ...song, lyrics: "Lyrics not available for this song." },
          isLoadingLyrics: false,
        },
      });
    }
  };

  const handleFavoriteSelect = async (favorite: any) => {
    if (favorite.type === "song") {
      await handleSongSelect(favorite);
    } else if (favorite.type === "note") {
      navigate("/note-detail", {
        state: { note: favorite },
      });
    }
  };

  const handleSearchSongs = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Only search if query is at least 3 characters to reduce API calls
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await musixmatchApi.searchSongs(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Removed debounced search to prevent auto API calls
  // Search now only triggers on icon click

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
  };

  const handleAddSongToFolder = (song: Song) => {
    if (!selectedFolder) return;

    // Check if song is already in folder
    if (selectedFolder.songs.some((s) => s.id === song.id)) return;

    // Add song to folder
    setFolders((prev) =>
      prev.map((folder) =>
        folder.id === selectedFolder.id
          ? {
              ...folder,
              songs: [...folder.songs, song],
              songCount: folder.songs.length + 1,
            }
          : folder,
      ),
    );

    // Update selectedFolder state to reflect changes immediately
    setSelectedFolder((prev) =>
      prev
        ? {
            ...prev,
            songs: [...prev.songs, song],
            songCount: prev.songs.length + 1,
          }
        : null,
    );

    // Automatically add song to liked songs if not already liked
    if (!likedSongs.some((s) => s.id === song.id)) {
      toggleLike(song);
    }

    // Keep dialog open for adding more songs
  };

  const handleAddNoteToFolder = (note: any) => {
    if (!selectedFolder) return;

    // Convert note to song format for folder storage
    const noteAsSong = {
      id: note.id,
      title: note.title,
      artist: note.artist,
      lyrics: note.lyrics,
      type: "note",
    };

    // Check if note is already in folder
    if (selectedFolder.songs.some((s) => s.id === note.id)) return;

    // Add note to folder
    setFolders((prev) =>
      prev.map((folder) =>
        folder.id === selectedFolder.id
          ? {
              ...folder,
              songs: [...folder.songs, noteAsSong],
              songCount: folder.songs.length + 1,
            }
          : folder,
      ),
    );

    // Update selectedFolder state to reflect changes immediately
    setSelectedFolder((prev) =>
      prev
        ? {
            ...prev,
            songs: [...prev.songs, noteAsSong],
            songCount: prev.songs.length + 1,
          }
        : null,
    );

    // Keep dialog open for adding more items
  };

  const handleRemoveSongFromFolder = (songId: string) => {
    if (!selectedFolder) return;

    setFolders((prev) =>
      prev.map((folder) =>
        folder.id === selectedFolder.id
          ? {
              ...folder,
              songs: folder.songs.filter((s) => s.id !== songId),
              songCount: folder.songs.length - 1,
            }
          : folder,
      ),
    );

    // Update selectedFolder state
    setSelectedFolder((prev) =>
      prev
        ? {
            ...prev,
            songs: prev.songs.filter((s) => s.id !== songId),
            songCount: prev.songs.length - 1,
          }
        : null,
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setFolders((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Folder view
  if (selectedFolder) {
    return (
      <div className="p-4 space-y-6 tablet-container tablet-spacing">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFolder(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div
              className={`p-2 bg-gradient-to-br ${selectedFolder.color} rounded-lg`}
            >
              <Music2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-mobile-title">{selectedFolder.name}</h2>
              <p className="text-sm text-muted-foreground">
                {selectedFolder.songs.length} songs
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddSongDialog(true)}
            className="bg-gradient-primary hover:bg-gradient-accent hover-scale"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Folder Songs */}
        {selectedFolder.songs.length > 0 ? (
          <div className="space-y-3">
            {selectedFolder.songs.map((song) => (
              <Card
                key={song.id}
                className="glass border-border/50 hover:border-primary/30 transition-smooth"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => {
                        if (song.type === "note") {
                          navigate("/note-detail", {
                            state: { note: song },
                          });
                        } else {
                          handleSongSelect(song);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground">
                          {song.title}
                        </h4>
                        {song.type === "note" && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            Note
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {song.artist}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSongFromFolder(song.id)}
                      className="ml-3 transition-smooth text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="inline-flex p-4 bg-muted/30 rounded-2xl mb-4">
              <Music2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t.noSongsFound}</h3>
            <p className="text-muted-foreground mb-4">
              {t.noSongsFoundSubtitle}
            </p>
            <Button
              onClick={() => setShowAddSongDialog(true)}
              className="bg-gradient-primary hover:bg-gradient-accent"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t.addSong}
            </Button>
          </div>
        )}

        {/* Add Song Dialog */}
        <Dialog open={showAddSongDialog} onOpenChange={setShowAddSongDialog}>
          <DialogContent className="w-[90%] glass border-border/50 max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                {t.addSong} {t.to} {selectedFolder.name}
              </DialogTitle>
              <DialogDescription>
                Add songs and notes to this folder from your liked items or search for new ones.
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="liked" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="liked">
                  {t.likedSongs}
                </TabsTrigger>
                <TabsTrigger value="notes">{t.notes}</TabsTrigger>
                <TabsTrigger value="search">{t.searchSongs}</TabsTrigger>
              </TabsList>

              <TabsContent
                value="liked"
                className="space-y-3 max-h-96 overflow-y-auto"
              >
                {likedSongs.length > 0 ? (
                  likedSongs.map((song) => (
                    <Card
                      key={song.id}
                      className="glass border-border/30 hover:border-primary/30 transition-smooth"
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">
                              {song.title}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {song.artist}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddSongToFolder(song)}
                            disabled={selectedFolder.songs.some(
                              (s) => s.id === song.id,
                            )}
                            className="bg-gradient-primary hover:bg-gradient-accent h-8 px-3"
                          >
                            {selectedFolder.songs.some((s) => s.id === song.id)
                              ? "Added"
                              : "Add"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <Heart className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {t.noSongsFound}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="notes"
                className="space-y-3 max-h-96 overflow-y-auto"
              >
                {notes.length > 0 ? (
                  notes.map((note) => (
                    <Card
                      key={note.id}
                      className="glass border-border/30 hover:border-primary/30 transition-smooth"
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-1">
                              {note.title}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {note.artist}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddNoteToFolder(note)}
                            disabled={selectedFolder.songs.some(
                              (s) => s.id === note.id,
                            )}
                            className="bg-gradient-primary hover:bg-gradient-accent h-8 px-3"
                          >
                            {selectedFolder.songs.some((s) => s.id === note.id)
                              ? "Added"
                              : "Add"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <div className="inline-flex p-3 bg-muted/30 rounded-2xl mb-2">
                      <StickyNote className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t.noNotesFound}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="search" className="space-y-3">
                <div className="relative">
                  <Input
                    placeholder={t.searchSongs}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchSongs(searchQuery);
                      }
                    }}
                    className="pr-10 bg-card/50 border-border/50"
                  />
                  <button
                    onClick={() => {
                      if (searchResults.length > 0) {
                        clearSearch();
                      } else {
                        handleSearchSongs(searchQuery);
                      }
                    }}
                    disabled={isSearching}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : searchResults.length > 0 ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2">
                  {searchResults.map((song) => (
                    <Card
                      key={song.id}
                      className="glass border-border/30 hover:border-primary/30 transition-smooth"
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">
                              {song.title}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {song.artist}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddSongToFolder(song)}
                            disabled={selectedFolder.songs.some(
                              (s) => s.id === song.id,
                            )}
                            className="bg-gradient-primary hover:bg-gradient-accent h-8 px-3"
                          >
                            {selectedFolder.songs.some((s) => s.id === song.id)
                              ? "Added"
                              : "Add"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* No Results Found */}
                  {hasSearched && !isSearching && searchResults.length === 0 && (
                    <div className="text-center py-6">
                      <Search className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {t.noSongsFound}
                      </p>
                    </div>
                  )}

                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (showLikedSongs) {
    return (
      <div className="p-4 space-y-6 tablet-container tablet-spacing">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLikedSongs(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-mobile-title">{t.likedSongs}</h2>
            <p className="text-sm text-muted-foreground">
              {allFavorites.length} favorites
            </p>
          </div>
        </div>

        {/* All Favorites List (Songs + Notes) */}
        {allFavorites.length > 0 ? (
          <div className="space-y-3" key={refreshKey}>
            {allFavorites.map((favorite) => (
              <Card
                key={`${favorite.type}-${favorite.id}-${refreshKey}`}
                className="glass border-border/50 hover:border-primary/30 transition-smooth"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleFavoriteSelect(favorite)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground">
                          {favorite.title}
                        </h4>
                        {favorite.type === "note" && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            Note
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {favorite.artist}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (favorite.type === "song") {
                          toggleLike(favorite);
                          // Force re-render to show change immediately
                          setTimeout(() => setRefreshKey(prev => prev + 1), 100);
                        } else {
                          toggleNoteLike(favorite.id);
                          // Force re-render to show change immediately
                          setTimeout(() => setRefreshKey(prev => prev + 1), 100);
                        }
                      }}
                      className="ml-3 transition-smooth text-primary hover:text-primary/80"
                    >
                      <Heart className="w-5 h-5 fill-current" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="inline-flex p-4 bg-muted/30 rounded-2xl mb-4">
              <Heart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t.noSongsFound}</h3>
            <p className="text-muted-foreground">{t.noSongsFoundSubtitle}</p>
          </div>
        )}
      </div>
    );
  }

  // Show authentication prompt if not logged in
  if (!isAuthenticated) {
    return (
      <div className="p-4 space-y-6 tablet-container tablet-spacing">
        <div className="text-center py-8">
          <div className="inline-flex p-3 bg-gradient-primary rounded-2xl shadow-glow mb-4">
            <User className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-mobile-hero mb-2">Sign In Required</h2>
          <p className="text-muted-foreground mb-6">
            Sign in to save your favorite songs and organize them into folders.
          </p>
          <Alert>
            <AlertDescription>
              Your bookmarks will be synced across all devices when you sign in.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="p-4 space-y-6 tablet-container tablet-spacing">
        {/* Header */}
        <div className="text-center py-4">
          <div className="inline-flex p-3 bg-gradient-primary rounded-2xl shadow-glow mb-4">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-mobile-hero mb-2">
            {t.bookmarks.split(" ").map((word, index) =>
              word === "Collection" ? (
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

        {/* Quick Access - Liked Songs */}
        <Card
          className="glass border-border/50 hover:border-primary/30 transition-smooth cursor-pointer"
          onClick={() => setShowLikedSongs(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-accent rounded-lg">
                <Heart className="w-5 h-5 text-white fill-current" />
              </div>
              <div>
                <h3 className="font-semibold">{t.likedSongs}</h3>
                <p className="text-sm text-muted-foreground">
                  {allFavorites.length} favorites
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Folders Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-mobile-title">{t.folders}</h3>
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-gradient-primary hover:bg-gradient-accent transition-smooth"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  {t.createFolder}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[90%] glass border-border/50">
                <DialogHeader>
                  <DialogTitle>{t.createFolder}</DialogTitle>
                  <DialogDescription>
                    {t.createFolderDescription ||
                      "Create a new folder to organize your favorite songs."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder={t.folderName}
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="bg-card/50 border-border/50"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      onClick={() => setIsCreating(false)}
                    >
                      {t.cancel}
                    </Button>
                    <Button
                      onClick={createFolder}
                      disabled={!newFolderName.trim()}
                      className="bg-gradient-primary hover:bg-gradient-accent"
                    >
                      {t.save}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Folders Grid */}
          {isLoadingUserData ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading your folders...</p>
            </div>
          ) : (userFolders.length > 0 || folders.length > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userFolders.map((folder) => (
                <div key={folder.id} className="relative">
                  <Card
                    className="glass border-border/50 hover:border-primary/30 transition-smooth cursor-pointer hover-scale"
                    onClick={() => {
                      // Convert user folder to local folder format for compatibility
                      const localFolder: Folder = {
                        id: folder.id,
                        name: folder.folder_name,
                        songCount: userBookmarks.filter(b => b.folder_id === folder.id).length,
                        color: "from-blue-500 to-purple-500", // Default color
                        songs: userBookmarks.filter(b => b.folder_id === folder.id).map(bookmark => ({
                          id: bookmark.track_id || bookmark.id,  // Use track_id for Musixmatch API
                          title: bookmark.song_title,
                          artist: bookmark.artist_name,
                          album: "",
                          duration: 0,
                          year: 0,
                          genre: "",
                          lyrics: "",
                          albumArt: "",
                          isLiked: false,
                        }))
                      };
                      setSelectedFolder(localFolder);
                    }}
                  >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-3 h-3 bg-gradient-primary rounded-full" />
                      {folder.folder_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {userBookmarks.filter(b => b.folder_id === folder.id).length} songs
                    </p>
                  </CardContent>
                </Card>
                
                {/* Delete button for user folders */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFolder(folder.id);
                  }}
                  className="absolute top-2 right-2 h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              ))}
              
              {/* Local folders (for non-authenticated users or additional folders) */}
              {!isAuthenticated && folders.map((folder) => (
                <SortableFolderItem
                  key={folder.id}
                  folder={folder}
                  onDelete={handleDeleteFolder}
                  onClick={() => setSelectedFolder(folder)}
                  deleteText={t.delete}
                  songText={t.song}
                  songsText={t.songs}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FolderPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No folders yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first folder to organize your favorite songs.
              </p>
              <Button
                onClick={() => setIsCreating(true)}
                className="bg-gradient-primary hover:bg-gradient-accent"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Folder
              </Button>
            </div>
          )}

        </div>
      </div>
    </DndContext>
  );
};

export default BookmarksPage;
