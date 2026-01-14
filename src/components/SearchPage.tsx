import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import { Capacitor } from "@capacitor/core";
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
import { useProStatus } from "@/hooks/useProStatus";

// Swipeable History Item Component (memoized for performance)
const SwipeableHistoryItem = memo(({
  historyItem,
  onSelect,
  onLike,
  onDelete,
  isLiked,
  deleteText,
  isPro,
}: {
  historyItem: SearchHistoryItem & { hasLyrics: boolean };
  onSelect: () => void;
  onLike: () => void;
  onDelete: () => void;
  isLiked: boolean;
  deleteText: string;
  isPro: boolean;
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
            {isPro && (
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
            )}
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
  const { isPro } = useProStatus();
  const { isLiked, toggleLike } = useLikedSongs({
    isPro,
    // SearchPage doesn't have upgrade modal, so we'll just prevent the action
    onLimitReached: () => {
      // Could show a toast or console warning
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Song limit reached');
      }
    }
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const allowBlurRef = useRef(false);
  const isProgrammaticFocus = useRef(false);
  const enableSearchDebug =
    typeof import.meta !== "undefined" &&
    (import.meta.env?.VITE_ENABLE_SEARCH_DEBUG === "true" ||
      import.meta.env?.VITE_ENABLE_SEARCH_DEBUG === true);

  const emitDebugLog = useCallback(
    (message: string) => {
      if (!enableSearchDebug) {
        return;
      }

      const detail = `[SearchDebug] ${message}`;
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("search-debug-log", {
            detail,
          }),
        );
      }

      if (process.env.NODE_ENV !== 'production') {
        console.debug(detail);
      }
    },
    [enableSearchDebug],
  );
  const isIOSApp = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    let platform = "web";

    try {
      platform = Capacitor.getPlatform();
    } catch (error) {
      // Capacitor not available (web build)
    }

    if (platform === "ios") {
      return true;
    }

    if (platform === "web") {
      return /iPad|iPhone|iPod/.test(navigator.userAgent);
    }

    return false;
  }, []);
  
  // Handle outside taps to dismiss keyboard (no auto-blur on scroll)
  // Do not force blur on outside taps; rely on explicit user actions instead.

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
      const results = await musixmatchApi.searchSongs(query);
      setSearchResults(results);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Search failed:", error);
      }
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search to prevent excessive API calls
  const debouncedSearch = useMemo(
    () => debounce(handleSearch, 300), // Reduced from 500ms to 300ms for faster real-time search
    [debounce, handleSearch]
  );

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
    setShowHistory(true);
  };

  const handleSongSelect = async (song: Song) => {
    allowBlurRef.current = true;
    emitDebugLog(`song selected (${song.title}) – allowing blur`);
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
      if (process.env.NODE_ENV !== 'production') {
        console.error("Failed to fetch lyrics:", error);
      }
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
    allowBlurRef.current = true;
    emitDebugLog(
      `history item selected (${historyItem.title}) – allowing blur`,
    );
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
      if (process.env.NODE_ENV !== 'production') {
        console.error("Failed to fetch lyrics:", error);
      }
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
      emitDebugLog(`query changed "${searchQuery}" – run debounced search`);
      debouncedSearch(searchQuery);
    } else {
      emitDebugLog("query cleared – showing history");
      setSearchResults([]);
      setShowHistory(true);
      setHasSearched(false);
    }
  }, [searchQuery, debouncedSearch, emitDebugLog]);

  useEffect(() => {
    if (!enableSearchDebug) {
      return;
    }

    const handleDocumentFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      emitDebugLog(
        `document focusin target=${target?.tagName ?? "null"} class=${target?.className ?? ""}`,
      );
    };

    const handleDocumentFocusOut = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      emitDebugLog(
        `document focusout target=${target?.tagName ?? "null"} relatedTarget=${(event.relatedTarget as HTMLElement | null)?.tagName ?? "null"}`,
      );
    };

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      emitDebugLog(
        `document pointerdown target=${target?.tagName ?? "null"} class=${target?.className ?? ""}`,
      );
    };

    const handleDocumentTouchStart = (event: TouchEvent) => {
      const target = event.target as HTMLElement | null;
      emitDebugLog(
        `document touchstart target=${target?.tagName ?? "null"} class=${target?.className ?? ""}`,
      );
    };

    document.addEventListener("focusin", handleDocumentFocusIn);
    document.addEventListener("focusout", handleDocumentFocusOut);
    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    document.addEventListener("touchstart", handleDocumentTouchStart, true);

    return () => {
      document.removeEventListener("focusin", handleDocumentFocusIn);
      document.removeEventListener("focusout", handleDocumentFocusOut);
      document.removeEventListener(
        "pointerdown",
        handleDocumentPointerDown,
        true,
      );
      document.removeEventListener(
        "touchstart",
        handleDocumentTouchStart,
        true,
      );
    };
  }, [enableSearchDebug, emitDebugLog]);

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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // When form is submitted (e.g., "Done" button on iOS keyboard),
            // explicitly allow blur to prevent refocus
            allowBlurRef.current = true;
            emitDebugLog("form onSubmit (likely Done button) – allowing blur");
            handleSearch(searchQuery);
            searchInputRef.current?.blur();
          }}
        >
          <Input
            ref={searchInputRef}
            placeholder="Search by song title, artist, or lyrics"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-search-debug-input={enableSearchDebug ? "true" : undefined}
            onPointerDown={(event) => {
              if (enableSearchDebug) {
                emitDebugLog(
                  `input pointerdown button=${event.button} pointerType=${event.pointerType}`,
                );
              }
            }}
            onTouchStart={(event) => {
              if (enableSearchDebug) {
                emitDebugLog(
                  `input touchstart touches=${event.touches.length}`,
                );
              }
            }}
            onFocus={() => {
              emitDebugLog("input focus");
              if (isProgrammaticFocus.current) {
                isProgrammaticFocus.current = false;
                return;
              }
              allowBlurRef.current = false;
            }}
            onBlur={(e) => {
              const relatedTarget = e.relatedTarget as HTMLElement | null;
              const activeElement = document.activeElement as HTMLElement | null;
              const isBlurringToBody = !relatedTarget || 
                relatedTarget === document.body || 
                relatedTarget.tagName === 'HTML' ||
                (!activeElement || activeElement === document.body || activeElement.tagName === 'HTML');
              
              emitDebugLog(
                `input blur (allowBlur=${allowBlurRef.current}, isIOS=${isIOSApp}, relatedTarget=${relatedTarget?.tagName ?? "null"}, activeElement=${activeElement?.tagName ?? "null"}, isBlurringToBody=${isBlurringToBody})`,
              );
              
              // On iOS, if blurring to body/document (intentional dismissal like "Done"),
              // or if allowBlur is explicitly set, allow the blur
              if (isIOSApp && !allowBlurRef.current) {
                // Check if this is an intentional dismissal (blurring to body/document)
                if (isBlurringToBody) {
                  // This looks like intentional keyboard dismissal (e.g., "Done" button)
                  allowBlurRef.current = true;
                  emitDebugLog("blur to body detected – allowing intentional dismissal");
                  return; // Allow the blur
                }
                // Otherwise, it might be accidental blur, so refocus
                requestAnimationFrame(() => {
                  isProgrammaticFocus.current = true;
                  searchInputRef.current?.focus();
                  emitDebugLog("refocusing input after unexpected blur");
                });
              } else {
                allowBlurRef.current = false;
                emitDebugLog("blur permitted – state reset");
              }
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                allowBlurRef.current = true;
                emitDebugLog("Enter key pressed – allowing blur");
                handleSearch(searchQuery);
                searchInputRef.current?.blur();
              }
            }}
            className="pr-12 h-12 bg-card/50 border-border/50 focus:border-primary/50 transition-smooth"
            autoCapitalize="sentences"
            autoComplete="on"
            autoCorrect="on"
            dir="auto"
            spellCheck={true}
          />
        </form>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Set allowBlur BEFORE blur happens to prevent iOS refocus
            allowBlurRef.current = true;
            emitDebugLog("done button mousedown – allowing blur");
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Set allowBlur BEFORE blur happens to prevent iOS refocus
            allowBlurRef.current = true;
            emitDebugLog("done button touchstart – allowing blur");
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (searchResults.length > 0 || hasSearched) {
              clearSearch();
            }
            // Dismiss keyboard when button is clicked
            emitDebugLog("done button clicked – blurring input");
            // Use requestAnimationFrame to ensure blur happens after click event completes
            requestAnimationFrame(() => {
              searchInputRef.current?.blur();
              // Also blur any active element as a fallback
              if (document.activeElement && document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
              }
            });
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
              isPro={isPro}
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
                  {isPro && (
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
                  )}
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
