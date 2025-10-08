-- Remove album_art_url column from user_bookmarks table
-- SQLite requires recreating the table to drop a column

-- Create new table without album_art_url
CREATE TABLE IF NOT EXISTS user_bookmarks_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  folder_id TEXT,
  song_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  track_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy existing data
INSERT INTO user_bookmarks_new (id, user_id, folder_id, song_title, artist_name, track_id, created_at)
SELECT id, user_id, folder_id, song_title, artist_name, track_id, created_at 
FROM user_bookmarks;

-- Drop old table
DROP TABLE user_bookmarks;

-- Rename new table
ALTER TABLE user_bookmarks_new RENAME TO user_bookmarks;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_folder_id ON user_bookmarks(folder_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_track_id ON user_bookmarks(track_id);

