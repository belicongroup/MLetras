import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Heart,
  ArrowLeft,
  Type,
  Play,
  Music,
  ExternalLink,
} from "lucide-react";
import { lockScreenOrientation, unlockScreenOrientation, isCapacitorEnvironment } from "@/lib/capacitor";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { usePinch } from "@use-gesture/react";
import { translations } from "@/lib/translations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Song {
  id: string;
  title: string;
  artist: string;
  lyrics?: string;
}

const LyricsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const songData = location.state?.song as Song;
  const isLoadingLyrics = location.state?.isLoadingLyrics || false;
  const { isLiked, toggleLike } = useLikedSongs();
  const { settings } = useSettings();
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const t = translations[settings.language];

  const [isBoldText, setIsBoldText] = useState(settings.boldText);
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuItemsDisabled, setMenuItemsDisabled] = useState(true);
  const menuOpenTimeRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const timeoutIdsRef = useRef<NodeJS.Timeout[]>([]);

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

    // Handle screen orientation in Capacitor environment
    if (isCapacitorEnvironment()) {
      // Allow all orientations in mobile app
      lockScreenOrientation('any');
    }

    // Scroll to top when component mounts to ensure header is always visible
    // Use requestAnimationFrame to ensure DOM is ready
    const scrollToTop = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
        scrollContainerRef.current.scrollTo(0, 0);
      }
      // Also scroll window to top
      window.scrollTo(0, 0);
    };
    
    // Call immediately multiple times
    scrollToTop();
    scrollToTop();
    
    // Call again after a frame to ensure it works on Android
    requestAnimationFrame(() => {
      scrollToTop();
      // Multiple aggressive attempts for Android
      setTimeout(scrollToTop, 10);
      setTimeout(scrollToTop, 50);
      setTimeout(scrollToTop, 100);
      setTimeout(scrollToTop, 150);
    });

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
      
      // Unlock orientation when component unmounts
      if (isCapacitorEnvironment()) {
        unlockScreenOrientation();
      }
    };
  }, []);

  useEffect(() => {
    // Only allow auto-scroll for authenticated Pro users
    if (
      !isAuthenticated ||
      user?.subscription_type !== 'pro' ||
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

  // Scroll to top when a new song is loaded to ensure header is always visible
  useEffect(() => {
    if (scrollContainerRef.current && songData) {
      const scrollToTop = () => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
          scrollContainerRef.current.scrollTo(0, 0);
        }
        // Also scroll window to top for good measure
        window.scrollTo(0, 0);
      };
      
      // Call immediately multiple times
      scrollToTop();
      scrollToTop();
      
      // Call again after render to ensure it works on Android
      requestAnimationFrame(() => {
        scrollToTop();
        // Multiple aggressive attempts for Android
        setTimeout(scrollToTop, 10);
        setTimeout(scrollToTop, 50);
        setTimeout(scrollToTop, 100);
        setTimeout(scrollToTop, 150);
        setTimeout(scrollToTop, 300);
      });
    }
  }, [songData?.id]);

  // Pinch gesture handler for font size control
  usePinch(
    ({ offset: [scaleOffset] }) => {
      // Calculate new font size based on pinch scale
      // Base font size is 18px, scale range from 0.5 to 3.0
      const newFontSize = Math.max(12, Math.min(48, 18 * scaleOffset));
      setFontSize(newFontSize);
    },
    {
      target: scrollContainerRef,
      eventOptions: { passive: false },
      scaleBounds: { min: 0.5, max: 3.0 },
      rubberband: true,
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

  const handleToggleLike = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Remove focus after click to prevent purple overlay
    addTimeout(() => {
      e.currentTarget?.blur();
    }, 10);

    if (songData) {
      toggleLike(songData);
    }
  };

  const openStreamingService = (
    service: "spotify" | "apple" | "youtube" | "chords",
  ) => {
    if (!songData) return;

    // Prevent click if menu items are still disabled
    if (menuItemsDisabled) {
      if (process.env.NODE_ENV !== "production") {
        console.log("Menu items still disabled - prevented click");
      }
      return;
    }

    const searchQuery = encodeURIComponent(
      `${songData.title} ${songData.artist}`,
    );
    let url = "";

    switch (service) {
      case "spotify":
        url = `https://open.spotify.com/search/${searchQuery}`;
        break;
      case "apple":
        url = `https://music.apple.com/search?term=${searchQuery}`;
        break;
      case "youtube":
        url = `https://www.youtube.com/results?search_query=${searchQuery}`;
        break;
      case "chords": {
        const chordsQuery = encodeURIComponent(
          `${songData.title} ${songData.artist} acordes`,
        );
        url = `https://www.google.com/search?q=${chordsQuery}`;
        break;
      }
    }

    window.open(url, "_blank");
  };

  if (!songData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{t.noSongDataFound}</h2>
          <Button onClick={() => navigate("/")}>{t.goBackToSearch}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      {/* Header - In landscape mode, only show when controls are toggled on */}
      {(!isLandscape || showControlsInLandscape) && (
        <div className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-b border-border/50 safe-top safe-left safe-right px-4 pb-4 z-50 fixed top-0 left-0 right-0" style={{ pointerEvents: 'none', touchAction: 'none' }}>
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
                  navigate("/");
                }}
                onBlur={(e) => e.target?.blur()}
                onFocus={(e) => e.target?.blur()}
                className="text-muted-foreground hover:text-foreground btn-no-focus"
                style={{ pointerEvents: 'auto' }}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>

              {/* Centered song title and artist */}
              <div className="text-center flex-1">
                <h1 className="text-xl font-bold text-foreground mb-1">
                  {songData.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {songData.artist}
                </p>
              </div>

              {/* Invisible spacer to balance the back button */}
              <div className="w-10"></div>
            </div>

            {/* Centered buttons */}
            <div className="flex items-center justify-center gap-3">
              {/* Auto-scroller button - only show for Pro users */}
              {user?.subscription_type === 'pro' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAutoScroll}
                  onBlur={(e) => e.target?.blur()}
                  onFocus={(e) => e.target?.blur()}
                  style={{ pointerEvents: 'auto' }}
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
                style={{ pointerEvents: 'auto' }}
                className={`transition-smooth btn-no-focus ${
                  isBoldText
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Type className="w-4 h-4" />
              </Button>
              <DropdownMenu onOpenChange={(open) => {
                if (open) {
                  menuOpenTimeRef.current = Date.now();
                  setIsMenuOpen(true);
                  setMenuItemsDisabled(true);
                  // Enable menu items after 300ms
                  addTimeout(() => {
                    setMenuItemsDisabled(false);
                  }, 300);
                } else {
                  setIsMenuOpen(false);
                  setMenuItemsDisabled(true);
                }
              }}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onBlur={(e) => e.target?.blur()}
                    onFocus={(e) => e.target?.blur()}
                    style={{ pointerEvents: 'auto' }}
                    className="transition-smooth btn-no-focus text-muted-foreground hover:text-foreground"
                    title={t.listenOnStreamingServices}
                  >
                    <Music className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="center" 
                  className="w-48"
                  style={{ 
                    opacity: menuItemsDisabled ? 0.5 : 1,
                    pointerEvents: menuItemsDisabled ? 'none' : 'auto',
                    transition: 'opacity 0.3s ease'
                  }}
                >
                  <DropdownMenuItem
                    onClick={() => openStreamingService("spotify")}
                    className="flex items-center gap-2 cursor-pointer"
                    onPointerDown={(e) => {
                      const timeSinceOpen = Date.now() - menuOpenTimeRef.current;
                      if (timeSinceOpen < 1000) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    onTouchEnd={(e) => {
                      const timeSinceOpen = Date.now() - menuOpenTimeRef.current;
                      if (timeSinceOpen < 1000) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  >
                    <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-sm"></div>
                    </div>
                    <span>{t.spotify}</span>
                    <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openStreamingService("apple")}
                    className="flex items-center gap-2 cursor-pointer"
                    onPointerDown={(e) => {
                      const timeSinceOpen = Date.now() - menuOpenTimeRef.current;
                      if (timeSinceOpen < 1000) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    onTouchEnd={(e) => {
                      const timeSinceOpen = Date.now() - menuOpenTimeRef.current;
                      if (timeSinceOpen < 1000) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  >
                    <div className="w-4 h-4 bg-pink-500 rounded-sm flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-sm"></div>
                    </div>
                    <span>{t.appleMusic}</span>
                    <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openStreamingService("youtube")}
                    className="flex items-center gap-2 cursor-pointer"
                    onPointerDown={(e) => {
                      const timeSinceOpen = Date.now() - menuOpenTimeRef.current;
                      if (timeSinceOpen < 1000) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    onTouchEnd={(e) => {
                      const timeSinceOpen = Date.now() - menuOpenTimeRef.current;
                      if (timeSinceOpen < 1000) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  >
                    <div className="w-4 h-4 bg-red-500 rounded-sm flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-sm"></div>
                    </div>
                    <span>{t.youtube}</span>
                    <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openStreamingService("chords")}
                    className="flex items-center gap-2 cursor-pointer"
                    onPointerDown={(e) => {
                      const timeSinceOpen = Date.now() - menuOpenTimeRef.current;
                      if (timeSinceOpen < 1000) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    onTouchEnd={(e) => {
                      const timeSinceOpen = Date.now() - menuOpenTimeRef.current;
                      if (timeSinceOpen < 1000) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  >
                    <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-sm"></div>
                    </div>
                    <span>{t.searchForChords}</span>
                    <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleLike}
                onBlur={(e) => e.target?.blur()}
                onFocus={(e) => e.target?.blur()}
                style={{ pointerEvents: 'auto' }}
                className={`transition-smooth btn-no-focus ${
                  isLiked(songData?.id || "")
                    ? "text-primary hover:text-primary/80"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${isLiked(songData?.id || "") ? "fill-current" : ""}`}
                />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lyrics Content */}
      <div
        className={`flex-1 overflow-hidden ${
          isLandscape 
            ? showControlsInLandscape 
              ? 'lyrics-content-landscape-with-header' 
              : 'lyrics-content-landscape'
            : ''
        }`}
        style={{ 
          position: 'relative', 
          zIndex: 1,
          touchAction: 'none', // Prevent pinch-zoom and scrolling on main container
          marginTop: (!isLandscape || showControlsInLandscape) ? '160px' : '0',
          overflow: 'hidden', // Prevent any scrolling on this container
          overscrollBehavior: 'none' // Prevent overscroll
        }}
      >
        <div className="h-full max-w-4xl mx-auto safe-left safe-right safe-bottom px-4 pb-4 tablet-container">
          <div
            ref={scrollContainerRef}
            className="h-full p-8 overflow-y-auto lyrics-scroll tablet-spacing"
            style={{ 
              scrollbarGutter: 'stable',
              touchAction: isLandscape ? 'pinch-zoom pan-y' : 'pan-y pinch-zoom',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              position: 'relative',
              isolation: 'isolate',
              paddingTop: 'max(2rem, env(safe-area-inset-top))' // Ensure content doesn't scroll behind header
            }}
          >
            {isLoadingLyrics ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 bg-primary/10 rounded-2xl mb-4">
                  <div className="w-8 h-8 text-primary animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
                <h3 className="font-semibold mb-2">{t.loadingLyrics}</h3>
              </div>
            ) : songData.lyrics ? (
              <>
                <div
                  ref={lyricsRef}
                  onClick={handleLyricsClick}
                  className={`whitespace-pre-line leading-relaxed transition-smooth text-center cursor-pointer lyrics-touch-area lyrics-text ${
                    isBoldText ? "font-semibold" : "font-normal"
                  }`}
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {songData.lyrics}
                </div>
                {/* Musixmatch Attribution - Required by API Terms */}
                <div className="mt-8 mb-4 text-center">
                  <a
                    href="https://www.musixmatch.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block transition-opacity hover:opacity-80"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <img
                      src={theme === 'dark' 
                        ? '/musixmatch-attribution/Musixmatch-logo-brands-Black.png'
                        : '/musixmatch-attribution/Musixmatch-logo-brands-White.png'
                      }
                      alt="Lyrics powered by Musixmatch"
                      className="h-6 sm:h-7 mx-auto"
                    />
                  </a>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 bg-muted/30 rounded-2xl mb-4">
                  <div className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">Lyrics not available</h3>
                <p className="text-sm text-muted-foreground">
                  We couldn't find the lyrics for this song.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LyricsPage;
