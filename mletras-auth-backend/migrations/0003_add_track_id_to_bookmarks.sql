-- Add track_id and album_art_url to existing user_bookmarks table

-- Check if columns exist and add them if they don't
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we'll use CREATE TABLE IF NOT EXISTS approach

-- Create new tables if they don't exist
CREATE TABLE IF NOT EXISTS user_folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  note_title TEXT NOT NULL,
  note_content TEXT NOT NULL,
  artist_name TEXT,
  song_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- For user_bookmarks, we need to check if track_id column exists
-- Create a new table with all columns, copy data, drop old, rename new
CREATE TABLE IF NOT EXISTS user_bookmarks_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  folder_id TEXT,
  song_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  track_id TEXT,
  album_art_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy existing data if user_bookmarks table exists
INSERT OR IGNORE INTO user_bookmarks_new (id, user_id, folder_id, song_title, artist_name, created_at)
SELECT id, user_id, folder_id, song_title, artist_name, created_at 
FROM user_bookmarks WHERE EXISTS (SELECT 1 FROM user_bookmarks LIMIT 1);

-- Drop old table and rename new one
DROP TABLE IF EXISTS user_bookmarks;
ALTER TABLE user_bookmarks_new RENAME TO user_bookmarks;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_folders_user_id ON user_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_folder_id ON user_bookmarks(folder_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_track_id ON user_bookmarks(track_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);

