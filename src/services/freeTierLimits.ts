/**
 * Free Tier Limits Service
 * 
 * Manages client-side locking of folders and notes for Free tier users.
 * Implements Option A: "Keep Everything, Lock Anything Over Free Limits"
 * 
 * Free Limits:
 * - Folders: 1 folder can be opened/used
 * - Notes: 3 notes can be opened/edited/used
 * - Liked Songs: 5 songs can be opened/used
 * 
 * Rules:
 * - Most recently opened/used items remain unlocked
 * - If "most recently used" isn't tracked, use most recently created as fallback
 * - Unlocked set is stable across app restarts (stored in localStorage)
 */

const UNLOCKED_FOLDERS_KEY = 'mletras_unlocked_folders';
const UNLOCKED_NOTES_KEY = 'mletras_unlocked_notes';
const UNLOCKED_LIKED_SONGS_KEY = 'mletras_unlocked_liked_songs';
const FOLDER_USAGE_KEY = 'mletras_folder_usage'; // Track when folders are opened
const NOTE_USAGE_KEY = 'mletras_note_usage'; // Track when notes are opened
const LIKED_SONG_USAGE_KEY = 'mletras_liked_song_usage'; // Track when liked songs are opened

const FREE_FOLDER_LIMIT = 1;
const FREE_NOTE_LIMIT = 3;
const FREE_LIKED_SONGS_LIMIT = 5;

interface UsageRecord {
  id: string;
  timestamp: number;
}

/**
 * Get unlocked folder IDs from localStorage
 */
export function getUnlockedFolders(): string[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(UNLOCKED_FOLDERS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

/**
 * Get unlocked note IDs from localStorage
 */
export function getUnlockedNotes(): string[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(UNLOCKED_NOTES_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

/**
 * Get folder usage records (when folders were last opened)
 */
function getFolderUsage(): UsageRecord[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(FOLDER_USAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as UsageRecord[];
  } catch {
    return [];
  }
}

/**
 * Get note usage records (when notes were last opened)
 */
function getNoteUsage(): UsageRecord[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(NOTE_USAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as UsageRecord[];
  } catch {
    return [];
  }
}

/**
 * Get unlocked liked song IDs from localStorage
 */
export function getUnlockedLikedSongs(): string[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(UNLOCKED_LIKED_SONGS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

/**
 * Get liked song usage records (when liked songs were last opened)
 */
function getLikedSongUsage(): UsageRecord[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LIKED_SONG_USAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as UsageRecord[];
  } catch {
    return [];
  }
}

/**
 * Record that a folder was opened/used
 */
export function recordFolderUsage(folderId: string): void {
  if (typeof window === 'undefined') return;
  
  const usage = getFolderUsage();
  const existingIndex = usage.findIndex(r => r.id === folderId);
  
  if (existingIndex >= 0) {
    // Update existing record
    usage[existingIndex].timestamp = Date.now();
  } else {
    // Add new record
    usage.push({ id: folderId, timestamp: Date.now() });
  }
  
  // Sort by timestamp (most recent first)
  usage.sort((a, b) => b.timestamp - a.timestamp);
  
  localStorage.setItem(FOLDER_USAGE_KEY, JSON.stringify(usage));
}

/**
 * Record that a note was opened/used
 */
export function recordNoteUsage(noteId: string): void {
  if (typeof window === 'undefined') return;
  
  const usage = getNoteUsage();
  const existingIndex = usage.findIndex(r => r.id === noteId);
  
  if (existingIndex >= 0) {
    // Update existing record
    usage[existingIndex].timestamp = Date.now();
  } else {
    // Add new record
    usage.push({ id: noteId, timestamp: Date.now() });
  }
  
  // Sort by timestamp (most recent first)
  usage.sort((a, b) => b.timestamp - a.timestamp);
  
  localStorage.setItem(NOTE_USAGE_KEY, JSON.stringify(usage));
}

/**
 * Record that a liked song was opened/used
 */
export function recordLikedSongUsage(songId: string): void {
  if (typeof window === 'undefined') return;
  
  const usage = getLikedSongUsage();
  const existingIndex = usage.findIndex(r => r.id === songId);
  
  if (existingIndex >= 0) {
    // Update existing record
    usage[existingIndex].timestamp = Date.now();
  } else {
    // Add new record
    usage.push({ id: songId, timestamp: Date.now() });
  }
  
  // Sort by timestamp (most recent first)
  usage.sort((a, b) => b.timestamp - a.timestamp);
  
  localStorage.setItem(LIKED_SONG_USAGE_KEY, JSON.stringify(usage));
}

/**
 * Compute which folders should be unlocked based on usage and limits
 * Returns the IDs of folders that should be unlocked
 * @param folderIds - Array of folder IDs
 * @param isPro - Whether user has Pro subscription
 * @param foldersWithTimestamps - Optional map of folder ID to creation timestamp (for fallback)
 */
function computeUnlockedFolders(
  folderIds: string[],
  isPro: boolean,
  foldersWithTimestamps?: Map<string, number>
): string[] {
  if (isPro) {
    // Pro users: all folders unlocked
    return folderIds;
  }
  
  if (folderIds.length <= FREE_FOLDER_LIMIT) {
    // Within limit: all unlocked
    return folderIds;
  }
  
  // Over limit: determine which to unlock based on usage
  const usage = getFolderUsage();
  
  // Sort folders by usage (most recently used first)
  // If no usage record, fallback to creation timestamp (most recently created first)
  const foldersWithUsage = folderIds.map(id => {
    const usageRecord = usage.find(r => r.id === id);
    const creationTime = foldersWithTimestamps?.get(id);
    // Use usage timestamp if available, otherwise use creation time, otherwise 0
    const timestamp = usageRecord?.timestamp ?? creationTime ?? 0;
    return {
      id,
      timestamp,
    };
  });
  
  // Sort by timestamp (most recent first), then by ID for stability
  foldersWithUsage.sort((a, b) => {
    if (b.timestamp !== a.timestamp) {
      return b.timestamp - a.timestamp;
    }
    return a.id.localeCompare(b.id);
  });
  
  // Take the top N folders (most recently used/created)
  const unlocked = foldersWithUsage
    .slice(0, FREE_FOLDER_LIMIT)
    .map(f => f.id);
  
  return unlocked;
}

/**
 * Compute which notes should be unlocked based on usage and limits
 * Returns the IDs of notes that should be unlocked
 * @param noteIds - Array of note IDs
 * @param isPro - Whether user has Pro subscription
 * @param notesWithTimestamps - Optional map of note ID to creation timestamp (for fallback)
 */
function computeUnlockedNotes(
  noteIds: string[],
  isPro: boolean,
  notesWithTimestamps?: Map<string, number>
): string[] {
  if (isPro) {
    // Pro users: all notes unlocked
    return noteIds;
  }
  
  if (noteIds.length <= FREE_NOTE_LIMIT) {
    // Within limit: all unlocked
    return noteIds;
  }
  
  // Over limit: determine which to unlock based on usage
  const usage = getNoteUsage();
  
  // Sort notes by usage (most recently used first)
  // If no usage record, fallback to creation timestamp (most recently created first)
  const notesWithUsage = noteIds.map(id => {
    const usageRecord = usage.find(r => r.id === id);
    const creationTime = notesWithTimestamps?.get(id);
    // Use usage timestamp if available, otherwise use creation time, otherwise 0
    const timestamp = usageRecord?.timestamp ?? creationTime ?? 0;
    return {
      id,
      timestamp,
    };
  });
  
  // Sort by timestamp (most recent first), then by ID for stability
  notesWithUsage.sort((a, b) => {
    if (b.timestamp !== a.timestamp) {
      return b.timestamp - a.timestamp;
    }
    return a.id.localeCompare(b.id);
  });
  
  // Take the top N notes (most recently used/created)
  const unlocked = notesWithUsage
    .slice(0, FREE_NOTE_LIMIT)
    .map(n => n.id);
  
  return unlocked;
}

/**
 * Compute which liked songs should be unlocked based on usage and limits
 * Returns the IDs of liked songs that should be unlocked
 * @param songIds - Array of liked song IDs (only songs, not notes)
 * @param isPro - Whether user has Pro subscription
 * @param songsWithTimestamps - Optional map of song ID to creation timestamp (for fallback)
 */
function computeUnlockedLikedSongs(
  songIds: string[],
  isPro: boolean,
  songsWithTimestamps?: Map<string, number>
): string[] {
  if (isPro) {
    // Pro users: all liked songs unlocked
    return songIds;
  }
  
  if (songIds.length <= FREE_LIKED_SONGS_LIMIT) {
    // Within limit: all unlocked
    return songIds;
  }
  
  // Over limit: determine which to unlock based on usage
  const usage = getLikedSongUsage();
  
  // Sort songs by usage (most recently used first)
  // If no usage record, fallback to creation timestamp (most recently created first)
  const songsWithUsage = songIds.map(id => {
    const usageRecord = usage.find(r => r.id === id);
    const creationTime = songsWithTimestamps?.get(id);
    // Use usage timestamp if available, otherwise use creation time, otherwise 0
    const timestamp = usageRecord?.timestamp ?? creationTime ?? 0;
    return {
      id,
      timestamp,
    };
  });
  
  // Sort by timestamp (most recent first), then by ID for stability
  songsWithUsage.sort((a, b) => {
    if (b.timestamp !== a.timestamp) {
      return b.timestamp - a.timestamp;
    }
    return a.id.localeCompare(b.id);
  });
  
  // Take the top N songs (most recently used/created)
  const unlocked = songsWithUsage
    .slice(0, FREE_LIKED_SONGS_LIMIT)
    .map(s => s.id);
  
  return unlocked;
}

/**
 * Update unlocked folders based on current folder list and Pro status
 * This should be called whenever folders change or Pro status changes
 * @param folderIds - Array of folder IDs
 * @param isPro - Whether user has Pro subscription
 * @param foldersWithTimestamps - Optional map of folder ID to creation timestamp (for fallback)
 */
export function updateUnlockedFolders(
  folderIds: string[],
  isPro: boolean,
  foldersWithTimestamps?: Map<string, number>
): string[] {
  const unlocked = computeUnlockedFolders(folderIds, isPro, foldersWithTimestamps);
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(UNLOCKED_FOLDERS_KEY, JSON.stringify(unlocked));
  }
  
  return unlocked;
}

/**
 * Update unlocked notes based on current note list and Pro status
 * This should be called whenever notes change or Pro status changes
 * @param noteIds - Array of note IDs
 * @param isPro - Whether user has Pro subscription
 * @param notesWithTimestamps - Optional map of note ID to creation timestamp (for fallback)
 */
export function updateUnlockedNotes(
  noteIds: string[],
  isPro: boolean,
  notesWithTimestamps?: Map<string, number>
): string[] {
  const unlocked = computeUnlockedNotes(noteIds, isPro, notesWithTimestamps);
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(UNLOCKED_NOTES_KEY, JSON.stringify(unlocked));
  }
  
  return unlocked;
}

/**
 * Update unlocked liked songs based on current liked songs list and Pro status
 * This should be called whenever liked songs change or Pro status changes
 * @param songIds - Array of liked song IDs (only songs, not notes)
 * @param isPro - Whether user has Pro subscription
 * @param songsWithTimestamps - Optional map of song ID to creation timestamp (for fallback)
 */
export function updateUnlockedLikedSongs(
  songIds: string[],
  isPro: boolean,
  songsWithTimestamps?: Map<string, number>
): string[] {
  const unlocked = computeUnlockedLikedSongs(songIds, isPro, songsWithTimestamps);
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(UNLOCKED_LIKED_SONGS_KEY, JSON.stringify(unlocked));
  }
  
  return unlocked;
}

/**
 * Check if a folder is locked
 */
export function isFolderLocked(folderId: string, isPro: boolean): boolean {
  if (isPro) return false;
  
  const unlocked = getUnlockedFolders();
  return !unlocked.includes(folderId);
}

/**
 * Check if a note is locked
 */
export function isNoteLocked(noteId: string, isPro: boolean): boolean {
  if (isPro) return false;
  
  const unlocked = getUnlockedNotes();
  return !unlocked.includes(noteId);
}

/**
 * Check if a liked song is locked
 */
export function isLikedSongLocked(songId: string, isPro: boolean): boolean {
  if (isPro) return false;
  
  const unlocked = getUnlockedLikedSongs();
  return !unlocked.includes(songId);
}

/**
 * When a folder is opened, record usage and update unlocked set if needed
 */
export function onFolderOpened(
  folderId: string,
  allFolderIds: string[],
  isPro: boolean
): void {
  recordFolderUsage(folderId);
  
  // If this folder wasn't unlocked, we need to update the unlocked set
  // (this can happen if user upgrades or if we're recalculating)
  const unlocked = getUnlockedFolders();
  if (!unlocked.includes(folderId)) {
    updateUnlockedFolders(allFolderIds, isPro);
  }
}

/**
 * When a note is opened, record usage and update unlocked set if needed
 */
export function onNoteOpened(
  noteId: string,
  allNoteIds: string[],
  isPro: boolean
): void {
  recordNoteUsage(noteId);
  
  // If this note wasn't unlocked, we need to update the unlocked set
  // (this can happen if user upgrades or if we're recalculating)
  const unlocked = getUnlockedNotes();
  if (!unlocked.includes(noteId)) {
    updateUnlockedNotes(allNoteIds, isPro);
  }
}

/**
 * When a liked song is opened, record usage and update unlocked set if needed
 */
export function onLikedSongOpened(
  songId: string,
  allSongIds: string[],
  isPro: boolean
): void {
  recordLikedSongUsage(songId);
  
  // If this song wasn't unlocked, we need to update the unlocked set
  // (this can happen if user upgrades or if we're recalculating)
  const unlocked = getUnlockedLikedSongs();
  if (!unlocked.includes(songId)) {
    updateUnlockedLikedSongs(allSongIds, isPro);
  }
}

/**
 * Clear all unlocked state (useful for testing or reset)
 */
export function clearUnlockedState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(UNLOCKED_FOLDERS_KEY);
  localStorage.removeItem(UNLOCKED_NOTES_KEY);
  localStorage.removeItem(UNLOCKED_LIKED_SONGS_KEY);
  localStorage.removeItem(FOLDER_USAGE_KEY);
  localStorage.removeItem(NOTE_USAGE_KEY);
  localStorage.removeItem(LIKED_SONG_USAGE_KEY);
}

