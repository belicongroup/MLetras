# Musixmatch API Compliance Notice

## Overview
This document outlines the changes made to MLetras to ensure compliance with Musixmatch's "no caching allowed" policy.

## Changes Made

### 1. Musixmatch API Service (`src/services/musixmatchApi.ts`)
- **REMOVED**: Caching of lyrics data from Musixmatch API
- **REMOVED**: Cache checking before API calls
- **CHANGED**: Always fetch lyrics fresh from API
- **ADDED**: Compliance comment explaining no caching policy

### 2. Lyrics Cache Service (`src/services/lyricsCache.ts`)
- **STATUS**: File remains but is no longer used for Musixmatch data
- **PURPOSE**: May be used for other non-Musixmatch data in the future

### 3. Search History Service (`src/services/searchHistory.ts`)
- **REMOVED**: Integration with lyrics cache
- **CHANGED**: `getHistoryWithCachedLyrics()` now returns `hasLyrics: false` for all items
- **REMOVED**: `cacheSongForOffline()` functionality
- **ADDED**: Compliance comments

### 4. Liked Songs Hook (`src/hooks/useLikedSongs.ts`)
- **REMOVED**: IndexedDB caching of song data
- **CHANGED**: Only stores basic metadata (no lyrics) in localStorage
- **REMOVED**: Cache migration functionality
- **CHANGED**: `getLikedSongWithLyrics()` returns metadata only

### 5. Settings Page (`src/components/SettingsPage.tsx`)
- **REMOVED**: Cache management UI
- **REMOVED**: Cache size display
- **REMOVED**: Clear cache functionality
- **ADDED**: Compliance notice explaining no caching policy
- **CHANGED**: Connection status section to reflect API-only access

## Compliance Summary

### ✅ What We Can Still Do:
- Store basic song metadata (title, artist, imageUrl, url) in localStorage
- Maintain search history (without lyrics)
- Store user preferences and settings
- Cache non-Musixmatch data

### ❌ What We Cannot Do:
- Cache lyrics from Musixmatch API
- Store Musixmatch API responses
- Provide offline lyrics access
- Cache any data returned from Musixmatch endpoints

## Impact on User Experience

### Positive Changes:
- Always fresh lyrics from Musixmatch
- Compliance with API terms
- No risk of API subscription issues

### Limitations:
- No offline lyrics access
- Increased API calls (higher costs)
- Slower loading for previously viewed songs
- No offline functionality for lyrics

## Technical Notes

- All Musixmatch API calls now go directly to the API
- No intermediate caching layer for lyrics
- Search history still works but doesn't indicate cached lyrics
- Liked songs still work but don't store lyrics
- Settings page reflects the new no-caching policy

## Monitoring

- Monitor API usage to ensure compliance
- Track user experience impact
- Consider implementing user education about the no-caching policy

---

**Last Updated**: $(date)
**Compliance Status**: ✅ COMPLIANT
**API Terms**: Musixmatch "No Caching Allowed" Policy
