// Note: No caching of Musixmatch API data per terms of service

// Note: API key is now handled server-side by Cloudflare Worker proxy
// No client-side API key needed for security

// Use Cloudflare Worker proxy for all environments
// Production: Using workers.dev URL with CORS configured for mletras.vercel.app
const MUSIXMATCH_BASE_URL = "https://mletras-api-proxy.belicongroup.workers.dev/musixmatch";

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
    // Use Cloudflare Worker proxy - API key handled server-side
    const url = new URL(`${MUSIXMATCH_BASE_URL}${endpoint}`);

    // Add parameters (API key is added by Cloudflare Worker)
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
    pageSize: number = 5, // Reduced from 10 to 5
    page: number = 1,
  ): Promise<Song[]> {
    if (!query.trim()) return [];

    try {
      const data: MusixmatchSearchResponse = await this.makeRequest(
        "/track.search",
        {
          q_track: query,
          page_size: pageSize.toString(),
          page: page.toString(),
          s_track_rating: "desc", // Sort by track rating
          f_has_lyrics: "1", // Only return tracks with lyrics
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
      console.error("Musixmatch search error:", error);
      return [];
    }
  }

  async getSongLyrics(trackId: string, song?: Song): Promise<string> {
    console.log("Fetching lyrics for track ID:", trackId);

    // Always fetch from API - no caching allowed per Musixmatch terms
    try {
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

      // Note: No caching of Musixmatch API data per terms of service
      return lyricsText;
    } catch (error) {
      console.error("Musixmatch lyrics fetch error:", error);
      return "Error fetching lyrics. Please try again.";
    }
  }


  // Method to search by artist
  async searchByArtist(
    artistName: string,
    pageSize: number = 5, // Reduced from 10 to 5
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
      console.error("Musixmatch artist search error:", error);
      return [];
    }
  }
}

export const musixmatchApi = new MusixmatchApiService();
