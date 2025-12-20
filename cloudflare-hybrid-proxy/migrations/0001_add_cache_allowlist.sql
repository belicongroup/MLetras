-- Migration: Add cache allowlist support to users table
-- This migration adds a use_cache column to enable selective caching per user

-- Option 1: Add use_cache column (Recommended)
-- This allows direct boolean flag for cache control
ALTER TABLE users ADD COLUMN use_cache BOOLEAN DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_use_cache ON users(use_cache);

-- Note: The worker also supports using the metadata JSON column:
-- UPDATE users SET metadata = json_set(COALESCE(metadata, '{}'), '$.use_cache', 1) WHERE id = 'user-id';
-- 
-- The worker checks both methods, so you can use either approach.

