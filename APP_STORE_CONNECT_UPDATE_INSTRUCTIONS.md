# App Store Connect Update Instructions
## Critical Fixes Required for Resubmission

---

## 🔴 CRITICAL: Add Terms of Use Link to App Description

### Step-by-Step Instructions:

1. **Log into App Store Connect**
   - Go to https://appstoreconnect.apple.com
   - Sign in with your Apple Developer account

2. **Navigate to Your App**
   - Click "My Apps"
   - Select "MLetras"

3. **Go to Version 1.0.3**
   - Click on "iOS App" under your app
   - Select version "1.0.3" (or the version you're submitting)

4. **Edit App Description**
   - Scroll down to "App Information" section
   - Find the "Description" field
   - Click "Edit" or the pencil icon

5. **Add Terms of Use Link**
   - Scroll to the end of your current description
   - Add a new line with:
     ```
     Terms of Use: https://mletras.com/terms
     ```
   - Or if you prefer a more formatted version:
     ```
     
     Terms of Use: https://mletras.com/terms
     ```

6. **Save Changes**
   - Click "Save" or "Done"
   - Wait for changes to be saved

---

## ✅ VERIFY: Privacy Policy URL

### Step-by-Step Instructions:

1. **Navigate to App Information**
   - In App Store Connect → Your App → App Information

2. **Check Privacy Policy URL**
   - Scroll to "Privacy Policy URL" field
   - Verify it says: `https://mletras.com/privacy`
   - If it's empty or different, update it to: `https://mletras.com/privacy`

3. **Verify URL is Accessible**
   - Open a new browser tab
   - Navigate to: https://mletras.com/privacy
   - Verify the page loads correctly (should return 200 OK, not 404)

---

## ✅ VERIFY: Paid Apps Agreement

### Step-by-Step Instructions:

1. **Navigate to Agreements**
   - In App Store Connect, click "Agreements, Tax, and Banking" in the left sidebar
   - Or go to: https://appstoreconnect.apple.com/agreements

2. **Check Paid Apps Agreement Status**
   - Look for "Paid Apps Agreement" section
   - Check the status:
     - ✅ **"Active"** = You're good to go
     - ⚠️ **"Pending"** = Account Holder needs to accept
     - ❌ **"Missing"** = Need to set up

3. **If Not Active:**
   - Click on the agreement
   - Read and accept the terms
   - Complete any required tax/banking information
   - Wait for approval (can take 24-48 hours)

---

## 📝 UPDATED APP DESCRIPTION TEMPLATE

Here's what your App Description should look like (add the Terms link at the end):

```
MLetras is your go-to app for finding and organizing song lyrics. Search for any song by title or artist, view lyrics, and keep your favorites organized.

KEY FEATURES:
• Search lyrics for millions of songs
• Save favorite songs to folders
• Create personal notes for songs
• Bookmark lyrics for quick access
• Auto-scroll lyrics while listening
• Dark mode for comfortable viewing
• Multi-language support (English & Spanish)

PRO SUBSCRIPTION:
Upgrade to MLetras Pro for:
• Unlimited folders
• Unlimited notes
• Auto-scroll lyrics
• Dark theme
• Priority support

MLetras makes it easy to find, save, and organize your favorite song lyrics. Perfect for musicians, karaoke enthusiasts, and music lovers.

Privacy-focused with secure cloud sync across all your devices.

Terms of Use: https://mletras.com/terms
```

---

## ✅ VERIFICATION CHECKLIST

Before resubmitting, check:

- [ ] Terms of Use link added to App Description
- [ ] Privacy Policy URL verified in App Information
- [ ] Privacy Policy URL is publicly accessible (test in browser)
- [ ] Terms of Use URL is publicly accessible (test in browser)
- [ ] Paid Apps Agreement status is "Active"
- [ ] All changes saved in App Store Connect

---

## 🚨 IMPORTANT NOTES

1. **URL Accessibility:**
   - Both URLs must be publicly accessible
   - They should return HTTP 200 (not 404 or 403)
   - Test both URLs in an incognito/private browser window

2. **Terms of Use vs EULA:**
   - Apple accepts either:
     - Link in App Description (easier - recommended)
     - Custom EULA uploaded in App Store Connect (more complex)
   - We're using the App Description method (simpler)

3. **Timing:**
   - Changes to App Description take effect immediately
   - You can resubmit right after adding the Terms link
   - No need to wait for approval of metadata changes

4. **Testing:**
   - After adding Terms link, verify it appears in App Store Connect preview
   - Make sure the link is clickable and formatted correctly

---

## 📞 NEXT STEPS AFTER UPDATING

1. ✅ Complete all App Store Connect updates above
2. ✅ Update `APPLE_REVIEW_RESPONSE.md` with current UI (already done)
3. ✅ Copy updated response from `APPLE_REVIEW_RESPONSE.md`
4. ✅ Reply to Apple's review message in App Store Connect
5. ✅ Paste the response
6. ✅ Resubmit app for review

---

## 🎯 SUMMARY

**What to Fix:**
- Add Terms of Use link to App Description
- Verify Privacy Policy URL is set
- Verify Paid Apps Agreement is active

**Time Required:** 15-30 minutes

**Difficulty:** Easy (just copy/paste URLs)

**Impact:** Critical - App will be rejected without these fixes

