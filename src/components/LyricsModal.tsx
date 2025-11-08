import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Heart,
  X,
  Type,
  RotateCcw,
  Loader2,
  Play,
  Music,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
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

interface LyricsModalProps {
  song: Song;
  isOpen: boolean;
  onClose: () => void;
  isLiked: boolean;
  onToggleLike: () => void;
  isLoadingLyrics?: boolean;
}

const LyricsModal = ({
  song,
  isOpen,
  onClose,
  isLiked,
  onToggleLike,
  isLoadingLyrics,
}: LyricsModalProps) => {
  const { settings } = useSettings();
  const { user } = useAuth();
  const t = translations[settings.language];
  const [isBoldText, setIsBoldText] = useState(settings.boldText);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<
    "off" | "slow" | "medium" | "fast"
  >(settings.autoScrollSpeed);
  const [fontSize, setFontSize] = useState(() => {
    // Larger default font size for tablets
    if (window.innerWidth >= 1024) return 24; // Large tablets
    if (window.innerWidth >= 768) return 22;  // Small tablets
    return 18; // Phones
  });
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);

  const scrollSpeeds = {
    off: 0,
    slow: 7.5,
    medium: 15,
    fast: 30,
  };

  useEffect(() => {
    if (
      autoScrollSpeed === "off" ||
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
  }, [autoScrollSpeed, hasUserInteracted]);

  // Update bold text state when settings change
  useEffect(() => {
    setIsBoldText(settings.boldText);
  }, [settings.boldText]);

  // Update auto-scroll speed when settings change
  useEffect(() => {
    setAutoScrollSpeed(settings.autoScrollSpeed);
  }, [settings.autoScrollSpeed]);

  const toggleAutoScroll = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Remove focus after click to prevent purple overlay
    setTimeout(() => {
      e.currentTarget.blur();
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

    if (newSpeed !== "off") {
      setHasUserInteracted(true); // Mark that user has interacted
    }

    setAutoScrollSpeed(newSpeed);
  };

  const openStreamingService = (
    service: "spotify" | "apple" | "youtube" | "chords",
  ) => {
    const searchQuery = encodeURIComponent(`${song.title} ${song.artist}`);
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
          `${song.title} ${song.artist} acordes`,
        );
        url = `https://www.google.com/search?q=${chordsQuery}`;
        break;
      }
    }

    window.open(url, "_blank");
  };

  // Pinch gesture handler for font size control
  usePinch(
    ({ offset: [scaleOffset] }) => {
      // Calculate new font size based on pinch scale
      // Base font size is 18px, scale range from 0.5 to 3.0
      const newFontSize = Math.max(12, Math.min(48, 18 * scaleOffset));
      setFontSize(newFontSize);
    },
    {
      target: lyricsRef,
      eventOptions: { passive: false },
      scaleBounds: { min: 0.5, max: 3.0 },
      rubberband: true,
    },
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-[95%] max-w-4xl h-[90vh] p-0 glass border-border/50 tablet-container"
        aria-describedby="lyrics-description"
      >
        <div id="lyrics-description" className="sr-only">
          Song lyrics for {song.title} by {song.artist}
        </div>
        {/* Header */}
        <DialogHeader className="p-4 pb-0">
          <div className="max-w-4xl mx-auto">
            {/* Close button and song title row */}
            <div className="flex items-center justify-between mb-4">
              {/* Invisible spacer to balance the close button */}
              <div className="w-10"></div>

              {/* Centered song title and artist */}
              <div className="text-center flex-1">
                <DialogTitle className="text-lg font-bold text-foreground mb-1">
                  {song.title}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">{song.artist}</p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  setTimeout(() => {
                    e.currentTarget.blur();
                  }, 10);
                  onClose();
                }}
                onBlur={(e) => e.target.blur()}
                onFocus={(e) => e.target.blur()}
                className="text-muted-foreground hover:text-foreground btn-no-focus"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Centered buttons */}
            <div className="flex items-center justify-center gap-3">
              {/* Auto-scroller button - only show for Pro users */}
              {user?.subscription_type === 'pro' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAutoScroll}
                  onBlur={(e) => e.target.blur()}
                  onFocus={(e) => e.target.blur()}
                  className={`transition-smooth btn-no-focus ${
                    autoScrollSpeed === "off"
                      ? "text-muted-foreground hover:text-foreground"
                      : autoScrollSpeed === "slow"
                        ? hasUserInteracted
                          ? "text-green-500 bg-green-500/10"
                          : "text-green-500 hover:text-green-600"
                        : autoScrollSpeed === "medium"
                          ? hasUserInteracted
                            ? "text-yellow-500 bg-yellow-500/10"
                            : "text-yellow-500 hover:text-yellow-600"
                          : hasUserInteracted
                            ? "text-red-500 bg-red-500/10"
                            : "text-red-500 hover:text-red-600"
                  }`}
                  title={`${t.autoScroll}: ${autoScrollSpeed}`}
                >
                  <Play
                    className={`w-4 h-4 ${autoScrollSpeed !== "off" && hasUserInteracted ? "animate-pulse" : ""}`}
                  />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  setTimeout(() => {
                    e.currentTarget.blur();
                  }, 10);
                  setIsBoldText(!isBoldText);
                }}
                onBlur={(e) => e.target.blur()}
                onFocus={(e) => e.target.blur()}
                className={`transition-smooth btn-no-focus ${
                  isBoldText
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Type className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onBlur={(e) => e.target.blur()}
                    onFocus={(e) => e.target.blur()}
                    className="transition-smooth btn-no-focus text-muted-foreground hover:text-foreground"
                    title={t.listenOnStreamingServices}
                  >
                    <Music className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48">
                  <DropdownMenuItem
                    onClick={() => openStreamingService("spotify")}
                    className="flex items-center gap-2 cursor-pointer"
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
                onClick={(e) => {
                  setTimeout(() => {
                    e.currentTarget.blur();
                  }, 10);
                  onToggleLike();
                }}
                onBlur={(e) => e.target.blur()}
                onFocus={(e) => e.target.blur()}
                className={`transition-smooth btn-no-focus ${
                  isLiked
                    ? "text-primary hover:text-primary/80"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Lyrics Content */}
        <div className="flex-1 overflow-hidden px-4 pb-4" style={{ 
          touchAction: 'none',
          overflow: 'hidden',
          overscrollBehavior: 'none'
        }}>
          <Card className="h-full bg-card/30 border-border/30 relative">
            <div
              ref={scrollContainerRef}
              className="h-full p-6 overflow-y-auto lyrics-scroll tablet-spacing"
              style={{ 
                paddingTop: 'max(1.5rem, env(safe-area-inset-top))' // Ensure content doesn't scroll behind header
              }}
            >
              {isLoadingLyrics ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="p-4 bg-primary/10 rounded-2xl mb-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  <h3 className="font-semibold mb-2">{t.loadingLyrics}</h3>
                </div>
              ) : song.lyrics ? (
                <div
                  ref={lyricsRef}
                  onClick={() => {
                    if (autoScrollSpeed !== "off") {
                      setHasUserInteracted(true);
                    }
                  }}
                  className={`whitespace-pre-line leading-relaxed transition-smooth text-center lyrics-touch-area lyrics-text cursor-pointer ${
                    isBoldText ? "font-semibold" : "font-normal"
                  }`}
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {song.lyrics}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="p-4 bg-muted/30 rounded-2xl mb-4">
                    <RotateCcw className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">{t.lyricsNotAvailable}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.lyricsNotAvailableSubtitle}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LyricsModal;
