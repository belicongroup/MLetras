# Guest Transactions Monitoring

## Overview

The `guest_transactions` table logs transaction verifications for guest users (users who purchase without creating accounts). This is **Apple compliant** because:

- ✅ No personal information collected (only Apple transaction IDs)
- ✅ Passive logging (doesn't block purchases)
- ✅ No registration required
- ✅ Transaction IDs are not PII

## Database Schema

```sql
CREATE TABLE guest_transactions (
  transaction_id TEXT PRIMARY KEY,  -- Apple transaction ID (not PII)
  verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT,  -- 'active' or 'inactive'
  apple_response JSON,  -- Raw Apple API response
  use_cache BOOLEAN DEFAULT 0,  -- Cache control flag (like users table)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Querying Guest Transactions

### View All Guest Transactions

**Local:**
```bash
cd mletras-auth-backend
npx wrangler d1 execute mletras-auth-db --local --command="SELECT transaction_id, status, verified_at, created_at FROM guest_transactions ORDER BY verified_at DESC LIMIT 50;"
```

**Production:**
```bash
npx wrangler d1 execute mletras-auth-db --command="SELECT transaction_id, status, verified_at, created_at FROM guest_transactions ORDER BY verified_at DESC LIMIT 50;"
```

### View Active Guest Transactions

**Local:**
```bash
npx wrangler d1 execute mletras-auth-db --local --command="SELECT transaction_id, verified_at FROM guest_transactions WHERE status = 'active' ORDER BY verified_at DESC;"
```

**Production:**
```bash
npx wrangler d1 execute mletras-auth-db --command="SELECT transaction_id, verified_at FROM guest_transactions WHERE status = 'active' ORDER BY verified_at DESC;"
```

### Count Guest Transactions

**Local:**
```bash
npx wrangler d1 execute mletras-auth-db --local --command="SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count FROM guest_transactions;"
```

**Production:**
```bash
npx wrangler d1 execute mletras-auth-db --command="SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count FROM guest_transactions;"
```

### View Transaction Details (with Apple Response)

**Local:**
```bash
npx wrangler d1 execute mletras-auth-db --local --command="SELECT transaction_id, status, verified_at, apple_response FROM guest_transactions WHERE transaction_id = 'YOUR_TRANSACTION_ID';"
```

**Production:**
```bash
npx wrangler d1 execute mletras-auth-db --command="SELECT transaction_id, status, verified_at, apple_response FROM guest_transactions WHERE transaction_id = 'YOUR_TRANSACTION_ID';"
```

### View Recent Verifications (Last 24 Hours)

**Local:**
```bash
npx wrangler d1 execute mletras-auth-db --local --command="SELECT transaction_id, status, verified_at FROM guest_transactions WHERE verified_at >= datetime('now', '-1 day') ORDER BY verified_at DESC;"
```

**Production:**
```bash
npx wrangler d1 execute mletras-auth-db --command="SELECT transaction_id, status, verified_at FROM guest_transactions WHERE verified_at >= datetime('now', '-1 day') ORDER BY verified_at DESC;"
```

### Enable Cache for a Transaction

**Local:**
```bash
npx wrangler d1 execute mletras-auth-db --local --command="UPDATE guest_transactions SET use_cache = 1 WHERE transaction_id = 'TRANSACTION_ID';"
```

**Production:**
```bash
npx wrangler d1 execute mletras-auth-db --command="UPDATE guest_transactions SET use_cache = 1 WHERE transaction_id = 'TRANSACTION_ID';"
```

### Disable Cache for a Transaction

**Local:**
```bash
npx wrangler d1 execute mletras-auth-db --local --command="UPDATE guest_transactions SET use_cache = 0 WHERE transaction_id = 'TRANSACTION_ID';"
```

**Production:**
```bash
npx wrangler d1 execute mletras-auth-db --command="UPDATE guest_transactions SET use_cache = 0 WHERE transaction_id = 'TRANSACTION_ID';"
```

### View Transactions with Cache Status

**Local:**
```bash
npx wrangler d1 execute mletras-auth-db --local --command="SELECT transaction_id, status, use_cache, verified_at FROM guest_transactions ORDER BY verified_at DESC LIMIT 50;"
```

**Production:**
```bash
npx wrangler d1 execute mletras-auth-db --command="SELECT transaction_id, status, use_cache, verified_at FROM guest_transactions ORDER BY verified_at DESC LIMIT 50;"
```

## How It Works

1. **When a transaction is verified** via `/verify-transaction` endpoint:
   - Checks if transaction has `use_cache = 1` flag
   - If cached: Returns cached response from KV (1 hour TTL)
   - If not cached: Calls Apple API → Caches if `use_cache = 1` → Returns
   - Transaction ID is logged to database
   - Verification status (active/inactive) is stored
   - Apple's API response is stored (for audit)
   - `use_cache` flag is stored

2. **Caching behavior:**
   - If `use_cache = 1`: Response cached in KV for 1 hour
   - If `use_cache = 0` or NULL: Always calls Apple API (no cache)
   - Cache key: `apple_transaction:{transactionId}`

3. **Logging is passive:**
   - Logging happens asynchronously (non-blocking)
   - If logging fails, verification still succeeds
   - Never affects the purchase or verification flow

4. **No personal information:**
   - Only Apple transaction IDs (not PII)
   - No email, name, device ID, or IP address
   - Cannot identify individual users

## Privacy Compliance

✅ **Apple Guideline 5.1.1 Compliant:**
- No personal information collected
- No registration required
- Purchase flow unaffected
- Transaction IDs are not PII

## Migration

To apply the migration:

**Local:**
```bash
cd mletras-auth-backend
npx wrangler d1 migrations apply mletras-auth-db --local
```

**Production:**
```bash
cd mletras-auth-backend
npx wrangler d1 migrations apply mletras-auth-db
```

## Notes

- Transactions are logged automatically when `/verify-transaction` is called
- Logging failures are silent (don't affect verification)
- Old transactions can be cleaned up periodically if needed
- This data is for monitoring/audit purposes only

