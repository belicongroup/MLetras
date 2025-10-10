// API key is handled server-side by Cloudflare Worker proxy
// Smart Proxy provides caching to reduce API calls

import { lyricsCache } from "./lyricsCache";

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
  instrumental: number;
  restricted: number;
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

class MusixmatchApiService {
  private lastRequestTime = 0;
  private readonly minRequestInterval = 300; // Increased to 300ms between requests

  /**
   * Normalize search query - remove diacritics, lowercase, trim, collapse spaces
   */
  private normalizeQuery(query: string): string {
    return query
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .normalize('NFD') // Decompose combined characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/ñ/g, 'n') // Spanish ñ
      .replace(/ü/g, 'u'); // Spanish ü
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
    // Use Smart Proxy with KV caching - API key handled server-side
    const url = new URL(`${MUSIXMATCH_BASE_URL}/${endpoint}`);

    // Add parameters (API key is added by Smart Proxy)
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
    pageSize: number = 5,
    page: number = 1,
  ): Promise<Song[]> {
    if (!query.trim()) return [];

    // Normalize the query
    const normalizedQuery = this.normalizeQuery(query);

    try {
      // Try to intelligently parse the query for artist + track combinations
      // Examples: "luna peso pluma" -> track: "luna", artist: "peso pluma"
      const words = normalizedQuery.split(' ');
      
      let searchParams: Record<string, string> = {
        page_size: pageSize.toString(),
        page: page.toString(),
        s_track_rating: "desc", // Sort by track rating
        f_has_lyrics: "1", // Only return tracks with lyrics
      };

      // Strategy 1: Try to parse as "track artist" format (most common)
      if (words.length >= 2) {
        // Try first word as track, rest as artist
        const possibleTrack = words[0];
        const possibleArtist = words.slice(1).join(' ');
        
        searchParams.q_track = possibleTrack;
        searchParams.q_artist = possibleArtist;
      } else {
        // Single word - search as track only
        searchParams.q_track = normalizedQuery;
      }

      // First attempt: parsed search
      const data: MusixmatchSearchResponse = await this.makeRequest(
        "/track.search",
        searchParams,
      );

      if (!data.message.body.track_list || data.message.body.track_list.length === 0) {
        // Fallback: Try different parsing strategies
        if (process.env.NODE_ENV !== 'production') {
          console.log('Zero results - trying alternative parsing strategies');
        }
        
        // Strategy 2: Try as "artist track" format
        if (words.length >= 2) {
          try {
            const fallbackData: MusixmatchSearchResponse = await this.makeRequest(
              "/track.search",
              {
                q_track: words[words.length - 1], // Last word as track
                q_artist: words.slice(0, -1).join(' '), // All but last as artist
                page_size: pageSize.toString(),
                page: page.toString(),
                s_track_rating: "desc",
                f_has_lyrics: "1",
              },
            );
            
            if (fallbackData.message.body.track_list && fallbackData.message.body.track_list.length > 0) {
              if (process.env.NODE_ENV !== 'production') {
                console.log(`Found results with "artist track" parsing`);
              }
              return fallbackData.message.body.track_list.map((item) => ({
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
                hasLyrics: item.track.has_lyrics === 1,
              }));
            }
          } catch (fallbackError) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('Artist-track parsing failed, trying next strategy...');
            }
          }
        }
        
        // Strategy 3: Try as general search (original approach)
        try {
          const fallbackData: MusixmatchSearchResponse = await this.makeRequest(
            "/track.search",
            {
              q: normalizedQuery, // General search as last resort
              page_size: pageSize.toString(),
              page: page.toString(),
              s_track_rating: "desc",
              f_has_lyrics: "1",
            },
          );
            
          if (fallbackData.message.body.track_list && fallbackData.message.body.track_list.length > 0) {
            if (process.env.NODE_ENV !== 'production') {
              console.log(`Found results with general search`);
            }
            return fallbackData.message.body.track_list.map((item) => ({
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
              hasLyrics: item.track.has_lyrics === 1,
            }));
          }
        } catch (fallbackError) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('General search fallback failed');
          }
        }
        
        // No results found with any strategy
        return [];
      }

      // Return results from first attempt
      return data.message.body.track_list.map((item) => ({
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
        hasLyrics: item.track.has_lyrics === 1,
      }));
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Musixmatch search error:", error);
      }
      return [];
    }
  }

  async getSongLyrics(trackId: string, song?: Song): Promise<string> {
    try {
      // Check cache first
      const cached = await lyricsCache.getCachedLyrics(trackId);
      if (cached && cached.lyrics) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Lyrics loaded from cache:', trackId);
        }
        return cached.lyrics;
      }

      // Cache miss - fetch from API through Smart Proxy
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️ Cache miss - fetching from API:', trackId);
      }

      const data: MusixmatchLyricsResponse = await this.makeRequest(
        "/track.lyrics.get",
        {
          track_id: trackId,
        },
      );

      let lyricsText = "Lyrics not available for this song.";

      if (data.message.body.lyrics && data.message.body.lyrics.lyrics_body) {
        lyricsText = data.message.body.lyrics.lyrics_body;

        // Handle Musixmatch's placeholder text
        if (
          lyricsText.includes(
            "******* This Lyrics is NOT for Commercial use *******",
          )
        ) {
          lyricsText = "Lyrics not available for this song.";
        }
      }

      // Cache the lyrics for future use
      if (lyricsText && lyricsText !== "Lyrics not available for this song." && song) {
        await lyricsCache.cacheLyrics({
          id: trackId,
          title: song.title,
          artist: song.artist,
          lyrics: lyricsText,
          imageUrl: song.imageUrl,
          url: song.url,
          timestamp: Date.now(),
          isLiked: false,
        });
        if (process.env.NODE_ENV !== 'production') {
          console.log('💾 Lyrics cached successfully:', trackId);
        }
      }

      return lyricsText;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Musixmatch lyrics fetch error:", error);
      }
      return "Error fetching lyrics. Please try again.";
    }
  }


  /**
   * Search cached lyrics by content (server-side only, exact phrase)
   * Returns song metadata that can be merged with regular search results
   */
  async searchCachedLyricsSilent(query: string): Promise<Song[]> {
    try {
      if (!query.trim()) return [];

      const url = new URL(`${MUSIXMATCH_BASE_URL}/search.cached.lyrics`);
      url.searchParams.set('q', query.trim());

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      
      if (data.success && data.results && data.results.length > 0) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`🎵 Lyrics search enhanced results with ${data.results.length} songs`);
        }
        
        // Convert to Song format to merge with regular results
        return data.results.map((result: any) => ({
          id: `lyrics-match-${result.trackName}-${result.artistName}`,
          title: result.trackName,
          artist: result.artistName,
          hasLyrics: true,
        }));
      }

      return [];
    } catch (error) {
      // Silently fail - lyrics search is enhancement only
      if (process.env.NODE_ENV !== 'production') {
        console.log("Lyrics search skipped:", error);
      }
      return [];
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

      return data.message.body.track_list.map((item) => ({
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
        hasLyrics: item.track.has_lyrics === 1,
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
