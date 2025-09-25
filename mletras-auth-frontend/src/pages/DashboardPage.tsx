import { useState, useEffect } from 'react';
import { Search, LogOut, User, Crown, Music, X, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { useLyrics } from '../hooks/useLyrics';
import { Song } from '../types';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const {
    searchResults,
    currentLyrics,
    isLoading,
    isSearching,
    error,
    searchSongs,
    getLyrics,
    clearResults,
    clearError
  } = useLyrics();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setHasSearched(true);
    clearError();
    await searchSongs(searchQuery);
  };

  const handleSongSelect = async (song: Song) => {
    setSelectedSong(song);
    await getLyrics(song.track_id);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedSong(null);
    setHasSearched(false);
    clearResults();
    clearError();
  };

  const handleLogout = async () => {
    await logout();
  };

  // Auto-redirect after successful auth
  useEffect(() => {
    if (user) {
      // User is authenticated, we're good to go
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Music className="h-8 w-8 text-primary-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">MLetras</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* User info */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-gray-100">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-700">{user.email}</span>
                </div>
                {user.subscription_type === 'pro' && (
                  <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-yellow-100">
                    <Crown className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs text-yellow-700 font-medium">PRO</span>
                  </div>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-1"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Search Section */}
          <div className="space-y-6">
            {/* Search Form */}
            <Card>
              <CardHeader>
                <CardTitle>Search for Lyrics</CardTitle>
                <CardDescription>
                  Find songs and view their lyrics instantly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for songs..."
                        className="pr-10"
                      />
                      {searchResults.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearSearch}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <Button
                      type="submit"
                      loading={isSearching}
                      disabled={!searchQuery.trim() || isSearching}
                    >
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Search Results */}
            {hasSearched && (
              <Card>
                <CardHeader>
                  <CardTitle>Search Results</CardTitle>
                  <CardDescription>
                    {searchResults.length > 0 
                      ? `Found ${searchResults.length} song${searchResults.length === 1 ? '' : 's'}`
                      : 'No songs found'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {searchResults.length > 0 ? (
                    <div className="space-y-2">
                      {searchResults.map((song) => (
                        <button
                          key={song.track_id}
                          onClick={() => handleSongSelect(song)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedSong?.track_id === song.track_id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{song.track_name}</div>
                          <div className="text-sm text-gray-600">{song.artist_name}</div>
                          {song.album_name && (
                            <div className="text-xs text-gray-500">{song.album_name}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Music className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No songs found for "{searchQuery}"</p>
                      <p className="text-sm">Try a different search term</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Lyrics Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lyrics</CardTitle>
                <CardDescription>
                  {selectedSong 
                    ? `${selectedSong.track_name} by ${selectedSong.artist_name}`
                    : 'Select a song to view lyrics'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : currentLyrics ? (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                      {currentLyrics}
                    </pre>
                  </div>
                ) : selectedSong ? (
                  <div className="text-center py-8 text-gray-500">
                    <Music className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No lyrics available for this song</p>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Search for a song to view its lyrics</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Usage Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
                <CardDescription>
                  Your current plan and usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Plan</span>
                    <div className="flex items-center space-x-1">
                      {user.subscription_type === 'pro' ? (
                        <>
                          <Crown className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-gray-900">Pro</span>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-gray-900">Free</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Daily Limit</span>
                    <span className="text-sm font-medium text-gray-900">
                      {user.subscription_type === 'pro' ? '1,000' : '100'} requests
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Rate Limit</span>
                    <span className="text-sm font-medium text-gray-900">
                      {user.subscription_type === 'pro' ? '20' : '5'} per minute
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}



