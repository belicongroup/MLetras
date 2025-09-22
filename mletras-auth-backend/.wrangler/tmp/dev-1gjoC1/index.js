var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-WspGQi/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/rate-limiter.ts
var RateLimiter = class {
  static {
    __name(this, "RateLimiter");
  }
  state;
  env;
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  async fetch(request) {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const userType = url.searchParams.get("userType") || "free";
    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const config = this.getRateLimitConfig(userType);
    try {
      switch (url.pathname) {
        case "/check":
          return await this.checkRateLimit(userId, config);
        case "/record":
          return await this.recordRequest(userId, config);
        case "/reset":
          return await this.resetRateLimit(userId);
        default:
          return new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
      }
    } catch (error) {
      console.error("RateLimiter error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  getRateLimitConfig(userType) {
    const burstWindowSeconds = parseInt(this.env.BURST_WINDOW_SECONDS || "60");
    if (userType === "pro") {
      return {
        burstLimit: parseInt(this.env.PRO_BURST_LIMIT || "20"),
        windowSeconds: burstWindowSeconds
      };
    } else {
      return {
        burstLimit: parseInt(this.env.FREE_BURST_LIMIT || "5"),
        windowSeconds: burstWindowSeconds
      };
    }
  }
  async checkRateLimit(userId, config) {
    const stateKey = `rate_limit_${userId}`;
    const stored = await this.state.storage.get(stateKey);
    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1e3;
    let rateLimitState = stored || {
      requests: [],
      lastReset: now
    };
    rateLimitState.requests = rateLimitState.requests.filter(
      (req) => req.timestamp > windowStart
    );
    const currentRequests = rateLimitState.requests.length;
    const isAllowed = currentRequests < config.burstLimit;
    return new Response(JSON.stringify({
      allowed: isAllowed,
      currentRequests,
      limit: config.burstLimit,
      windowSeconds: config.windowSeconds,
      resetTime: windowStart + config.windowSeconds * 1e3
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
  async recordRequest(userId, config) {
    const stateKey = `rate_limit_${userId}`;
    const stored = await this.state.storage.get(stateKey);
    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1e3;
    let rateLimitState = stored || {
      requests: [],
      lastReset: now
    };
    rateLimitState.requests = rateLimitState.requests.filter(
      (req) => req.timestamp > windowStart
    );
    if (rateLimitState.requests.length >= config.burstLimit) {
      return new Response(JSON.stringify({
        allowed: false,
        error: "Rate limit exceeded",
        currentRequests: rateLimitState.requests.length,
        limit: config.burstLimit,
        retryAfter: Math.ceil((rateLimitState.requests[0].timestamp + config.windowSeconds * 1e3 - now) / 1e3)
      }), {
        status: 429,
        headers: { "Content-Type": "application/json" }
      });
    }
    rateLimitState.requests.push({ timestamp: now });
    await this.state.storage.put(stateKey, rateLimitState);
    return new Response(JSON.stringify({
      allowed: true,
      currentRequests: rateLimitState.requests.length,
      limit: config.burstLimit
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
  async resetRateLimit(userId) {
    const stateKey = `rate_limit_${userId}`;
    await this.state.storage.delete(stateKey);
    return new Response(JSON.stringify({
      success: true,
      message: "Rate limit reset"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
};

// src/index.ts
var AuthAPI = class {
  static {
    __name(this, "AuthAPI");
  }
  env;
  allowedOrigins;
  constructor(env) {
    this.env = env;
    this.allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim());
  }
  /**
   * Handle CORS preflight requests
   */
  handleCors(origin) {
    const headers = new Headers();
    if (origin && this.allowedOrigins.includes(origin)) {
      headers.set("Access-Control-Allow-Origin", origin);
    } else if (this.allowedOrigins.includes("*")) {
      headers.set("Access-Control-Allow-Origin", "*");
    } else {
      headers.set("Access-Control-Allow-Origin", this.allowedOrigins[0]);
    }
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Max-Age", "86400");
    return new Response(null, { status: 204, headers });
  }
  /**
   * Set CORS headers on response
   */
  setCorsHeaders(response, origin) {
    const headers = new Headers(response.headers);
    if (origin && this.allowedOrigins.includes(origin)) {
      headers.set("Access-Control-Allow-Origin", origin);
    } else if (this.allowedOrigins.includes("*")) {
      headers.set("Access-Control-Allow-Origin", "*");
    } else {
      headers.set("Access-Control-Allow-Origin", this.allowedOrigins[0]);
    }
    headers.set("Access-Control-Allow-Credentials", "true");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
  /**
   * Generate a secure random string
   */
  generateRandomString(length = 32) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
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
  generateOTP() {
    return Math.floor(1e5 + Math.random() * 9e5).toString();
  }
  /**
   * Send OTP email using Resend
   */
  async sendOTPEmail(email, code, type) {
    try {
      if (this.env.ENVIRONMENT === "development") {
        console.log(`[DEV] OTP for ${email}: ${code}`);
        return true;
      }
      const emailType = type === "signup" ? "sign up" : "log in";
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
                <div class="logo">\u{1F3B5} MLetras</div>
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
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.env.EMAIL_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "MLetras <noreply@mail.mletras.com>",
          to: [email],
          subject,
          html: htmlContent,
          text: textContent
        })
      });
      if (!response.ok) {
        const errorData = await response.text();
        console.error("Resend API error:", response.status, errorData);
        return false;
      }
      const result = await response.json();
      console.log(`OTP email sent successfully to ${email}, message ID: ${result.id}`);
      return true;
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      return false;
    }
  }
  /**
   * Create JWT token
   */
  async createJWT(payload) {
    const header = { alg: "HS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1e3);
    const jwtPayload = {
      ...payload,
      iat: now,
      exp: now + 24 * 60 * 60
      // 24 hours
    };
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(jwtPayload));
    const signature = await crypto.subtle.sign(
      "HMAC",
      await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(this.env.JWT_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      ),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    );
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  }
  /**
   * Verify JWT token
   */
  async verifyJWT(token) {
    try {
      const [header, payload, signature] = token.split(".");
      const expectedSignature = await crypto.subtle.sign(
        "HMAC",
        await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(this.env.JWT_SECRET),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        ),
        new TextEncoder().encode(`${header}.${payload}`)
      );
      const expectedSignatureB64 = btoa(String.fromCharCode(...new Uint8Array(expectedSignature)));
      if (signature !== expectedSignatureB64) {
        return null;
      }
      const decodedPayload = JSON.parse(atob(payload));
      if (decodedPayload.exp < Math.floor(Date.now() / 1e3)) {
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
  async getSessionFromCookie(cookie) {
    const match = cookie.match(/session=([^;]+)/);
    if (!match) return null;
    try {
      const token = match[1];
      const payload = await this.verifyJWT(token);
      if (!payload) return null;
      const sessionData = await this.env.SESSIONS.get(`session:${payload.userId}`);
      if (!sessionData) return null;
      const session = JSON.parse(sessionData);
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
  async createSession(user) {
    const sessionData = {
      userId: user.id,
      email: user.email,
      subscription_type: user.subscription_type,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1e3
      // 24 hours
    };
    const token = await this.createJWT({
      userId: user.id,
      email: user.email,
      subscription_type: user.subscription_type
    });
    await this.env.SESSIONS.put(`session:${user.id}`, JSON.stringify(sessionData), {
      expirationTtl: 24 * 60 * 60
      // 24 hours
    });
    return token;
  }
  /**
   * Handle signup/login request
   */
  async handleAuthRequest(email, type) {
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({ error: "Invalid email format" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await this.env.DB.prepare(
        "SELECT * FROM users WHERE email = ?"
      ).bind(normalizedEmail).first();
      let userId;
      let isNewUser = false;
      if (existingUser) {
        userId = existingUser.id;
        await this.env.DB.prepare(
          "UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).bind(userId).run();
      } else {
        if (type === "login") {
          return new Response(JSON.stringify({ error: "User not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        userId = this.generateRandomString();
        await this.env.DB.prepare(
          "INSERT INTO users (id, email, email_verified, subscription_type) VALUES (?, ?, ?, ?)"
        ).bind(userId, normalizedEmail, false, "free").run();
        isNewUser = true;
      }
      const otpCode = this.generateOTP();
      const otpId = this.generateRandomString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
      await this.env.DB.prepare(
        "INSERT INTO otps (id, user_id, email, code, type, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(otpId, userId, normalizedEmail, otpCode, type, expiresAt.toISOString()).run();
      const emailSent = await this.sendOTPEmail(normalizedEmail, otpCode, type);
      if (!emailSent) {
        return new Response(JSON.stringify({ error: "Failed to send OTP email" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({
        success: true,
        message: `OTP sent to ${normalizedEmail}`,
        isNewUser,
        expiresIn: 600
        // 10 minutes in seconds
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Auth request error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  /**
   * Handle OTP verification
   */
  async handleOTPVerification(email, code) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const otp = await this.env.DB.prepare(
        "SELECT * FROM otps WHERE email = ? AND code = ? AND used_at IS NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 1"
      ).bind(normalizedEmail, code, (/* @__PURE__ */ new Date()).toISOString()).first();
      if (!otp) {
        return new Response(JSON.stringify({ error: "Invalid or expired OTP" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      await this.env.DB.prepare(
        "UPDATE otps SET used_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(otp.id).run();
      let user = await this.env.DB.prepare(
        "SELECT * FROM users WHERE email = ?"
      ).bind(normalizedEmail).first();
      if (!user) {
        const userId = this.generateRandomString();
        await this.env.DB.prepare(
          "INSERT INTO users (id, email, email_verified, subscription_type, last_login_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)"
        ).bind(userId, normalizedEmail, true, "free").run();
        user = await this.env.DB.prepare(
          "SELECT * FROM users WHERE id = ?"
        ).bind(userId).first();
      } else {
        await this.env.DB.prepare(
          "UPDATE users SET email_verified = TRUE, last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).bind(user.id).run();
        user.email_verified = true;
      }
      const sessionToken = await this.createSession(user);
      return new Response(JSON.stringify({
        success: true,
        message: "Authentication successful",
        user: {
          id: user.id,
          email: user.email,
          subscription_type: user.subscription_type,
          email_verified: user.email_verified
        },
        sessionToken
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}; Path=/`
        }
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  /**
   * Check rate limits and record usage
   */
  async checkRateLimit(userId, userType, endpoint) {
    try {
      const rateLimiterId = this.env.RATE_LIMITER.idFromName(userId);
      const rateLimiter = this.env.RATE_LIMITER.get(rateLimiterId);
      const burstResponse = await rateLimiter.fetch(
        `https://rate-limiter/check?userId=${userId}&userType=${userType}`
      );
      const burstData = await burstResponse.json();
      if (!burstData.allowed) {
        return {
          allowed: false,
          error: "Rate limit exceeded",
          retryAfter: burstData.resetTime ? Math.ceil((burstData.resetTime - Date.now()) / 1e3) : 60
        };
      }
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const dailyUsage = await this.env.DB.prepare(
        "SELECT request_count FROM usage_logs WHERE user_id = ? AND date = ? AND endpoint = ?"
      ).bind(userId, today, endpoint).first();
      const dailyLimit = userType === "pro" ? parseInt(this.env.PRO_DAILY_LIMIT) : parseInt(this.env.FREE_DAILY_LIMIT);
      const currentUsage = dailyUsage?.request_count || 0;
      if (currentUsage >= dailyLimit) {
        return {
          allowed: false,
          error: "Daily limit exceeded"
        };
      }
      await this.env.DB.prepare(
        "INSERT OR REPLACE INTO usage_logs (id, user_id, endpoint, request_count, date) VALUES (?, ?, ?, ?, ?)"
      ).bind(
        this.generateRandomString(),
        userId,
        endpoint,
        currentUsage + 1,
        today
      ).run();
      await rateLimiter.fetch(
        `https://rate-limiter/record?userId=${userId}&userType=${userType}`
      );
      return { allowed: true };
    } catch (error) {
      console.error("Rate limit check error:", error);
      return { allowed: true };
    }
  }
  /**
   * Handle lyrics API requests with rate limiting
   */
  async handleLyricsRequest(request, session) {
    const url = new URL(request.url);
    const endpoint = url.pathname;
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
        headers: { "Content-Type": "application/json" }
      });
      return this.setCorsHeaders(response);
    }
    const musixmatchUrl = new URL(`https://api.musixmatch.com/ws/1.1${endpoint}`);
    musixmatchUrl.searchParams.set("apikey", this.env.MUSIXMATCH_API_KEY);
    musixmatchUrl.searchParams.set("format", "json");
    url.searchParams.forEach((value, key) => {
      if (key !== "apikey") {
        musixmatchUrl.searchParams.set(key, value);
      }
    });
    try {
      const musixmatchResponse = await fetch(musixmatchUrl.toString());
      const data = await musixmatchResponse.json();
      const response = new Response(JSON.stringify(data), {
        status: musixmatchResponse.status,
        headers: {
          "Content-Type": "application/json",
          "X-Rate-Limit-Remaining": rateLimitResult.allowed ? "ok" : "exceeded"
        }
      });
      return this.setCorsHeaders(response);
    } catch (error) {
      console.error("Musixmatch API error:", error);
      const response = new Response(JSON.stringify({ error: "External API error" }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
      return this.setCorsHeaders(response);
    }
  }
  /**
   * Main request handler
   */
  async handleRequest(request) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") {
      return this.handleCors(origin);
    }
    try {
      const path = url.pathname;
      if (path.startsWith("/auth/")) {
        return this.handleAuthRoutes(request, origin);
      } else if (path.startsWith("/api/")) {
        return this.handleAPIRoutes(request, origin);
      } else if (path.startsWith("/admin/")) {
        return this.handleAdminRoutes(request, origin);
      } else {
        return this.setCorsHeaders(new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }), origin);
      }
    } catch (error) {
      console.error("Request handling error:", error);
      return this.setCorsHeaders(new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }), origin);
    }
  }
  /**
   * Handle authentication routes
   */
  async handleAuthRoutes(request, origin) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/auth/signup" && request.method === "POST") {
      const body = await request.json();
      const response = await this.handleAuthRequest(body.email, "signup");
      return this.setCorsHeaders(response, origin);
    }
    if (path === "/auth/login" && request.method === "POST") {
      const body = await request.json();
      const response = await this.handleAuthRequest(body.email, "login");
      return this.setCorsHeaders(response, origin);
    }
    if (path === "/auth/verify" && request.method === "POST") {
      const body = await request.json();
      const response = await this.handleOTPVerification(body.email, body.code);
      return this.setCorsHeaders(response, origin);
    }
    if (path === "/auth/logout" && request.method === "POST") {
      const cookie = request.headers.get("Cookie") || "";
      const session = await this.getSessionFromCookie(cookie);
      if (session) {
        await this.env.SESSIONS.delete(`session:${session.userId}`);
      }
      const response = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": "session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/"
        }
      });
      return this.setCorsHeaders(response, origin);
    }
    if (path === "/auth/me" && request.method === "GET") {
      const cookie = request.headers.get("Cookie") || "";
      const session = await this.getSessionFromCookie(cookie);
      if (!session) {
        const response2 = new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
        return this.setCorsHeaders(response2, origin);
      }
      const user = await this.env.DB.prepare(
        "SELECT id, email, subscription_type, email_verified, created_at FROM users WHERE id = ?"
      ).bind(session.userId).first();
      const response = new Response(JSON.stringify({
        user: {
          id: user?.id,
          email: user?.email,
          subscription_type: user?.subscription_type,
          email_verified: user?.email_verified,
          created_at: user?.created_at
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      return this.setCorsHeaders(response, origin);
    }
    return this.setCorsHeaders(new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    }), origin);
  }
  /**
   * Handle API routes (lyrics endpoints)
   */
  async handleAPIRoutes(request, origin) {
    const cookie = request.headers.get("Cookie") || "";
    const session = await this.getSessionFromCookie(cookie);
    if (!session) {
      const response = new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
      return this.setCorsHeaders(response, origin);
    }
    return await this.handleLyricsRequest(request, session);
  }
  /**
   * Handle admin routes (placeholder)
   */
  async handleAdminRoutes(request, origin) {
    const response = new Response(JSON.stringify({ error: "Admin routes not implemented yet" }), {
      status: 501,
      headers: { "Content-Type": "application/json" }
    });
    return this.setCorsHeaders(response, origin);
  }
};
var src_default = {
  async fetch(request, env, ctx) {
    const api = new AuthAPI(env);
    return api.handleRequest(request);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-WspGQi/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-WspGQi/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  RateLimiter,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
