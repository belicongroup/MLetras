# Results Limits Documentation

## Overview
This document outlines restrictions on the total number of search results returned.

---

## 1. Page Size Limit (Per Search)

**Location**: `src/services/musixmatchApi.ts` (line 205)

```typescript
async searchSongs(
  query: string,
  pageSize: number = 10,  // ⚠️ Default: 10 results per search
  page: number = 1,
): Promise<Song[]>
```

**Restriction**: 
- ✅ **Default page size: 10 results** per search
- Each API call returns up to 10 results
- Can be customized when calling `searchSongs(query, pageSize, page)`

**Usage**:
- `SearchPage.tsx` calls `musixmatchApi.searchSongs(query)` without specifying pageSize
- This means it uses the default of **10 results**

---

## 2. No Pagination Implementation

**Location**: `src/components/SearchPage.tsx` (line 224)

```typescript
const results = await musixmatchApi.searchSongs(query);
// No pagination parameters passed
// Always fetches page 1 with default pageSize (10)
```

**Restriction**: 
- ✅ **Only page 1 is fetched**
- No "Load More" or "Next Page" functionality
- No way to get results beyond the first 10

**Impact**: 
- Users can only see the first 10 results for any search
- If there are more than 10 matching songs, they won't be accessible

---

## 3. Multi-Strategy Fallback Limitation

**Location**: `src/services/musixmatchApi.ts` (searchSongs method)

**Behavior**: 
- With the multi-strategy fallback approach, only the **first successful strategy** returns results
- If Strategy 1 succeeds with 5 results, Strategies 2-4 are not executed
- If Strategy 1 fails but Strategy 2 succeeds with 8 results, those 8 results are returned

**Restriction**: 
- ✅ Maximum results = `pageSize` (default 10) from the first successful strategy
- Other strategies don't combine their results
- Only one strategy's results are returned

---

## 4. Search History Display Limit

**Location**: `src/components/SearchPage.tsx` (line 636)

```typescript
{searchHistoryItems.slice(0, 10).map((historyItem) => (
  // Only shows first 10 history items
))}
```

**Restriction**: 
- ✅ **Only 10 search history items** are displayed
- Additional history items exist but aren't shown
- This is a UI display limit, not a storage limit

**Note**: This is just for display - the actual history storage may have more items.

---

## 5. No Total Results Limit Across Searches

**Observation**: 
- ✅ **No restriction** on total number of searches
- ✅ **No restriction** on total number of unique results across multiple searches
- Each search is independent

---

## Summary Table

| Restriction | Location | Value | Impact |
|------------|----------|-------|--------|
| **Page Size (Default)** | `musixmatchApi.ts` | 10 results | Limits results per search |
| **Pagination** | Not implemented | Page 1 only | Can't access results beyond first 10 |
| **Multi-Strategy** | `musixmatchApi.ts` | First successful strategy only | Only one strategy's results returned |
| **History Display** | `SearchPage.tsx` | 10 items shown | UI limitation only |
| **Total Results** | None | Unlimited | No restriction across searches |

---

## Current Behavior Example

### Scenario: User searches "love"

1. **API Call**: Fetches page 1 with pageSize=10
2. **Results**: Returns up to 10 songs matching "love"
3. **Display**: Shows all 10 results (if 10 are found)
4. **Limitation**: If Musixmatch has 100 songs matching "love", user only sees first 10
5. **No Pagination**: User cannot access results 11-100

---

## Potential Improvements

### 1. Increase Default Page Size
```typescript
pageSize: number = 20,  // Increase from 10 to 20
```

### 2. Add Pagination Support
- Add "Load More" button
- Fetch additional pages when requested
- Allow users to navigate through result pages

### 3. Combine Strategy Results (Not Recommended)
- Could combine results from multiple strategies
- But this would increase API calls and complexity
- Current approach (first successful strategy) is simpler

### 4. Make Page Size Configurable
- Allow users to choose how many results they want
- Store preference in settings

---

## Comparison with COPY Version

| Aspect | Current (Production) | COPY Version |
|--------|---------------------|--------------|
| Default pageSize | 10 | 5 |
| Pagination | No | No |
| Max Results Per Search | 10 | 5 |

**Note**: The COPY version uses `pageSize: number = 5` by default, so it returns fewer results per search.
