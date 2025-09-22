import { AuthResponse, AuthError, User, LyricsResponse, SearchResponse } from '../types';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://mletras-auth-api-dev.belicongroup.workers.dev';

class ApiClient {
  private baseUrl: string;
  private sessionToken: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    // For local development, use localhost
    if (this.baseUrl.includes('localhost')) {
      this.baseUrl = 'http://localhost:8787';
    }
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // Add session token if available
    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(errorData.error || 'Request failed', response.status, errorData.retryAfter, errorData.userType);
    }

    return response.json();
  }

  /**
   * Authentication endpoints
   */
  async signup(email: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async login(email: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyOTP(email: string, code: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    
    // Store session token if provided
    if (response.success && response.sessionToken) {
      this.sessionToken = response.sessionToken;
    }
    
    return response;
  }

  async logout(): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/logout', {
      method: 'POST',
    });
    
    // Clear session token
    this.sessionToken = null;
    
    return response;
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  /**
   * Lyrics API endpoints (proxied through auth system)
   */
  async searchSongs(q: string, pageSize: number = 3): Promise<SearchResponse> {
    const params = new URLSearchParams({
      q_lyrics: q,
      page_size: pageSize.toString(),
      s_track_rating: 'desc',
    });

    return this.request<SearchResponse>(`/api/track.search?${params}`);
  }

  async getLyrics(trackId: number): Promise<LyricsResponse> {
    const params = new URLSearchParams({
      track_id: trackId.toString(),
    });

    return this.request<LyricsResponse>(`/api/track.lyrics.get?${params}`);
  }
}

// Custom error class
class ApiError extends Error {
  public status?: number;
  public retryAfter?: number;
  public userType?: 'free' | 'pro';

  constructor(message: string, status?: number, retryAfter?: number, userType?: 'free' | 'pro') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfter = retryAfter;
    this.userType = userType;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export { ApiError };
