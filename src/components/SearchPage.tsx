import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Music2, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { geniusApi, Song } from "@/services/geniusApi";
import { useLikedSongs } from "@/hooks/useLikedSongs";

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const { isLiked, toggleLike } = useLikedSongs();

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
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
      const lyrics = await geniusApi.getSongLyrics(song.id);
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

      {!searchQuery && (
        <div className="text-center py-8">
          <div className="inline-flex p-4 bg-muted/30 rounded-2xl mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Start Your Search</h3>
          <p className="text-muted-foreground">
            Enter a song title or artist name to find lyrics
          </p>
        </div>
      )}

    </div>
  );
};

export default SearchPage;