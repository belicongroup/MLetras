# Search Function Troubleshooting Sandbox

This folder contains duplicates of all search-related code from the main application.
You can safely modify these files for testing and troubleshooting without affecting the actual application.

## Files Included

### 1. `SearchPage-COPY.tsx`
- **Original Location:** `src/components/SearchPage.tsx`
- **Purpose:** Main search page component with UI and search logic
- **Key Functions:**
  - `handleSearch()` - Main search handler (line 187)
  - `debouncedSearch` - Debounced search (line 217)
  - `handleSongSelect()` - When user clicks a song (line 229)
  - `handleHistoryItemSelect()` - When user clicks history item (line 272)

### 2. `searchHistory-COPY.ts`
- **Original Location:** `src/services/searchHistory.ts`
- **Purpose:** Manages search history in localStorage
- **Key Functions:**
  - `addToHistory()` - Adds song to search history (line 15)
  - `getHistory()` - Retrieves all history (line 38)
  - `searchHistory()` - Searches within history (line 79)

### 3. `musixmatchApi-COPY.ts`
- **Original Location:** `src/services/musixmatchApi.ts`
- **Purpose:** Handles all Musixmatch API calls
- **Key Functions:**
  - `searchSongs()` - Main search function (line 202)
  - `normalizeQuery()` - Normalizes search queries (line 114)
  - `makeRequest()` - Base API request handler (line 158)
  - `searchByArtist()` - Artist-specific search (line 388)

## How to Use This Sandbox

### Option 1: Standalone Test (Easiest!)
1. **Open `test-search.html` in your browser**
2. Enter a search query and click Search
3. Watch the **Debug Log** to see exactly what's happening
4. Test different queries and strategies
5. Modify the JavaScript in the HTML file to test changes

### Option 2: Modify the Copies
1. **Experiment freely** - Modify any of the `-COPY` files to test changes
2. **Add console.logs** - Debug by adding logging statements
3. **Test different approaches** - Try alternative search strategies
4. **Compare with originals** - The original files remain untouched

## Common Troubleshooting Scenarios

### Test Search Logic
Edit `searchSongs()` in `musixmatchApi-COPY.ts` (line 202-350)

### Debug Query Normalization
Check `normalizeQuery()` in `musixmatchApi-COPY.ts` (line 114-123)

### Adjust Debounce Timing
Modify debounce in `SearchPage-COPY.tsx` (line 218)

### Change Search History Behavior
Edit functions in `searchHistory-COPY.ts`

## Notes
- These copies are independent and won't affect your app
- Copy your successful changes back to the original files when ready
- Delete this folder when troubleshooting is complete

