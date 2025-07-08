import { useState, useEffect } from "react";
import { Search, Loader2, Music2, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LyricsModal from "@/components/LyricsModal";

interface Song {
  id: string;
  title: string;
  artist: string;
  lyrics?: string;
}

// Mock data for demo - in real app would connect to lyrics API
const mockSongs: Song[] = [
  {
    id: "1",
    title: "Imagine",
    artist: "John Lennon",
    lyrics: `Imagine there's no heaven
It's easy if you try
No hell below us
Above us only sky
Imagine all the people living for today

Imagine there's no countries
It isn't hard to do
Nothing to kill or die for
And no religion too
Imagine all the people living life in peace

You may say I'm a dreamer
But I'm not the only one
I hope someday you'll join us
And the world will be as one

Imagine no possessions
I wonder if you can
No need for greed or hunger
A brotherhood of man
Imagine all the people sharing all the world

You may say I'm a dreamer
But I'm not the only one
I hope someday you'll join us
And the world will be as one`
  },
  {
    id: "2", 
    title: "Bohemian Rhapsody",
    artist: "Queen",
    lyrics: `Is this the real life?
Is this just fantasy?
Caught in a landslide
No escape from reality
Open your eyes
Look up to the skies and see
I'm just a poor boy, I need no sympathy
Because I'm easy come, easy go
Little high, little low
Any way the wind blows doesn't really matter to me, to me

Mama, just killed a man
Put a gun against his head
Pulled my trigger, now he's dead
Mama, life had just begun
But now I've gone and thrown it all away

Mama, ooh
Didn't mean to make you cry
If I'm not back again this time tomorrow
Carry on, carry on as if nothing really matters`
  },
  {
    id: "3",
    title: "Hotel California", 
    artist: "Eagles",
    lyrics: `On a dark desert highway, cool wind in my hair
Warm smell of colitas, rising up through the air
Up ahead in the distance, I saw a shimmering light
My head grew heavy and my sight grew dim
I had to stop for the night

There she stood in the doorway
I heard the mission bell
And I was thinking to myself
"This could be Heaven or this could be Hell"
Then she lit up a candle and she showed me the way
There were voices down the corridor
I thought I heard them say

Welcome to the Hotel California
Such a lovely place (Such a lovely place)
Such a lovely face
Plenty of room at the Hotel California
Any time of year (Any time of year)
You can find it here`
  }
];

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set());

  // Mock search function
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const results = mockSongs.filter(song => 
      song.title.toLowerCase().includes(query.toLowerCase()) ||
      song.artist.toLowerCase().includes(query.toLowerCase())
    );
    
    setSearchResults(results);
    setIsSearching(false);
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const toggleLike = (songId: string) => {
    const newLikedSongs = new Set(likedSongs);
    if (newLikedSongs.has(songId)) {
      newLikedSongs.delete(songId);
    } else {
      newLikedSongs.add(songId);
    }
    setLikedSongs(newLikedSongs);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Hero Section */}
      <div className="text-center py-8">
        <div className="inline-flex p-3 bg-gradient-primary rounded-2xl shadow-glow mb-4">
          <Music2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-mobile-hero mb-2">
          Find Your <span className="bg-gradient-primary bg-clip-text text-transparent">Lyrics</span>
        </h2>
        <p className="text-muted-foreground">
          Search for your favorite songs and discover their lyrics
        </p>
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
                    onClick={() => setSelectedSong(song)}
                  >
                    <h4 className="font-semibold text-foreground mb-1">{song.title}</h4>
                    <p className="text-sm text-muted-foreground">{song.artist}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLike(song.id)}
                    className={`ml-3 transition-smooth ${
                      likedSongs.has(song.id) 
                        ? "text-primary hover:text-primary/80" 
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${likedSongs.has(song.id) ? "fill-current" : ""}`} />
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

      {/* Lyrics Modal */}
      {selectedSong && (
        <LyricsModal
          song={selectedSong}
          isOpen={!!selectedSong}
          onClose={() => setSelectedSong(null)}
          isLiked={likedSongs.has(selectedSong.id)}
          onToggleLike={() => toggleLike(selectedSong.id)}
        />
      )}
    </div>
  );
};

export default SearchPage;