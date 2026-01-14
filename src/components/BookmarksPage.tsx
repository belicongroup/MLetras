import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Lock,
  Crown,
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
import { useProStatus } from "@/hooks/useProStatus";
import { userDataApi } from "@/services/userDataApi";
import type { Folder as ApiFolder, Bookmark } from "@/services/userDataApi";
import { syncDebug } from "@/lib/syncDebug";
import { useNavigate, useLocation } from "react-router-dom";
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
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { UpgradeModal } from "@/components/UpgradeModal";
import {
  isFolderLocked,
  updateUnlockedFolders,
  onFolderOpened,
  isLikedSongLocked,
  updateUnlockedLikedSongs,
  onLikedSongOpened,
  recordFolderUsage,
  getUnlockedFolders,
} from "@/services/freeTierLimits";

type FolderItem = Song & {
  type?: "note";
};

interface ClientFolder {
  id: string;
  name: string;
  songCount: number;
  color: string;
  songs: FolderItem[];
  isLocked?: boolean;  // Lock status for free tier downgrade
  created_at?: string; // For lock computation
}

// Sortable Folder Item Component
const SortableFolderItem = ({
  folder,
  onDelete,
  onClick,
  deleteText,
  songText,
  songsText,
  onLockedClick,
}: {
  folder: ClientFolder;
  onDelete: (id: string) => void;
  onClick: () => void;
  deleteText: string;
  songText: string;
  songsText: string;
  onLockedClick?: () => void;
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

  const handleClick = () => {
    if (folder.isLocked && onLockedClick) {
      onLockedClick();
    } else {
      onClick();
    }
  };

  return (
    <div className="relative overflow-hidden">
      <Card
        ref={setNodeRef}
        style={style}
        className={`glass border-border/50 hover:border-primary/30 transition-smooth cursor-pointer hover-scale sortable-item ${
          folder.isLocked ? 'opacity-60' : ''
        }`}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 bg-gradient-to-br ${folder.color} rounded-lg shadow-sm ${
                folder.isLocked ? 'opacity-50' : ''
              }`}
            >
              <Music2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{folder.name}</h4>
                {folder.isLocked && (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {folder.songs.length}{" "}
                {folder.songs.length === 1 ? songText : songsText}
                {folder.isLocked && ' • Locked'}
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

interface BookmarksPageProps {
  onOpenAuth?: () => void;
}

const BookmarksPage = ({ onOpenAuth }: BookmarksPageProps = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const { user, isAuthenticated } = useAuth();
  const { isPro, isLoading: isProLoading } = useProStatus();
  const t = translations[settings.language];
  const [showLikedSongs, setShowLikedSongs] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<ClientFolder | null>(null);
  const [showAddSongDialog, setShowAddSongDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // User data state
  const [userFolders, setUserFolders] = useState<ApiFolder[]>([]);
  const [userBookmarks, setUserBookmarks] = useState<Bookmark[]>([]);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Free tier limits
  const FREE_FOLDER_LIMIT = 1;
  const FREE_SONGS_LIMIT = 5;
  const FREE_NOTES_IN_FOLDER_LIMIT = 3;

  // No default folders - users start with an empty slate

  // Color palette for user folders - cycling through these colors
  const folderColors = [
    "from-blue-500 to-purple-500",
    "from-purple-500 to-indigo-500", 
    "from-indigo-500 to-blue-500",
    "from-teal-500 to-cyan-500",
    "from-cyan-500 to-blue-500",
    "from-emerald-500 to-teal-500",
    "from-rose-500 to-pink-500",
    "from-pink-500 to-rose-500"
  ];

  // Function to assign color to user folder based on index
  const getFolderColor = (index: number) => {
    return folderColors[index % folderColors.length];
  };

  // Load folders from localStorage on component mount
  const [folders, setFolders] = useState<ClientFolder[]>(() => {
    const savedFolders = localStorage.getItem("mletras-folders");
    if (savedFolders) {
      try {
        return JSON.parse(savedFolders);
      } catch (error) {
        console.error("Error parsing saved folders:", error);
        return [];
      }
    }
    return [];
  });

  const [isCreating, setIsCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Track if sync is in progress to prevent duplicate syncs
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Track which local folder IDs have been synced in this session to prevent duplicates
  const syncedLocalFolderIdsRef = useRef<Set<string>>(new Set());

  // Helper function to count total songs (liked songs + all songs in folders)
  // Note: This will be redefined after likedSongs is available from the hook

  // Initialize likedSongs hook - we'll update it with getTotalSongCount after it's defined
  const { likedSongs: initialLikedSongs, toggleLike: initialToggleLike } = useLikedSongs({
    isPro,
    onLimitReached: () => setShowUpgradeModal(true)
  });

  const { allFavorites, toggleNoteLike } = useAllFavorites(initialLikedSongs);
  const { notes } = useNotes();

  // Helper function to count total songs (liked songs + all songs in folders)
  // Defined after likedSongs is available from the hook
  const getTotalSongCount = useCallback(() => {
    let total = initialLikedSongs.length;
    
    // Track which songs we've already counted to avoid double-counting
    const countedSongIds = new Set<string>();
    
    // Count songs in folders, avoiding double-counting for server folders
    folders.forEach(folder => {
      const isServerFolder = isAuthenticated && (
        userFolders.some(f => f.id === folder.id) || 
        !(/^\d+$/.test(folder.id) && folder.id.length <= 15) // UUID-like ID means it's from server
      );
      
      if (isServerFolder) {
        // For server folders, count from userBookmarks to avoid double-counting
        // (folders.songs might be stale or duplicated)
        const folderBookmarks = userBookmarks.filter(b => b.folder_id === folder.id);
        folderBookmarks.forEach(bookmark => {
          const songId = bookmark.track_id || bookmark.id;
          if (songId && !countedSongIds.has(songId)) {
            countedSongIds.add(songId);
            total += 1;
          }
        });
      } else {
        // For local folders, count from folders.songs
        folder.songs.forEach(song => {
          if (song.type !== 'note' && !countedSongIds.has(song.id)) {
            countedSongIds.add(song.id);
            total += 1;
          }
        });
      }
    });
    
    return total;
  }, [initialLikedSongs, folders, userFolders, userBookmarks, isAuthenticated]);

  // Wrapper for toggleLike that checks liked songs limit before adding
  const toggleLike = useCallback(async (song: any) => {
    // Check limit before adding a new song (only for non-Pro users)
    if (!isPro) {
      const isLiked = initialLikedSongs.some((s) => s.id === song.id);
      if (!isLiked) {
        // Check if adding this song would exceed the liked songs limit (5 for free users)
        // Free users can have access to 5 liked songs - anything beyond should be blocked
        if (initialLikedSongs.length >= FREE_SONGS_LIMIT) {
          setShowUpgradeModal(true);
          return;
        }
      }
    }
    await initialToggleLike(song);
  }, [isPro, initialLikedSongs, initialToggleLike]);

  // Use the wrapped version
  const likedSongs = initialLikedSongs;

  // Restore state from location when navigating back from lyrics page
  useEffect(() => {
    if (location.state?.returnTo) {
      const returnTo = location.state.returnTo;
      if (returnTo.showLikedSongs) {
        setShowLikedSongs(true);
        setSelectedFolder(null);
      } else if (returnTo.selectedFolderId) {
        // Find the folder by ID
        const folder = folders.find(f => f.id === returnTo.selectedFolderId);
        if (folder) {
          setSelectedFolder(folder);
          setShowLikedSongs(false);
        }
      }
    }
  }, [location.state, folders]);

  // Compute unlocked liked song IDs synchronously during render to ensure correct lock state on first render
  // This prevents the issue where all songs show as locked when logged out
  const unlockedLikedSongIds = useMemo(() => {
    // Don't compute until Pro status is determined
    if (isProLoading || likedSongs.length === 0) {
      // Return empty set while loading - songs will show as unlocked to prevent flash
      return new Set<string>();
    }
    
    const songIds = likedSongs.map(s => s.id);
    // Create a map of song IDs to creation timestamps for fallback
    // Since songs don't have createdAt, we'll use the order they appear (most recent first)
    // or we can track when they were added to liked songs
    const songsWithTimestamps = new Map<string, number>();
    likedSongs.forEach((song, index) => {
      // Use reverse index as timestamp (most recent = highest timestamp)
      // This ensures the first 5 songs are unlocked by default
      songsWithTimestamps.set(song.id, Date.now() - index);
    });
    const unlocked = updateUnlockedLikedSongs(songIds, isPro, songsWithTimestamps);
    return new Set(unlocked);
  }, [likedSongs, isPro, isProLoading]);

  // Update unlocked liked songs whenever liked songs change or Pro status changes
  useEffect(() => {
    if (!isProLoading && likedSongs.length > 0) {
      const songIds = likedSongs.map(s => s.id);
      const songsWithTimestamps = new Map<string, number>();
      likedSongs.forEach((song, index) => {
        songsWithTimestamps.set(song.id, Date.now() - index);
      });
      updateUnlockedLikedSongs(songIds, isPro, songsWithTimestamps);
    }
  }, [likedSongs, isPro, isProLoading]);

  // Force re-render when likedSongs count changes
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [likedSongs.length]);

  // Save folders to localStorage whenever folders change
  // Also update unlocked folders, but only if not currently syncing (to avoid race conditions)
  useEffect(() => {
    if (isSyncing) {
      // Skip updating unlocked folders during sync - it will be updated after sync completes
      return;
    }
    
    localStorage.setItem("mletras-folders", JSON.stringify(folders));
    
    // Update unlocked folders based on current folder list and Pro status
    const folderIds = folders.map(f => f.id);
    // Create a map of folder IDs to creation timestamps for fallback
    // Folders use created_at (string) or we can use ID as timestamp if it's a numeric ID
    const foldersWithTimestamps = new Map<string, number>();
    folders.forEach(folder => {
      // If folder has created_at, use it; otherwise, if ID is numeric (timestamp), use it
      if (folder.created_at) {
        foldersWithTimestamps.set(folder.id, new Date(folder.created_at).getTime());
      } else if (/^\d+$/.test(folder.id) && folder.id.length <= 15) {
        // Local folder with timestamp ID
        foldersWithTimestamps.set(folder.id, parseInt(folder.id));
      }
    });
    updateUnlockedFolders(folderIds, isPro, foldersWithTimestamps);
  }, [folders, isPro, isSyncing]);

  // Load and sync folders from both localStorage and server (offline-first pattern)
  // Follows the same pattern as liked songs and notes
  useEffect(() => {
    const loadAndSyncFolders = async () => {
      try {
        // Step 1: Always load from localStorage first (instant UX, offline-first)
        const savedFolders = localStorage.getItem("mletras-folders");
        let localFolders: ClientFolder[] = [];
        if (savedFolders) {
          try {
            localFolders = JSON.parse(savedFolders);
            setFolders(localFolders);
          } catch (error) {
            console.error("Error parsing saved folders:", error);
          }
        }

        // Step 2: If authenticated, sync with server (only if not already syncing)
        if (isAuthenticated && !isSyncing) {
          await loadUserData(localFolders);
        } else if (!isAuthenticated) {
          // When logged out, show all folders from localStorage
          // Clear server folders when logged out
          setUserFolders([]);
          setUserBookmarks([]);
          // Reset sync tracking when logged out
          syncedLocalFolderIdsRef.current.clear();
        }
      } catch (error) {
        console.error("Error loading folders:", error);
      }
    };

    loadAndSyncFolders();
  }, [isAuthenticated]);

  // Reload bookmarks when likedSongs changes (when songs are liked/unliked)
  // But don't trigger folder sync - only refresh bookmarks
  useEffect(() => {
    if (isAuthenticated && !isSyncing) {
      // Only reload bookmarks, not folders (to avoid duplicate folder syncs)
      const refreshBookmarks = async () => {
        try {
          const bookmarksResponse = await userDataApi.getBookmarks();
          const bookmarksWithLocks = bookmarksResponse.bookmarks.map(b => ({
            ...b,
            is_locked: b.is_locked !== undefined ? b.is_locked : false
          }));
          setUserBookmarks(bookmarksWithLocks);
          
          // Update folder songs from bookmarks
          setFolders(prev => prev.map(folder => {
            const isServerFolder = userFolders.some(f => f.id === folder.id);
            if (isServerFolder) {
              const folderBookmarks = bookmarksWithLocks.filter(b => b.folder_id === folder.id);
              return {
                ...folder,
                songs: folderBookmarks.map<FolderItem>((bookmark) => {
                  // If no track_id, it's a note - try to find the note data
                  if (!bookmark.track_id) {
                    // Try to find matching note by title and artist
                    const matchingNote = notes.find(n => 
                      n.title === bookmark.song_title && 
                      n.artist === bookmark.artist_name
                    );
                    
                    if (matchingNote) {
                      // Use note's ID and include lyrics
                      return {
                        id: matchingNote.id,
                        title: matchingNote.title,
                        artist: matchingNote.artist,
                        lyrics: matchingNote.lyrics,
                        type: "note" as const,
                      };
                    }
                    
                    // If note not found, still mark as note but use bookmark ID
                    return {
                      id: bookmark.id,
                      title: bookmark.song_title,
                      artist: bookmark.artist_name,
                      type: "note" as const,
                    };
                  }
                  
                  // Regular song
                  return {
                    id: bookmark.track_id || bookmark.id,
                    title: bookmark.song_title,
                    artist: bookmark.artist_name,
                  };
                }),
                songCount: folderBookmarks.length,
              };
            }
            return folder;
          }));
        } catch (error) {
          console.error('Failed to refresh bookmarks:', error);
        }
      };
      refreshBookmarks();
    }
  }, [likedSongs.length, isAuthenticated, notes, userFolders]);

  // Load user folders and bookmarks from server, and sync local folders to server
  const loadUserData = async (localFolders: ClientFolder[] = []) => {
    const timer = syncDebug.createTimer('loadUserData');
    
    syncDebug.log('Starting loadUserData', {
      operation: 'loadUserData',
      data: {
        localFoldersCount: localFolders.length,
        isAuthenticated,
        isSyncing,
      },
      status: 'start',
    });
    
    // Prevent concurrent syncs
    if (isSyncing) {
      syncDebug.log('Sync already in progress, skipping', {
        operation: 'loadUserData',
        status: 'warning',
      });
      return;
    }
    
    setIsSyncing(true);
    setIsLoadingUserData(true);
    try {
      // First, sync local folders to server (if any exist that aren't on server)
      // Track which local folders were synced so we can replace them with server versions
      const syncedFolderMap = new Map<string, string>(); // localId -> serverId
      
      if (localFolders.length > 0) {
        syncDebug.log('Checking local folders for sync', {
          operation: 'loadUserData.syncLocalFolders',
          data: {
            localFoldersCount: localFolders.length,
            localFolderNames: localFolders.map(f => f.name),
          },
          status: 'start',
        });
        
        try {
          // Get server folders to check which local folders need to be synced
          const getFoldersTimer = syncDebug.createTimer('getFolders');
          const foldersResponse = await userDataApi.getFolders();
          getFoldersTimer.end();
          
          const serverFolderNames = new Set(foldersResponse.folders.map(f => f.folder_name));
          const serverFolderIds = new Set(foldersResponse.folders.map(f => f.id));
          
          syncDebug.log('Retrieved server folders', {
            operation: 'loadUserData.getFolders',
            data: {
              serverFoldersCount: foldersResponse.folders.length,
              serverFolderNames: Array.from(serverFolderNames),
            },
            status: 'success',
          });
          
          // Helper to identify local folders (timestamp-based IDs, not UUIDs)
          const isLocalId = (id: string) => /^\d+$/.test(id) && id.length <= 15;
          
          // Sync only truly local folders that don't exist on server
          // AND haven't been synced in this session
          for (const localFolder of localFolders) {
            // Only sync if:
            // 1. It has a local ID (timestamp, not UUID)
            // 2. It doesn't exist on server by name
            // 3. It hasn't been synced in this session (idempotency check)
            const isLocal = isLocalId(localFolder.id);
            const existsOnServer = serverFolderNames.has(localFolder.name) || serverFolderIds.has(localFolder.id);
            const alreadySynced = syncedLocalFolderIdsRef.current.has(localFolder.id);
            
            if (isLocal && !existsOnServer && !alreadySynced) {
              syncDebug.log(`Syncing local folder to server: ${localFolder.name}`, {
                operation: 'loadUserData.syncLocalFolder',
                data: {
                  localFolderId: localFolder.id,
                  localFolderName: localFolder.name,
                  isLocal,
                  existsOnServer,
                  alreadySynced,
                },
                status: 'start',
              });
              
              try {
                const createFolderTimer = syncDebug.createTimer('createFolder');
                const response = await userDataApi.createFolder(localFolder.name);
                createFolderTimer.end();
                
                if (response.success) {
                  // Map local ID to server ID so we can replace it later
                  syncedFolderMap.set(localFolder.id, response.folder.id);
                  // Mark as synced in this session to prevent duplicates
                  syncedLocalFolderIdsRef.current.add(localFolder.id);
                  
                  syncDebug.log(`Local folder synced to server`, {
                    operation: 'loadUserData.syncLocalFolder',
                    data: {
                      localFolderId: localFolder.id,
                      localFolderName: localFolder.name,
                      serverFolderId: response.folder.id,
                    },
                    status: 'success',
                  });
                  
                  // Migrate folder contents (songs and notes) to server
                  if (localFolder.songs && localFolder.songs.length > 0) {
                    syncDebug.log(`Migrating folder contents to server`, {
                      operation: 'loadUserData.migrateFolderContents',
                      data: {
                        folderName: localFolder.name,
                        serverFolderId: response.folder.id,
                        itemsCount: localFolder.songs.length,
                        items: localFolder.songs.map(item => ({
                          title: item.title,
                          type: item.type,
                        })),
                      },
                      status: 'start',
                    });
                    
                    let migratedCount = 0;
                    let failedCount = 0;
                    
                    for (const item of localFolder.songs) {
                      try {
                        if (item.type === "note") {
                          // It's a note - create bookmark without track_id
                          await userDataApi.createBookmark(
                            item.title,
                            item.artist || '',
                            response.folder.id, // Use server folder ID
                            undefined // no track_id for notes
                          );
                        } else {
                          // It's a song - create bookmark with track_id
                          await userDataApi.createBookmark(
                            item.title,
                            item.artist,
                            response.folder.id, // Use server folder ID
                            item.id // track_id
                          );
                        }
                        migratedCount++;
                      } catch (error) {
                        failedCount++;
                        syncDebug.log(`Failed to migrate item to server`, {
                          operation: 'loadUserData.migrateItem',
                          data: {
                            itemTitle: item.title,
                            itemType: item.type,
                            folderName: localFolder.name,
                          },
                          error,
                          status: 'error',
                        });
                      }
                    }
                    
                    syncDebug.log(`Folder contents migration completed`, {
                      operation: 'loadUserData.migrateFolderContents',
                      data: {
                        folderName: localFolder.name,
                        migratedCount,
                        failedCount,
                        totalItems: localFolder.songs.length,
                      },
                      status: migratedCount === localFolder.songs.length ? 'success' : 'warning',
                    });
                  }
                }
              } catch (error) {
                syncDebug.log(`Failed to sync local folder to server`, {
                  operation: 'loadUserData.syncLocalFolder',
                  data: {
                    localFolderId: localFolder.id,
                    localFolderName: localFolder.name,
                  },
                  error,
                  status: 'error',
                });
              }
            } else {
              syncDebug.log(`Skipping local folder (already exists or synced)`, {
                operation: 'loadUserData.syncLocalFolder',
                data: {
                  localFolderId: localFolder.id,
                  localFolderName: localFolder.name,
                  isLocal,
                  existsOnServer,
                  alreadySynced,
                },
                status: 'info',
              });
            }
          }
        } catch (error) {
          syncDebug.log(`Failed to sync local folders`, {
            operation: 'loadUserData.syncLocalFolders',
            error,
            status: 'error',
          });
        }
      }

      // Then load all folders and bookmarks from server
      syncDebug.log('Loading folders and bookmarks from server', {
        operation: 'loadUserData.loadFromServer',
        status: 'start',
      });
      
      const loadTimer = syncDebug.createTimer('loadFromServer');
      let [foldersResponse, bookmarksResponse] = await Promise.all([
        userDataApi.getFolders(),
        userDataApi.getBookmarks()
      ]);
      loadTimer.end();
      
      syncDebug.log('Loaded folders and bookmarks from server', {
        operation: 'loadUserData.loadFromServer',
        data: {
          foldersCount: foldersResponse.folders.length,
          bookmarksCount: bookmarksResponse.bookmarks.length,
        },
        status: 'success',
      });
      
      // Backend already computes locks, but we can also compute client-side for consistency
      // Use backend-provided locks if available, otherwise compute locally
      const foldersWithLocks = foldersResponse.folders.map(f => ({
        ...f,
        is_locked: f.is_locked !== undefined ? f.is_locked : false
      }));
      let bookmarksWithLocks = bookmarksResponse.bookmarks.map(b => ({
        ...b,
        is_locked: b.is_locked !== undefined ? b.is_locked : false
      }));
      
      setUserFolders(foldersWithLocks);
      setUserBookmarks(bookmarksWithLocks);
      
      syncDebug.log('Updated state with server data', {
        operation: 'loadUserData.updateState',
        data: {
          foldersCount: foldersWithLocks.length,
          bookmarksCount: bookmarksWithLocks.length,
        },
        status: 'success',
      });

      // Migrate contents for folders that exist on server but are empty (in case they were synced without contents)
      // This handles the case where a folder was synced in a previous session but contents weren't migrated
      if (localFolders.length > 0) {
        try {
          let needsReload = false;
          for (const localFolder of localFolders) {
            // Find matching server folder by name
            const matchingServerFolder = foldersWithLocks.find(
              sf => sf.folder_name === localFolder.name
            );
            
            // If server folder exists but has no bookmarks, and local folder has contents, migrate them
            if (matchingServerFolder && localFolder.songs && localFolder.songs.length > 0) {
              const serverFolderBookmarks = bookmarksWithLocks.filter(
                b => b.folder_id === matchingServerFolder.id
              );
              
              // Only migrate if server folder is empty but local has contents
              if (serverFolderBookmarks.length === 0) {
                needsReload = true;
                if (process.env.NODE_ENV !== "production") {
                  console.log(`🔄 Migrating ${localFolder.songs.length} items to existing empty server folder "${localFolder.name}"...`);
                }
                
                for (const item of localFolder.songs) {
                  try {
                    if (item.type === "note") {
                      // It's a note - create bookmark without track_id
                      await userDataApi.createBookmark(
                        item.title,
                        item.artist || '',
                        matchingServerFolder.id,
                        undefined // no track_id for notes
                      );
                    } else {
                      // It's a song - create bookmark with track_id
                      await userDataApi.createBookmark(
                        item.title,
                        item.artist,
                        matchingServerFolder.id,
                        item.id // track_id
                      );
                    }
                  } catch (error) {
                    if (process.env.NODE_ENV !== "production") {
                      console.warn(`Failed to migrate item "${item.title}" to existing server folder:`, error);
                    }
                  }
                }
                
                if (process.env.NODE_ENV !== "production") {
                  console.log(`✅ Contents migrated to existing server folder "${localFolder.name}"`);
                }
              }
            }
          }
          
          // Reload bookmarks after migration to get updated data
          if (needsReload) {
            bookmarksResponse = await userDataApi.getBookmarks();
            bookmarksWithLocks = bookmarksResponse.bookmarks.map(b => ({
              ...b,
              is_locked: b.is_locked !== undefined ? b.is_locked : false
            }));
            setUserBookmarks(bookmarksWithLocks);
          }
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("Failed to migrate contents to existing server folders:", error);
          }
        }
      }

      // Merge server folders with local folders (offline-first pattern)
      // Use a single merged list to avoid duplicates
      const serverFolderNames = new Set(foldersWithLocks.map(f => f.folder_name));
      const serverFolderIds = new Set(foldersWithLocks.map(f => f.id));
      
      // Convert server folders to ClientFolder format
      const serverFoldersAsClient: ClientFolder[] = foldersWithLocks.map((folder, index) => ({
        id: folder.id,
        name: folder.folder_name,
        songCount: bookmarksWithLocks.filter(b => b.folder_id === folder.id).length,
        color: getFolderColor(index),
        songs: bookmarksWithLocks
          .filter((b) => b.folder_id === folder.id)
          .map<FolderItem>((bookmark) => {
            // If no track_id, it's a note - try to find the note data
            if (!bookmark.track_id) {
              // Try to find matching note by title and artist
              const matchingNote = notes.find(n => 
                n.title === bookmark.song_title && 
                n.artist === bookmark.artist_name
              );
              
              if (matchingNote) {
                // Use note's ID and include lyrics
                return {
                  id: matchingNote.id,
                  title: matchingNote.title,
                  artist: matchingNote.artist,
                  lyrics: matchingNote.lyrics,
                  type: "note" as const,
                };
              }
              
              // If note not found, still mark as note but use bookmark ID
              return {
                id: bookmark.id,
                title: bookmark.song_title,
                artist: bookmark.artist_name,
                type: "note" as const,
              };
            }
            
            // Regular song
            return {
              id: bookmark.track_id || bookmark.id,
              title: bookmark.song_title,
              artist: bookmark.artist_name,
            };
          }),
        isLocked: folder.is_locked || false,
        created_at: folder.created_at,
      }));

      // Filter local folders to identify which are truly local (not yet synced)
      // A folder is local if:
      // 1. It has a timestamp-based ID (local) not UUID (server)
      // 2. It doesn't exist on server by name
      // 3. It wasn't just synced in this run
      const isLocalId = (id: string) => /^\d+$/.test(id) && id.length <= 15; // Timestamp IDs are numeric and short
      
      const localOnlyFolders = localFolders.filter(f => {
        const isLocal = isLocalId(f.id);
        const existsOnServer = serverFolderNames.has(f.name);
        const wasJustSynced = syncedFolderMap.has(f.id);
        const isServerId = serverFolderIds.has(f.id);
        
        // Keep only truly local folders that haven't been synced
        return isLocal && !existsOnServer && !wasJustSynced && !isServerId;
      });

      // Merge: server folders + local-only folders
      // Deduplicate by ID (primary) and name (secondary) to prevent any duplicates
      const mergedById = new Map<string, ClientFolder>();
      const mergedByName = new Map<string, ClientFolder>();
      
      // Add server folders first (they take precedence)
      serverFoldersAsClient.forEach(folder => {
        mergedById.set(folder.id, folder);
        mergedByName.set(folder.name.toLowerCase(), folder);
      });
      
      // Add local-only folders (only if not already present by ID or name)
      localOnlyFolders.forEach(folder => {
        const existsById = mergedById.has(folder.id);
        const existsByName = mergedByName.has(folder.name.toLowerCase());
        
        if (!existsById && !existsByName) {
          mergedById.set(folder.id, folder);
          mergedByName.set(folder.name.toLowerCase(), folder);
        }
      });
      
      // Convert to array (use ID-based map for final list)
      const mergedFolders = Array.from(mergedById.values());
      
      // Save merged result to localStorage for offline access
      // This includes server folders (so they're visible when logged out) + local-only folders
      localStorage.setItem("mletras-folders", JSON.stringify(mergedFolders));
      
      syncDebug.log('Merged folders and saved to localStorage', {
        operation: 'loadUserData.mergeFolders',
        data: {
          serverFoldersCount: serverFoldersAsClient.length,
          localOnlyFoldersCount: localOnlyFolders.length,
          mergedFoldersCount: mergedFolders.length,
        },
        status: 'success',
      });
      
      // Set folders to the merged list (single source of truth)
      // This prevents duplicates - we show everything from folders, not userFolders
      setFolders(mergedFolders);
      
      // Update unlocked folders after merge
      const allFolderIds = mergedFolders.map(f => f.id);
      const foldersWithTimestamps = new Map<string, number>();
      mergedFolders.forEach(folder => {
        if (folder.created_at) {
          foldersWithTimestamps.set(folder.id, new Date(folder.created_at).getTime());
        } else if (/^\d+$/.test(folder.id) && folder.id.length <= 15) {
          foldersWithTimestamps.set(folder.id, parseInt(folder.id));
        }
      });
      updateUnlockedFolders(allFolderIds, isPro, foldersWithTimestamps);
      
      timer.end();
      syncDebug.log('loadUserData completed successfully', {
        operation: 'loadUserData',
        data: {
          finalFoldersCount: mergedFolders.length,
          finalBookmarksCount: bookmarksWithLocks.length,
        },
        status: 'success',
      });
    } catch (error) {
      timer.end();
      syncDebug.log('loadUserData failed', {
        operation: 'loadUserData',
        error,
        status: 'error',
      });
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoadingUserData(false);
      setIsSyncing(false);
      
      syncDebug.log('loadUserData cleanup completed', {
        operation: 'loadUserData',
        data: {
          isSyncing: false,
          isLoadingUserData: false,
        },
        status: 'info',
      });
    }
  };

  // Handler to open add song dialog
  // Check if folder has reached the limit (5 songs + 3 notes) before opening
  const handleOpenAddSongDialog = useCallback(() => {
    console.log('🔓 handleOpenAddSongDialog called', {
      isPro,
      selectedFolderId: selectedFolder?.id,
      selectedFolderName: selectedFolder?.name
    });
    
    // For non-Pro users, check if folder has reached the limit
    if (!isPro && selectedFolder) {
      // Get the latest folder from state
      const currentFolder = folders.find(f => f.id === selectedFolder.id) || selectedFolder;
      
      // Count songs and notes in the folder
      const songCount = currentFolder.songs.filter(s => s.type !== "note").length;
      const noteCount = currentFolder.songs.filter(s => s.type === "note").length;
      
      console.log('📊 Folder limit check:', {
        songCount,
        noteCount,
        FREE_SONGS_LIMIT,
        FREE_NOTES_IN_FOLDER_LIMIT,
        hasReachedSongLimit: songCount >= FREE_SONGS_LIMIT,
        hasReachedNoteLimit: noteCount >= FREE_NOTES_IN_FOLDER_LIMIT,
        hasReachedLimit: songCount >= FREE_SONGS_LIMIT && noteCount >= FREE_NOTES_IN_FOLDER_LIMIT
      });
      
      // If folder has 5 songs AND 3 notes, show upgrade modal (can't add more)
      if (songCount >= FREE_SONGS_LIMIT && noteCount >= FREE_NOTES_IN_FOLDER_LIMIT) {
        console.log('🚫 Folder limit reached (5 songs AND 3 notes), showing upgrade modal');
        setShowUpgradeModal(true);
        return;
      }
    }
    
    console.log('✅ Opening add song dialog');
    setShowAddSongDialog(true);
  }, [isPro, selectedFolder, folders]);

  // Handler to open create folder dialog - checks limit first
  const handleOpenCreateFolderDialog = useCallback(() => {
    // Check folder limit for non-Pro users before opening dialog
    // Free users can have many folders stored, but only 1 can be opened/used
    // So we allow creating folders, but they'll be locked if over limit
    // However, if user already has folders and is at limit, we should still allow creation
    // The new folder will just be locked until they upgrade or it becomes most recently used
    setIsCreating(true);
    setShowCreateFolderDialog(true);
    return true; // Allow opening dialog
  }, []);

  // Create new folder (server + local)
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    // Free users can have many folders stored, but only 1 can be opened/used
    // So we allow creation, but if they're already at the limit, show upgrade modal
    // The new folder will be locked if over limit
    // However, per requirements: "If user is Free and already at the limit: block creating additional folders/notes"
    if (!isPro) {
      const totalFolders = userFolders.length + folders.length;
      // If they already have 1 or more folders (at the limit), block creating more
      if (totalFolders >= FREE_FOLDER_LIMIT) {
        setShowCreateFolderDialog(false);
        setShowUpgradeModal(true);
        return;
      }
    }
    
    if (isAuthenticated) {
      // Authenticated user - create on server
      // Pass StoreKit-verified Pro status (source of truth) to backend
      console.log('🔍 [DEBUG] Creating folder:', {
        folderName: newFolderName.trim(),
        isPro,
        isProType: typeof isPro,
        isAuthenticated,
        userId: user?.id
      });
      try {
        const response = await userDataApi.createFolder(newFolderName.trim(), isPro);
        if (response.success) {
          // Update userFolders state
          setUserFolders(prev => [...prev, response.folder]);
          
          // Immediately add to folders state (the displayed list) so it appears right away
          const newClientFolder: ClientFolder = {
            id: response.folder.id,
            name: response.folder.folder_name,
            songCount: 0,
            color: getFolderColor(folders.length), // Use current folders length for color index
            songs: [],
            isLocked: response.folder.is_locked || false,
            created_at: response.folder.created_at,
          };
          
          // Add to folders state immediately and update unlocked folders
          setFolders((prev) => {
            const updated = [...prev, newClientFolder];
            // Save to localStorage
            localStorage.setItem("mletras-folders", JSON.stringify(updated));
            
            // Update unlocked folders after creating new folder
            // The new folder will be unlocked if under limit, or locked if over limit
            const allFolderIds = updated.map(f => f.id);
            const foldersWithTimestamps = new Map<string, number>();
            updated.forEach(folder => {
              if (folder.created_at) {
                foldersWithTimestamps.set(folder.id, new Date(folder.created_at).getTime());
              } else if (/^\d+$/.test(folder.id) && folder.id.length <= 15) {
                foldersWithTimestamps.set(folder.id, parseInt(folder.id));
              }
            });
            updateUnlockedFolders(allFolderIds, isPro, foldersWithTimestamps);
            
            return updated;
          });
          
          setNewFolderName("");
          setIsCreating(false);
          setShowCreateFolderDialog(false);
        }
      } catch (error: any) {
        console.error('Failed to create folder:', error);
        // Handle folder limit error
        if (error.message.includes('Folder limit reached')) {
          setShowCreateFolderDialog(false);
          setShowUpgradeModal(true);
        }
      }
    } else {
      // Local user - create locally
      handleCreateFolder();
      // Note: handleCreateFolder now updates unlocked folders immediately
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
    const folderId = Date.now().toString();
    const folderTimestamp = parseInt(folderId);
    const newFolder: ClientFolder = {
      id: folderId,
      name: newFolderName.trim(),
      songCount: 0,
      color: randomColor,
      songs: [],
      created_at: new Date(folderTimestamp).toISOString(), // Add created_at for lock computation
    };

    setFolders((prev) => {
      const updated = [...prev, newFolder];
      // Immediately update unlocked folders with the new folder included
      const allFolderIds = updated.map(f => f.id);
      const foldersWithTimestamps = new Map<string, number>();
      updated.forEach(folder => {
        if (folder.created_at) {
          foldersWithTimestamps.set(folder.id, new Date(folder.created_at).getTime());
        } else if (/^\d+$/.test(folder.id) && folder.id.length <= 15) {
          foldersWithTimestamps.set(folder.id, parseInt(folder.id));
        }
      });
      // Ensure new folder timestamp is included
      foldersWithTimestamps.set(newFolder.id, folderTimestamp);
      updateUnlockedFolders(allFolderIds, isPro, foldersWithTimestamps);
      return updated;
    });
    setNewFolderName("");
    setIsCreating(false);
    setShowCreateFolderDialog(false);
  };

  // Delete folder (server + local)
  const deleteFolder = async (folderId: string) => {
    if (isAuthenticated) {
      // Authenticated user - delete from server
      try {
        const response = await userDataApi.deleteFolder(folderId);
        if (response.success) {
          // Remove from both userFolders and folders state
          setUserFolders(prev => prev.filter(folder => folder.id !== folderId));
          setFolders(prev => {
            const updated = prev.filter(folder => folder.id !== folderId);
            // Update localStorage
            localStorage.setItem("mletras-folders", JSON.stringify(updated));
            return updated;
          });
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
    // Check if it's a note - if so, navigate to note detail instead
    if (song.type === "note") {
      // Prepare return state for navigation back
      const returnTo = {
        activeTab: "bookmarks" as const,
        showLikedSongs: showLikedSongs,
        selectedFolderId: selectedFolder?.id || null,
      };
      navigate("/note-detail", {
        state: { note: song, returnTo },
      });
      return;
    }

    // Prepare return state for navigation back
    const returnTo = {
      activeTab: "bookmarks" as const,
      showLikedSongs: showLikedSongs,
      selectedFolderId: selectedFolder?.id || null,
    };

    // Navigate to lyrics page with loading state
    navigate("/lyrics", {
      state: {
        song: { ...song, lyrics: "Loading..." },
        isLoadingLyrics: true,
        returnTo,
      },
    });

    // Fetch lyrics and update the page
    try {
      const lyrics = await musixmatchApi.getSongLyrics(song.id, song);
      navigate("/lyrics", {
        state: {
          song: { ...song, lyrics },
          isLoadingLyrics: false,
          returnTo,
        },
      });
    } catch (error) {
      console.error("Failed to fetch lyrics:", error);
      navigate("/lyrics", {
        state: {
          song: { ...song, lyrics: "Lyrics not available for this song." },
          isLoadingLyrics: false,
          returnTo,
        },
      });
    }
  };

  const handleFavoriteSelect = async (favorite: any) => {
    if (favorite.type === "song") {
      // Check if song is locked before opening
      if (isLikedSongLocked(favorite.id, isPro)) {
        setShowUpgradeModal(true);
        return;
      }
      
      // Record song usage and update unlocked set
      const allSongIds = likedSongs.map(s => s.id);
      onLikedSongOpened(favorite.id, allSongIds, isPro);
      
      // handleSongSelect will pass the return state, so we can just call it
      await handleSongSelect(favorite);
    } else if (favorite.type === "note") {
      // Prepare return state for navigation back
      const returnTo = {
        activeTab: "bookmarks" as const,
        showLikedSongs: showLikedSongs,
        selectedFolderId: selectedFolder?.id || null,
      };
      navigate("/note-detail", {
        state: { note: favorite, returnTo },
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

  const handleAddSongToFolder = async (song: FolderItem) => {
    console.log('🎵 handleAddSongToFolder called', { 
      songTitle: song.title, 
      selectedFolderId: selectedFolder?.id,
      selectedFolderName: selectedFolder?.name,
      isPro,
      isAuthenticated
    });
    
    if (!selectedFolder) {
      console.error('❌ No selectedFolder');
      return;
    }

    // Get the latest folder from state to ensure we're working with current data
    const currentFolder = folders.find(f => f.id === selectedFolder.id);
    if (!currentFolder) {
      console.error('❌ Folder not found in state:', selectedFolder.id, 'Available folders:', folders.map(f => f.id));
      return;
    }

    console.log('📁 Current folder:', {
      id: currentFolder.id,
      name: currentFolder.name,
      songCount: currentFolder.songs.length,
      songs: currentFolder.songs.map(s => s.id)
    });

    // Check if song is already in folder
    if (currentFolder.songs.some((s) => s.id === song.id)) {
      console.log('⚠️ Song already in folder');
      return;
    }

    // Check song limit for non-Pro users (works for both guests and authenticated free users)
    if (!isPro) {
      const totalSongs = getTotalSongCount();
      console.log('📊 Song limit check:', {
        totalSongs,
        FREE_SONGS_LIMIT,
        isSongInLiked: likedSongs.some((s) => s.id === song.id),
        isSongInFolders: folders.some(f => f.songs.some((s) => s.id === song.id)),
        isSongInBookmarks: userBookmarks.some(b => b.track_id === song.id)
      });
      
      // Check if adding this song would exceed the limit
      // Only count if the song is not already in liked songs or any folder
      const isSongAlreadyCounted = likedSongs.some((s) => s.id === song.id) ||
        folders.some(f => f.songs.some((s) => s.id === song.id)) ||
        userBookmarks.some(b => b.track_id === song.id);
      
      console.log('🔍 Song counting:', {
        isSongAlreadyCounted,
        wouldExceedLimit: !isSongAlreadyCounted && totalSongs >= FREE_SONGS_LIMIT
      });
      
      if (!isSongAlreadyCounted && totalSongs >= FREE_SONGS_LIMIT) {
        console.log('🚫 Song limit reached, showing upgrade modal');
        // Close the dialog first
        setShowAddSongDialog(false);
        // Show upgrade modal immediately after a short delay to ensure dialog closes
        setTimeout(() => {
          console.log('✅ Showing upgrade modal after dialog close');
          setShowUpgradeModal(true);
        }, 150);
        return;
      }
    }

    // Check if this is a server folder (exists in userFolders) or local folder
    // Also check by ID format: server folders have UUIDs, local folders have timestamp IDs
    const isLocalId = (id: string) => /^\d+$/.test(id) && id.length <= 15;
    const isServerFolder = isAuthenticated && (
      userFolders.some(folder => folder.id === currentFolder.id) || 
      !isLocalId(currentFolder.id) // UUID-like ID means it's from server
    );

    console.log('🌐 Folder type check:', {
      isAuthenticated,
      isServerFolder,
      folderId: currentFolder.id,
      isLocalId: isLocalId(currentFolder.id),
      inUserFolders: userFolders.some(f => f.id === currentFolder.id),
      userFoldersIds: userFolders.map(f => f.id)
    });

    if (isAuthenticated && isServerFolder) {
      // Authenticated user - add to server folder
      console.log('☁️ Adding song to server folder...');
      try {
        const response = await userDataApi.createBookmark(
          song.title,
          song.artist,
          currentFolder.id,
          song.id
        );
        
        console.log('📡 Server response:', response);
        
        if (response.success) {
          // Update userBookmarks to reflect the new bookmark
          setUserBookmarks(prev => [...prev, response.bookmark]);
          
          // Update folders state
          setFolders((prev) =>
            prev.map((folder) =>
              folder.id === currentFolder.id
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
                  songs: [...(prev?.songs || []), song],
                  songCount: (prev?.songs.length || 0) + 1,
                }
              : null,
          );
          
          console.log("✅ Song added to server folder:", song.title);
        } else {
          console.error('❌ Server returned success:false', response);
        }
      } catch (error) {
        console.error('❌ Failed to add song to server folder:', error);
      }
    } else {
      // Local folder or non-authenticated user - add to local folder
      console.log('💾 Adding song to local folder...');
      setFolders((prev) =>
        prev.map((folder) =>
          folder.id === currentFolder.id
            ? {
                ...folder,
                songs: [...folder.songs, song],
                songCount: folder.songs.length + 1,
              }
            : folder,
        ),
      );

      // Update selectedFolder state to reflect changes immediately
      // Use the current folder state directly since we know it exists
      setSelectedFolder((prev) => {
        if (!prev || prev.id !== currentFolder.id) return prev;
        return {
          ...prev,
          songs: [...prev.songs, song],
          songCount: prev.songs.length + 1,
        };
      });
      console.log("✅ Song added to local folder:", song.title);
    }

    // Automatically add song to liked songs if not already liked
    if (!likedSongs.some((s) => s.id === song.id)) {
      toggleLike(song);
    }

    // Keep dialog open for adding more songs
  };

  const handleAddNoteToFolder = async (note: any) => {
    if (!selectedFolder) return;

    // Get the latest folder from state to ensure we're working with current data
    const currentFolder = folders.find(f => f.id === selectedFolder.id);
    if (!currentFolder) {
      console.error('Folder not found in state:', selectedFolder.id);
      return;
    }

    // Convert note to song format for folder storage
    const noteAsSong: FolderItem = {
      id: note.id,
      title: note.title,
      artist: note.artist || "",
      lyrics: note.lyrics,
      type: "note",
    };

    // Check if note is already in folder
    if (currentFolder.songs.some((s) => s.id === note.id)) {
      console.log('⚠️ Note already in folder');
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("📝 Adding note to folder:", {
        noteTitle: note.title,
        folderId: selectedFolder.id,
        folderName: selectedFolder.name,
        isAuthenticated,
      });
    }

    // Check if this is a server folder (exists in userFolders) or local folder
    // Also check by ID format: server folders have UUIDs, local folders have timestamp IDs
    const isLocalId = (id: string) => /^\d+$/.test(id) && id.length <= 15;
    const isServerFolder = isAuthenticated && (
      userFolders.some(folder => folder.id === currentFolder.id) || 
      !isLocalId(currentFolder.id) // UUID-like ID means it's from server
    );

    if (isAuthenticated && isServerFolder) {
      // Authenticated user - save to server as bookmark
      try {
        const response = await userDataApi.createBookmark(
          note.title,
          note.artist || '',
          currentFolder.id,
          undefined // no track_id for notes
        );
        
        if (response.success) {
          // Update userBookmarks to reflect the new bookmark
          setUserBookmarks(prev => [...prev, response.bookmark]);
          
          // Update folders state
          setFolders((prev) =>
            prev.map((folder) =>
              folder.id === currentFolder.id
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
                  songs: [...(prev?.songs || []), noteAsSong],
                  songCount: (prev?.songs.length || 0) + 1,
                }
              : null,
          );
          
          if (process.env.NODE_ENV !== "production") {
            console.log("✅ Note saved to server as bookmark:", note.title);
          }
        } else {
          console.error('❌ Server returned success:false', response);
        }
      } catch (error) {
        console.error('❌ Failed to save note to server:', error);
        // Continue with local storage as fallback
      }
    } else {
      // Local folder or non-authenticated user - add to local folder
      setFolders((prev) =>
        prev.map((folder) =>
          folder.id === currentFolder.id
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
              songs: [...(prev?.songs || []), noteAsSong],
              songCount: (prev?.songs.length || 0) + 1,
            }
          : null,
      );
      
      if (process.env.NODE_ENV !== "production") {
        console.log("✅ Note added to local folder:", note.title);
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Note added to folder:", note.title);
    }

    // Keep dialog open for adding more items
  };

  const handleRemoveSongFromFolder = async (songId: string) => {
    if (!selectedFolder) return;

    // Get the latest folder from state to ensure we're working with current data
    const currentFolder = folders.find(f => f.id === selectedFolder.id);
    if (!currentFolder) {
      console.error('Folder not found in state:', selectedFolder.id);
      return;
    }

    // Check if this is a server folder (exists in userFolders) or local folder
    // Also check by ID format: server folders have UUIDs, local folders have timestamp IDs
    const isLocalId = (id: string) => /^\d+$/.test(id) && id.length <= 15;
    const isServerFolder = isAuthenticated && (
      userFolders.some(folder => folder.id === currentFolder.id) || 
      !isLocalId(currentFolder.id) // UUID-like ID means it's from server
    );

    if (isAuthenticated && isServerFolder) {
      // Authenticated user - remove from server folder
      try {
        // Find the item in the folder to get its title and artist
        const itemToRemove = currentFolder.songs.find(s => s.id === songId);
        
        if (!itemToRemove) {
          console.error('Item not found in folder:', songId);
          return;
        }
        
        // Find the bookmark to delete
        // For songs: match by track_id or bookmark.id
        // For notes: match by title and artist (no track_id)
        const bookmarkToDelete = userBookmarks.find(
          bookmark => {
            if (bookmark.folder_id !== currentFolder.id) return false;
            
            // If it's a note (no track_id in bookmark), match by title and artist
            if (!bookmark.track_id) {
              return bookmark.song_title === itemToRemove.title && 
                     bookmark.artist_name === itemToRemove.artist;
            }
            
            // If it's a song, match by track_id or bookmark.id
            return bookmark.track_id === songId || bookmark.id === songId;
          }
        );
        
        if (bookmarkToDelete) {
          const response = await userDataApi.deleteBookmark(bookmarkToDelete.id);
          
          if (response.success) {
            // Update userBookmarks to reflect the deletion
            setUserBookmarks(prev => prev.filter(bookmark => bookmark.id !== bookmarkToDelete.id));
            
            // Update folders state to reflect the deletion (for immediate UI update)
            setFolders((prev) =>
              prev.map((folder) =>
                folder.id === currentFolder.id
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
            
            if (process.env.NODE_ENV !== "production") {
              console.log("✅ Item removed from server folder:", itemToRemove.type === "note" ? "Note" : "Song", songId);
            }
          }
        } else {
          console.error('Bookmark not found for item:', songId, itemToRemove);
        }
      } catch (error) {
        console.error('Failed to remove item from server folder:', error);
      }
    } else {
      // Local folder or non-authenticated user - remove from local folder
      setFolders((prev) =>
        prev.map((folder) =>
          folder.id === currentFolder.id
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
      
      if (process.env.NODE_ENV !== "production") {
        console.log("✅ Song removed from local folder:", songId);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    // Drag and drop disabled - no action needed
    return;
  };

  // Update selectedFolder lock state when it changes (useEffect to avoid render loop)
  useEffect(() => {
    if (selectedFolder) {
      const currentIsLocked = isFolderLocked(selectedFolder.id, isPro);
      // If folder was locked but is now unlocked, update selectedFolder state
      if (selectedFolder.isLocked && !currentIsLocked) {
        console.log('🔄 Folder lock state changed from locked to unlocked, updating selectedFolder');
        const currentFolder = folders.find(f => f.id === selectedFolder.id) || selectedFolder;
        setSelectedFolder({
          ...currentFolder,
          isLocked: false,
        });
      }
    }
  }, [selectedFolder?.id, isPro, folders]);

  // Folder view
  if (selectedFolder) {
    // Get the latest folder from state to ensure we have current data
    const currentSelectedFolder = folders.find(f => f.id === selectedFolder.id) || selectedFolder;
    // Recompute lock state to ensure it's up-to-date (always check fresh from localStorage)
    const currentIsLocked = isFolderLocked(currentSelectedFolder.id, isPro);
    
    console.log('📂 Folder view render:', {
      folderId: currentSelectedFolder.id,
      folderName: currentSelectedFolder.name,
      isLocked: currentIsLocked,
      selectedFolderIsLocked: selectedFolder.isLocked,
      isPro,
      songCount: currentSelectedFolder.songs.length,
      unlockedFolders: getUnlockedFolders()
    });
    
    return (
      <div className="p-4 space-y-6 tablet-container tablet-spacing">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedFolder(null);
              setShowAddSongDialog(false);
              setShowUpgradeModal(false); // Close upgrade modal when going back
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div
              className={`p-2 bg-gradient-to-br ${currentSelectedFolder.color} rounded-lg`}
            >
              <Music2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-mobile-title">{currentSelectedFolder.name}</h2>
              <p className="text-sm text-muted-foreground">
                {currentSelectedFolder.songs.length} songs
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              console.log('➕ Add song button clicked', {
                currentIsLocked,
                folderId: currentSelectedFolder.id
              });
              
              // Double-check folder is not locked before allowing add song
              if (currentIsLocked) {
                console.log('🔒 Folder is locked, showing upgrade modal');
                setShowUpgradeModal(true);
                return;
              }
              handleOpenAddSongDialog();
            }}
            className="bg-gradient-primary hover:bg-gradient-accent hover-scale"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Folder Songs */}
        {currentSelectedFolder.songs.length > 0 ? (
          <div className="space-y-3">
            {currentSelectedFolder.songs.map((song) => (
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
                          // Prepare return state for navigation back
                          const returnTo = {
                            activeTab: "bookmarks" as const,
                            showLikedSongs: showLikedSongs,
                            selectedFolderId: selectedFolder?.id || null,
                          };
                          navigate("/note-detail", {
                            state: { note: song, returnTo },
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
              onClick={() => {
                // Double-check folder is not locked before allowing add song
                if (currentIsLocked) {
                  setShowUpgradeModal(true);
                  return;
                }
                handleOpenAddSongDialog();
              }}
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
                            disabled={currentSelectedFolder.songs.some(
                              (s) => s.id === song.id,
                            )}
                            className="bg-gradient-primary hover:bg-gradient-accent h-8 px-3"
                          >
                            {currentSelectedFolder.songs.some((s) => s.id === song.id)
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
                            disabled={currentSelectedFolder.songs.some(
                              (s) => s.id === note.id,
                            )}
                            className="bg-gradient-primary hover:bg-gradient-accent h-8 px-3"
                          >
                            {currentSelectedFolder.songs.some((s) => s.id === note.id)
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
                            disabled={currentSelectedFolder.songs.some(
                              (s) => s.id === song.id,
                            )}
                            className="bg-gradient-primary hover:bg-gradient-accent h-8 px-3"
                          >
                            {currentSelectedFolder.songs.some((s) => s.id === song.id)
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

        {/* Upgrade Modal */}
        <UpgradeModal 
          isOpen={showUpgradeModal} 
          onClose={() => setShowUpgradeModal(false)} 
        />
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
            {allFavorites.map((favorite) => {
              // Compute lock state for songs only (notes have their own locking)
              const isLocked = favorite.type === "song" && (
                isProLoading || unlockedLikedSongIds.size === 0
                  ? false // Don't show as locked while loading to prevent flash
                  : !unlockedLikedSongIds.has(favorite.id) && !isPro
              );
              
              return (
                <Card
                  key={`${favorite.type}-${favorite.id}-${refreshKey}`}
                  className={`glass border-border/50 hover:border-primary/30 transition-smooth ${
                    isLocked ? 'opacity-60' : ''
                  }`}
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
                          {isLocked && (
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {favorite.artist}
                          {isLocked && ' • Locked'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
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
              );
            })}
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

        {/* Upgrade Modal */}
        <UpgradeModal 
          isOpen={showUpgradeModal} 
          onClose={() => setShowUpgradeModal(false)} 
        />
      </div>
    );
  }

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
            <Dialog 
              open={isCreating} 
              onOpenChange={(open) => {
                if (open) {
                  // Check limit before opening dialog
                  if (!isPro) {
                    const totalFolders = userFolders.length + folders.length;
                    if (totalFolders >= FREE_FOLDER_LIMIT) {
                      setShowUpgradeModal(true);
                      return; // Don't open dialog
                    }
                  }
                  setIsCreating(true);
                  setShowCreateFolderDialog(true);
                } else {
                  setIsCreating(false);
                  setShowCreateFolderDialog(false);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-gradient-primary hover:bg-gradient-accent transition-smooth"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  {t.createFolder}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[90%] glass border-border/50 max-h-[90vh] !top-[20%] !translate-y-0">
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
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newFolderName.trim()) {
                        createFolder();
                      }
                    }}
                    className="bg-card/50 border-border/50"
                    autoFocus
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
          ) : folders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Show all folders from merged list (single source of truth) */}
              {folders.map((folder, index) => {
                // Check if this is a server folder by checking if it exists in userFolders
                // Server folders have UUID-like IDs, local folders have timestamp IDs
                const isServerFolder = isAuthenticated && userFolders.some(f => f.id === folder.id);
                
                // Compute lock status using free tier limits service
                const folderIsLocked = isFolderLocked(folder.id, isPro);
                const folderWithLock: ClientFolder = {
                  ...folder,
                  isLocked: folderIsLocked,
                };
                
                return (
                  <SortableFolderItem
                    key={folder.id}
                    folder={folderWithLock}
                    onDelete={isServerFolder ? deleteFolder : handleDeleteFolder}
                    onClick={() => {
                      // Double-check lock state before opening (in case it changed)
                      const currentLockState = isFolderLocked(folder.id, isPro);
                      if (currentLockState) {
                        console.log('🔒 Folder is locked, showing upgrade modal');
                        setShowUpgradeModal(true);
                        return;
                      }
                      
                      console.log('🔓 Opening folder:', folder.id);
                      
                      // Record folder usage and update unlocked set
                      const allFolderIds = folders.map(f => f.id);
                      // Build timestamps map for proper unlock computation
                      const foldersWithTimestamps = new Map<string, number>();
                      folders.forEach(f => {
                        if (f.created_at) {
                          foldersWithTimestamps.set(f.id, new Date(f.created_at).getTime());
                        } else if (/^\d+$/.test(f.id) && f.id.length <= 15) {
                          foldersWithTimestamps.set(f.id, parseInt(f.id));
                        }
                      });
                      // Record usage and update unlocked set with timestamps
                      recordFolderUsage(folder.id);
                      updateUnlockedFolders(allFolderIds, isPro, foldersWithTimestamps);
                      
                      // Get the latest folder from state and recompute lock state after update
                      // Use setTimeout to ensure localStorage update has been processed
                      setTimeout(() => {
                        const latestFolder = folders.find(f => f.id === folder.id) || folder;
                        // Recompute lock state after updating unlocked set
                        const updatedIsLocked = isFolderLocked(folder.id, isPro);
                        const latestFolderWithLock: ClientFolder = {
                          ...latestFolder,
                          isLocked: updatedIsLocked,
                        };
                        console.log('🔓 Folder opened, updating lock state:', {
                          folderId: folder.id,
                          wasLocked: folderIsLocked,
                          nowLocked: updatedIsLocked,
                          unlockedFolders: getUnlockedFolders()
                        });
                        setSelectedFolder(latestFolderWithLock);
                      }, 0);
                    }}
                    onLockedClick={() => {
                      setShowUpgradeModal(true);
                    }}
                    deleteText={t.delete}
                    songText={t.song}
                    songsText={t.songs}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FolderPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No folders yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first folder to organize your favorite songs.
              </p>
              <Button
                onClick={handleOpenCreateFolderDialog}
                className="bg-gradient-primary hover:bg-gradient-accent"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Folder
              </Button>
            </div>
          )}

        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />
    </DndContext>
  );
};

export default BookmarksPage;
