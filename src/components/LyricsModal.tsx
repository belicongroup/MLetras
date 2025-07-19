import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, X, Type, RotateCcw, Loader2, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { usePinch } from "@use-gesture/react";

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

const LyricsModal = ({ song, isOpen, onClose, isLiked, onToggleLike, isLoadingLyrics }: LyricsModalProps) => {
  const [isBoldText, setIsBoldText] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<'off' | 'slow' | 'medium' | 'fast'>('off');
  const [fontSize, setFontSize] = useState(18); // Default font size
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  
  const scrollSpeeds = {
    off: 0,
    slow: 30,
    medium: 60,
    fast: 120
  };

  useEffect(() => {
    if (autoScrollSpeed === 'off' || !scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const speed = scrollSpeeds[autoScrollSpeed];
    
    const scroll = () => {
      container.scrollTop += 1;
      if (container.scrollTop >= container.scrollHeight - container.clientHeight) {
        container.scrollTop = 0; // Reset to top when reaching bottom
      }
    };
    
    const interval = setInterval(scroll, 1000 / speed);
    return () => clearInterval(interval);
  }, [autoScrollSpeed, song.lyrics]);

  const toggleAutoScroll = () => {
    const speeds: Array<'off' | 'slow' | 'medium' | 'fast'> = ['off', 'slow', 'medium', 'fast'];
    const currentIndex = speeds.indexOf(autoScrollSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setAutoScrollSpeed(speeds[nextIndex]);
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
    }
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95%] max-w-2xl h-[90vh] p-0 glass border-border/50" aria-describedby="lyrics-description">
        <div id="lyrics-description" className="sr-only">
          Song lyrics for {song.title} by {song.artist}
        </div>
        {/* Header */}
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <DialogTitle className="text-lg font-bold text-foreground mb-1">
                {song.title}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">{song.artist}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAutoScroll}
                className={`transition-smooth ${
                  autoScrollSpeed !== 'off' 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={`Auto-scroll: ${autoScrollSpeed}`}
              >
                <Play className={`w-4 h-4 ${autoScrollSpeed !== 'off' ? "animate-pulse" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsBoldText(!isBoldText)}
                className={`transition-smooth ${
                  isBoldText 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Type className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleLike}
                className={`transition-smooth ${
                  isLiked 
                    ? "text-primary hover:text-primary/80" 
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Lyrics Content */}
        <div className="flex-1 overflow-hidden px-4 pb-4">
          <Card className="h-full bg-card/30 border-border/30 relative">
            <div ref={scrollContainerRef} className="h-full p-6 overflow-y-auto lyrics-scroll">
              {isLoadingLyrics ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="p-4 bg-primary/10 rounded-2xl mb-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  <h3 className="font-semibold mb-2">Loading lyrics...</h3>
                  <p className="text-sm text-muted-foreground">
                    Fetching lyrics from Genius
                  </p>
                </div>
              ) : song.lyrics ? (
                <div 
                  ref={lyricsRef}
                  className={`whitespace-pre-line leading-relaxed transition-smooth text-center lyrics-touch-area lyrics-text ${
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
                  <h3 className="font-semibold mb-2">Lyrics not available</h3>
                  <p className="text-sm text-muted-foreground">
                    We couldn't find the lyrics for this song.
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