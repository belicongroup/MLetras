import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft, Type, Play } from "lucide-react";
import { Card } from "@/components/ui/card";

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
  const isLiked = location.state?.isLiked || false;
  const isLoadingLyrics = location.state?.isLoadingLyrics || false;
  
  const [isBoldText, setIsBoldText] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<'off' | 'slow' | 'medium' | 'fast'>('off');
  const [isScrollPaused, setIsScrollPaused] = useState(false);
  const [lastScrollSpeed, setLastScrollSpeed] = useState<'slow' | 'medium' | 'fast'>('slow');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const scrollSpeeds = {
    off: 0,
    slow: 30,
    medium: 60,
    fast: 120
  };

  useEffect(() => {
    if (autoScrollSpeed === 'off' || isScrollPaused || !scrollContainerRef.current) return;
    
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
  }, [autoScrollSpeed, isScrollPaused, songData?.lyrics]);

  const toggleAutoScroll = () => {
    const speeds: Array<'off' | 'slow' | 'medium' | 'fast'> = ['off', 'slow', 'medium', 'fast'];
    const currentIndex = speeds.indexOf(autoScrollSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    
    // Save the last speed when turning on auto-scroll
    if (newSpeed !== 'off') {
      setLastScrollSpeed(newSpeed as 'slow' | 'medium' | 'fast');
    }
    
    setAutoScrollSpeed(newSpeed);
    setIsScrollPaused(false); // Reset pause state when changing speed
  };

  const handleLyricsClick = () => {
    if (autoScrollSpeed === 'off') return; // Do nothing if auto-scroll is off
    
    if (isScrollPaused) {
      // Resume scrolling at the last speed
      setAutoScrollSpeed(lastScrollSpeed);
      setIsScrollPaused(false);
    } else {
      // Pause scrolling but remember the current speed
      setLastScrollSpeed(autoScrollSpeed as 'slow' | 'medium' | 'fast');
      setIsScrollPaused(true);
    }
  };

  const handleToggleLike = () => {
    // This would typically trigger a callback passed from the parent component
    // For now, we'll just navigate back
    console.log('Toggle like for song:', songData?.id);
  };

  if (!songData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No song data found</h2>
          <Button onClick={() => navigate('/')}>Go back to search</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/50 safe-top safe-left safe-right px-4 pb-4">
        <div className="flex items-start justify-between max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground mb-1">
                {songData.title}
              </h1>
              <p className="text-sm text-muted-foreground">{songData.artist}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAutoScroll}
              className={`transition-smooth ${
                autoScrollSpeed === 'off' 
                  ? "text-muted-foreground hover:text-foreground"
                  : autoScrollSpeed === 'slow'
                  ? "text-green-500 bg-green-500/10"
                  : autoScrollSpeed === 'medium'
                  ? "text-yellow-500 bg-yellow-500/10"
                  : "text-red-500 bg-red-500/10"
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
              onClick={handleToggleLike}
              className={`transition-smooth ${
                isLiked 
                  ? "text-primary hover:text-primary/80" 
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Lyrics Content */}
      <div className="max-w-4xl mx-auto safe-left safe-right safe-bottom px-4 pb-4">
        <Card className="min-h-[calc(100vh-140px)] bg-card/30 border-border/30">
          <div ref={scrollContainerRef} className="h-[calc(100vh-140px)] p-8 overflow-y-auto lyrics-scroll">
            {isLoadingLyrics ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 bg-primary/10 rounded-2xl mb-4">
                  <div className="w-8 h-8 text-primary animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
                <h3 className="font-semibold mb-2">Loading lyrics...</h3>
                <p className="text-sm text-muted-foreground">
                  Fetching lyrics from Genius
                </p>
              </div>
            ) : songData.lyrics ? (
              <div 
                onClick={handleLyricsClick}
                className={`whitespace-pre-line leading-relaxed transition-smooth text-center text-lg cursor-pointer ${
                  isBoldText ? "font-semibold" : "font-normal"
                }`}
              >
                {songData.lyrics}
              </div>
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
        </Card>
      </div>
    </div>
  );
};

export default LyricsPage;