import { lyricsCache, CachedLyrics } from '@/services/lyricsCache';

const RAPIDAPI_KEY = '1e1cad9707msh91a2590c323310fp1e04b8jsn4797f27d7d2e';
const RAPIDAPI_HOST = 'genius-song-lyrics1.p.rapidapi.com';

export interface GeniusSearchResult {
  id: number;
  title: string;
  full_title: string;
  artist_names: string;
  url: string;
  song_art_image_url: string;
  primary_artist: {
    name: string;
  };
}

// Updated interface to match actual API response
export interface GeniusSearchResponse {
  hits: Array<{
    result: GeniusSearchResult;
  }>;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  lyrics?: string;
  imageUrl?: string;
  url?: string;
}

class GeniusApiService {
  private async makeRequest(endpoint: string): Promise<any> {
    const response = await fetch(`https://${RAPIDAPI_HOST}${endpoint}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
  }

  async searchSongs(query: string, perPage: number = 10): Promise<Song[]> {
    if (!query.trim()) return [];

    try {
      const encodedQuery = encodeURIComponent(query);
      const data: GeniusSearchResponse = await this.makeRequest(
        `/search/?q=${encodedQuery}&per_page=${perPage}&page=1`
      );

      // Handle the actual API response structure
      if (!data.hits) {
        return [];
      }

      return data.hits.map(hit => ({
        id: hit.result.id.toString(),
        title: hit.result.title,
        artist: hit.result.primary_artist.name,
        imageUrl: hit.result.song_art_image_url,
        url: hit.result.url,
      }));
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  private convertHtmlToText(html: string): string {
    // Replace <br> tags with newlines
    let text = html.replace(/<br\s*\/?>/gi, '\n');
    // Remove all other HTML tags
    text = text.replace(/<[^>]*>/g, '');
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    
    return text.trim();
  }

  async getSongLyrics(songId: string, song?: Song): Promise<string> {
    console.log('Fetching lyrics for song ID:', songId);
    
    // First, try to get from cache
    try {
      const cached = await lyricsCache.getCachedLyrics(songId);
      if (cached && cached.lyrics) {
        console.log('Lyrics found in cache');
        return cached.lyrics;
      }
    } catch (error) {
      console.error('Error checking cache:', error);
    }
    
    // If not in cache, fetch from API
    try {
      const data = await this.makeRequest(`/song/lyrics/?id=${songId}`);
      console.log('Raw API response:', data);
      console.log('Lyrics object:', data.lyrics);
      
      let lyricsText = 'Lyrics not available for this song.';
      
      // Check if lyrics object exists and log its structure
      if (data.lyrics) {
        console.log('Lyrics object keys:', Object.keys(data.lyrics));
        console.log('Full lyrics object:', JSON.stringify(data.lyrics, null, 2));
        
        // Try to find lyrics in various possible locations
        const possiblePaths = [
          { path: data.lyrics.lyrics?.body?.html, isHtml: true },
          { path: data.lyrics.lyrics?.body?.plain, isHtml: false },
          { path: data.lyrics.lyrics?.plain, isHtml: false },
          { path: data.lyrics.body?.plain, isHtml: false },
          { path: data.lyrics.plain, isHtml: false },
          { path: data.lyrics.text, isHtml: false },
          { path: data.lyrics.content, isHtml: false }
        ];
        
        for (let i = 0; i < possiblePaths.length; i++) {
          const { path, isHtml } = possiblePaths[i];
          if (path && typeof path === 'string' && path.trim()) {
            console.log(`Lyrics found at path ${i}, length:`, path.length);
            lyricsText = isHtml ? this.convertHtmlToText(path) : path;
            break;
          }
        }
      }
      
      // Cache the lyrics if we have a song object
      if (song && lyricsText !== 'Lyrics not available for this song.') {
        try {
          const cachedLyrics: CachedLyrics = {
            id: songId,
            title: song.title,
            artist: song.artist,
            lyrics: lyricsText,
            imageUrl: song.imageUrl,
            url: song.url,
            timestamp: Date.now(),
            isLiked: false // Will be updated by the like system
          };
          await lyricsCache.cacheLyrics(cachedLyrics);
          console.log('Lyrics cached successfully');
        } catch (error) {
          console.error('Error caching lyrics:', error);
        }
      }
      
      return lyricsText;
    } catch (error) {
      console.error('Lyrics fetch error:', error);
      return 'Error fetching lyrics. Please try again.';
    }
  }
}

export const geniusApi = new GeniusApiService();