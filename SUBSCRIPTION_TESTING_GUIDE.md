# 🔍 Troubleshooting: "Product not found" Error

## Common Causes & Solutions

### 1. **Testing on Simulator** ❌
**Problem:** iOS Simulator doesn't support real in-app purchases.

**Solution:**
- **Test on a REAL iOS device** (iPhone/iPad)
- Simulator will always show "Product not found"

---

### 2. **Not Using Sandbox Tester Account** ❌
**Problem:** You need to be signed in with a sandbox tester account.

**Solution:**
1. **Create Sandbox Tester in App Store Connect:**
   - Go to App Store Connect → Users and Access → Sandbox Testers
   - Click "+" to create a new tester
   - Use a **different email** than your Apple ID
   - Don't use a real email you use elsewhere

2. **Sign Out of Apple ID on Test Device:**
   - Settings → [Your Name] → Sign Out
   - **Important:** Sign out completely

3. **Try to Purchase in Your App:**
   - When you tap "Start Free Trial"
   - iOS will prompt you to sign in
   - **Sign in with your SANDBOX TESTER email**
   - Use the password you set in App Store Connect

---

### 3. **Subscription Not Ready** ❌
**Problem:** Subscription must be in "Ready to Submit" status.

**Check in App Store Connect:**
1. Go to your app → Subscriptions
2. Click on "MLetras Pro Monthly"
3. Check the status:
   - ✅ **"Ready to Submit"** = Good!
   - ⚠️ **"Missing Metadata"** = Need to complete setup
   - ❌ **"Draft"** = Not ready yet

**If status is not "Ready to Submit":**
- Complete all required fields
- Add pricing
- Add free trial
- Add subscription information
- Add localization (at least English)

---

### 4. **Product ID Mismatch** ❌
**Problem:** Product ID in code doesn't match App Store Connect.

**Verify:**
- **Code:** `com.mletras.pro.monthly` ✅
- **App Store Connect:** Check Product ID matches exactly

**To check:**
1. App Store Connect → Subscriptions
2. Click "MLetras Pro Monthly"
3. Check "Product ID" field
4. Should be: `com.mletras.pro.monthly`

---

### 5. **Subscription Not Linked to App Version** ⚠️
**Problem:** First subscription must be linked to an app version.

**This is normal!** The blue info box in App Store Connect says:
> "Your first subscription must be submitted with a new app version"

**What this means:**
- You can't test purchases until you upload version 1.0.2
- After uploading, link subscription to that version
- Then you can test

**Workaround for Testing:**
- You might need to upload a build first
- Or wait until subscription is approved

---

## Quick Checklist

- [ ] Testing on **real device** (not simulator)
- [ ] Signed out of regular Apple ID
- [ ] Signed in with **sandbox tester** account
- [ ] Subscription status is **"Ready to Submit"**
- [ ] Product ID matches: `com.mletras.pro.monthly`
- [ ] All subscription metadata completed

---

## Testing Steps

1. **Create Sandbox Tester:**
   ```
   App Store Connect → Users and Access → Sandbox Testers → +
   ```

2. **On Test Device:**
   - Sign out of Apple ID
   - Open your app
   - Try to purchase
   - Sign in with sandbox tester when prompted

3. **Expected Behavior:**
   - Sandbox purchases are FREE
   - No real money charged
   - Subscription activates immediately
   - Can test cancellation/restoration

---

## Still Not Working?

**Check Xcode Console:**
- Look for error messages
- Check if product ID is being called correctly
- Verify plugin is initialized

**Common Error Messages:**
- "Invalid product ID" → Check spelling
- "Product not available" → Subscription not ready
- "StoreKit not available" → Testing on simulator

---

**Most likely issue: Testing on simulator or not using sandbox account!** 🎯

