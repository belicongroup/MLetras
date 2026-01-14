-- Add use_cache column to guest_transactions table
-- Allows manual control of caching for guest transaction verifications

ALTER TABLE guest_transactions ADD COLUMN use_cache BOOLEAN DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guest_transactions_use_cache ON guest_transactions(use_cache);

