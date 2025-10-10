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
  private readonly HISTORY_KEY = "searchHistory";
  private readonly MAX_HISTORY_ITEMS = 50;

  async addToHistory(song: SearchHistoryItem): Promise<void> {
    try {
      // Get current history
      const history = this.getHistory();

      // Remove if already exists (to update timestamp)
      const filteredHistory = history.filter((item) => item.id !== song.id);

      // Add to beginning of array
      const newHistory = [song, ...filteredHistory];

      // Keep only the most recent items
      const limitedHistory = newHistory.slice(0, this.MAX_HISTORY_ITEMS);

      // Save to localStorage
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(limitedHistory));
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Error adding to search history:", error);
      }
    }
  }

  getHistory(): SearchHistoryItem[] {
    try {
      const saved = localStorage.getItem(this.HISTORY_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Error parsing search history:", error);
      }
    }
    return [];
  }

  async getHistoryWithCachedLyrics(): Promise<
    (SearchHistoryItem & { hasLyrics: boolean })[]
  > {
    const history = this.getHistory();
    
    // No local caching - always show as not having lyrics locally
    return history.map(item => ({
      ...item,
      hasLyrics: false,
    }));
  }

  clearHistory(): void {
    localStorage.removeItem(this.HISTORY_KEY);
  }

  removeFromHistory(songId: string): void {
    const history = this.getHistory();
    const filteredHistory = history.filter((item) => item.id !== songId);
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(filteredHistory));
  }

  async getRecentSearches(limit: number = 10): Promise<SearchHistoryItem[]> {
    const history = this.getHistory();
    return history.slice(0, limit);
  }

  async searchHistory(query: string): Promise<SearchHistoryItem[]> {
    const history = this.getHistory();
    const lowerQuery = query.toLowerCase();

    return history.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.artist.toLowerCase().includes(lowerQuery) ||
        item.searchQuery.toLowerCase().includes(lowerQuery),
    );
  }
}

export const searchHistory = new SearchHistoryService();
