import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Music2, Heart, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { geniusApi, Song } from "@/services/geniusApi";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { searchHistory, SearchHistoryItem } from "@/services/searchHistory";

// Swipeable History Item Component
const SwipeableHistoryItem = ({ 
  historyItem, 
  onSelect, 
  onLike, 
  onDelete, 
  isLiked 
}: { 
  historyItem: SearchHistoryItem & { hasLyrics: boolean }; 
  onSelect: () => void; 
  onLike: () => void; 
  onDelete: () => void; 
  isLiked: boolean;
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
              <h4 className="font-semibold text-foreground mb-1">{historyItem.title}</h4>
              <p className="text-sm text-muted-foreground">{historyItem.artist}</p>
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
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searchHistoryItems, setSearchHistoryItems] = useState<(SearchHistoryItem & { hasLyrics: boolean })[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { isLiked, toggleLike } = useLikedSongs();

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowHistory(true);
      return;
    }

    setIsSearching(true);
    setShowHistory(false);
    
    try {
      const results = await geniusApi.searchSongs(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
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
      searchQuery: searchQuery
    });

    // Navigate to lyrics page with song data
    navigate('/lyrics', {
      state: {
        song: { ...song, lyrics: 'Loading...' },
        isLiked: isLiked(song.id),
        isLoadingLyrics: true
      }
    });
    
    // Fetch lyrics and update the page
    try {
      const lyrics = await geniusApi.getSongLyrics(song.id, song);
      navigate('/lyrics', {
        state: {
          song: { ...song, lyrics },
          isLiked: isLiked(song.id),
          isLoadingLyrics: false
        }
      });
    } catch (error) {
      console.error('Failed to fetch lyrics:', error);
      navigate('/lyrics', {
        state: {
          song: { ...song, lyrics: 'Lyrics not available for this song.' },
          isLiked: isLiked(song.id),
          isLoadingLyrics: false
        }
      });
    }
  };

  const handleHistoryItemSelect = async (historyItem: SearchHistoryItem & { hasLyrics: boolean }) => {
    // Add to search history (update timestamp)
    await searchHistory.addToHistory({
      id: historyItem.id,
      title: historyItem.title,
      artist: historyItem.artist,
      imageUrl: historyItem.imageUrl,
      url: historyItem.url,
      timestamp: Date.now(),
      searchQuery: historyItem.searchQuery
    });

    // Navigate to lyrics page
    navigate('/lyrics', {
      state: {
        song: { 
          id: historyItem.id,
          title: historyItem.title,
          artist: historyItem.artist,
          imageUrl: historyItem.imageUrl,
          url: historyItem.url,
          lyrics: historyItem.hasLyrics ? 'Loading cached lyrics...' : 'Loading...'
        },
        isLiked: isLiked(historyItem.id),
        isLoadingLyrics: !historyItem.hasLyrics
      }
    });

    // If lyrics are cached, fetch them immediately
    if (historyItem.hasLyrics) {
      try {
        const lyrics = await geniusApi.getSongLyrics(historyItem.id);
        navigate('/lyrics', {
          state: {
            song: { 
              id: historyItem.id,
              title: historyItem.title,
              artist: historyItem.artist,
              imageUrl: historyItem.imageUrl,
              url: historyItem.url,
              lyrics
            },
            isLiked: isLiked(historyItem.id),
            isLoadingLyrics: false
          }
        });
      } catch (error) {
        console.error('Failed to fetch cached lyrics:', error);
      }
    }
  };

  const removeFromHistory = (songId: string) => {
    searchHistory.removeFromHistory(songId);
    setSearchHistoryItems(prev => prev.filter(item => item.id !== songId));
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
        console.error('Error loading search history:', error);
      }
    };

    loadHistory();
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);


  return (
    <div className="safe-area space-y-6">
      {/* Hero Section */}
      <div className="text-center py-8">
        <div className="inline-flex p-3 bg-gradient-primary rounded-2xl shadow-glow mb-4">
          <Music2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-mobile-hero mb-2">
          Find Your <span className="bg-gradient-primary bg-clip-text text-transparent">Lyrics</span>
        </h2>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <Input
          placeholder="Search by song title or artist..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 bg-card/50 border-border/50 focus:border-primary/50 transition-smooth"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Search History */}
      {showHistory && searchHistoryItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-mobile-title flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recent Searches
          </h3>
          {searchHistoryItems.slice(0, 10).map((historyItem) => (
            <SwipeableHistoryItem
              key={historyItem.id}
              historyItem={historyItem}
              onSelect={() => handleHistoryItemSelect(historyItem)}
              onLike={() => toggleLike({
                id: historyItem.id,
                title: historyItem.title,
                artist: historyItem.artist,
                imageUrl: historyItem.imageUrl,
                url: historyItem.url
              })}
              onDelete={() => removeFromHistory(historyItem.id)}
              isLiked={isLiked(historyItem.id)}
            />
          ))}
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-mobile-title">Search Results</h3>
          {searchResults.map((song) => (
            <Card key={song.id} className="glass border-border/50 hover:border-primary/30 transition-smooth">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => handleSongSelect(song)}
                  >
                    <h4 className="font-semibold text-foreground mb-1">{song.title}</h4>
                    <p className="text-sm text-muted-foreground">{song.artist}</p>
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
                    <Heart className={`w-5 h-5 ${isLiked(song.id) ? "fill-current" : ""}`} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty States */}
      {searchQuery && !isSearching && searchResults.length === 0 && (
        <div className="text-center py-8">
          <Music2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No lyrics found</h3>
          <p className="text-muted-foreground">
            Try searching for a different song or artist
          </p>
        </div>
      )}

      {showHistory && searchHistoryItems.length === 0 && (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No recent searches</h3>
          <p className="text-muted-foreground">
            Start searching for songs to build your history
          </p>
        </div>
      )}


    </div>
  );
};

export default SearchPage;