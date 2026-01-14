// API key is handled server-side by Cloudflare Worker proxy
// Using Smart Proxy (mletras-smart-proxy) with 7-day caching for lyrics
// Caching complies with Musixmatch licensing when pixel_tracking_url is called

const MUSIXMATCH_BASE_URL = "https://mletras-smart-proxy.belicongroup.workers.dev";

export interface MusixmatchTrack {
  track_id: number;
  track_name: string;
  artist_name: string;
  album_name: string;
  track_share_url: string;
  track_edit_url: string;
  restricted: number;
  instrumental: number;
  explicit: number;
  has_lyrics: number;
  has_subtitles: number;
  has_richsync: number;
  num_favourite: number;
  lyrics_id: number;
  subtitle_id: number;
  album_coverart_100x100: string;
  album_coverart_350x350: string;
  album_coverart_500x500: string;
  album_coverart_800x800: string;
  track_spotify_id: string;
  track_isrc: string;
  track_length: number;
  commontrack_id: number;
  commontrack_vanity_id: string;
  first_release_date: string;
  updated_time: string;
  primary_genres: {
    music_genre_list: Array<{
      music_genre: {
        music_genre_id: number;
        music_genre_name: string;
        music_genre_name_extended: string;
        music_genre_vanity: string;
      };
    }>;
  };
  secondary_genres: {
    music_genre_list: Array<{
      music_genre: {
        music_genre_id: number;
        music_genre_name: string;
        music_genre_name_extended: string;
        music_genre_vanity: string;
      };
    }>;
  };
}

export interface MusixmatchSearchResponse {
  message: {
    header: {
      status_code: number;
      execute_time: number;
      available: number;
    };
    body: {
      track_list: Array<{
        track: MusixmatchTrack;
      }>;
    };
  };
}

export interface MusixmatchLyricsResponse {
  message: {
    header: {
      status_code: number;
      execute_time: number;
      available: number;
    };
    body: {
      lyrics: {
        lyrics_id: number;
        restricted: number;
        instrumental: number;
        lyrics_body: string;
        lyrics_language: string;
        script_tracking_url: string;
        pixel_tracking_url: string;
        lyrics_copyright: string;
        backlink_url: string;
        updated_time: string;
      };
    };
  };
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  lyrics?: string;
  imageUrl?: string;
  url?: string;
  album?: string;
  trackLength?: number;
  hasLyrics?: boolean;
}

interface CachedLyricsEntry {
  lyrics: string;
  pixelTrackingUrl: string | undefined;
  timestamp: number;
}

class MusixmatchApiService {
  private lastRequestTime = 0;
  private readonly minRequestInterval = 100; // Reduced from 300ms to 100ms for faster search (Python library has no rate limit)
  private readonly LYRICS_CACHE_PREFIX = "mletras_lyrics_";
  private readonly LYRICS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  /**
   * Get cached lyrics from localStorage
   */
  private getCachedLyrics(trackId: string): string | null {
    if (typeof window === 'undefined') return null;

    try {
      const cacheKey = `${this.LYRICS_CACHE_PREFIX}${trackId}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) return null;

      const entry: CachedLyricsEntry = JSON.parse(cached);
      const now = Date.now();
      const age = now - entry.timestamp;

      // Check if cache is still valid (within 7 days)
      if (age > this.LYRICS_CACHE_TTL) {
        // Cache expired, remove it
        localStorage.removeItem(cacheKey);
        return null;
      }

      return entry.lyrics;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error reading cached lyrics:', error);
      }
      return null;
    }
  }

  /**
   * Cache lyrics in localStorage
   */
  private cacheLyrics(trackId: string, lyrics: string, pixelTrackingUrl?: string): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheKey = `${this.LYRICS_CACHE_PREFIX}${trackId}`;
      const entry: CachedLyricsEntry = {
        lyrics,
        pixelTrackingUrl,
        timestamp: Date.now()
      };

      localStorage.setItem(cacheKey, JSON.stringify(entry));

      // Call pixel tracking URL for licensing compliance (fire and forget)
      if (pixelTrackingUrl) {
        this.callPixelTrackingUrl(pixelTrackingUrl);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error caching lyrics:', error);
      }
      // If localStorage is full, try to clean up old entries
      this.cleanupExpiredCache();
    }
  }

  /**
   * Refresh cache timestamp for existing cached lyrics (extends 7-day TTL)
   * Public method for offline sync
   */
  public refreshCacheTimestamp(trackId: string): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheKey = `${this.LYRICS_CACHE_PREFIX}${trackId}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const entry: CachedLyricsEntry = JSON.parse(cached);
        // Update timestamp to refresh 7-day TTL
        entry.timestamp = Date.now();
        localStorage.setItem(cacheKey, JSON.stringify(entry));
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error refreshing cache timestamp:', error);
      }
    }
  }

  /**
   * Sync lyrics for offline access (fetch and cache if not already cached)
   * Public method for offline sync
   */
  public async syncLyricsForOffline(trackId: string): Promise<boolean> {
    // Check if already cached
    const cached = this.getCachedLyrics(trackId);
    if (cached !== null) {
      // Refresh timestamp to extend 7-day TTL
      this.refreshCacheTimestamp(trackId);
      return true;
    }

    // Not cached, fetch and cache
    try {
      await this.getSongLyrics(trackId);
      return true;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error syncing lyrics for offline:', error);
      }
      return false;
    }
  }

  /**
   * Call pixel tracking URL (fire and forget)
   * Required for licensing compliance when caching lyrics
   */
  private callPixelTrackingUrl(pixelUrl: string): void {
    if (!pixelUrl || typeof window === 'undefined') return;

    try {
      // Fire and forget - we don't wait for the response
      fetch(pixelUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'MLetras/1.0'
        }
      }).catch(error => {
        // Log but don't fail caching if tracking fails
        if (process.env.NODE_ENV !== 'production') {
          console.error('Pixel tracking URL call failed (non-critical):', error);
        }
      });
    } catch (error) {
      // Ignore errors - tracking is non-critical
      if (process.env.NODE_ENV !== 'production') {
        console.error('Pixel tracking URL error (non-critical):', error);
      }
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    if (typeof window === 'undefined') return;

    try {
      const keysToRemove: string[] = [];
      const now = Date.now();

      // Iterate through localStorage to find expired lyrics cache entries
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.LYRICS_CACHE_PREFIX)) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const entry: CachedLyricsEntry = JSON.parse(cached);
              const age = now - entry.timestamp;
              if (age > this.LYRICS_CACHE_TTL) {
                keysToRemove.push(key);
              }
            }
          } catch (e) {
            // Invalid entry, mark for removal
            keysToRemove.push(key);
          }
        }
      }

      // Remove expired entries
      keysToRemove.forEach(key => localStorage.removeItem(key));

      if (keysToRemove.length > 0 && process.env.NODE_ENV !== 'production') {
        console.log(`Cleaned up ${keysToRemove.length} expired lyrics cache entries`);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error cleaning up cache:', error);
      }
    }
  }

  /**
   * Light query cleanup - trims surrounding whitespace only
   */
  private normalizeQuery(query: string): string {
    return query.trim();
  }

  /**
   * Generate plural/singular variations for Spanish words
   */
  private getPluralSingularVariations(query: string): string[] {
    const variations: string[] = [query];
    const words = query.split(' ');
    
    words.forEach((word, index) => {
      // Try removing trailing 's' for plural → singular
      if (word.endsWith('s') && word.length > 3) {
        const singular = word.slice(0, -1);
        const newQuery = [...words.slice(0, index), singular, ...words.slice(index + 1)].join(' ');
        variations.push(newQuery);
      }
      
      // Try removing trailing 'es' for plural → singular
      if (word.endsWith('es') && word.length > 4) {
        const singular = word.slice(0, -2);
        const newQuery = [...words.slice(0, index), singular, ...words.slice(index + 1)].join(' ');
        variations.push(newQuery);
      }
      
      // Try adding 's' for singular → plural
      if (!word.endsWith('s') && word.length > 3) {
        const plural = word + 's';
        const newQuery = [...words.slice(0, index), plural, ...words.slice(index + 1)].join(' ');
        variations.push(newQuery);
      }
    });
    
    return [...new Set(variations)]; // Remove duplicates
  }

  private async makeRequest(
    endpoint: string,
    params: Record<string, string> = {},
  ): Promise<any> {
    // Throttle requests to prevent excessive API calls
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
    // Use Smart Proxy with caching - API key handled server-side
    // Smart proxy uses direct endpoint paths (e.g., /track.search)
    const url = new URL(`${MUSIXMATCH_BASE_URL}/${endpoint}`);

    // Add parameters (API key is added by simple proxy)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Musixmatch API request failed: ${response.status}`);
    }

    const data = await response.json();

    // Check for API errors
    if (data.message.header.status_code !== 200) {
      throw new Error(
        `Musixmatch API error: ${data.message.header.status_code}`,
      );
    }

    return data;
  }

  async searchSongs(
    query: string,
    pageSize: number = 10,
    page: number = 1,
  ): Promise<Song[]> {
    const simpleQuery = this.normalizeQuery(query);
    if (!simpleQuery) return [];

    try {
      const searchData: MusixmatchSearchResponse = await this.makeRequest(
        "/track.search",
        {
          q: simpleQuery,
          page_size: pageSize.toString(),
          page: page.toString(),
          f_has_lyrics: "1",
        },
      );

      if (!searchData.message.body.track_list || searchData.message.body.track_list.length === 0) {
        return [];
      }

      return searchData.message.body.track_list
        .filter((item) => item.track.has_lyrics === 1)
        .map((item) => ({
          id: item.track.track_id.toString(),
          title: item.track.track_name,
          artist: item.track.artist_name,
          album: item.track.album_name,
          imageUrl:
            item.track.album_coverart_500x500 ||
            item.track.album_coverart_350x350 ||
            item.track.album_coverart_100x100,
          url: item.track.track_share_url,
          trackLength: item.track.track_length,
          hasLyrics: true, // Already filtered, so always true
        }));
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Musixmatch search error:", error);
      }
      return [];
    }
  }

  async getSongLyrics(trackId: string, song?: Song): Promise<string> {
    // Check local cache first
    const cachedLyrics = this.getCachedLyrics(trackId);
    if (cachedLyrics !== null) {
      return cachedLyrics;
    }

    // Fetch from server - Smart proxy caches lyrics for 7 days
    // We also cache locally for offline access
    try {
      const data: MusixmatchLyricsResponse = await this.makeRequest(
        "/track.lyrics.get",
        {
          track_id: trackId,
        },
      );

      let lyricsText = "Lyrics not available for this song.";
      let pixelTrackingUrl: string | undefined;

      if (data.message.body.lyrics && data.message.body.lyrics.lyrics_body) {
        lyricsText = data.message.body.lyrics.lyrics_body;
        pixelTrackingUrl = data.message.body.lyrics.pixel_tracking_url;

        // Handle Musixmatch's placeholder text
        if (
          lyricsText.includes(
            "******* This Lyrics is NOT for Commercial use *******",
          )
        ) {
          lyricsText = "Lyrics not available for this song.";
        }
      }

      // Cache lyrics locally for 7 days with pixel tracking URL
      // This provides offline access and faster subsequent loads
      if (lyricsText !== "Lyrics not available for this song.") {
        this.cacheLyrics(trackId, lyricsText, pixelTrackingUrl);
      }

      return lyricsText;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Musixmatch lyrics fetch error:", error);
      }
      return "Error fetching lyrics. Please try again.";
    }
  }

  // Method to search by artist
  async searchByArtist(
    artistName: string,
    pageSize: number = 5,
  ): Promise<Song[]> {
    if (!artistName.trim()) return [];

    try {
      const data: MusixmatchSearchResponse = await this.makeRequest(
        "/track.search",
        {
          q_artist: artistName,
          page_size: pageSize.toString(),
          s_track_rating: "desc",
          f_has_lyrics: "1",
        },
      );

      if (!data.message.body.track_list) {
        return [];
      }

      return data.message.body.track_list
        .filter((item) => item.track.has_lyrics === 1)
        .map((item) => ({
          id: item.track.track_id.toString(),
          title: item.track.track_name,
          artist: item.track.artist_name,
          album: item.track.album_name,
          imageUrl:
            item.track.album_coverart_500x500 ||
            item.track.album_coverart_350x350 ||
            item.track.album_coverart_100x100,
          url: item.track.track_share_url,
          trackLength: item.track.track_length,
          hasLyrics: true, // Already filtered, so always true
        }));
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Musixmatch artist search error:", error);
      }
      return [];
    }
  }
}

export const musixmatchApi = new MusixmatchApiService();
