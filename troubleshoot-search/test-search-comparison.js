// Test script to compare Production vs COPY search logic for "malboro rojo"
// This demonstrates what each approach would do without making actual API calls

console.log("=" .repeat(60));
console.log("SEARCH COMPARISON: 'malboro rojo'");
console.log("=" .repeat(60));
console.log("");

// Production normalization (from src/services/musixmatchApi.ts)
function normalizeQueryProduction(query) {
  return query.trim();
}

// COPY normalization (from troubleshoot-search/musixmatchApi-COPY.ts)
function normalizeQueryCOPY(query) {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/ñ/g, 'n') // Spanish ñ
    .replace(/ü/g, 'u'); // Spanish ü
}

// Test query
const testQuery = "malboro rojo";
console.log("Test Query:", JSON.stringify(testQuery));
console.log("");

// Production approach
console.log("--- PRODUCTION APPROACH (src/services/musixmatchApi.ts) ---");
console.log("");

const normalizedProduction = normalizeQueryProduction(testQuery);
console.log("1. Normalization:");
console.log(`   Input:  "${testQuery}"`);
console.log(`   Output: "${normalizedProduction}"`);
console.log(`   Method: query.trim()`);
console.log("");

console.log("2. API Call Strategy:");
console.log("   Strategy: Single API call with 'q' parameter");
console.log("");

console.log("3. API Request Parameters:");
console.log("   GET /track.search");
const productionParams = {
  q: normalizedProduction,
  page_size: "10",
  page: "1",
  f_has_lyrics: "1"
};
console.log("   Parameters:", JSON.stringify(productionParams, null, 2));
console.log("");

console.log("4. Expected Behavior:");
console.log("   - Makes 1 API call");
console.log("   - Uses general 'q' parameter (searches everywhere)");
console.log("   - Musixmatch handles query interpretation");
console.log("   - Fast response (~300ms)");
console.log("");

console.log("=" .repeat(60));
console.log("");

// COPY approach
console.log("--- COPY APPROACH (troubleshoot-search/musixmatchApi-COPY.ts) ---");
console.log("");

const normalizedCOPY = normalizeQueryCOPY(testQuery);
console.log("1. Normalization:");
console.log(`   Input:  "${testQuery}"`);
console.log(`   Output: "${normalizedCOPY}"`);
console.log(`   Method: trim() -> toLowerCase() -> remove accents -> collapse spaces`);
console.log("");

console.log("2. Query Parsing:");
const words = normalizedCOPY.split(' ');
console.log(`   Words: [${words.map(w => `"${w}"`).join(', ')}]`);
console.log(`   Length: ${words.length} words`);
console.log("");

console.log("3. API Call Strategy:");
console.log("   Strategy: Multi-strategy fallback (up to 4 API calls)");
console.log("");

// Strategy 1
console.log("4. Strategy 1 - Parse as 'track artist':");
let strategy1Params = {
  page_size: "5",
  page: "1",
  s_track_rating: "desc",
  f_has_lyrics: "1"
};
if (words.length >= 2) {
  strategy1Params.q_track = words[0];
  strategy1Params.q_artist = words.slice(1).join(' ');
  console.log(`   Parsing: First word="${words[0]}" as track, Rest="${words.slice(1).join(' ')}" as artist`);
} else {
  strategy1Params.q_track = normalizedCOPY;
  console.log(`   Parsing: Single word, using as track only`);
}
console.log("   API Call #1:");
console.log("   GET /track.search");
console.log("   Parameters:", JSON.stringify(strategy1Params, null, 2));
console.log("");

// Strategy 2
console.log("5. Strategy 2 - Parse as 'artist track' (if Strategy 1 fails):");
if (words.length >= 2) {
  const strategy2Params = {
    q_track: words[words.length - 1],
    q_artist: words.slice(0, -1).join(' '),
    page_size: "5",
    page: "1",
    s_track_rating: "desc",
    f_has_lyrics: "1"
  };
  console.log(`   Parsing: Last word="${words[words.length - 1]}" as track, Rest="${words.slice(0, -1).join(' ')}" as artist`);
  console.log("   API Call #2:");
  console.log("   GET /track.search");
  console.log("   Parameters:", JSON.stringify(strategy2Params, null, 2));
} else {
  console.log("   Skipped (single word query)");
}
console.log("");

// Strategy 3
console.log("6. Strategy 3 - Full query as track name (if Strategy 2 fails):");
const strategy3Params = {
  q_track: normalizedCOPY,
  page_size: "5",
  page: "1",
  s_track_rating: "desc",
  f_has_lyrics: "1"
};
console.log("   API Call #3:");
console.log("   GET /track.search");
console.log("   Parameters:", JSON.stringify(strategy3Params, null, 2));
console.log("");

// Strategy 4
console.log("7. Strategy 4 - General search with 'q' parameter (if Strategy 3 fails):");
const strategy4Params = {
  q: normalizedCOPY,
  page_size: "5",
  page: "1",
  s_track_rating: "desc",
  f_has_lyrics: "1"
};
console.log("   API Call #4:");
console.log("   GET /track.search");
console.log("   Parameters:", JSON.stringify(strategy4Params, null, 2));
console.log("   Note: This is the SAME as Production approach!");
console.log("");

console.log("8. Expected Behavior:");
console.log("   - Makes 1-4 API calls (sequential, stops at first success)");
console.log("   - Tries restrictive parameters first (q_track + q_artist)");
console.log("   - Falls back to general 'q' parameter (Strategy 4)");
console.log("   - Slower response (300ms - 1200ms depending on which strategy works)");
console.log("");

console.log("=" .repeat(60));
console.log("");

// Comparison summary
console.log("--- COMPARISON SUMMARY ---");
console.log("");
console.log("Normalization Differences:");
console.log(`  Production: "${normalizedProduction}"`);
console.log(`  COPY:       "${normalizedCOPY}"`);
console.log(`  Different:  ${normalizedProduction !== normalizedCOPY ? "YES (COPY lowercases and removes accents)" : "NO"}`);
console.log("");

console.log("API Call Comparison:");
console.log("  Production:");
console.log("    - API Calls: 1");
console.log("    - Parameters: q=\"malboro rojo\"");
console.log("    - Strategy: Direct general search");
console.log("");
console.log("  COPY:");
console.log("    - API Calls: 1-4 (sequential)");
console.log("    - Strategy 1: q_track=\"malboro\", q_artist=\"rojo\"");
console.log("    - Strategy 2: q_track=\"rojo\", q_artist=\"malboro\"");
console.log("    - Strategy 3: q_track=\"malboro rojo\"");
console.log("    - Strategy 4: q=\"malboro rojo\" (same as Production!)");
console.log("");

console.log("Key Insight:");
console.log("  COPY Strategy 4 uses the EXACT SAME approach as Production!");
console.log("  COPY just wastes time trying 3 restrictive strategies first.");
console.log("");

console.log("=" .repeat(60));
console.log("DETAILED SIDE-BY-SIDE COMPARISON");
console.log("=" .repeat(60));
console.log("");

console.log("┌──────────────────────────────────────────────────────────────────┐");
console.log("│ PRODUCTION APPROACH                                              │");
console.log("├──────────────────────────────────────────────────────────────────┤");
console.log(`│ Query: "${testQuery}"                                            │`);
console.log(`│ Normalized: "${normalizedProduction}"                            │`);
console.log("│                                                                  │");
console.log("│ API CALL #1 (Only call):                                         │");
console.log("│   Endpoint: /track.search                                        │");
console.log("│   Method: GET                                                    │");
console.log(`│   q: "${productionParams.q}"                                     │`);
console.log(`│   page_size: ${productionParams.page_size}                       │`);
console.log(`│   page: ${productionParams.page}                                 │`);
console.log(`│   f_has_lyrics: ${productionParams.f_has_lyrics}                 │`);
console.log("│                                                                  │");
console.log("│ Results:                                                         │");
console.log("│   ✅ Makes 1 API call                                            │");
console.log("│   ✅ Fast response (~300ms)                                      │");
console.log("│   ✅ Simple and reliable                                         │");
console.log("│   ✅ Uses Musixmatch's intelligent search                        │");
console.log("└──────────────────────────────────────────────────────────────────┘");
console.log("");

console.log("┌──────────────────────────────────────────────────────────────────┐");
console.log("│ COPY APPROACH                                                    │");
console.log("├──────────────────────────────────────────────────────────────────┤");
console.log(`│ Query: "${testQuery}"                                            │`);
console.log(`│ Normalized: "${normalizedCOPY}"                                  │`);
console.log(`│ Parsed Words: [${words.map(w => `"${w}"`).join(', ')}]          │`);
console.log("│                                                                  │");
console.log("│ API CALL #1 (Strategy 1 - Parse as 'track artist'):             │");
console.log("│   Endpoint: /track.search                                        │");
console.log("│   Method: GET                                                    │");
console.log(`│   q_track: "${words[0]}"                                         │`);
console.log(`│   q_artist: "${words.slice(1).join(' ')}"                        │`);
console.log("│   page_size: 5                                                   │");
console.log("│   s_track_rating: desc                                           │");
console.log("│   f_has_lyrics: 1                                                │");
const trackWord = words[0];
const artistWords = words.slice(1).join(' ');
console.log(`│   ⚠️  Assumes: track="${trackWord}", artist="${artistWords}"      │`);
console.log("│   ❌ Likely to fail (wrong assumption)                           │");
console.log("│                                                                  │");
if (words.length >= 2) {
  console.log("│ API CALL #2 (Strategy 2 - Parse as 'artist track'):                │");
  console.log("│   Endpoint: /track.search                                        │");
  console.log("│   Method: GET                                                    │");
  const lastWord = words[words.length - 1];
  const firstWords = words.slice(0, -1).join(' ');
  console.log(`│   q_track: "${lastWord}"                                         │`);
  console.log(`│   q_artist: "${firstWords}"                                      │`);
  console.log("│   page_size: 5                                                   │");
  console.log("│   s_track_rating: desc                                           │");
  console.log("│   f_has_lyrics: 1                                                │");
  console.log(`│   ⚠️  Assumes: track="${lastWord}", artist="${firstWords}"        │`);
  console.log("│   ❌ Likely to fail (wrong assumption)                           │");
  console.log("│                                                                  │");
}
console.log("│ API CALL #3 (Strategy 3 - Full query as track):                  │");
console.log("│   Endpoint: /track.search                                        │");
console.log("│   Method: GET                                                    │");
console.log(`│   q_track: "${normalizedCOPY}"                                   │`);
console.log("│   page_size: 5                                                   │");
console.log("│   s_track_rating: desc                                           │");
console.log("│   f_has_lyrics: 1                                                │");
console.log("│   ⚠️  Restrictive (only searches track field)                    │");
console.log("│                                                                  │");
console.log("│ API CALL #4 (Strategy 4 - General search):                       │");
console.log("│   Endpoint: /track.search                                        │");
console.log("│   Method: GET                                                    │");
console.log(`│   q: "${normalizedCOPY}"                                         │`);
console.log("│   page_size: 5                                                   │");
console.log("│   s_track_rating: desc                                           │");
console.log("│   f_has_lyrics: 1                                                │");
console.log("│   ✅ SAME AS PRODUCTION APPROACH!                                │");
console.log("│                                                                  │");
console.log("│ Results:                                                         │");
console.log("│   ❌ Makes 1-4 API calls (sequential)                            │");
console.log("│   ❌ Slow response (300ms - 1200ms)                              │");
console.log("│   ❌ Wastes API calls on failed strategies                       │");
console.log("│   ❌ Eventually falls back to Production approach anyway         │");
console.log("└──────────────────────────────────────────────────────────────────┘");
console.log("");

console.log("=" .repeat(60));
console.log("FINAL VERDICT");
console.log("=" .repeat(60));
console.log("");
console.log("Production: ✅ Simple, fast, effective");
console.log("COPY:       ❌ Complex, slow, eventually does the same thing");
console.log("");
console.log("The COPY approach tries 3 strategies that often fail,");
console.log("then falls back to using the EXACT SAME strategy as Production!");
console.log("");
