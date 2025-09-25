/**
 * MLetras Auth API - Production-ready authentication and metering system
 * Handles passwordless email auth, rate limiting, and admin functions
 */

import { RateLimiter } from './rate-limiter';

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  RATE_LIMITER: DurableObjectNamespace;
  JWT_SECRET: string;
  EMAIL_API_KEY: string;
  MUSIXMATCH_API_KEY: string;
  ALLOWED_ORIGINS: string;
  FREE_DAILY_LIMIT: string;
  FREE_BURST_LIMIT: string;
  PRO_DAILY_LIMIT: string;
  PRO_BURST_LIMIT: string;
  BURST_WINDOW_SECONDS: string;
  ENVIRONMENT: string;
}

interface User {
  id: string;
  email: string;
  username?: string;
  email_verified: boolean;
  subscription_type: 'free' | 'pro';
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: boolean;
}

interface SessionData {
  userId: string;
  email: string;
  subscription_type: 'free' | 'pro';
  createdAt: number;
  expiresAt: number;
}

class AuthAPI {
  private env: Env;
  private allowedOrigins: string[];

  constructor(env: Env) {
    this.env = env;
    this.allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  }

  /**
   * Handle CORS preflight requests
   */
  private handleCors(origin?: string): Response {
    const headers = new Headers();
    
    if (origin && this.allowedOrigins.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
    } else if (this.allowedOrigins.includes('*')) {
      headers.set('Access-Control-Allow-Origin', '*');
    } else {
      headers.set('Access-Control-Allow-Origin', this.allowedOrigins[0]);
    }
    
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Max-Age', '86400');
    
    return new Response(null, { status: 204, headers });
  }

  /**
   * Set CORS headers on response
   */
  private setCorsHeaders(response: Response, origin?: string): Response {
    const headers = new Headers(response.headers);
    
    if (origin && this.allowedOrigins.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
    } else if (this.allowedOrigins.includes('*')) {
      headers.set('Access-Control-Allow-Origin', '*');
    } else {
      headers.set('Access-Control-Allow-Origin', this.allowedOrigins[0]);
    }
    
    headers.set('Access-Control-Allow-Credentials', 'true');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  /**
   * Generate a secure random string
   */
  private generateRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    return result;
  }

  /**
   * Generate OTP code
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP email using Resend
   */
  private async sendOTPEmail(email: string, code: string, type: string): Promise<boolean> {
    try {
      // Log OTP for debugging (but still send real email)
      console.log(`[DEV] OTP for ${email}: ${code}`);

      const emailType = type === 'signup' ? 'sign up' : 'log in';
      const subject = `Your MLetras ${emailType} code`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your MLetras Verification Code</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 32px; }
            .header { text-align: center; margin-bottom: 32px; }
            .logo { color: #0ea5e9; font-size: 24px; font-weight: bold; margin-bottom: 8px; }
            .title { color: #111827; font-size: 20px; font-weight: 600; margin-bottom: 8px; }
            .subtitle { color: #6b7280; font-size: 14px; }
            .code-container { background: #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0; }
            .code { font-size: 32px; font-weight: bold; color: #111827; letter-spacing: 8px; font-family: monospace; }
            .info { color: #6b7280; font-size: 14px; text-align: center; margin-top: 24px; }
            .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo">🎵 MLetras</div>
                <div class="title">Your verification code</div>
                <div class="subtitle">Use this code to ${emailType} to your account</div>
              </div>
              
              <div class="code-container">
                <div class="code">${code}</div>
              </div>
              
              <div class="info">
                This code will expire in 10 minutes.<br>
                If you didn't request this code, please ignore this email.
              </div>
              
              <div class="footer">
                <p>This email was sent from MLetras (noreply@mail.mletras.com)</p>
                <p>If you have any questions, please contact our support team.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
MLetras Verification Code

Your ${emailType} code is: ${code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

--
MLetras Team
noreply@mail.mletras.com
      `;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.EMAIL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'MLetras <noreply@mail.mletras.com>',
          to: [email],
          subject: subject,
          html: htmlContent,
          text: textContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Resend API error:', response.status, errorData);
        return false;
      }

      const result = await response.json();
      console.log(`OTP email sent successfully to ${email}, message ID: ${result.id}`);
      return true;

    } catch (error) {
      console.error('Failed to send OTP email:', error);
      return false;
    }
  }

  /**
   * Create JWT token
   */
  private async createJWT(payload: any): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    
    const jwtPayload = {
      ...payload,
      iat: now,
      exp: now + (24 * 60 * 60) // 24 hours
    };

    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(jwtPayload));
    const signature = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(this.env.JWT_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  }

  /**
   * Verify JWT token
   */
  private async verifyJWT(token: string): Promise<any | null> {
    try {
      const [header, payload, signature] = token.split('.');
      
      const expectedSignature = await crypto.subtle.sign(
        'HMAC',
        await crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(this.env.JWT_SECRET),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        ),
        new TextEncoder().encode(`${header}.${payload}`)
      );

      const expectedSignatureB64 = btoa(String.fromCharCode(...new Uint8Array(expectedSignature)));
      
      if (signature !== expectedSignatureB64) {
        return null;
      }

      const decodedPayload = JSON.parse(atob(payload));
      
      if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return decodedPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user session from cookie
   */
  private async getSessionFromCookie(cookie: string): Promise<SessionData | null> {
    const match = cookie.match(/session=([^;]+)/);
    if (!match) return null;

    try {
      const token = match[1];
      const payload = await this.verifyJWT(token);
      
      if (!payload) return null;

      // Verify session exists in KV
      const sessionData = await this.env.SESSIONS.get(`session:${payload.userId}`);
      if (!sessionData) return null;

      const session: SessionData = JSON.parse(sessionData);
      
      if (session.expiresAt < Date.now()) {
        await this.env.SESSIONS.delete(`session:${payload.userId}`);
        return null;
      }

      return session;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create user session
   */
  private async createSession(user: User): Promise<string> {
    const sessionData: SessionData = {
      userId: user.id,
      email: user.email,
      subscription_type: user.subscription_type,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };

    const token = await this.createJWT({
      userId: user.id,
      email: user.email,
      subscription_type: user.subscription_type
    });

    // Store session in KV
    await this.env.SESSIONS.put(`session:${user.id}`, JSON.stringify(sessionData), {
      expirationTtl: 24 * 60 * 60 // 24 hours
    });

    return token;
  }

  /**
   * Handle signup/login request
   */
  private async handleAuthRequest(email: string, type: 'signup' | 'login'): Promise<Response> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({ error: 'Invalid email format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user exists
      const existingUser = await this.env.DB.prepare(
        'SELECT * FROM users WHERE email = ?'
      ).bind(normalizedEmail).first<User>();

      let userId: string;
      let isNewUser = false;

      if (existingUser) {
        userId = existingUser.id;
        
        // Update last login attempt
        await this.env.DB.prepare(
          'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind(userId).run();
      } else {
        // Create new user (for both signup and login in OTP-based auth)
        userId = this.generateRandomString();
        await this.env.DB.prepare(
          'INSERT INTO users (id, email, email_verified, subscription_type) VALUES (?, ?, ?, ?)'
        ).bind(userId, normalizedEmail, false, 'free').run();
        
        isNewUser = true;
      }

      // Generate and store OTP
      const otpCode = this.generateOTP();
      const otpId = this.generateRandomString();
      const expiresAt = new Date(Date.now() + (10 * 60 * 1000)); // 10 minutes

      await this.env.DB.prepare(
        'INSERT INTO otps (id, user_id, email, code, type, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(otpId, userId, normalizedEmail, otpCode, type, expiresAt.toISOString()).run();

      // Send OTP email
      const emailSent = await this.sendOTPEmail(normalizedEmail, otpCode, type);

      if (!emailSent) {
        return new Response(JSON.stringify({ error: 'Failed to send OTP email' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: `OTP sent to ${normalizedEmail}`,
        isNewUser,
        expiresIn: 600 // 10 minutes in seconds
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Auth request error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Handle OTP verification
   */
  private async handleOTPVerification(email: string, code: string): Promise<Response> {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Find valid OTP
      const otp = await this.env.DB.prepare(
        'SELECT * FROM otps WHERE email = ? AND code = ? AND used_at IS NULL AND expires_at > datetime(\'now\') ORDER BY created_at DESC LIMIT 1'
      ).bind(normalizedEmail, code).first();

      if (!otp) {
        return new Response(JSON.stringify({ error: 'Invalid or expired OTP' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Mark OTP as used
      await this.env.DB.prepare(
        'UPDATE otps SET used_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(otp.id).run();

      // Get or create user
      let user = await this.env.DB.prepare(
        'SELECT * FROM users WHERE email = ?'
      ).bind(normalizedEmail).first<User>();

      if (!user) {
        const userId = this.generateRandomString();
        await this.env.DB.prepare(
          'INSERT INTO users (id, email, email_verified, subscription_type, last_login_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
        ).bind(userId, normalizedEmail, true, 'free').run();
        
        user = await this.env.DB.prepare(
          'SELECT * FROM users WHERE id = ?'
        ).bind(userId).first<User>();
      } else {
        // Update user login time and verify email
        await this.env.DB.prepare(
          'UPDATE users SET email_verified = TRUE, last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind(user.id).run();
        
        user.email_verified = true;
      }

      // Create session
      const sessionToken = await this.createSession(user!);

      return new Response(JSON.stringify({
        success: true,
        message: 'Authentication successful',
        user: {
          id: user!.id,
          email: user!.email,
          username: user!.username || null,
          subscription_type: user!.subscription_type,
          email_verified: user!.email_verified
        },
        sessionToken
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}; Path=/`
        }
      });

    } catch (error) {
      console.error('OTP verification error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Check rate limits and record usage
   */
  private async checkRateLimit(userId: string, userType: string, endpoint: string): Promise<{ allowed: boolean; error?: string; retryAfter?: number }> {
    try {
      // Get rate limiter Durable Object
      const rateLimiterId = this.env.RATE_LIMITER.idFromName(userId);
      const rateLimiter = this.env.RATE_LIMITER.get(rateLimiterId);

      // Check burst limit
      const burstResponse = await rateLimiter.fetch(
        `https://rate-limiter/check?userId=${userId}&userType=${userType}`
      );
      
      const burstData = await burstResponse.json();
      
      if (!burstData.allowed) {
        return {
          allowed: false,
          error: 'Rate limit exceeded',
          retryAfter: burstData.resetTime ? Math.ceil((burstData.resetTime - Date.now()) / 1000) : 60
        };
      }

      // Check daily limit
      const today = new Date().toISOString().split('T')[0];
      const dailyUsage = await this.env.DB.prepare(
        'SELECT request_count FROM usage_logs WHERE user_id = ? AND date = ? AND endpoint = ?'
      ).bind(userId, today, endpoint).first<{ request_count: number }>();

      const dailyLimit = userType === 'pro' 
        ? parseInt(this.env.PRO_DAILY_LIMIT) 
        : parseInt(this.env.FREE_DAILY_LIMIT);

      const currentUsage = dailyUsage?.request_count || 0;

      if (currentUsage >= dailyLimit) {
        return {
          allowed: false,
          error: 'Daily limit exceeded'
        };
      }

      // Record usage
      await this.env.DB.prepare(
        'INSERT OR REPLACE INTO usage_logs (id, user_id, endpoint, request_count, date) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        this.generateRandomString(),
        userId,
        endpoint,
        currentUsage + 1,
        today
      ).run();

      // Record burst usage
      await rateLimiter.fetch(
        `https://rate-limiter/record?userId=${userId}&userType=${userType}`
      );

      return { allowed: true };

    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true }; // Allow on error to avoid blocking legitimate requests
    }
  }

  /**
   * Handle lyrics API requests with rate limiting
   */
  private async handleLyricsRequest(request: Request, session: SessionData): Promise<Response> {
    const url = new URL(request.url);
    const endpoint = url.pathname;

    // Check rate limits
    const rateLimitResult = await this.checkRateLimit(
      session.userId,
      session.subscription_type,
      endpoint
    );

    if (!rateLimitResult.allowed) {
      const response = new Response(JSON.stringify({
        error: rateLimitResult.error,
        retryAfter: rateLimitResult.retryAfter,
        userType: session.subscription_type
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });

      return this.setCorsHeaders(response);
    }

    // Proxy request to Musixmatch API
    const musixmatchUrl = new URL(`https://api.musixmatch.com/ws/1.1${endpoint}`);
    musixmatchUrl.searchParams.set('apikey', this.env.MUSIXMATCH_API_KEY);
    musixmatchUrl.searchParams.set('format', 'json');

    // Copy query parameters
    url.searchParams.forEach((value, key) => {
      if (key !== 'apikey') {
        musixmatchUrl.searchParams.set(key, value);
      }
    });

    try {
      const musixmatchResponse = await fetch(musixmatchUrl.toString());
      const data = await musixmatchResponse.json();

      const response = new Response(JSON.stringify(data), {
        status: musixmatchResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'X-Rate-Limit-Remaining': (rateLimitResult.allowed ? 'ok' : 'exceeded')
        }
      });

      return this.setCorsHeaders(response);

    } catch (error) {
      console.error('Musixmatch API error:', error);
      const response = new Response(JSON.stringify({ error: 'External API error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });

      return this.setCorsHeaders(response);
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
      return this.handleCors(origin);
    }

    try {
      // Route handling
      const path = url.pathname;

      if (path.startsWith('/auth/')) {
        return this.handleAuthRoutes(request, origin);
      } else if (path.startsWith('/api/')) {
        return this.handleAPIRoutes(request, origin);
      } else if (path.startsWith('/admin/')) {
        return this.handleAdminRoutes(request, origin);
      } else {
        return this.setCorsHeaders(new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }), origin);
      }

    } catch (error) {
      console.error('Request handling error:', error);
      return this.setCorsHeaders(new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }), origin);
    }
  }

  /**
   * Handle authentication routes
   */
  private async handleAuthRoutes(request: Request, origin?: string): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/auth/signup' && request.method === 'POST') {
      const body = await request.json();
      const response = await this.handleAuthRequest(body.email, 'signup');
      return this.setCorsHeaders(response, origin);
    }

    if (path === '/auth/login' && request.method === 'POST') {
      const body = await request.json();
      const response = await this.handleAuthRequest(body.email, 'login');
      return this.setCorsHeaders(response, origin);
    }

    if (path === '/auth/verify' && request.method === 'POST') {
      const body = await request.json();
      const response = await this.handleOTPVerification(body.email, body.code);
      return this.setCorsHeaders(response, origin);
    }

    if (path === '/auth/logout' && request.method === 'POST') {
      const cookie = request.headers.get('Cookie') || '';
      const session = await this.getSessionFromCookie(cookie);
      
      if (session) {
        await this.env.SESSIONS.delete(`session:${session.userId}`);
      }

      const response = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
        }
      });

      return this.setCorsHeaders(response, origin);
    }

    if (path === '/auth/me' && request.method === 'GET') {
      const cookie = request.headers.get('Cookie') || '';
      const session = await this.getSessionFromCookie(cookie);
      
      if (!session) {
        const response = new Response(JSON.stringify({ error: 'Not authenticated' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      const user = await this.env.DB.prepare(
        'SELECT id, email, username, subscription_type, email_verified, created_at FROM users WHERE id = ?'
      ).bind(session.userId).first();

      const response = new Response(JSON.stringify({
        user: {
          id: user?.id,
          email: user?.email,
          username: user?.username || null,
          subscription_type: user?.subscription_type,
          email_verified: user?.email_verified,
          created_at: user?.created_at
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      return this.setCorsHeaders(response, origin);
    }

    return this.setCorsHeaders(new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    }), origin);
  }

  /**
   * Handle API routes (lyrics and user data endpoints)
   */
  private async handleAPIRoutes(request: Request, origin?: string): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Check for Authorization header (Bearer token)
    const authHeader = request.headers.get('Authorization');
    const sessionToken = authHeader ? authHeader.replace('Bearer ', '') : null;
    
    if (!sessionToken) {
      const response = new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }

    // Verify session token
    const session = await this.getSessionFromToken(sessionToken);
    if (!session) {
      const response = new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }

    // Route to appropriate handler
    if (path.startsWith('/api/user/')) {
      return this.handleUserDataRoutes(request, session, origin);
    } else if (path.startsWith('/api/track.')) {
      return await this.handleLyricsRequest(request, session);
    } else {
      const response = new Response(JSON.stringify({ error: 'API endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }
  }

  /**
   * Get session from JWT token
   */
  private async getSessionFromToken(token: string): Promise<SessionData | null> {
    try {
      const payload = await this.verifyJWT(token);
      if (!payload) return null;

      // Get session from KV
      const sessionData = await this.env.SESSIONS.get(`session:${payload.userId}`);
      if (!sessionData) return null;

      const session = JSON.parse(sessionData) as SessionData;
      
      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        await this.env.SESSIONS.delete(`session:${payload.userId}`);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Session verification error:', error);
      return null;
    }
  }

  /**
   * Handle user data routes (folders, bookmarks, notes)
   */
  private async handleUserDataRoutes(request: Request, session: SessionData, origin?: string): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // Folder routes
      if (path === '/api/user/folders' && method === 'GET') {
        return this.getUserFolders(session, origin);
      }
      if (path === '/api/user/folders' && method === 'POST') {
        const body = await request.json();
        return this.createUserFolder(session, body, origin);
      }
      if (path.startsWith('/api/user/folders/') && method === 'PUT') {
        const folderId = path.split('/')[4];
        const body = await request.json();
        return this.updateUserFolder(session, folderId, body, origin);
      }
      if (path.startsWith('/api/user/folders/') && method === 'DELETE') {
        const folderId = path.split('/')[4];
        return this.deleteUserFolder(session, folderId, origin);
      }

      // Bookmark routes
      if (path === '/api/user/bookmarks' && method === 'GET') {
        return this.getUserBookmarks(session, origin);
      }
      if (path === '/api/user/bookmarks' && method === 'POST') {
        const body = await request.json();
        return this.createUserBookmark(session, body, origin);
      }
      if (path.startsWith('/api/user/bookmarks/') && method === 'PUT') {
        const bookmarkId = path.split('/')[4];
        const body = await request.json();
        return this.updateUserBookmark(session, bookmarkId, body, origin);
      }
      if (path.startsWith('/api/user/bookmarks/') && method === 'DELETE') {
        const bookmarkId = path.split('/')[4];
        return this.deleteUserBookmark(session, bookmarkId, origin);
      }

      // Notes routes
      if (path === '/api/user/notes' && method === 'GET') {
        return this.getUserNotes(session, origin);
      }
      if (path === '/api/user/notes' && method === 'POST') {
        const body = await request.json();
        return this.createUserNote(session, body, origin);
      }
      if (path.startsWith('/api/user/notes/') && method === 'PUT') {
        const noteId = path.split('/')[4];
        const body = await request.json();
        return this.updateUserNote(session, noteId, body, origin);
      }
      if (path.startsWith('/api/user/notes/') && method === 'DELETE') {
        const noteId = path.split('/')[4];
        return this.deleteUserNote(session, noteId, origin);
      }

      // Username routes
      if (path === '/api/user/username' && method === 'POST') {
        const body = await request.json();
        return this.setUsername(session, body, origin);
      }
      if (path === '/api/user/profile' && method === 'GET') {
        return this.getUserProfile(session, origin);
      }

      // Test endpoint (temporary)
      if (path === '/api/test' && method === 'GET') {
        const response = new Response(JSON.stringify({
          success: true,
          message: 'API is working',
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      const response = new Response(JSON.stringify({ error: 'User data endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);

    } catch (error) {
      console.error('User data route error:', error);
      const response = new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }
  }

  /**
   * Handle admin routes (placeholder)
   */
  private async handleAdminRoutes(request: Request, origin?: string): Promise<Response> {
    // TODO: Implement admin authentication and routes
    const response = new Response(JSON.stringify({ error: 'Admin routes not implemented yet' }), {
      status: 501,
      headers: { 'Content-Type': 'application/json' }
    });

    return this.setCorsHeaders(response, origin);
  }

  // ===== FOLDER MANAGEMENT METHODS =====

  /**
   * Get user's folders
   */
  private async getUserFolders(session: SessionData, origin?: string): Promise<Response> {
    try {
      const folders = await this.env.DB.prepare(
        'SELECT * FROM user_folders WHERE user_id = ? ORDER BY created_at ASC'
      ).bind(session.userId).all();

      const response = new Response(JSON.stringify({
        success: true,
        folders: folders.results
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      return this.setCorsHeaders(response, origin);
    } catch (error) {
      console.error('Get folders error:', error);
      const response = new Response(JSON.stringify({ error: 'Failed to get folders' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }
  }

  /**
   * Create new folder (with 3-folder limit for free users)
   */
  private async createUserFolder(session: SessionData, body: any, origin?: string): Promise<Response> {
    try {
      const { folder_name } = body;
      
      if (!folder_name || typeof folder_name !== 'string' || folder_name.trim().length === 0) {
        const response = new Response(JSON.stringify({ error: 'Folder name is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      // Check folder count limit for free users
      if (session.subscription_type === 'free') {
        const folderCount = await this.env.DB.prepare(
          'SELECT COUNT(*) as count FROM user_folders WHERE user_id = ?'
        ).bind(session.userId).first();

        if (folderCount && folderCount.count >= 3) {
          const response = new Response(JSON.stringify({ 
            error: 'Folder limit reached',
            message: 'Free users can create up to 3 folders. Upgrade to Pro for unlimited folders.',
            limit: 3,
            current: folderCount.count
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
          return this.setCorsHeaders(response, origin);
        }
      }

      const folderId = this.generateRandomString();
      await this.env.DB.prepare(
        'INSERT INTO user_folders (id, user_id, folder_name) VALUES (?, ?, ?)'
      ).bind(folderId, session.userId, folder_name.trim()).run();

      const response = new Response(JSON.stringify({
        success: true,
        message: 'Folder created successfully',
        folder: {
          id: folderId,
          user_id: session.userId,
          folder_name: folder_name.trim(),
          created_at: new Date().toISOString()
        }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

      return this.setCorsHeaders(response, origin);
    } catch (error) {
      console.error('Create folder error:', error);
      const response = new Response(JSON.stringify({ error: 'Failed to create folder' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }
  }

  /**
   * Update folder name
   */
  private async updateUserFolder(session: SessionData, folderId: string, body: any, origin?: string): Promise<Response> {
    try {
      const { folder_name } = body;
      
      if (!folder_name || typeof folder_name !== 'string' || folder_name.trim().length === 0) {
        const response = new Response(JSON.stringify({ error: 'Folder name is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      const result = await this.env.DB.prepare(
        'UPDATE user_folders SET folder_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
      ).bind(folder_name.trim(), folderId, session.userId).run();

      if (result.changes === 0) {
        const response = new Response(JSON.stringify({ error: 'Folder not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      const response = new Response(JSON.stringify({
        success: true,
        message: 'Folder updated successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      return this.setCorsHeaders(response, origin);
    } catch (error) {
      console.error('Update folder error:', error);
      const response = new Response(JSON.stringify({ error: 'Failed to update folder' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }
  }

  /**
   * Delete folder
   */
  private async deleteUserFolder(session: SessionData, folderId: string, origin?: string): Promise<Response> {
    try {
      const result = await this.env.DB.prepare(
        'DELETE FROM user_folders WHERE id = ? AND user_id = ?'
      ).bind(folderId, session.userId).run();

      if (result.changes === 0) {
        const response = new Response(JSON.stringify({ error: 'Folder not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      const response = new Response(JSON.stringify({
        success: true,
        message: 'Folder deleted successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      return this.setCorsHeaders(response, origin);
    } catch (error) {
      console.error('Delete folder error:', error);
      const response = new Response(JSON.stringify({ error: 'Failed to delete folder' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }
  }

  // ===== BOOKMARK MANAGEMENT METHODS =====

  /**
   * Get user's bookmarks
   */
  private async getUserBookmarks(session: SessionData, origin?: string): Promise<Response> {
    try {
      const bookmarks = await this.env.DB.prepare(`
        SELECT b.*, f.folder_name 
        FROM user_bookmarks b 
        LEFT JOIN user_folders f ON b.folder_id = f.id 
        WHERE b.user_id = ? 
        ORDER BY b.created_at DESC
      `).bind(session.userId).all();

      const response = new Response(JSON.stringify({
        success: true,
        bookmarks: bookmarks.results
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      return this.setCorsHeaders(response, origin);
    } catch (error) {
      console.error('Get bookmarks error:', error);
      const response = new Response(JSON.stringify({ error: 'Failed to get bookmarks' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }
  }

  /**
   * Create new bookmark
   */
  private async createUserBookmark(session: SessionData, body: any, origin?: string): Promise<Response> {
    try {
      const { song_title, artist_name, folder_id } = body;
      
      if (!song_title || !artist_name) {
        const response = new Response(JSON.stringify({ error: 'Song title and artist name are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      // Verify folder belongs to user if provided
      if (folder_id) {
        const folder = await this.env.DB.prepare(
          'SELECT id FROM user_folders WHERE id = ? AND user_id = ?'
        ).bind(folder_id, session.userId).first();

        if (!folder) {
          const response = new Response(JSON.stringify({ error: 'Folder not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
          return this.setCorsHeaders(response, origin);
        }
      }

      const bookmarkId = this.generateRandomString();
      await this.env.DB.prepare(
        'INSERT INTO user_bookmarks (id, user_id, folder_id, song_title, artist_name) VALUES (?, ?, ?, ?, ?)'
      ).bind(bookmarkId, session.userId, folder_id || null, song_title.trim(), artist_name.trim()).run();

      const response = new Response(JSON.stringify({
        success: true,
        message: 'Bookmark created successfully',
        bookmark: {
          id: bookmarkId,
          user_id: session.userId,
          folder_id: folder_id || null,
          song_title: song_title.trim(),
          artist_name: artist_name.trim(),
          created_at: new Date().toISOString()
        }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

      return this.setCorsHeaders(response, origin);
    } catch (error) {
      console.error('Create bookmark error:', error);
      const response = new Response(JSON.stringify({ error: 'Failed to create bookmark' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }
  }

  /**
   * Update bookmark (move between folders)
   */
  private async updateUserBookmark(session: SessionData, bookmarkId: string, body: any, origin?: string): Promise<Response> {
    try {
      const { folder_id } = body;

      // Verify folder belongs to user if provided
      if (folder_id) {
        const folder = await this.env.DB.prepare(
          'SELECT id FROM user_folders WHERE id = ? AND user_id = ?'
        ).bind(folder_id, session.userId).first();

        if (!folder) {
          const response = new Response(JSON.stringify({ error: 'Folder not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
          return this.setCorsHeaders(response, origin);
        }
      }

      const result = await this.env.DB.prepare(
        'UPDATE user_bookmarks SET folder_id = ? WHERE id = ? AND user_id = ?'
      ).bind(folder_id || null, bookmarkId, session.userId).run();

      if (result.changes === 0) {
        const response = new Response(JSON.stringify({ error: 'Bookmark not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      const response = new Response(JSON.stringify({
        success: true,
        message: 'Bookmark updated successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      return this.setCorsHeaders(response, origin);
    } catch (error) {
      console.error('Update bookmark error:', error);
      const response = new Response(JSON.stringify({ error: 'Failed to update bookmark' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }
  }

  /**
   * Delete bookmark
   */
  private async deleteUserBookmark(session: SessionData, bookmarkId: string, origin?: string): Promise<Response> {
    try {
      const result = await this.env.DB.prepare(
        'DELETE FROM user_bookmarks WHERE id = ? AND user_id = ?'
      ).bind(bookmarkId, session.userId).run();

      if (result.changes === 0) {
        const response = new Response(JSON.stringify({ error: 'Bookmark not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      const response = new Response(JSON.stringify({
        success: true,
        message: 'Bookmark deleted successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      return this.setCorsHeaders(response, origin);
    } catch (error) {
      console.error('Delete bookmark error:', error);
      const response = new Response(JSON.stringify({ error: 'Failed to delete bookmark' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }
  }

  // ===== NOTES MANAGEMENT METHODS =====

  /**
   * Get user's notes
   */
  private async getUserNotes(session: SessionData, origin?: string): Promise<Response> {
    try {
      const notes = await this.env.DB.prepare(
        'SELECT * FROM user_notes WHERE user_id = ? ORDER BY updated_at DESC'
      ).bind(session.userId).all();

      const response = new Response(JSON.stringify({
        success: true,
        notes: notes.results
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      return this.setCorsHeaders(response, origin);
    } catch (error) {
      console.error('Get notes error:', error);
      const response = new Response(JSON.stringify({ error: 'Failed to get notes' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }
  }

  /**
   * Create new note (with 10-note limit for free users)
   */
  private async createUserNote(session: SessionData, body: any, origin?: string): Promise<Response> {
    try {
      const { note_title, note_content, artist_name, song_name } = body;
      
      if (!note_title || !note_content) {
        const response = new Response(JSON.stringify({ error: 'Note title and content are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      // Check note count limit for free users
      if (session.subscription_type === 'free') {
        const noteCount = await this.env.DB.prepare(
          'SELECT COUNT(*) as count FROM user_notes WHERE user_id = ?'
        ).bind(session.userId).first();

        if (noteCount && noteCount.count >= 10) {
          const response = new Response(JSON.stringify({ 
            error: 'Note limit reached',
            message: 'Free users can create up to 10 notes. Upgrade to Pro for unlimited notes.',
            limit: 10,
            current: noteCount.count
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
          return this.setCorsHeaders(response, origin);
        }
      }

      const noteId = this.generateRandomString();
      await this.env.DB.prepare(
        'INSERT INTO user_notes (id, user_id, note_title, note_content, artist_name, song_name) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        noteId, 
        session.userId, 
        note_title.trim(), 
        note_content.trim(),
        artist_name ? artist_name.trim() : null,
        song_name ? song_name.trim() : null
      ).run();

      const response = new Response(JSON.stringify({
        success: true,
        message: 'Note created successfully',
        note: {
          id: noteId,
          user_id: session.userId,
          note_title: note_title.trim(),
          note_content: note_content.trim(),
          artist_name: artist_name ? artist_name.trim() : null,
          song_name: song_name ? song_name.trim() : null,
          created_at: new Date().toISOString()
        }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

      return this.setCorsHeaders(response, origin);
    } catch (error) {
      console.error('Create note error:', error);
      const response = new Response(JSON.stringify({ error: 'Failed to create note' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }
  }

  /**
   * Update note
   */
  private async updateUserNote(session: SessionData, noteId: string, body: any, origin?: string): Promise<Response> {
    try {
      const { note_title, note_content, artist_name, song_name } = body;
      
      if (!note_title || !note_content) {
        const response = new Response(JSON.stringify({ error: 'Note title and content are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      const result = await this.env.DB.prepare(
        'UPDATE user_notes SET note_title = ?, note_content = ?, artist_name = ?, song_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
      ).bind(
        note_title.trim(), 
        note_content.trim(),
        artist_name ? artist_name.trim() : null,
        song_name ? song_name.trim() : null,
        noteId, 
        session.userId
      ).run();

      if (result.changes === 0) {
        const response = new Response(JSON.stringify({ error: 'Note not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      const response = new Response(JSON.stringify({
        success: true,
        message: 'Note updated successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      return this.setCorsHeaders(response, origin);
    } catch (error) {
      console.error('Update note error:', error);
      const response = new Response(JSON.stringify({ error: 'Failed to update note' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }
  }

  /**
   * Delete note
   */
  private async deleteUserNote(session: SessionData, noteId: string, origin?: string): Promise<Response> {
    try {
      const result = await this.env.DB.prepare(
        'DELETE FROM user_notes WHERE id = ? AND user_id = ?'
      ).bind(noteId, session.userId).run();

      if (result.changes === 0) {
        const response = new Response(JSON.stringify({ error: 'Note not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      const response = new Response(JSON.stringify({
        success: true,
        message: 'Note deleted successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      return this.setCorsHeaders(response, origin);
    } catch (error) {
      console.error('Delete note error:', error);
      const response = new Response(JSON.stringify({ error: 'Failed to delete note' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }
  }

  // ===== USERNAME MANAGEMENT METHODS =====

  /**
   * Set username
   */
  private async setUsername(session: SessionData, body: any, origin?: string): Promise<Response> {
    try {
      const { username } = body;
      
      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        const response = new Response(JSON.stringify({ error: 'Username is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      const trimmedUsername = username.trim();
      
      // Validate username format
      if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
        const response = new Response(JSON.stringify({ error: 'Username must be 3-20 characters long' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
        const response = new Response(JSON.stringify({ error: 'Username can only contain letters, numbers, and underscores' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      // Check if username is already taken
      const existingUser = await this.env.DB.prepare(
        'SELECT id FROM users WHERE username = ? AND id != ?'
      ).bind(trimmedUsername, session.userId).first();

      if (existingUser) {
        const response = new Response(JSON.stringify({ error: 'Username is already taken' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      await this.env.DB.prepare(
        'UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(trimmedUsername, session.userId).run();

      const response = new Response(JSON.stringify({
        success: true,
        message: 'Username set successfully',
        username: trimmedUsername
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      return this.setCorsHeaders(response, origin);
    } catch (error) {
      console.error('Set username error:', error);
      const response = new Response(JSON.stringify({ error: 'Failed to set username' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }
  }

  /**
   * Get user profile
   */
  private async getUserProfile(session: SessionData, origin?: string): Promise<Response> {
    try {
      const user = await this.env.DB.prepare(
        'SELECT id, email, username, subscription_type, email_verified, created_at, last_login_at FROM users WHERE id = ?'
      ).bind(session.userId).first();

      if (!user) {
        const response = new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
        return this.setCorsHeaders(response, origin);
      }

      const response = new Response(JSON.stringify({
        success: true,
        user: user
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      return this.setCorsHeaders(response, origin);
    } catch (error) {
      console.error('Get profile error:', error);
      const response = new Response(JSON.stringify({ error: 'Failed to get profile' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return this.setCorsHeaders(response, origin);
    }
  }
}

/**
 * Cloudflare Worker entry point
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const api = new AuthAPI(env);
    return api.handleRequest(request);
  }
};

export { RateLimiter };
