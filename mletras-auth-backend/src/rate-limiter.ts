/**
 * Durable Object for per-user rate limiting
 * Handles burst limiting (requests per minute) for individual users
 */

interface RateLimitState {
  requests: Array<{ timestamp: number }>;
  lastReset: number;
}

interface RateLimitConfig {
  burstLimit: number;
  windowSeconds: number;
}

export class RateLimiter {
  private state: DurableObjectState;
  private env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const userType = url.searchParams.get('userType') || 'free';

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get rate limit configuration based on user type
    const config = this.getRateLimitConfig(userType);

    try {
      switch (url.pathname) {
        case '/check':
          return await this.checkRateLimit(userId, config);
        case '/record':
          return await this.recordRequest(userId, config);
        case '/reset':
          return await this.resetRateLimit(userId);
        default:
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
      }
    } catch (error) {
      console.error('RateLimiter error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private getRateLimitConfig(userType: string): RateLimitConfig {
    const burstWindowSeconds = parseInt(this.env.BURST_WINDOW_SECONDS || '60');
    
    if (userType === 'pro') {
      return {
        burstLimit: parseInt(this.env.PRO_BURST_LIMIT || '20'),
        windowSeconds: burstWindowSeconds
      };
    } else {
      return {
        burstLimit: parseInt(this.env.FREE_BURST_LIMIT || '5'),
        windowSeconds: burstWindowSeconds
      };
    }
  }

  private async checkRateLimit(userId: string, config: RateLimitConfig): Promise<Response> {
    const stateKey = `rate_limit_${userId}`;
    const stored = await this.state.storage.get<RateLimitState>(stateKey);
    
    const now = Date.now();
    const windowStart = now - (config.windowSeconds * 1000);
    
    let rateLimitState: RateLimitState = stored || {
      requests: [],
      lastReset: now
    };

    // Clean old requests outside the window
    rateLimitState.requests = rateLimitState.requests.filter(
      req => req.timestamp > windowStart
    );

    const currentRequests = rateLimitState.requests.length;
    const isAllowed = currentRequests < config.burstLimit;

    return new Response(JSON.stringify({
      allowed: isAllowed,
      currentRequests,
      limit: config.burstLimit,
      windowSeconds: config.windowSeconds,
      resetTime: windowStart + (config.windowSeconds * 1000)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async recordRequest(userId: string, config: RateLimitConfig): Promise<Response> {
    const stateKey = `rate_limit_${userId}`;
    const stored = await this.state.storage.get<RateLimitState>(stateKey);
    
    const now = Date.now();
    const windowStart = now - (config.windowSeconds * 1000);
    
    let rateLimitState: RateLimitState = stored || {
      requests: [],
      lastReset: now
    };

    // Clean old requests outside the window
    rateLimitState.requests = rateLimitState.requests.filter(
      req => req.timestamp > windowStart
    );

    // Check if we can record this request
    if (rateLimitState.requests.length >= config.burstLimit) {
      return new Response(JSON.stringify({
        allowed: false,
        error: 'Rate limit exceeded',
        currentRequests: rateLimitState.requests.length,
        limit: config.burstLimit,
        retryAfter: Math.ceil((rateLimitState.requests[0].timestamp + (config.windowSeconds * 1000) - now) / 1000)
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Record the request
    rateLimitState.requests.push({ timestamp: now });
    await this.state.storage.put(stateKey, rateLimitState);

    return new Response(JSON.stringify({
      allowed: true,
      currentRequests: rateLimitState.requests.length,
      limit: config.burstLimit
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async resetRateLimit(userId: string): Promise<Response> {
    const stateKey = `rate_limit_${userId}`;
    await this.state.storage.delete(stateKey);

    return new Response(JSON.stringify({
      success: true,
      message: 'Rate limit reset'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

