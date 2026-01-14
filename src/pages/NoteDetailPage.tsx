import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Type,
  Play,
  Edit3,
  Save,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNotes, UserNote } from "@/hooks/useNotes";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProStatus } from "@/hooks/useProStatus";
import { usePinch } from "@use-gesture/react";
import { translations } from "@/lib/translations";
import { isNoteLocked, onNoteOpened } from "@/services/freeTierLimits";

const NoteDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialNoteData = location.state?.note as UserNote;
  const { settings } = useSettings();
  const { user, isAuthenticated } = useAuth();
  const { isPro, isLoading: isProLoading } = useProStatus();
  const { notes, updateNote } = useNotes();
  const t = translations[settings.language];
  
  // Get the latest note data from notes list to keep it in sync
  const noteData = initialNoteData ? (notes.find(n => n.id === initialNoteData.id) || initialNoteData) : null;
  
  // State to track if we've verified the note isn't locked
  const [isLocked, setIsLocked] = useState<boolean | null>(null);

  const [isBoldText, setIsBoldText] = useState(settings.boldText);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLyrics, setEditedLyrics] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<
    "off" | "slow" | "medium" | "fast"
  >(settings.autoScrollSpeed);
  const [isScrollPaused, setIsScrollPaused] = useState(false);
  const [lastScrollSpeed, setLastScrollSpeed] = useState<
    "slow" | "medium" | "fast"
  >("slow");
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showControlsInLandscape, setShowControlsInLandscape] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    // Larger default font size for tablets
    if (window.innerWidth >= 1024) return 24; // Large tablets
    if (window.innerWidth >= 768) return 22;  // Small tablets
    return 18; // Phones
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const timeoutIdsRef = useRef<number[]>([]);

  // Utility function to manage timeout cleanup
  const addTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      callback();
      // Remove from tracking array when timeout completes
      timeoutIdsRef.current = timeoutIdsRef.current.filter(id => id !== timeoutId);
    }, delay);
    timeoutIdsRef.current.push(timeoutId);
    return timeoutId;
  }, []);

  // Cleanup all pending timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach(clearTimeout);
      timeoutIdsRef.current = [];
    };
  }, []);

  const scrollSpeeds = {
    off: 0,
    slow: 7.5,
    medium: 15,
    fast: 30,
  };

  useEffect(() => {
    const checkOrientation = () => {
      const newIsLandscape = window.innerHeight < window.innerWidth;
      const wasLandscape = isLandscape;
      setIsLandscape(newIsLandscape);
      
      // When switching TO landscape mode, reset auto-scroll to off
      if (newIsLandscape && !wasLandscape) {
        setAutoScrollSpeed("off");
        setIsScrollPaused(false);
        setHasUserInteracted(false);
      }
      
      // Reset controls visibility when switching to portrait mode
      if (!newIsLandscape) {
        setShowControlsInLandscape(false);
      }
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    // Scroll to top when component mounts to ensure header is always visible
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  useEffect(() => {
    // Only allow auto-scroll for Pro users (works for both guests and authenticated users)
    if (
      !isPro ||
      autoScrollSpeed === "off" ||
      isScrollPaused ||
      !scrollContainerRef.current ||
      !hasUserInteracted
    )
      return;

    const container = scrollContainerRef.current;
    const speed = scrollSpeeds[autoScrollSpeed];

    const scroll = () => {
      // Get current scroll position and container dimensions
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      // Calculate the maximum scroll position (with a small buffer)
      const maxScroll = Math.max(0, scrollHeight - clientHeight - 5);

      // Check if we've reached the bottom (with some tolerance)
      if (scrollTop >= maxScroll) {
        // Stop auto-scroll when reaching the bottom
        setAutoScrollSpeed("off");
        return;
      }

      // Continue scrolling
      container.scrollTop += 1;
    };

    const interval = setInterval(scroll, 1000 / speed);
    return () => clearInterval(interval);
  }, [autoScrollSpeed, isScrollPaused, hasUserInteracted]);

  // Update bold text state when settings change
  useEffect(() => {
    setIsBoldText(settings.boldText);
  }, [settings.boldText]);

  // Update auto-scroll speed when settings change
  useEffect(() => {
    setAutoScrollSpeed(settings.autoScrollSpeed);
  }, [settings.autoScrollSpeed]);

  // Check if note is locked when page loads - do this immediately
  useEffect(() => {
    if (!noteData) {
      // No note data - redirect back
      navigate("/", { state: { activeTab: "notes" } });
      return;
    }
    
    // Wait for Pro status to load
    if (isProLoading) {
      return;
    }
    
    // Check if note is locked
    const noteIsLocked = isNoteLocked(noteData.id, isPro);
    setIsLocked(noteIsLocked);
    
    if (noteIsLocked) {
      // Note is locked - redirect back to notes list immediately
      navigate("/", { state: { activeTab: "notes" } });
      return;
    }
    
    // Record note usage when successfully opened
    if (!isPro) {
      const allNoteIds = notes.map(n => n.id);
      onNoteOpened(noteData.id, allNoteIds, isPro);
    }
  }, [noteData?.id, isPro, isProLoading, notes, navigate]);

  // Scroll to top when a new note is loaded to ensure header is always visible
  useEffect(() => {
    if (scrollContainerRef.current && noteData) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [noteData?.id]);


  // Initialize edited lyrics when note data changes
  useEffect(() => {
    if (noteData) {
      setEditedLyrics(noteData.lyrics || "");
    }
  }, [noteData?.id]);

  // Handle save when exiting edit mode
  const handleSaveEdit = async () => {
    if (!noteData || !isEditing) return;
    
    setIsSaving(true);
    try {
      await updateNote(noteData.id, {
        lyrics: editedLyrics,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Enter edit mode
  const toggleEdit = () => {
    setEditedLyrics(noteData?.lyrics || "");
    setIsEditing(true);
  };

  // Pinch gesture handler for font size control
  const baseFontSizeRef = useRef<number>(fontSize);
  const isPinchingRef = useRef(false);
  
  // Update base font size when initial font size is set or orientation changes
  useEffect(() => {
    baseFontSizeRef.current = fontSize;
  }, []);
  
  // Reset base font size when orientation changes
  useEffect(() => {
    baseFontSizeRef.current = fontSize;
    isPinchingRef.current = false;
  }, [isLandscape]);
  
  usePinch(
    ({ offset: [scaleOffset], first, last }) => {
      // Don't allow pinch-to-zoom when editing
      if (isEditing) return;
      
      if (first) {
        // On first touch, set the base font size to current
        baseFontSizeRef.current = fontSize;
        isPinchingRef.current = true;
        // Disable CSS transitions during pinch for immediate feedback
        if (lyricsRef.current) {
          lyricsRef.current.style.transition = 'none';
        }
      }
      
      // Calculate new font size based on pinch scale
      // Use the base font size, scale range from 0.5 to 3.0
      const baseSize = baseFontSizeRef.current;
      const newFontSize = Math.max(12, Math.min(48, baseSize * scaleOffset));
      setFontSize(newFontSize);
      
      if (last) {
        isPinchingRef.current = false;
        // Re-enable CSS transitions after pinch ends
        if (lyricsRef.current) {
          lyricsRef.current.style.transition = '';
        }
      }
    },
    {
      target: lyricsRef,
      eventOptions: { passive: false },
      scaleBounds: { min: 0.5, max: 3.0 },
      rubberband: true,
      pointer: { touch: true },
      enabled: !isEditing,
      threshold: 0,
    },
  );

  const toggleAutoScroll = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Remove focus after click to prevent purple overlay
    addTimeout(() => {
      e.currentTarget?.blur();
    }, 10);

    const speeds: Array<"off" | "slow" | "medium" | "fast"> = [
      "off",
      "slow",
      "medium",
      "fast",
    ];
    const currentIndex = speeds.indexOf(autoScrollSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];

    // Save the last speed when turning on auto-scroll
    if (newSpeed !== "off") {
      setLastScrollSpeed(newSpeed as "slow" | "medium" | "fast");
      setHasUserInteracted(true); // Mark that user has interacted
    }

    setAutoScrollSpeed(newSpeed);
    setIsScrollPaused(false); // Reset pause state when changing speed
  };

  const handleLyricsClick = () => {
    // In landscape mode, toggle controls visibility
    if (isLandscape) {
      setShowControlsInLandscape(!showControlsInLandscape);
      return;
    }

    // Portrait mode: handle auto-scroll pause/resume
    if (autoScrollSpeed === "off") return; // Do nothing if auto-scroll is off

    setHasUserInteracted(true); // Mark that user has interacted

    if (isScrollPaused) {
      // Resume scrolling at the last speed
      setAutoScrollSpeed(lastScrollSpeed);
      setIsScrollPaused(false);
    } else {
      // Pause scrolling but remember the current speed
      setLastScrollSpeed(autoScrollSpeed as "slow" | "medium" | "fast");
      setIsScrollPaused(true);
    }
  };


  if (!noteData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Note not found</h2>
          <Button onClick={() => navigate("/", { state: { activeTab: "notes" } })}>Go back to Notes</Button>
        </div>
      </div>
    );
  }

  // Prevent rendering if note is locked (check happens in useEffect, but also check here for immediate blocking)
  if (isLocked === true || (!isProLoading && !isPro && isNoteLocked(noteData.id, isPro))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">This note is locked</h2>
          <p className="text-muted-foreground mb-4">Upgrade to Pro to unlock all your notes</p>
          <Button onClick={() => navigate("/", { state: { activeTab: "notes" } })}>Go back to Notes</Button>
        </div>
      </div>
    );
  }

  // Show loading while checking Pro status
  if (isProLoading || isLocked === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - In landscape mode, only show when controls are toggled on */}
      {(!isLandscape || showControlsInLandscape) && (
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/50 safe-top safe-left safe-right px-4 pb-4 z-10">
          <div className="max-w-4xl mx-auto">
            {/* Back button and song title row */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  addTimeout(() => {
                    e.currentTarget?.blur();
                  }, 10);
                  // Check if there's a returnTo state (from bookmarks/folders)
                  const returnTo = location.state?.returnTo;
                  if (returnTo) {
                    // Navigate back to bookmarks with return state
                    navigate("/", { 
                      state: { 
                        activeTab: "bookmarks",
                        returnTo: {
                          showLikedSongs: returnTo.showLikedSongs,
                          selectedFolderId: returnTo.selectedFolderId,
                        }
                      } 
                    });
                  } else {
                    // Default: navigate to notes tab
                    navigate("/", { state: { activeTab: "notes" } });
                  }
                }}
                onBlur={(e) => e.target?.blur()}
                onFocus={(e) => e.target?.blur()}
                className="text-muted-foreground hover:text-foreground btn-no-focus"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>

              {/* Centered song title and artist */}
              <div className="text-center flex-1">
                <h1 className="text-xl font-bold text-foreground mb-1">
                  {noteData.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {noteData.artist}
                </p>
              </div>

              {/* Invisible spacer to balance the back button */}
              <div className="w-10"></div>
            </div>

            {/* Centered buttons - NO external music search icons or heart */}
            <div className="flex items-center justify-center gap-3">
              {/* Auto-scroller button - only show for Pro users */}
              {isPro && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAutoScroll}
                  onBlur={(e) => e.target?.blur()}
                  onFocus={(e) => e.target?.blur()}
                  className={`transition-smooth btn-no-focus ${
                    autoScrollSpeed === "off"
                      ? "text-muted-foreground hover:text-foreground"
                      : autoScrollSpeed === "slow"
                        ? hasUserInteracted && !isScrollPaused
                          ? "text-green-500 bg-green-500/10"
                          : "text-green-500 hover:text-green-600"
                        : autoScrollSpeed === "medium"
                          ? hasUserInteracted && !isScrollPaused
                            ? "text-yellow-500 bg-yellow-500/10"
                            : "text-yellow-500 hover:text-yellow-600"
                          : hasUserInteracted && !isScrollPaused
                            ? "text-red-500 bg-red-500/10"
                            : "text-red-500 hover:text-red-600"
                  }`}
                  title={`${t.autoScroll}: ${autoScrollSpeed}`}
                >
                  <Play
                    className={`w-4 h-4 ${autoScrollSpeed !== "off" && hasUserInteracted && !isScrollPaused ? "animate-pulse" : ""}`}
                  />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  addTimeout(() => {
                    e.currentTarget?.blur();
                  }, 10);
                  setIsBoldText(!isBoldText);
                }}
                onBlur={(e) => e.target?.blur()}
                onFocus={(e) => e.target?.blur()}
                className={`transition-smooth btn-no-focus ${
                  isBoldText
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Type className="w-4 h-4" />
              </Button>
              {isEditing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    addTimeout(() => {
                      e.currentTarget?.blur();
                    }, 10);
                    handleSaveEdit();
                  }}
                  onBlur={(e) => e.target?.blur()}
                  onFocus={(e) => e.target?.blur()}
                  disabled={isSaving}
                  className="transition-smooth btn-no-focus text-primary bg-primary/10"
                  title="Save"
                >
                  <Save className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    addTimeout(() => {
                      e.currentTarget?.blur();
                    }, 10);
                    toggleEdit();
                  }}
                  onBlur={(e) => e.target?.blur()}
                  onFocus={(e) => e.target?.blur()}
                  className="transition-smooth btn-no-focus text-muted-foreground hover:text-foreground"
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Note Content */}
      <div
        className={`max-w-4xl mx-auto safe-left safe-right safe-bottom px-4 pb-4 tablet-container ${isLandscape ? "pt-4" : ""}`}
        style={{ 
          position: 'relative', 
          touchAction: isLandscape ? 'pinch-zoom pan-y' : 'none'
        }}
      >
        <Card
          className={`${isLandscape ? "min-h-screen" : "min-h-[calc(100vh-140px)]"} bg-card/30 border-border/30 relative`}
          style={{
            touchAction: isLandscape ? 'pinch-zoom pan-y' : 'none'
          }}
        >
          <div
            ref={scrollContainerRef}
            className={`${isLandscape ? "h-screen" : "h-[calc(100vh-140px)]"} p-8 overflow-y-auto lyrics-scroll tablet-spacing`}
            style={{ 
              touchAction: 'pan-y pinch-zoom',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              pointerEvents: 'auto'
            }}
          >
            {isEditing ? (
              <textarea
                value={editedLyrics}
                onChange={(e) => setEditedLyrics(e.target.value)}
                className={`w-full p-0 bg-transparent border-none outline-none resize-none leading-relaxed transition-smooth lyrics-text ${
                  isBoldText ? "font-semibold" : "font-normal"
                } text-center`}
                style={{ 
                  fontSize: `${fontSize}px`,
                  fontFamily: 'inherit',
                  color: 'inherit',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  minHeight: '100%',
                  height: 'auto',
                  touchAction: 'auto',
                  WebkitUserSelect: 'text',
                  userSelect: 'text',
                  overflow: 'visible',
                  textAlign: 'center',
                  maxWidth: '100%',
                  overflowX: 'hidden',
                }}
                autoFocus
                rows={Math.max(10, editedLyrics.split('\n').length + 2)}
                spellCheck={false}
              />
            ) : noteData.lyrics ? (
              <div
                ref={lyricsRef}
                onClick={handleLyricsClick}
                className={`leading-relaxed transition-smooth cursor-pointer lyrics-touch-area lyrics-text text-center ${
                  isBoldText ? "font-semibold" : "font-normal"
                }`}
                style={{ 
                  fontSize: `${fontSize}px`,
                  touchAction: 'pinch-zoom pan-y',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  WebkitTouchCallout: 'none',
                  pointerEvents: 'auto',
                  position: 'relative',
                  zIndex: 1,
                  fontFamily: 'inherit',
                  textAlign: 'center',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word',
                  wordWrap: 'break-word',
                  maxWidth: '100%',
                  overflowX: 'hidden',
                }}
              >
                {noteData.lyrics}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 bg-muted/30 rounded-2xl mb-4">
                  <div className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">{t.noLyricsInNote}</h3>
                <p className="text-sm text-muted-foreground">
                  {t.noLyricsInNoteDescription}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default NoteDetailPage;
