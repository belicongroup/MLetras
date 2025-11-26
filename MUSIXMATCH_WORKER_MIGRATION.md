# Musixmatch Worker Migration Guide

**Date:** 2025-01-XX  
**Status:** ✅ Completed

## Overview

This migration switches the app from using `mletras-smart-proxy` (which caches lyrics in KV) to `mletras-api-proxy` (which does NOT cache lyrics). This change ensures compliance with Musixmatch Terms of Service, which prohibit caching full lyrics text.

## What Changed

### File Modified
- **`src/services/musixmatchApi.ts`**

### Changes Made

1. **Base URL Updated:**
   - **Before:** `https://mletras-smart-proxy.belicongroup.workers.dev`
   - **After:** `https://mletras-api-proxy.belicongroup.workers.dev`

2. **URL Path Updated:**
   - **Before:** `${MUSIXMATCH_BASE_URL}/${endpoint}` (e.g., `/track.search`)
   - **After:** `${MUSIXMATCH_BASE_URL}/musixmatch${endpoint}` (e.g., `/musixmatch/track.search`)

3. **Comments Updated:**
   - Removed references to "Smart Proxy" and "KV caching"
   - Updated to reflect "simple proxy" with "no caching"

## What Was NOT Changed

✅ **Database (`mletras-auth-db`)** - Completely untouched  
✅ **Auth Backend Worker** - Not modified  
✅ **SESSIONS KV** - Still used by auth backend  
✅ **User Data** - All bookmarks, folders, notes remain safe  
✅ **API Response Format** - Same Musixmatch JSON structure  

## Impact

### Before Migration
- Lyrics were cached in `MUSIXMATCH_CACHE` KV namespace
- Faster responses for cached songs
- ❌ **Non-compliant** with Musixmatch Terms of Service

### After Migration
- Lyrics fetched fresh from Musixmatch API each time
- No caching of lyrics text
- ✅ **Compliant** with Musixmatch Terms of Service
- Slightly slower responses (no cache), but compliant

## Testing Checklist

After migration, verify:

- [ ] Search functionality works
- [ ] Lyrics load correctly
- [ ] Error handling works (invalid track IDs, network errors)
- [ ] CORS works (especially on mobile/Android)
- [ ] No rate limit errors (429 status codes)

## iOS App Update

Since this is a **Capacitor app**, the iOS app uses the same web code from `src/`. The update is already complete in the source code. You just need to rebuild the iOS app:

### Step 1: Build the Web App
```bash
npm run build
```

### Step 2: Sync with Capacitor
```bash
npx cap sync ios
```

### Step 3: Open in Xcode
```bash
npx cap open ios
```

### Step 4: Build and Run in Xcode
1. Select your target device/simulator
2. Click the "Play" button or press `Cmd + R`
3. The app will build and run with the updated Worker

### Alternative: Command Line Build
```bash
# Build for device
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath build/App.xcarchive \
  archive

# Or use the Capacitor CLI
npx cap run ios
```

**Note:** The `capacitor.config.ts` already allows `*.workers.dev` domains, so no configuration changes are needed for iOS.

## How to Revert (Rollback)

If you need to revert back to the smart-proxy:

### Step 1: Update Base URL

In `src/services/musixmatchApi.ts`, change:

```typescript
// Change FROM:
const MUSIXMATCH_BASE_URL = "https://mletras-api-proxy.belicongroup.workers.dev";

// Change TO:
const MUSIXMATCH_BASE_URL = "https://mletras-smart-proxy.belicongroup.workers.dev";
```

### Step 2: Update URL Path

In `src/services/musixmatchApi.ts`, in the `makeRequest` method, change:

```typescript
// Change FROM:
const url = new URL(`${MUSIXMATCH_BASE_URL}/musixmatch${endpoint}`);

// Change TO:
const url = new URL(`${MUSIXMATCH_BASE_URL}/${endpoint}`);
```

### Step 3: Update Comments (Optional)

Update comments to reflect smart-proxy usage:

```typescript
// Change FROM:
// Use simple proxy (no caching) - API key handled server-side
// Simple proxy uses /musixmatch/ prefix for routing

// Change TO:
// Use Smart Proxy with KV caching - API key handled server-side
```

### Step 4: Rebuild and Deploy

```bash
npm run build
# Deploy to your hosting platform
```

### Step 5: Rebuild Mobile Apps (if applicable)

**iOS:**
```bash
npm run build
npx cap sync ios
npx cap open ios
# Build and run in Xcode
```

**Android:**
```bash
npm run build
npx cap sync android
npx cap open android
# Build and run in Android Studio
```

## Worker Details

### mletras-api-proxy (Simple Proxy)
- **Location:** `cloudflare-worker/index.js`
- **Route:** `/musixmatch/*`
- **Caching:** ❌ None
- **KV Bindings:** None
- **Status:** ✅ Compliant

### mletras-smart-proxy (Old - Caching)
- **Location:** `cloudflare-smart-proxy/src/index.ts`
- **Route:** Direct endpoints (e.g., `/track.search`)
- **Caching:** ✅ Yes (KV namespace: `MUSIXMATCH_CACHE`)
- **KV Bindings:** `MUSIXMATCH_CACHE`
- **Status:** ❌ Non-compliant (caches lyrics)

## Environment Variables

### Required for Simple Proxy
- `MUSIXMATCH_API_KEY` - Must be set as a secret in `mletras-api-proxy` Worker

### Verify API Key
```bash
# Check if API key is set
wrangler secret list --name mletras-api-proxy
```

## Troubleshooting

### Issue: 404 Not Found
- **Cause:** URL path incorrect
- **Fix:** Ensure endpoint uses `/musixmatch/` prefix

### Issue: 401/403 Unauthorized
- **Cause:** API key not set in Worker
- **Fix:** Set `MUSIXMATCH_API_KEY` secret in Cloudflare dashboard

### Issue: CORS Errors
- **Cause:** Origin not allowed
- **Fix:** Simple proxy allows all origins (`*`), should work automatically

### Issue: Rate Limit Errors (429)
- **Cause:** Too many requests to Musixmatch API
- **Fix:** This is expected - no caching means more API calls. Monitor usage.

## Notes

- Old cached lyrics in `MUSIXMATCH_CACHE` KV will remain but won't be accessed
- No data loss - all user data in database remains intact
- **iOS/Android apps:** Since this is a Capacitor app, they use the same web code. After rebuilding, they'll automatically use the new Worker
- This change affects ALL platforms (web, iOS, Android) since they share the same codebase
- **No iOS-specific code changes needed** - the update in `src/services/musixmatchApi.ts` applies to all platforms

## Support

If you encounter issues:
1. Check Cloudflare Worker logs
2. Verify API key is set correctly
3. Test Worker directly: `curl "https://mletras-api-proxy.belicongroup.workers.dev/musixmatch/track.search?q=test"`
4. Review error messages in browser console

