import { lyricsCache, CachedLyrics } from './lyricsCache';

export interface SearchHistoryItem {
  id: string;
  title: string;
  artist: string;
  imageUrl?: string;
  url?: string;
  timestamp: number;
  searchQuery: string;
}

class SearchHistoryService {
  private readonly HISTORY_KEY = 'searchHistory';
  private readonly MAX_HISTORY_ITEMS = 50;

  async addToHistory(song: SearchHistoryItem): Promise<void> {
    try {
      // Get current history
      const history = this.getHistory();
      
      // Remove if already exists (to update timestamp)
      const filteredHistory = history.filter(item => item.id !== song.id);
      
      // Add to beginning of array
      const newHistory = [song, ...filteredHistory];
      
      // Keep only the most recent items
      const limitedHistory = newHistory.slice(0, this.MAX_HISTORY_ITEMS);
      
      // Save to localStorage
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(limitedHistory));
      
      // Also cache the song in IndexedDB for offline access
      await this.cacheSongForOffline(song);
      
    } catch (error) {
      console.error('Error adding to search history:', error);
    }
  }

  getHistory(): SearchHistoryItem[] {
    try {
      const saved = localStorage.getItem(this.HISTORY_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error parsing search history:', error);
    }
    return [];
  }

  async getHistoryWithCachedLyrics(): Promise<(SearchHistoryItem & { hasLyrics: boolean })[]> {
    const history = this.getHistory();
    const historyWithLyrics = [];

    for (const item of history) {
      try {
        const cached = await lyricsCache.getCachedLyrics(item.id);
        historyWithLyrics.push({
          ...item,
          hasLyrics: !!cached?.lyrics
        });
      } catch (error) {
        console.error('Error checking cached lyrics:', error);
        historyWithLyrics.push({
          ...item,
          hasLyrics: false
        });
      }
    }

    return historyWithLyrics;
  }

  clearHistory(): void {
    localStorage.removeItem(this.HISTORY_KEY);
  }

  removeFromHistory(songId: string): void {
    const history = this.getHistory();
    const filteredHistory = history.filter(item => item.id !== songId);
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(filteredHistory));
  }

  private async cacheSongForOffline(song: SearchHistoryItem): Promise<void> {
    try {
      // Check if already cached
      const existing = await lyricsCache.getCachedLyrics(song.id);
      if (existing) {
        // Update timestamp
        existing.timestamp = Date.now();
        await lyricsCache.cacheLyrics(existing);
        return;
      }

      // If not cached, we'll cache it when lyrics are fetched
      // This is handled by the geniusApi service
    } catch (error) {
      console.error('Error caching song for offline:', error);
    }
  }

  async getRecentSearches(limit: number = 10): Promise<SearchHistoryItem[]> {
    const history = this.getHistory();
    return history.slice(0, limit);
  }

  async searchHistory(query: string): Promise<SearchHistoryItem[]> {
    const history = this.getHistory();
    const lowerQuery = query.toLowerCase();
    
    return history.filter(item => 
      item.title.toLowerCase().includes(lowerQuery) ||
      item.artist.toLowerCase().includes(lowerQuery) ||
      item.searchQuery.toLowerCase().includes(lowerQuery)
    );
  }
}

export const searchHistory = new SearchHistoryService(); 