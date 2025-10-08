-- User Data Tables Migration (Simple Version)
-- Adds support for folders, bookmarks, and notes

-- User Folders table
CREATE TABLE IF NOT EXISTS user_folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Bookmarks table (with Musixmatch track_id)
CREATE TABLE IF NOT EXISTS user_bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  folder_id TEXT,
  song_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  track_id TEXT,
  album_art_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Notes table
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_folders_user_id ON user_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_folder_id ON user_bookmarks(folder_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_track_id ON user_bookmarks(track_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);

