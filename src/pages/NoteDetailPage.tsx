import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Type,
  Play,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNotes, UserNote } from "@/hooks/useNotes";
import { useSettings } from "@/contexts/SettingsContext";
import { usePinch } from "@use-gesture/react";
import { translations } from "@/lib/translations";

const NoteDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const noteData = location.state?.note as UserNote;
  const { settings } = useSettings();
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
  const [fontSize, setFontSize] = useState(() => {
    // Larger default font size for tablets
    if (window.innerWidth >= 1024) return 24; // Large tablets
    if (window.innerWidth >= 768) return 22;  // Small tablets
    return 18; // Phones
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);

  const scrollSpeeds = {
    off: 0,
    slow: 7.5,
    medium: 15,
    fast: 30,
  };

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerHeight < window.innerWidth);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  useEffect(() => {
    if (
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

  const toggleAutoScroll = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Remove focus after click to prevent purple overlay
    setTimeout(() => {
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
          <Button onClick={() => navigate("/")}>Go back to Notes</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Hide in landscape mode */}
      {!isLandscape && (
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/50 safe-top safe-left safe-right px-4 pb-4">
          <div className="max-w-4xl mx-auto">
            {/* Back button and song title row */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  setTimeout(() => {
                    e.currentTarget?.blur();
                  }, 10);
                  navigate("/");
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
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  setTimeout(() => {
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
            </div>
          </div>
        </div>
      )}

      {/* Note Content */}
      <div
        className={`max-w-4xl mx-auto safe-left safe-right safe-bottom px-4 pb-4 tablet-container ${isLandscape ? "pt-4" : ""}`}
      >
        <Card
          className={`${isLandscape ? "min-h-screen" : "min-h-[calc(100vh-140px)]"} bg-card/30 border-border/30 relative`}
        >
          <div
            ref={scrollContainerRef}
            className={`${isLandscape ? "h-screen" : "h-[calc(100vh-140px)]"} p-8 overflow-y-auto lyrics-scroll tablet-spacing`}
          >
            {noteData.lyrics ? (
              <div
                ref={lyricsRef}
                onClick={handleLyricsClick}
                className={`whitespace-pre-line leading-relaxed transition-smooth text-center cursor-pointer lyrics-touch-area lyrics-text ${
                  isBoldText ? "font-semibold" : "font-normal"
                }`}
                style={{ fontSize: `${fontSize}px` }}
              >
                {noteData.lyrics}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 bg-muted/30 rounded-2xl mb-4">
                  <div className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No lyrics available</h3>
                <p className="text-sm text-muted-foreground">
                  This note doesn't have any lyrics content.
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
