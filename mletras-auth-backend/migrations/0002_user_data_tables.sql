-- User Data Tables Migration
-- Adds support for folders, bookmarks, and notes

-- User Folders table
CREATE TABLE IF NOT EXISTS user_folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User Bookmarks table (with Musixmatch track_id)
CREATE TABLE IF NOT EXISTS user_bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  folder_id TEXT,
  song_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  track_id TEXT,  -- Musixmatch track ID for fetching lyrics
  album_art_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (folder_id) REFERENCES user_folders(id) ON DELETE SET NULL
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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add username column to users table if not exists
-- SQLite doesn't support ALTER TABLE IF COLUMN NOT EXISTS, so we use a workaround
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;
DROP TABLE users;
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'pro')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSON DEFAULT '{}'
);
INSERT INTO users SELECT id, email, NULL, email_verified, subscription_type, created_at, updated_at, last_login_at, is_active, metadata FROM users_backup;
DROP TABLE users_backup;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_folders_user_id ON user_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_folder_id ON user_bookmarks(folder_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_track_id ON user_bookmarks(track_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

