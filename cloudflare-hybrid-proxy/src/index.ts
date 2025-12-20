/**
 * MLetras Hybrid Proxy - Gateway with selective caching
 * 
 * Features:
 * - FRESH mode (default): Always fetch from Musixmatch API, no caching
 * - CACHED mode (opt-in): Check KV cache first, then API if miss, store in KV
 * - User-based allowlist stored in D1 database
 * - Only cache successful 200 responses
 */

interface Env {
  MUSIXMATCH_API_KEY: string;
  MUSIXMATCH_CACHE: KVNamespace;
  DB: D1Database;
  AUTH_API_URL?: string; // Optional: URL to auth backend for token verification
  JWT_SECRET?: string; // Optional: If provided, can decode JWT directly
}

interface CacheEntry {
  data: any;
  timestamp: number;
  endpoint: string;
}

interface MusixmatchResponse {
  message: {
    header: {
      status_code: number;
      execute_time: number;
      available: number;
    };
    body: any;
  };
}

class HybridProxy {
  private env: Env;
  private readonly MUSIXMATCH_BASE_URL = 'https://api.musixmatch.com/ws/1.1';
  private readonly ALLOWED_ENDPOINTS = ['track.search', 'track.lyrics.get', 'track.get', 'artist.search', 'artist.get'];
  private readonly ALLOWED_ORIGINS = [
    'https://mletras.vercel.app',
    'https://mletras.com',
    'http://localhost',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://127.0.0.1',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000',
    'http://10.0.2.2:8080',
    'http://10.0.2.2:3000'
  ];
  private readonly CACHE_ALLOWLIST_TTL = 300; // Cache allowlist check for 5 minutes

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Check if origin is allowed
   */
  private isAllowedOrigin(origin: string | null): boolean {
    if (!origin) return false;
    return this.ALLOWED_ORIGINS.some(allowed => 
      origin === allowed || origin.startsWith(allowed + '/')
    );
  }

  /**
   * Set CORS headers
   */
  private setCorsHeaders(response: Response, origin?: string): Response {
    const headers = new Headers(response.headers);
    
    if (origin && this.isAllowedOrigin(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
    } else {
      headers.set('Access-Control-Allow-Origin', '*');
    }
    
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Access-Control-Max-Age', '86400');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  /**
   * Handle OPTIONS preflight requests
   */
  private handleOptions(origin?: string): Response {
    const headers = new Headers();
    
    if (origin && this.isAllowedOrigin(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
    } else {
      headers.set('Access-Control-Allow-Origin', '*');
    }
    
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Access-Control-Max-Age', '86400');
    
    return new Response(null, { status: 204, headers });
  }

  /**
   * Extract user ID from Bearer token
   * Supports multiple methods:
   * 1. Call auth backend API (if AUTH_API_URL is set)
   * 2. Decode JWT directly (if JWT_SECRET is set)
   * 3. Fallback: return null (user not identified)
   */
  private async getUserIdFromToken(token: string): Promise<string | null> {
    // Method 1: Call auth backend
    if (this.env.AUTH_API_URL) {
      try {
        const response = await fetch(`${this.env.AUTH_API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user?.id) {
            return data.user.id;
          }
        }
      } catch (error) {
        console.error('Error calling auth backend:', error);
      }
    }

    // Method 2: Decode JWT directly (if JWT_SECRET is available)
    // Note: This is a simplified JWT decode - in production, use a proper JWT library
    // For now, we'll skip this and rely on auth backend or query param fallback
    
    return null;
  }

  /**
   * Get user ID from request
   * Checks Bearer token first, then falls back to user_id query parameter
   */
  private async getUserId(request: Request): Promise<string | null> {
    // Try Bearer token first
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const userId = await this.getUserIdFromToken(token);
      if (userId) {
        return userId;
      }
    }

    // Fallback: check query parameter (for testing/debugging)
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('user_id');
    if (userIdParam) {
      return userIdParam;
    }

    return null;
  }

  /**
   * Check if user is in cache allowlist
   * Uses KV cache to avoid DB lookups on every request
   */
  private async isUserCacheAllowed(userId: string): Promise<boolean> {
    // Check KV cache first
    const cacheKey = `cache_allowlist:${userId}`;
    const cached = await this.env.MUSIXMATCH_CACHE.get(cacheKey);
    
    if (cached !== null) {
      return cached === 'true';
    }

    // Query database
    try {
      // Check both use_cache column and metadata JSON
      const result = await this.env.DB.prepare(
        `SELECT use_cache, metadata FROM users WHERE id = ?`
      ).bind(userId).first<{ use_cache: number | null; metadata: string | null }>();

      let canCache = false;
      
      if (result) {
        // Check use_cache column first
        if (result.use_cache === 1) {
          canCache = true;
        } 
        // Then check metadata JSON
        else if (result.metadata) {
          try {
            const metadata = JSON.parse(result.metadata);
            if (metadata.use_cache === 1 || metadata.use_cache === true) {
              canCache = true;
            }
          } catch (e) {
            // Invalid JSON, ignore
          }
        }
      }
      
      // Cache the result in KV for 5 minutes
      await this.env.MUSIXMATCH_CACHE.put(
        cacheKey, 
        canCache ? 'true' : 'false',
        { expirationTtl: this.CACHE_ALLOWLIST_TTL }
      );

      return canCache;
    } catch (error) {
      console.error('Error checking cache allowlist:', error);
      // On error, default to false (no cache)
      return false;
    }
  }

  /**
   * Generate a stable cache key from request parameters
   */
  private generateCacheKey(endpoint: string, params: URLSearchParams): string {
    // Sort parameters for consistent cache keys
    const sortedParams = Array.from(params.entries())
      .filter(([key]) => key !== 'apikey' && key !== 'user_id') // Exclude API key and user_id from cache key
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    return `musixmatch:${endpoint}:${btoa(sortedParams)}`;
  }

  /**
   * Get cached data from KV
   */
  private async getCachedData(cacheKey: string): Promise<CacheEntry | null> {
    try {
      const cached = await this.env.MUSIXMATCH_CACHE.get(cacheKey, 'json');
      return cached as CacheEntry;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  /**
   * Store data in KV cache
   */
  private async setCachedData(cacheKey: string, data: any, endpoint: string): Promise<void> {
    try {
      const cacheEntry: CacheEntry = {
        data,
        timestamp: Date.now(),
        endpoint
      };
      
      // Cache forever until manually cleared
      await this.env.MUSIXMATCH_CACHE.put(cacheKey, JSON.stringify(cacheEntry));
      console.log(`Cached data for key: ${cacheKey}`);
    } catch (error) {
      console.error('Error writing to cache:', error);
    }
  }

  /**
   * Fetch data from Musixmatch API
   */
  private async fetchFromAPI(endpoint: string, params: URLSearchParams): Promise<{ data: any; status: number }> {
    const url = new URL(`${this.MUSIXMATCH_BASE_URL}/${endpoint}`);
    
    // Add API key and format parameters
    params.set('apikey', this.env.MUSIXMATCH_API_KEY);
    params.set('format', 'json');
    
    // Add all parameters to URL
    params.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    console.log(`Fetching from Musixmatch API: ${url.toString()}`);
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    return {
      data,
      status: response.status
    };
  }

  /**
   * Process API request with caching logic
   */
  private async processRequest(
    endpoint: string, 
    params: URLSearchParams, 
    userId: string | null
  ): Promise<Response> {
    // Validate endpoint
    if (!this.ALLOWED_ENDPOINTS.includes(endpoint)) {
      return new Response(JSON.stringify({
        error: 'Endpoint not allowed',
        allowed: this.ALLOWED_ENDPOINTS
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Determine if user can use cache
    let useCache = false;
    if (userId) {
      useCache = await this.isUserCacheAllowed(userId);
      console.log(`User ${userId}: cache allowed = ${useCache}`);
    } else {
      console.log('No user ID provided: using FRESH mode (default)');
    }

    // FRESH mode: Always fetch from API, no caching
    if (!useCache) {
      console.log(`FRESH mode: Fetching from API (no cache)`);
      
      try {
        const { data, status } = await this.fetchFromAPI(endpoint, params);
        
        return new Response(JSON.stringify(data), {
          status,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'FRESH',
            'X-Cache-Mode': 'no-cache'
          }
        });
      } catch (error) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({
          error: 'Failed to fetch from Musixmatch API',
          details: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // CACHED mode: Check cache first, then API if miss
    const cacheKey = this.generateCacheKey(endpoint, params);
    const cached = await this.getCachedData(cacheKey);
    
    if (cached) {
      console.log(`Cache HIT for key: ${cacheKey}`);
      return new Response(JSON.stringify(cached.data), {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Cache-Timestamp': cached.timestamp.toString(),
          'X-Cache-Endpoint': cached.endpoint,
          'X-Cache-Mode': 'cached'
        }
      });
    }

    console.log(`Cache MISS for key: ${cacheKey}`);

    try {
      // Fetch from API
      const { data, status } = await this.fetchFromAPI(endpoint, params);
      
      // Only cache successful 200 responses
      if (status === 200 && data?.message?.header?.status_code === 200) {
        await this.setCachedData(cacheKey, data, endpoint);
        console.log(`Cached successful response for key: ${cacheKey}`);
      } else {
        console.log(`Not caching response: status=${status}, api_status=${data?.message?.header?.status_code}`);
      }
      
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'X-Cache-Mode': 'cached'
        }
      });
      
    } catch (error) {
      console.error('API Error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to fetch from Musixmatch API',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Main request handler
   */
  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return this.handleOptions(origin);
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({
        error: 'Method not allowed',
        allowed: ['GET']
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract endpoint from path
    // Support both /musixmatch/track.search and /track.search formats
    let endpoint: string | null = null;
    
    if (url.pathname.startsWith('/musixmatch/')) {
      // Format: /musixmatch/track.search
      endpoint = url.pathname.replace('/musixmatch/', '');
    } else {
      // Format: /track.search (direct endpoint)
      const pathParts = url.pathname.split('/').filter(Boolean);
      endpoint = pathParts[0] || null;
    }

    if (!endpoint) {
      return new Response(JSON.stringify({
        error: 'Invalid endpoint',
        path: url.pathname
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user ID (if available)
    const userId = await this.getUserId(request);
    
    console.log(`Processing request: ${request.url}`);
    console.log(`Endpoint: ${endpoint}`);
    console.log(`User ID: ${userId || 'none'}`);

    // Process request
    const response = await this.processRequest(endpoint, url.searchParams, userId);
    
    // Add CORS headers and return
    return this.setCorsHeaders(response, origin);
  }
}

/**
 * Cloudflare Worker entry point
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const proxy = new HybridProxy(env);
    return proxy.handleRequest(request);
  }
};

