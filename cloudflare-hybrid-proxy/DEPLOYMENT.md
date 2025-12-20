# Deployment Guide - mletras-hybrid-proxy

## Quick Start

This guide will help you deploy the new `mletras-hybrid-proxy` worker to Cloudflare.

## Prerequisites

- Cloudflare account with Workers access
- Wrangler CLI installed (`npm install -g wrangler`)
- Access to `mletras-auth-db` D1 database
- Access to `MUSIXMATCH_CACHE` KV namespace

## Step 1: Install Dependencies

```bash
cd cloudflare-hybrid-proxy
npm install
```

## Step 2: Configure Secrets

Set the required secrets in Cloudflare:

```bash
# Required: Musixmatch API key
wrangler secret put MUSIXMATCH_API_KEY
# Enter your Musixmatch API key when prompted

# Optional: Auth backend URL for Bearer token verification
wrangler secret put AUTH_API_URL
# Enter: https://mletras-auth-api.belicongroup.workers.dev
# (or your auth backend URL)
```

## Step 3: Run Database Migration

Add the `use_cache` column to the users table:

### Option A: Via Wrangler CLI

```bash
wrangler d1 execute mletras-auth-db --file=./migrations/0001_add_cache_allowlist.sql
```

### Option B: Via Cloudflare D1 Studio

1. Go to Cloudflare Dashboard → D1 Database → `mletras-auth-db` → Studio
2. Run this SQL:

```sql
ALTER TABLE users ADD COLUMN use_cache BOOLEAN DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_users_use_cache ON users(use_cache);
```

**Note:** If the column already exists, you'll get an error. That's okay - it means it's already set up.

## Step 4: Verify Configuration

Check `wrangler.toml` has correct bindings:

- ✅ KV Namespace: `MUSIXMATCH_CACHE` (ID: `be9ee410602c45b296f71febd64bb7cb`)
- ✅ D1 Database: `mletras-auth-db` (ID: `5a258f07-dc5a-4f3b-b92d-8616babb8ec8`)

## Step 5: Deploy to Production

```bash
npm run deploy:prod
```

Or:

```bash
wrangler deploy --env production
```

## Step 6: Test the Worker

### Test FRESH Mode (Default)

```bash
curl "https://mletras-hybrid-proxy.belicongroup.workers.dev/musixmatch/track.search?q=test"
```

Expected response headers:
- `X-Cache: FRESH`
- `X-Cache-Mode: no-cache`

### Test CACHED Mode (With Allowlisted User)

1. First, allowlist a user:

```sql
UPDATE users SET use_cache = 1 WHERE id = 'your-user-id';
```

2. Then test with Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  "https://mletras-hybrid-proxy.belicongroup.workers.dev/musixmatch/track.search?q=test"
```

Or test with user_id query param (for testing):

```bash
curl "https://mletras-hybrid-proxy.belicongroup.workers.dev/musixmatch/track.search?q=test&user_id=YOUR_USER_ID"
```

Expected response headers (first request):
- `X-Cache: MISS`
- `X-Cache-Mode: cached`

Expected response headers (subsequent requests):
- `X-Cache: HIT`
- `X-Cache-Mode: cached`

## Step 7: Monitor Logs

```bash
npm run tail:prod
```

Look for:
- `User {userId}: cache allowed = true/false`
- `FRESH mode: Fetching from API (no cache)`
- `Cache HIT for key: {key}`
- `Cache MISS for key: {key}`

## Managing Cache Allowlist

### Add User to Allowlist

```sql
UPDATE users SET use_cache = 1 WHERE id = 'user-id-here';
```

### Remove User from Allowlist

```sql
UPDATE users SET use_cache = 0 WHERE id = 'user-id-here';
```

### Check User Status

```sql
SELECT id, email, use_cache, metadata FROM users WHERE id = 'user-id-here';
```

### Alternative: Use Metadata JSON

If you prefer not to add a column, use the existing `metadata` column:

```sql
UPDATE users 
SET metadata = json_set(COALESCE(metadata, '{}'), '$.use_cache', 1) 
WHERE id = 'user-id-here';
```

## Troubleshooting

### Worker Not Deploying

1. Check you're logged in: `wrangler whoami`
2. Verify secrets are set: `wrangler secret list`
3. Check `wrangler.toml` has correct IDs

### Cache Not Working

1. **Check user is allowlisted:**
   ```sql
   SELECT use_cache, metadata FROM users WHERE id = 'user-id';
   ```

2. **Check KV cache:**
   - Key: `cache_allowlist:{userId}`
   - Should be `true` or `false`
   - TTL: 5 minutes

3. **Check logs:**
   ```bash
   npm run tail:prod
   ```
   Look for: `User {userId}: cache allowed = {true/false}`

### Authentication Issues

1. **If using Bearer token:**
   - Verify `AUTH_API_URL` secret is set correctly
   - Check auth backend is accessible
   - Verify token is valid

2. **If using query parameter:**
   - Ensure `user_id` parameter matches actual user ID in database

### Database Errors

1. **Column already exists:**
   - This is fine, the migration is idempotent
   - You can skip the migration step

2. **Query errors:**
   - Verify D1 database binding is correct in `wrangler.toml`
   - Check database ID matches your actual database

## Next Steps

1. ✅ Deploy worker
2. ✅ Test FRESH mode (default)
3. ✅ Allowlist a test user
4. ✅ Test CACHED mode
5. ⏳ Monitor performance
6. ⏳ Gradually migrate users from `mletras-api-proxy` to `mletras-hybrid-proxy`

## Rollback Plan

If you need to rollback:

1. **Stop using the worker:**
   - Update your frontend to use `mletras-api-proxy` instead
   - No code changes needed in the worker itself

2. **Remove allowlist (optional):**
   ```sql
   UPDATE users SET use_cache = 0;
   ```

3. **Delete worker (optional):**
   ```bash
   wrangler delete mletras-hybrid-proxy --env production
   ```

## Support

For issues or questions:
1. Check logs: `npm run tail:prod`
2. Review `README.md` for detailed documentation
3. Check `CACHE_CONTROL_FEATURE.md` for design decisions

