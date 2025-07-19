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

  async getSongLyrics(songId: string): Promise<string> {
    console.log('Fetching lyrics for song ID:', songId);
    
    try {
      const data = await this.makeRequest(`/song/lyrics/?id=${songId}`);
      console.log('Lyrics API response:', data);
      
      // Handle the actual API response structure
      if (data?.response?.lyrics?.lyrics?.body?.plain) {
        console.log('Lyrics found, length:', data.response.lyrics.lyrics.body.plain.length);
        return data.response.lyrics.lyrics.body.plain;
      }
      
      console.log('No lyrics found in response');
      return 'Lyrics not available for this song.';
    } catch (error) {
      console.error('Lyrics fetch error:', error);
      return 'Error fetching lyrics. Please try again.';
    }
  }
}

export const geniusApi = new GeniusApiService();