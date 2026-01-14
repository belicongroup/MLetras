-- Guest Transactions Table
-- Stores transaction verification data for guest users (Apple compliant)
-- No personal information collected - only Apple transaction IDs

CREATE TABLE IF NOT EXISTS guest_transactions (
  transaction_id TEXT PRIMARY KEY,
  verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT,
  apple_response JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for querying by verification date
CREATE INDEX IF NOT EXISTS idx_guest_transactions_verified_at ON guest_transactions(verified_at);

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_guest_transactions_status ON guest_transactions(status);

