# Subscription Verification Guide
## Cloudflare D1 Database & Apple App Store Sync

---

## ⚠️ IMPORTANT: Backend is NOT Automatically Synced with Apple

**Current Status:**
- The D1 database stores subscription status that the **app reports** to it
- The backend does **NOT** verify receipts with Apple automatically
- The database is a **cache/sync service**, not the source of truth
- **StoreKit is the source of truth** for subscription status

**Why:**
- Apple compliance requires subscriptions to work without backend
- Guest users can purchase without accounts
- Backend sync is optional (only for authenticated users who want cross-device sync)

---

## 📊 Database Schema

The `users` table stores subscription info:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'pro')),
  metadata JSON DEFAULT '{}',  -- Stores transaction_id here
  created_at DATETIME,
  updated_at DATETIME
);
```

**Subscription data location:**
- `subscription_type`: `'free'` or `'pro'`
- `metadata.last_transaction_id`: Apple transaction ID (if available)
- `metadata.subscription_updated_at`: When subscription was last updated

---

## 🔍 How to Query Subscription Status

### **1. View All Users with Subscription Status**

**Local Development:**
```bash
cd mletras-auth-backend
npx wrangler d1 execute mletras-auth-db --local --command="SELECT id, email, subscription_type, updated_at, metadata FROM users ORDER BY updated_at DESC;"
```

**Production:**
```bash
cd mletras-auth-backend
npx wrangler d1 execute mletras-auth-db --command="SELECT id, email, subscription_type, updated_at, metadata FROM users ORDER BY updated_at DESC;"
```

### **2. View Only Pro Users**

**Local:**
```bash
npx wrangler d1 execute mletras-auth-db --local --command="SELECT id, email, subscription_type, updated_at FROM users WHERE subscription_type = 'pro' ORDER BY updated_at DESC;"
```

**Production:**
```bash
npx wrangler d1 execute mletras-auth-db --command="SELECT id, email, subscription_type, updated_at FROM users WHERE subscription_type = 'pro' ORDER BY updated_at DESC;"
```

### **3. View Transaction IDs (from metadata)**

**Local:**
```bash
npx wrangler d1 execute mletras-auth-db --local --command="SELECT id, email, subscription_type, json_extract(metadata, '$.last_transaction_id') as transaction_id, json_extract(metadata, '$.subscription_updated_at') as updated_at FROM users WHERE subscription_type = 'pro';"
```

**Production:**
```bash
npx wrangler d1 execute mletras-auth-db --command="SELECT id, email, subscription_type, json_extract(metadata, '$.last_transaction_id') as transaction_id, json_extract(metadata, '$.subscription_updated_at') as updated_at FROM users WHERE subscription_type = 'pro';"
```

### **4. Find User by Email**

**Local:**
```bash
npx wrangler d1 execute mletras-auth-db --local --command="SELECT * FROM users WHERE email = 'user@example.com';"
```

**Production:**
```bash
npx wrangler d1 execute mletras-auth-db --command="SELECT * FROM users WHERE email = 'user@example.com';"
```

---

## 🔄 Current Sync Flow

### **How Subscription Status Gets to Database:**

1. **User purchases subscription** (via StoreKit)
2. **App verifies with StoreKit** (source of truth)
3. **If user is authenticated:**
   - App calls `/api/user/subscription` endpoint
   - Backend updates `users.subscription_type = 'pro'`
   - Backend stores `transaction_id` in `metadata`
4. **If user is NOT authenticated (guest):**
   - No backend update (by design - Apple compliance)
   - Pro features unlock via StoreKit verification only

### **Database Update Endpoint:**

**Endpoint:** `POST /api/user/subscription`

**Requires:** Authentication (session token)

**Request Body:**
```json
{
  "subscription_type": "pro",
  "transaction_id": "2000001088824988"
}
```

**What it does:**
- Updates `users.subscription_type` to `'pro'`
- Stores `transaction_id` in `metadata.last_transaction_id`
- Sets `metadata.subscription_updated_at` timestamp

---

## ⚠️ Sync Limitations

### **What the Database Knows:**

✅ **Authenticated users who purchased:**
- Subscription status (`pro` or `free`)
- Transaction ID (if provided)
- Last update timestamp

❌ **What the Database DOESN'T Know:**

- Guest users who purchased (no account = no database entry)
- Whether subscription is still active (no Apple verification)
- Subscription expiry date
- Trial status
- Cancellation status
- Refund status

### **Why This is By Design:**

- Apple requires subscriptions to work without backend
- Guest users can purchase without accounts
- Backend is optional sync service, not required for purchase
- StoreKit is the authoritative source

---

## 🔐 How to Verify with Apple (Manual)

If you need to verify a subscription with Apple, you have two options:

### **Option 1: App Store Server API (Recommended)**

Apple's official API for server-side verification:

```bash
# Requires App Store Connect API key
curl -X POST https://api.storekit.itunes.apple.com/inApps/v1/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "2000001088824988"
  }'
```

**Setup Required:**
1. Generate App Store Connect API key
2. Add server-side verification endpoint to your backend
3. Call Apple's API to verify transaction status

### **Option 2: Receipt Validation (Legacy)**

For older apps using receipt validation:

```bash
# Production
curl -X POST https://buy.itunes.apple.com/verifyReceipt \
  -d '{"receipt-data": "BASE64_RECEIPT_DATA", "password": "YOUR_SHARED_SECRET"}'

# Sandbox
curl -X POST https://sandbox.itunes.apple.com/verifyReceipt \
  -d '{"receipt-data": "BASE64_RECEIPT_DATA", "password": "YOUR_SHARED_SECRET"}'
```

---

## 🛠️ Recommended: Add Apple Verification to Backend

To keep database in sync with Apple, you could add:

### **1. Server-Side Verification Endpoint**

Add to `mletras-auth-backend/src/index.ts`:

```typescript
// Verify subscription with Apple App Store Server API
private async verifySubscriptionWithApple(transactionId: string): Promise<boolean> {
  try {
    // Call Apple's App Store Server API
    const response = await fetch('https://api.storekit.itunes.apple.com/inApps/v1/status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${APPLE_JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ transactionId })
    });
    
    const data = await response.json();
    return data.status === 'ACTIVE';
  } catch (error) {
    console.error('Apple verification failed:', error);
    return false;
  }
}
```

### **2. Periodic Sync Job**

Create a scheduled worker to verify all Pro subscriptions:

```typescript
// In wrangler.toml, add:
[[triggers.crons]]
cron = "0 */6 * * *"  // Every 6 hours

// In worker:
export default {
  async scheduled(event, env, ctx) {
    // Get all Pro users
    const proUsers = await env.DB.prepare(
      "SELECT id, json_extract(metadata, '$.last_transaction_id') as transaction_id FROM users WHERE subscription_type = 'pro'"
    ).all();
    
    // Verify each with Apple
    for (const user of proUsers.results) {
      const isActive = await verifySubscriptionWithApple(user.transaction_id);
      if (!isActive) {
        // Update to free if subscription expired
        await env.DB.prepare(
          "UPDATE users SET subscription_type = 'free' WHERE id = ?"
        ).bind(user.id).run();
      }
    }
  }
}
```

---

## 📋 Quick Reference Commands

### **View All Subscriptions:**
```bash
# Local
npx wrangler d1 execute mletras-auth-db --local --command="SELECT email, subscription_type, updated_at FROM users WHERE subscription_type = 'pro';"

# Production
npx wrangler d1 execute mletras-auth-db --command="SELECT email, subscription_type, updated_at FROM users WHERE subscription_type = 'pro';"
```

### **Count Pro Users:**
```bash
# Local
npx wrangler d1 execute mletras-auth-db --local --command="SELECT COUNT(*) as pro_users FROM users WHERE subscription_type = 'pro';"

# Production
npx wrangler d1 execute mletras-auth-db --command="SELECT COUNT(*) as pro_users FROM users WHERE subscription_type = 'pro';"
```

### **View Transaction IDs:**
```bash
# Local
npx wrangler d1 execute mletras-auth-db --local --command="SELECT email, json_extract(metadata, '$.last_transaction_id') as transaction_id FROM users WHERE subscription_type = 'pro';"

# Production
npx wrangler d1 execute mletras-auth-db --command="SELECT email, json_extract(metadata, '$.last_transaction_id') as transaction_id FROM users WHERE subscription_type = 'pro';"
```

### **Manual Update (for testing):**
```bash
# Set user to Pro
npx wrangler d1 execute mletras-auth-db --local --command="UPDATE users SET subscription_type = 'pro' WHERE email = 'user@example.com';"

# Set user to Free
npx wrangler d1 execute mletras-auth-db --local --command="UPDATE users SET subscription_type = 'free' WHERE email = 'user@example.com';"
```

---

## 🎯 Summary

**Current State:**
- ✅ Database stores subscription status for authenticated users
- ✅ Transaction IDs are stored in metadata
- ❌ Database is NOT automatically verified with Apple
- ❌ Guest purchases are NOT in database (by design)

**Source of Truth:**
- **StoreKit** = Authoritative source (always check this first)
- **Database** = Optional cache/sync (only for authenticated users)

**To Keep in Sync:**
- Add Apple App Store Server API verification
- Create periodic sync job to verify all subscriptions
- Update database when subscriptions expire/cancel

**For Now:**
- Use StoreKit verification in app (already implemented)
- Database is optional sync service
- Guest users work without database (Apple compliant)

