export interface User {
  id: string;
  email: string;
  subscription_type: 'free' | 'pro';
  email_verified: boolean;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  sessionToken?: string;
  isNewUser?: boolean;
  expiresIn?: number;
}

export interface AuthError {
  error: string;
  retryAfter?: number;
}

export interface RateLimitInfo {
  allowed: boolean;
  currentRequests: number;
  limit: number;
  windowSeconds: number;
  retryAfter?: number;
}

export interface UsageStats {
  dailyLimit: number;
  dailyUsed: number;
  burstLimit: number;
  burstUsed: number;
  subscription_type: 'free' | 'pro';
}

export interface Song {
  track_id: number;
  track_name: string;
  artist_name: string;
  album_name?: string;
  track_share_url?: string;
}

export interface LyricsResponse {
  message: {
    header: {
      status_code: number;
      execute_time: number;
    };
    body: {
      lyrics?: {
        lyrics_id: number;
        lyrics_body: string;
        lyrics_language: string;
        script_tracking_url?: string;
        pixel_tracking_url?: string;
        lyrics_copyright: string;
        backlink_url?: string;
        updated_time: string;
      };
    };
  };
}

export interface SearchResponse {
  message: {
    header: {
      status_code: number;
      execute_time: number;
    };
    body: {
      track_list?: Array<{
        track: Song;
      }>;
    };
  };
}

