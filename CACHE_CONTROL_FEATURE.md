# Manual Cache Control Feature - Design Document

**Date:** 2025-01-XX  
**Status:** ✅ Implemented

## Overview

This feature allows manual selection of which users get served from cache vs fresh data from the Musixmatch API. A new hybrid proxy worker (`mletras-hybrid-proxy`) has been created that provides fine-grained control over caching behavior per user.

## Current Architecture

### Workers
1. **`mletras-api-proxy`** (`cloudflare-worker/index.js`)
   - Simple proxy, no caching
   - Currently in use
   - Route: `/musixmatch/*`

2. **`mletras-smart-proxy`** (`cloudflare-smart-proxy/src/index.ts`)
   - Has KV caching (`MUSIXMATCH_CACHE`)
   - Currently NOT in use (migrated away for ToS compliance)
   - Route: Direct endpoints (e.g., `/track.search`)

3. **`mletras-auth-backend`** (`mletras-auth-backend/src/index.ts`)
   - Handles authentication
   - Has D1 database access (`mletras-auth-db`)
   - Can identify users via Bearer tokens (JWT session tokens)

### Database
- **D1 Database:** `mletras-auth-db`
- **Users Table Schema:**
  - `id` (TEXT PRIMARY KEY)
  - `email` (TEXT UNIQUE)
  - `username` (TEXT UNIQUE)
  - `email_verified` (BOOLEAN)
  - `subscription_type` (TEXT: 'free' | 'pro')
  - `created_at` (DATETIME)
  - `updated_at` (DATETIME)
  - `last_login_at` (DATETIME)
  - `is_active` (BOOLEAN)
  - `metadata` (JSON)

### KV Namespaces
- `MUSIXMATCH_CACHE` - Cache for Musixmatch API responses
- `MUSIXMATCH_CACHE_preview` - Preview cache
- `SESSIONS` - User session storage

## Implementation Summary

### ✅ Solution: New Hybrid Worker

**Decision:** Created a new worker `mletras-hybrid-proxy` that:
- Does NOT modify existing workers (`mletras-api-proxy` or `mletras-smart-proxy`)
- Provides both FRESH (default) and CACHED (opt-in) modes
- Uses D1 database for user allowlist
- Only caches successful 200 responses
- Supports Bearer token authentication or user_id query parameter

### Answers to Questions

### 1. Worker Selection
- [x] **Q1:** Which worker should be modified?
  - ✅ **Answer:** Created new hybrid worker (`mletras-hybrid-proxy`)
  - **Location:** `cloudflare-hybrid-proxy/`
  - **Hostname:** `mletras-hybrid-proxy.belicongroup.workers.dev`

### 2. User Identification
- [x] **Q2:** How should users be identified in the worker?
  - ✅ **Answer:** Both methods supported:
    - **Primary:** Bearer token (calls auth backend API if `AUTH_API_URL` is set)
    - **Fallback:** `user_id` query parameter (for testing/debugging)
  - **Implementation:** Worker checks Bearer token first, falls back to query param

### 3. Flag Storage
- [x] **Q3:** Where should the cache control flag be stored?
  - ✅ **Answer:** Both methods supported (worker checks both):
    - **Primary:** New `use_cache` BOOLEAN column in `users` table
    - **Alternative:** `metadata` JSON column with `{"use_cache": 1}`
  - **Performance:** Allowlist checks are cached in KV for 5 minutes to reduce DB queries

### 4. Flag Name & Values
- [x] **Q4:** What should the flag be called and what values should it have?
  - ✅ **Answer:** `use_cache` (BOOLEAN)
    - `1` or `true` = user can use cache (CACHED mode)
    - `0` or `false` or `NULL` = user gets fresh data (FRESH mode)

### 5. Default Behavior
- [x] **Q5:** What should be the default behavior for users without the flag set?
  - ✅ **Answer:** FRESH mode (always fetch from API, no caching)
  - **Rationale:** ToS compliant, safer default, opt-in caching only

### 6. Manual Selection Method
- [x] **Q6:** How should admins manually select which users get cache vs fresh?
  - ✅ **Answer:** Direct database edit via Cloudflare D1 Studio (as shown in screenshots)
  - **SQL Examples:**
    ```sql
    -- Enable cache for user
    UPDATE users SET use_cache = 1 WHERE id = 'user-id';
    
    -- Disable cache for user
    UPDATE users SET use_cache = 0 WHERE id = 'user-id';
    ```

### 7. Scope
- [x] **Q7:** Should this apply to all endpoints or specific ones?
  - ✅ **Answer:** All allowed Musixmatch endpoints
  - **Allowed endpoints:** `track.search`, `track.lyrics.get`, `track.get`, `artist.search`, `artist.get`
  - **Extensible:** Easy to add more endpoints to `ALLOWED_ENDPOINTS` array

### 8. Performance Considerations
- [x] **Q8:** Should we cache the user's cache preference to avoid DB lookups on every request?
  - ✅ **Answer:** Yes, cache in KV with 5-minute TTL
  - **Implementation:** Key format: `cache_allowlist:{userId}`, Value: `true` or `false`
  - **Benefit:** Reduces DB queries while keeping allowlist changes effective within 5 minutes

### 9. Integration Points
- [x] **Q9:** If using Bearer tokens, should the worker:
  - ✅ **Answer:** Call auth backend API (if `AUTH_API_URL` is set)
  - **Implementation:** Worker calls `${AUTH_API_URL}/auth/me` with Bearer token
  - **Fallback:** If `AUTH_API_URL` not set, falls back to `user_id` query parameter
  - **Future:** Can add JWT direct decoding if `JWT_SECRET` is shared (not implemented yet)

### 10. Backward Compatibility
- [x] **Q10:** Should this feature:
  - ✅ **Answer:** Opt-in only, works alongside existing workers
  - **Implementation:** New worker doesn't replace existing ones
  - **Default:** All users get FRESH mode unless explicitly allowlisted
  - **Migration:** Can gradually migrate from `mletras-api-proxy` to `mletras-hybrid-proxy`

## Implementation Details

### ✅ New Worker: `mletras-hybrid-proxy`

**Location:** `cloudflare-hybrid-proxy/`

**Files Created:**
- `src/index.ts` - Main worker code
- `wrangler.toml` - Cloudflare configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `README.md` - Documentation
- `migrations/0001_add_cache_allowlist.sql` - Database migration

**Key Features:**
1. **Dual Mode Operation:**
   - FRESH mode (default): Always fetch from API, no caching
   - CACHED mode (opt-in): Check KV → API if miss → Cache → Return

2. **User Identification:**
   - Primary: Bearer token → calls auth backend API
   - Fallback: `user_id` query parameter (for testing)

3. **Allowlist Management:**
   - Stored in D1 database (`users.use_cache` or `users.metadata.use_cache`)
   - Cached in KV for 5 minutes to reduce DB queries
   - Default: All users get FRESH mode

4. **Smart Caching:**
   - Only cache successful 200 responses
   - Never cache errors (429, 500, etc.)
   - Cache key excludes API key and user_id

5. **CORS Support:**
   - Handles preflight requests
   - Configurable allowed origins

## Database Migration

**Migration File:** `cloudflare-hybrid-proxy/migrations/0001_add_cache_allowlist.sql`

```sql
-- Add use_cache column
ALTER TABLE users ADD COLUMN use_cache BOOLEAN DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_use_cache ON users(use_cache);
```

**Alternative (No Migration):** Use existing `metadata` JSON column:
```sql
UPDATE users 
SET metadata = json_set(COALESCE(metadata, '{}'), '$.use_cache', 1) 
WHERE id = 'user-id';
```

## Deployment Steps

1. ✅ **Code Created** - Worker code in `cloudflare-hybrid-proxy/`
2. ⏳ **Install Dependencies:**
   ```bash
   cd cloudflare-hybrid-proxy
   npm install
   ```
3. ⏳ **Set Secrets:**
   ```bash
   wrangler secret put MUSIXMATCH_API_KEY
   wrangler secret put AUTH_API_URL  # Optional
   ```
4. ⏳ **Run Migration:**
   ```bash
   # Apply migration via D1 Studio or wrangler
   wrangler d1 execute mletras-auth-db --file=./migrations/0001_add_cache_allowlist.sql
   ```
5. ⏳ **Deploy Worker:**
   ```bash
   npm run deploy:prod
   ```
6. ⏳ **Test Worker:**
   ```bash
   # Test FRESH mode (no user)
   curl "https://mletras-hybrid-proxy.belicongroup.workers.dev/musixmatch/track.search?q=test"
   
   # Test CACHED mode (with allowlisted user)
   curl -H "Authorization: Bearer TOKEN" \
     "https://mletras-hybrid-proxy.belicongroup.workers.dev/musixmatch/track.search?q=test"
   ```
7. ⏳ **Allowlist Users:**
   ```sql
   UPDATE users SET use_cache = 1 WHERE id = 'user-id';
   ```

## Next Steps

1. ✅ Document current architecture
2. ✅ Get answers to questions
3. ✅ Design final implementation
4. ✅ Create implementation plan
5. ✅ Implement feature
6. ⏳ Test feature
7. ⏳ Deploy feature

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Request                            │
│  (with Bearer token or user_id param)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            mletras-hybrid-proxy Worker                       │
│                                                               │
│  1. Extract User ID                                          │
│     ├─ Bearer token → Auth API → User ID                     │
│     └─ OR user_id query param                                │
│                                                               │
│  2. Check Cache Allowlist                                     │
│     ├─ Check KV: cache_allowlist:{userId}                    │
│     └─ If miss: Query D1 → Cache in KV (5min TTL)           │
│                                                               │
│  3. Route Request                                            │
│     ├─ If allowlisted: CACHED mode                           │
│     │   ├─ Check KV cache                                    │
│     │   ├─ HIT: Return cached                                │
│     │   └─ MISS: API → Cache → Return                        │
│     └─ If not allowlisted: FRESH mode                         │
│         └─ API → Return (no cache)                           │
└─────────────────────────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│  D1 Database    │    │  KV Namespace     │
│  (Allowlist)    │    │  (Cache +         │
│                 │    │   Allowlist Cache) │
└─────────────────┘    └──────────────────┘
```

## Notes

- ✅ **ToS Compliance:** Default is FRESH mode (no caching). Only explicitly allowlisted users get cached responses.
- ✅ **Backward Compatible:** New worker doesn't modify existing `mletras-api-proxy` or `mletras-smart-proxy` workers.
- ✅ **Performance:** Allowlist checks cached in KV for 5 minutes to reduce DB load.
- ✅ **Error Handling:** Only successful 200 responses are cached. Errors (429, 500, etc.) are never cached.
- ✅ **Flexible:** Supports both `use_cache` column and `metadata` JSON for allowlist storage.

## Worker Configuration

**Hostname:** `mletras-hybrid-proxy.belicongroup.workers.dev`

**Bindings:**
- `MUSIXMATCH_CACHE` (KV) - For caching API responses and allowlist checks
- `DB` (D1) - For checking user allowlist

**Secrets:**
- `MUSIXMATCH_API_KEY` (required) - Musixmatch API key
- `AUTH_API_URL` (optional) - Auth backend URL for token verification
- `JWT_SECRET` (optional) - For direct JWT decoding (future feature)

## Usage Examples

### Enable Cache for User

```sql
-- Via D1 Studio or wrangler
UPDATE users SET use_cache = 1 WHERE id = 'user-id-here';
```

### Disable Cache for User

```sql
UPDATE users SET use_cache = 0 WHERE id = 'user-id-here';
```

### Check User Cache Status

```sql
SELECT id, email, use_cache, metadata FROM users WHERE id = 'user-id-here';
```

### Test Worker

```bash
# FRESH mode (no user or not allowlisted)
curl "https://mletras-hybrid-proxy.belicongroup.workers.dev/musixmatch/track.search?q=test"

# CACHED mode (with allowlisted user via Bearer token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://mletras-hybrid-proxy.belicongroup.workers.dev/musixmatch/track.search?q=test"

# CACHED mode (with allowlisted user via query param - for testing)
curl "https://mletras-hybrid-proxy.belicongroup.workers.dev/musixmatch/track.search?q=test&user_id=USER_ID"
```

