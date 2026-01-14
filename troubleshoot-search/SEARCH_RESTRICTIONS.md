# Search Restrictions Documentation

## Overview
This document outlines all search restrictions and limitations in the application.

---

## 1. Minimum Query Length (UI Level)

**Location**: `src/components/SearchPage.tsx` (line 212-216)

```typescript
// Only search if query is at least 3 characters to reduce API calls
if (query.trim().length < 3) {
  setSearchResults([]);
  setShowHistory(true);
  return;
}
```

**Restriction**: 
- ✅ **Minimum 3 characters** required to trigger a search
- Queries with less than 3 characters are rejected at the UI level
- Purpose: Reduce unnecessary API calls

**Impact**: 
- Users cannot search with 1-2 character queries
- Examples that won't search:
  - "a"
  - "ab"
  - "ab" (with spaces)

---

## 2. Empty Query Check (UI Level)

**Location**: `src/components/SearchPage.tsx` (line 206-209)

```typescript
if (!query.trim()) {
  setSearchResults([]);
  setShowHistory(true);
  return;
}
```

**Restriction**: 
- ✅ Empty queries (whitespace only) are rejected
- Returns empty results and shows history instead

---

## 3. Empty Query Check (API Service Level)

**Location**: `src/services/musixmatchApi.ts` (line 208)

```typescript
async searchSongs(query: string, pageSize: number = 10, page: number = 1): Promise<Song[]> {
  if (!query.trim()) return [];
  // ...
}
```

**Restriction**: 
- ✅ Empty queries return empty array immediately
- Double protection (UI + API level)

---

## 4. Rate Limiting / Request Throttling

**Location**: `src/services/musixmatchApi.ts` (line 109, 162-168)

```typescript
private readonly minRequestInterval = 300; // Increased to 300ms between requests

private async makeRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  // Throttle requests to prevent excessive API calls
  const now = Date.now();
  const timeSinceLastRequest = now - this.lastRequestTime;
  
  if (timeSinceLastRequest < this.minRequestInterval) {
    await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
  }
  
  this.lastRequestTime = Date.now();
  // ...
}
```

**Restriction**: 
- ✅ **Minimum 300ms delay** between API requests
- Prevents excessive API calls
- Applies to ALL API requests (search, lyrics, etc.)

**Impact**: 
- If multiple searches happen quickly, they will be throttled
- With multi-strategy fallback (up to 4 API calls), total time can be 300ms - 1200ms+

---

## 5. Query Normalization

**Location**: `src/services/musixmatchApi.ts` (line 114-123)

```typescript
private normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()              // ⚠️ Converts to lowercase
    .replace(/\s+/g, ' ')       // Collapses multiple spaces
    .normalize('NFD')           // Decomposes combined characters
    .replace(/[\u0300-\u036f]/g, '')  // Removes diacritics
    .replace(/ñ/g, 'n')         // Converts ñ to n
    .replace(/ü/g, 'u');        // Converts ü to u
}
```

**Restrictions/Transformations**: 
- ✅ All queries are converted to **lowercase**
- ✅ Accents and diacritics are **removed** (é → e, á → a, etc.)
- ✅ Multiple spaces are **collapsed** to single spaces
- ✅ Spanish characters are normalized (ñ → n, ü → u)

**Impact**: 
- Case-insensitive searches
- "José" becomes "jose"
- "Café" becomes "cafe"
- "Niño" becomes "nino"

**Example**:
- User types: `"José María"`
- Normalized to: `"jose maria"`

---

## 6. Lyrics Filter

**Location**: `src/services/musixmatchApi.ts` (line 222, 265, 305, 344, 387)

```typescript
f_has_lyrics: "1", // Only return tracks with lyrics

// Results are also filtered:
.filter((item) => item.track.has_lyrics === 1)
```

**Restriction**: 
- ✅ Only returns tracks that **have lyrics available**
- Tracks without lyrics are excluded from results

**Impact**: 
- Some songs may not appear in search results if they don't have lyrics in Musixmatch database

---

## 7. Search Debouncing (UI Level)

**Location**: `src/components/SearchPage.tsx` (line 237-240)

```typescript
// Debounced search to prevent excessive API calls
const debouncedSearch = useMemo(
  () => debounce(handleSearch, 500),
  [debounce, handleSearch]
);
```

**Restriction**: 
- ✅ **500ms debounce delay** before search executes
- User must stop typing for 500ms before search triggers
- Combined with rate limiting, this prevents excessive API calls

**Impact**: 
- Fast typing delays search execution
- Reduces API calls but may feel slower to users

---

## 8. Multi-Strategy Fallback Limitations

**Location**: `src/services/musixmatchApi.ts` (searchSongs method)

**Restriction**: 
- ✅ Up to **4 sequential API calls** per search
- Each strategy waits for the previous to fail before trying
- Rate limiting applies to each call (300ms minimum)

**Impact**: 
- Total search time: 300ms - 1200ms+ (depending on which strategy works)
- More API quota usage compared to single-call approach

---

## Summary Table

| Restriction | Location | Value | Purpose |
|------------|----------|-------|---------|
| **Min Query Length** | UI (SearchPage) | 3 characters | Reduce API calls |
| **Empty Query** | UI + API | Rejected | Prevent unnecessary requests |
| **Rate Limiting** | API Service | 300ms between requests | Prevent API abuse |
| **Query Normalization** | API Service | Lowercase + remove accents | Standardize queries |
| **Lyrics Filter** | API Service | Only tracks with lyrics | Filter results |
| **Search Debounce** | UI | 500ms delay | Reduce API calls |
| **Multi-Strategy** | API Service | Up to 4 API calls | Fallback logic |

---

## Recommendations

### Current Restrictions That Might Affect User Experience:

1. **3 Character Minimum** - May prevent users from searching for very short song titles
2. **500ms Debounce + 300ms Rate Limit** - Combined delays can make search feel slow
3. **Multi-Strategy Fallback** - Up to 4 API calls can take 1200ms+ in worst case
4. **Case/Accent Normalization** - May affect searches for songs that rely on specific capitalization

### Potential Improvements:

- Consider reducing minimum query length to 2 characters (if API allows)
- Consider reducing debounce time (currently 500ms)
- Consider reducing rate limit if API allows (currently 300ms)
- Consider making multi-strategy optional or reducing strategies
