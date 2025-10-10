import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Music2, Heart, Clock, X } from "lucide-react";
import { translations } from "@/lib/translations";
import { useSettings } from "@/contexts/SettingsContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { musixmatchApi, Song } from "@/services/musixmatchApi";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { searchHistory, SearchHistoryItem } from "@/services/searchHistory";
import { usePerformanceOptimizations } from "@/hooks/usePerformanceOptimizations";

// Swipeable History Item Component (memoized for performance)
const SwipeableHistoryItem = memo(({
  historyItem,
  onSelect,
  onLike,
  onDelete,
  isLiked,
  deleteText,
}: {
  historyItem: SearchHistoryItem & { hasLyrics: boolean };
  onSelect: () => void;
  onLike: () => void;
  onDelete: () => void;
  isLiked: boolean;
  deleteText: string;
}) => {
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
    const diff = touchStartX - touchCurrentX;
    if (diff < 50) {
      setShowDeleteButton(false);
    }
    setTouchStartX(0);
    setTouchCurrentX(0);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
    setShowDeleteButton(false);
  };

  return (
    <div className="relative overflow-hidden">
      <Card
        className="glass border-border/50 hover:border-primary/30 transition-smooth"
        onClick={onSelect}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 cursor-pointer">
              <h4 className="font-semibold text-foreground mb-1">
                {historyItem.title}
              </h4>
              <p className="text-sm text-muted-foreground">
                {historyItem.artist}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onLike();
              }}
              className={`transition-smooth ${
                isLiked
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
            </Button>
          </div>
        </CardContent>
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
});

const SearchPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const t = translations[settings.language];
  const { debounce } = usePerformanceOptimizations();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistoryItems, setSearchHistoryItems] = useState<
    (SearchHistoryItem & { hasLyrics: boolean })[]
  >([]);
  const [showHistory, setShowHistory] = useState(true);
  const { isLiked, toggleLike } = useLikedSongs();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Handle scroll to dismiss keyboard
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout | null = null;
    
    const handleScroll = () => {
      // Clear any existing timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // Debounce the blur to avoid too many calls
      scrollTimeout = setTimeout(() => {
        // Blur the search input when user scrolls
        if (searchInputRef.current && document.activeElement === searchInputRef.current) {
          searchInputRef.current.blur();
        }
      }, 50);
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Only dismiss keyboard if user is touching outside the search input
      if (searchInputRef.current && 
          document.activeElement === searchInputRef.current &&
          e.target !== searchInputRef.current) {
        searchInputRef.current.blur();
      }
    };

    // Listen for scroll on both window and parent container
    const container = containerRef.current?.parentElement;
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
    }
    
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
        container.removeEventListener('touchstart', handleTouchStart);
      }
    };
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowHistory(true);
      return;
    }

    // Only search if query is at least 3 characters to reduce API calls
    if (query.trim().length < 3) {
      setSearchResults([]);
      setShowHistory(true);
      return;
    }

    setIsSearching(true);
    setShowHistory(false);
    setHasSearched(true);

    try {
      // Run both searches in parallel
      const [titleResults, lyricsResults] = await Promise.all([
        musixmatchApi.searchSongs(query),
        musixmatchApi.searchCachedLyricsSilent(query)
      ]);

      // Merge results, removing duplicates by title+artist
      const mergedResults = [...titleResults];
      const existingKeys = new Set(
        titleResults.map(s => `${s.title.toLowerCase()}-${s.artist.toLowerCase()}`)
      );

      for (const lyricResult of lyricsResults) {
        const key = `${lyricResult.title.toLowerCase()}-${lyricResult.artist.toLowerCase()}`;
        if (!existingKeys.has(key)) {
          mergedResults.push(lyricResult);
        }
      }

      setSearchResults(mergedResults);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search to prevent excessive API calls
  const debouncedSearch = useMemo(
    () => debounce(handleSearch, 500),
    [debounce, handleSearch]
  );

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
    setShowHistory(true);
  };

  const handleSongSelect = async (song: Song) => {
    // Add to search history
    await searchHistory.addToHistory({
      id: song.id,
      title: song.title,
      artist: song.artist,
      imageUrl: song.imageUrl,
      url: song.url,
      timestamp: Date.now(),
      searchQuery: searchQuery,
    });

    // Navigate to lyrics page with song data
    navigate("/lyrics", {
      state: {
        song: { ...song, lyrics: "Loading..." },
        isLiked: isLiked(song.id),
        isLoadingLyrics: true,
      },
    });

    // Fetch lyrics and update the page
    try {
      const lyrics = await musixmatchApi.getSongLyrics(song.id, song);
      navigate("/lyrics", {
        state: {
          song: { ...song, lyrics },
          isLiked: isLiked(song.id),
          isLoadingLyrics: false,
        },
      });
    } catch (error) {
      console.error("Failed to fetch lyrics:", error);
      navigate("/lyrics", {
        state: {
          song: { ...song, lyrics: "Lyrics not available for this song." },
          isLiked: isLiked(song.id),
          isLoadingLyrics: false,
        },
      });
    }
  };

  const handleHistoryItemSelect = async (
    historyItem: SearchHistoryItem & { hasLyrics: boolean },
  ) => {
    // Add to search history (update timestamp)
    await searchHistory.addToHistory({
      id: historyItem.id,
      title: historyItem.title,
      artist: historyItem.artist,
      imageUrl: historyItem.imageUrl,
      url: historyItem.url,
      timestamp: Date.now(),
      searchQuery: historyItem.searchQuery,
    });

    // Navigate to lyrics page with loading state
    navigate("/lyrics", {
      state: {
        song: {
          id: historyItem.id,
          title: historyItem.title,
          artist: historyItem.artist,
          imageUrl: historyItem.imageUrl,
          url: historyItem.url,
          lyrics: "Loading...",
        },
        isLiked: isLiked(historyItem.id),
        isLoadingLyrics: true,
      },
    });

    // Always fetch lyrics from API (no caching per MusixMatch terms)
    try {
      const lyrics = await musixmatchApi.getSongLyrics(historyItem.id, {
        id: historyItem.id,
        title: historyItem.title,
        artist: historyItem.artist,
        imageUrl: historyItem.imageUrl,
        url: historyItem.url,
      });
      navigate("/lyrics", {
        state: {
          song: {
            id: historyItem.id,
            title: historyItem.title,
            artist: historyItem.artist,
            imageUrl: historyItem.imageUrl,
            url: historyItem.url,
            lyrics,
          },
          isLiked: isLiked(historyItem.id),
          isLoadingLyrics: false,
        },
      });
    } catch (error) {
      console.error("Failed to fetch lyrics:", error);
      navigate("/lyrics", {
        state: {
          song: {
            id: historyItem.id,
            title: historyItem.title,
            artist: historyItem.artist,
            imageUrl: historyItem.imageUrl,
            url: historyItem.url,
            lyrics: "Lyrics not available for this song.",
          },
          isLiked: isLiked(historyItem.id),
          isLoadingLyrics: false,
        },
      });
    }
  };

  const removeFromHistory = (songId: string) => {
    searchHistory.removeFromHistory(songId);
    setSearchHistoryItems((prev) => prev.filter((item) => item.id !== songId));
  };

  const clearHistory = () => {
    searchHistory.clearHistory();
    setSearchHistoryItems([]);
  };

  // Load search history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await searchHistory.getHistoryWithCachedLyrics();
        setSearchHistoryItems(history);
      } catch (error) {
        console.error("Error loading search history:", error);
      }
    };

    loadHistory();
  }, []);

  // Trigger debounced search when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      debouncedSearch(searchQuery);
    } else {
      setSearchResults([]);
      setShowHistory(true);
      setHasSearched(false);
    }
  }, [searchQuery, debouncedSearch]);

  // Debounced search automatically triggers as user types

  return (
    <div ref={containerRef} className="safe-area space-y-6 tablet-container">
      {/* Hero Section */}
      <div className="text-center py-8">
        <div className="inline-flex p-3 bg-gradient-primary rounded-2xl shadow-glow mb-4">
          <Music2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-mobile-hero mb-2">
          {t.findYourLyrics.split(" ").map((word, index) =>
            word === "Lyrics" ? (
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

      {/* Search Bar */}
      <div className="relative">
        <Input
          ref={searchInputRef}
          placeholder="Search by song title, artist, or lyrics"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch(searchQuery);
              searchInputRef.current?.blur();
            }
          }}
          className="pr-12 h-12 bg-card/50 border-border/50 focus:border-primary/50 transition-smooth"
          autoCapitalize="sentences"
          autoComplete="on"
          autoCorrect="on"
          dir="auto"
          rows={1}
          spellCheck={true}
        />
        <button
          onClick={() => {
            if (searchResults.length > 0 || hasSearched) {
              clearSearch();
            }
          }}
          disabled={isSearching}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSearching ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : searchResults.length > 0 ? (
            <X className="w-5 h-5" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Search History */}
      {showHistory && searchHistoryItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-mobile-title flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {t.recentSearches}
          </h3>
          {searchHistoryItems.slice(0, 10).map((historyItem) => (
            <SwipeableHistoryItem
              key={historyItem.id}
              historyItem={historyItem}
              onSelect={() => handleHistoryItemSelect(historyItem)}
              onLike={() =>
                toggleLike({
                  id: historyItem.id,
                  title: historyItem.title,
                  artist: historyItem.artist,
                  imageUrl: historyItem.imageUrl,
                  url: historyItem.url,
                })
              }
              onDelete={() => removeFromHistory(historyItem.id)}
              isLiked={isLiked(historyItem.id)}
              deleteText={t.delete}
            />
          ))}
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-mobile-title">{t.searchResults}</h3>
          {searchResults.map((song) => (
            <Card
              key={song.id}
              className="glass border-border/50 hover:border-primary/30 transition-smooth"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleSongSelect(song)}
                  >
                    <h4 className="font-semibold text-foreground mb-1">
                      {song.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {song.artist}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLike(song)}
                    className={`ml-3 transition-smooth ${
                      isLiked(song.id)
                        ? "text-primary hover:text-primary/80"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <Heart
                      className={`w-5 h-5 ${isLiked(song.id) ? "fill-current" : ""}`}
                    />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results Found */}
      {hasSearched && !isSearching && searchResults.length === 0 && (
        <div className="text-center py-8">
          <Music2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t.noLyricsFound}</h3>
          <p className="text-muted-foreground">{t.noLyricsFoundSubtitle}</p>
        </div>
      )}

      {showHistory && searchHistoryItems.length === 0 && (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t.noRecentSearches}</h3>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
