/**
 * MLetras Smart Proxy - Caching proxy for Musixmatch API
 * Uses Cloudflare Workers + KV for intelligent caching
 */

interface Env {
  MUSIXMATCH_API_KEY: string;
  MUSIXMATCH_CACHE: KVNamespace;
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

class SmartProxy {
  private env: Env;
  private readonly MUSIXMATCH_BASE_URL = 'https://api.musixmatch.com/ws/1.1';
  private readonly ALLOWED_ENDPOINTS = ['track.search', 'track.lyrics.get', 'search.cached.lyrics'];
  private readonly ALLOWED_ORIGINS = [
    'https://mletras.vercel.app',
    'http://localhost',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://127.0.0.1',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000',
    'http://10.0.2.2:8080',
    'http://10.0.2.2:3000'
  ];

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Generate a stable cache key from request parameters
   */
  private generateCacheKey(endpoint: string, params: URLSearchParams): string {
    // Sort parameters for consistent cache keys
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    return `musixmatch:${endpoint}:${btoa(sortedParams)}`;
  }

  /**
   * Check if request is from allowed origin
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
  private async fetchFromAPI(endpoint: string, params: URLSearchParams): Promise<any> {
    const url = new URL(`${this.MUSIXMATCH_BASE_URL}/${endpoint}`);
    
    // Add API key and format parameters
    // Use secret from environment variable
    const apiKey = this.env.MUSIXMATCH_API_KEY || '4d54e92614bedfaaffcab9fdbf56cdf3';
    params.set('apikey', apiKey);
    params.set('format', 'json');
    
    console.log(`API Key available: ${this.env.MUSIXMATCH_API_KEY ? 'YES' : 'NO'}`);
    console.log(`API Key length: ${this.env.MUSIXMATCH_API_KEY?.length || 0}`);
    console.log(`Using API key: ${apiKey.substring(0, 8)}...`);
    
    // Add all parameters to URL
    params.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    console.log(`Fetching from Musixmatch API: ${url.toString()}`);
    
    const response = await fetch(url.toString());
    
    console.log(`API Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`API Error response: ${errorText}`);
      throw new Error(`Musixmatch API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Search cached lyrics by content (exact phrase)
   */
  private async searchCachedLyrics(query: string): Promise<Response> {
    try {
      if (!query || query.trim().length === 0) {
        return new Response(JSON.stringify({ results: [] }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const searchPhrase = query.toLowerCase().trim();
      const results: any[] = [];
      const maxResults = 50;
      
      // List all keys in KV cache
      const list = await this.env.MUSIXMATCH_CACHE.list();
      
      console.log(`Searching ${list.keys.length} cached items for phrase: "${searchPhrase}"`);
      
      for (const key of list.keys) {
        if (results.length >= maxResults) break;
        
        // Only search lyrics entries (not search results)
        if (!key.name.includes('track.lyrics.get')) continue;
        
        try {
          const cached = await this.env.MUSIXMATCH_CACHE.get(key.name, 'json') as CacheEntry;
          if (!cached || !cached.data) continue;
          
          // Extract lyrics from the cached response
          const lyricsBody = cached.data?.message?.body?.lyrics?.lyrics_body;
          if (!lyricsBody) continue;
          
          const lyricsLower = lyricsBody.toLowerCase();
          
          // Check for exact phrase match
          if (lyricsLower.includes(searchPhrase)) {
            // Extract track info from the cache entry
            const trackName = cached.data?.message?.body?.lyrics?.track_name || 'Unknown';
            const artistName = cached.data?.message?.body?.lyrics?.artist_name || 'Unknown';
            
            // Find matching snippet (50 chars before and after)
            const matchIndex = lyricsLower.indexOf(searchPhrase);
            const snippetStart = Math.max(0, matchIndex - 50);
            const snippetEnd = Math.min(lyricsBody.length, matchIndex + searchPhrase.length + 50);
            const snippet = lyricsBody.substring(snippetStart, snippetEnd);
            
            results.push({
              trackName,
              artistName,
              snippet: `...${snippet}...`,
              matchCount: (lyricsLower.match(new RegExp(searchPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length,
              cacheKey: key.name
            });
          }
        } catch (error) {
          console.error(`Error processing cache key ${key.name}:`, error);
        }
      }
      
      console.log(`Found ${results.length} matching songs`);
      
      return new Response(JSON.stringify({ 
        success: true,
        results,
        totalSearched: list.keys.length,
        query: searchPhrase
      }), {
        headers: {
          'Content-Type': 'application/json',
          'X-Search-Type': 'cached-lyrics'
        }
      });
      
    } catch (error) {
      console.error('Lyrics search error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to search cached lyrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Process API request with caching
   */
  private async processRequest(endpoint: string, params: URLSearchParams): Promise<Response> {
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

    // Handle special endpoint for searching cached lyrics
    if (endpoint === 'search.cached.lyrics') {
      const query = params.get('q') || '';
      return await this.searchCachedLyrics(query);
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(endpoint, params);
    
    // Check cache first
    const cached = await this.getCachedData(cacheKey);
    
    if (cached) {
      console.log(`Cache HIT for key: ${cacheKey}`);
      return new Response(JSON.stringify(cached.data), {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Cache-Timestamp': cached.timestamp.toString(),
          'X-Cache-Endpoint': cached.endpoint
        }
      });
    }

    console.log(`Cache MISS for key: ${cacheKey}`);

    try {
      // Fetch from API
      const apiData = await this.fetchFromAPI(endpoint, params);
      
      // Store in cache
      await this.setCachedData(cacheKey, apiData, endpoint);
      
      return new Response(JSON.stringify(apiData), {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey
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

    // Extract endpoint and parameters
    const pathParts = url.pathname.split('/').filter(Boolean);
    const endpoint = pathParts[0]; // e.g., 'track.search'
    const params = url.searchParams;
    
    console.log(`Processing request: ${request.url}`);
    console.log(`Pathname: ${url.pathname}`);
    console.log(`Endpoint: ${endpoint}`);
    console.log(`Params:`, Object.fromEntries(params.entries()));

    // Process request with caching
    const response = await this.processRequest(endpoint, params);
    
    // Add CORS headers and return
    return this.setCorsHeaders(response, origin);
  }
}

/**
 * Cloudflare Worker entry point
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const proxy = new SmartProxy(env);
    return proxy.handleRequest(request);
  }
};
