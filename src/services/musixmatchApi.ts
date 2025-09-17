import { lyricsCache, CachedLyrics } from "@/services/lyricsCache";

const MUSIXMATCH_API_KEY = "4d54e92614bedfaaffcab9fdbf56cdf3";

// Use proxy in development, direct URL in production
const MUSIXMATCH_BASE_URL = import.meta.env.DEV
  ? "/api/musixmatch"
  : "https://api.musixmatch.com/ws/1.1";

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
  private async makeRequest(
    endpoint: string,
    params: Record<string, string> = {},
  ): Promise<any> {
    // Handle both relative and absolute URLs
    const baseUrl = MUSIXMATCH_BASE_URL.startsWith("http")
      ? MUSIXMATCH_BASE_URL
      : `${window.location.origin}${MUSIXMATCH_BASE_URL}`;

    const url = new URL(`${baseUrl}${endpoint}`);

    // Add API key to all requests
    url.searchParams.append("apikey", MUSIXMATCH_API_KEY);

    // Add other parameters
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

    // First, try to get from cache
    try {
      const cached = await lyricsCache.getCachedLyrics(trackId);
      if (cached && cached.lyrics) {
        console.log("Lyrics found in cache");
        return cached.lyrics;
      }
    } catch (error) {
      console.error("Error checking cache:", error);
    }

    // If not in cache, fetch from API
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

      // Cache the lyrics if we have a song object and lyrics are available
      if (song && lyricsText !== "Lyrics not available for this song.") {
        try {
          const cachedLyrics: CachedLyrics = {
            id: trackId,
            title: song.title,
            artist: song.artist,
            lyrics: lyricsText,
            imageUrl: song.imageUrl,
            url: song.url,
            timestamp: Date.now(),
            isLiked: false, // Will be updated by the like system
          };
          await lyricsCache.cacheLyrics(cachedLyrics);
          console.log("Lyrics cached successfully");
        } catch (error) {
          console.error("Error caching lyrics:", error);
        }
      }

      return lyricsText;
    } catch (error) {
      console.error("Musixmatch lyrics fetch error:", error);
      return "Error fetching lyrics. Please try again.";
    }
  }

  // Additional method to get track details
  async getTrackDetails(trackId: string): Promise<MusixmatchTrack | null> {
    try {
      const data = await this.makeRequest("/track.get", {
        track_id: trackId,
      });

      if (data.message.body.track) {
        return data.message.body.track;
      }

      return null;
    } catch (error) {
      console.error("Musixmatch track details error:", error);
      return null;
    }
  }

  // Method to search by artist
  async searchByArtist(
    artistName: string,
    pageSize: number = 10,
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
