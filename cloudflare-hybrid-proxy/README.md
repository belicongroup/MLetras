# MLetras Hybrid Proxy

A Cloudflare Worker that acts as a gateway/hybrid proxy for the Musixmatch API with selective caching based on user allowlist.

## Features

- **FRESH Mode (Default)**: Always fetch from Musixmatch API, no caching
- **CACHED Mode (Opt-in)**: Check KV cache first, then API if miss, store in KV
- **User-Based Allowlist**: Only allowlisted users can use cache (stored in D1 database)
- **Smart Caching**: Only cache successful 200 responses (no errors)
- **Flexible Authentication**: Supports Bearer tokens or user_id query parameter

## Architecture

```
Request → Hybrid Proxy
  ├─ Extract User ID (Bearer token or query param)
  ├─ Check D1 Database for cache allowlist
  ├─ If allowed: CACHED mode
  │   ├─ Check KV cache
  │   ├─ If HIT: Return cached data
  │   └─ If MISS: Fetch from API → Cache → Return
  └─ If not allowed: FRESH mode
      └─ Fetch from API → Return (no caching)
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Secrets

Set the required secrets in Cloudflare:

```bash
# Required: Musixmatch API key
wrangler secret put MUSIXMATCH_API_KEY

# Optional: Auth backend URL for token verification
wrangler secret put AUTH_API_URL

# Optional: JWT secret for direct token decoding (if not using auth backend)
wrangler secret put JWT_SECRET
```

### 3. Database Setup

The worker uses the existing `mletras-auth-db` D1 database. To enable caching for a user, you need to set the cache flag in the `users` table.

#### Option A: Add `use_cache` column (Recommended)

```sql
ALTER TABLE users ADD COLUMN use_cache BOOLEAN DEFAULT 0;
```

Then set it for specific users:

```sql
UPDATE users SET use_cache = 1 WHERE id = 'user-id-here';
```

#### Option B: Use `metadata` JSON column

```sql
UPDATE users 
SET metadata = json_set(COALESCE(metadata, '{}'), '$.use_cache', 1) 
WHERE id = 'user-id-here';
```

The worker checks both methods, so either works.

### 4. Deploy

```bash
# Deploy to production
npm run deploy:prod

# Or deploy to development
npm run dev
```

## Usage

### Endpoints

The worker supports both URL formats:

1. **With `/musixmatch/` prefix:**
   ```
   https://mletras-hybrid-proxy.belicongroup.workers.dev/musixmatch/track.search?q=test
   ```

2. **Direct endpoint:**
   ```
   https://mletras-hybrid-proxy.belicongroup.workers.dev/track.search?q=test
   ```

### Authentication

#### Method 1: Bearer Token (Recommended)

```bash
curl -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  "https://mletras-hybrid-proxy.belicongroup.workers.dev/musixmatch/track.search?q=test"
```

#### Method 2: Query Parameter (For Testing)

```bash
curl "https://mletras-hybrid-proxy.belicongroup.workers.dev/musixmatch/track.search?q=test&user_id=USER_ID"
```

### Cache Behavior

- **Default (No User ID)**: FRESH mode - always fetch from API, no caching
- **User Not Allowlisted**: FRESH mode - always fetch from API, no caching
- **User Allowlisted**: CACHED mode - check KV first, cache on miss

### Response Headers

The worker adds helpful headers:

- `X-Cache`: `HIT`, `MISS`, or `FRESH`
- `X-Cache-Mode`: `cached` or `no-cache`
- `X-Cache-Timestamp`: Timestamp of cached data (if HIT)
- `X-Cache-Key`: Cache key used (if MISS)

## Managing Cache Allowlist

### Add User to Allowlist

Via D1 Studio or SQL:

```sql
-- Method 1: Using use_cache column
UPDATE users SET use_cache = 1 WHERE id = 'user-id-here';

-- Method 2: Using metadata JSON
UPDATE users 
SET metadata = json_set(COALESCE(metadata, '{}'), '$.use_cache', 1) 
WHERE id = 'user-id-here';
```

### Remove User from Allowlist

```sql
-- Method 1: Using use_cache column
UPDATE users SET use_cache = 0 WHERE id = 'user-id-here';

-- Method 2: Using metadata JSON
UPDATE users 
SET metadata = json_set(COALESCE(metadata, '{}'), '$.use_cache', 0) 
WHERE id = 'user-id-here';
```

### Clear Allowlist Cache

The worker caches allowlist checks for 5 minutes. To force immediate update:

1. Wait 5 minutes, OR
2. Delete the KV entry: `cache_allowlist:{userId}`

## Monitoring

### View Logs

```bash
# Production logs
npm run tail:prod

# Development logs
npm run tail
```

### Check Cache Status

Look for these log messages:

- `User {userId}: cache allowed = true/false`
- `FRESH mode: Fetching from API (no cache)`
- `Cache HIT for key: {key}`
- `Cache MISS for key: {key}`

## Troubleshooting

### User Not Getting Cached Responses

1. **Check if user is allowlisted:**
   ```sql
   SELECT id, use_cache, metadata FROM users WHERE id = 'user-id';
   ```

2. **Check KV cache for allowlist:**
   - Key: `cache_allowlist:{userId}`
   - Value should be `true` or `false`
   - TTL: 5 minutes

3. **Check logs:**
   ```bash
   npm run tail:prod
   ```
   Look for: `User {userId}: cache allowed = {true/false}`

### Cache Not Working

1. **Verify KV namespace binding** in `wrangler.toml`
2. **Check if response is 200** - only successful responses are cached
3. **Check logs** for cache HIT/MISS messages

### Authentication Issues

1. **If using Bearer token:**
   - Verify `AUTH_API_URL` is set correctly
   - Check auth backend is accessible
   - Verify token is valid

2. **If using query parameter:**
   - Ensure `user_id` parameter is correct
   - This method is for testing only

## Development

### Local Development

```bash
npm run dev
```

This starts a local development server with hot reload.

### Testing

Test with curl:

```bash
# Test FRESH mode (no user)
curl "http://localhost:8787/musixmatch/track.search?q=test"

# Test CACHED mode (with allowlisted user)
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:8787/musixmatch/track.search?q=test"
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MUSIXMATCH_API_KEY` | Yes | Musixmatch API key |
| `AUTH_API_URL` | No | URL to auth backend for token verification |
| `JWT_SECRET` | No | JWT secret for direct token decoding |

## Notes

- **ToS Compliance**: Only allowlisted users get cached responses. Default is always fresh.
- **Performance**: Allowlist checks are cached in KV for 5 minutes to reduce DB queries.
- **Error Handling**: Only successful 200 responses are cached. Errors (429, 500, etc.) are never cached.
- **Backward Compatible**: Works alongside existing `mletras-api-proxy` and `mletras-smart-proxy` workers.

