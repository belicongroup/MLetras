# App Store Connect Submission Guide - Version 1.0.5

## ✅ Pre-Submission Checklist

### Version Information
- **App Version:** 1.0.5
- **Build Number:** 5
- **Bundle ID:** com.mletras.com

---

## 📋 Step-by-Step Submission Process

### Step 1: Build the App in Xcode

1. **Open Xcode**
   ```bash
   cd ios/App
   open App.xcworkspace
   ```

2. **Select Build Target**
   - In Xcode, select **"Any iOS Device"** or your connected device
   - Make sure the scheme is set to **"App"**

3. **Clean Build Folder**
   - Menu: **Product → Clean Build Folder** (Shift + Cmd + K)

4. **Archive the App**
   - Menu: **Product → Archive**
   - Wait for the archive process to complete (may take a few minutes)
   - The Organizer window will open automatically when done

---

### Step 2: Verify Archive

In the Organizer window, verify:
- ✅ Archive shows version **1.0.5**
- ✅ Build number is **5**
- ✅ No errors or warnings
- ✅ Archive size is reasonable

---

### Step 3: Distribute to App Store Connect

1. **In Organizer Window:**
   - Select your archive (should show version 1.0.5)
   - Click **"Distribute App"**

2. **Select Distribution Method:**
   - Choose **"App Store Connect"**
   - Click **"Next"**

3. **Select Distribution Options:**
   - Choose **"Upload"**
   - Click **"Next"**

4. **Select Distribution Options (Advanced):**
   - ✅ **"Upload your app's symbols"** (recommended)
   - ✅ **"Manage Version and Build Number"** (if available)
   - Click **"Next"**

5. **Review and Upload:**
   - Review the summary
   - Click **"Upload"**
   - Wait for upload to complete (may take 10-30 minutes depending on internet speed)

---

### Step 4: App Store Connect Setup

1. **Log into App Store Connect**
   - Go to https://appstoreconnect.apple.com
   - Sign in with your Apple Developer account

2. **Navigate to Your App**
   - Click **"My Apps"**
   - Select **"MLetras"**

3. **Create New Version (if needed)**
   - If version 1.0.5 doesn't exist, click **"+ Version or Platform"**
   - Enter version: **1.0.5**
   - Click **"Create"**

4. **Wait for Build Processing**
   - After upload, Apple processes the build (usually 10-60 minutes)
   - You'll see a yellow dot next to the build number
   - When ready, it will show a green checkmark ✅
   - **Refresh the page periodically to check status**

---

### Step 5: Complete App Store Connect Metadata

#### 5.1 App Information
- ✅ **Name:** MLetras
- ✅ **Subtitle:** (if you have one)
- ✅ **Bundle ID:** com.mletras.com
- ✅ **SKU:** com.mletras.com
- ✅ **Privacy Policy URL:** https://mletras.com/privacy

#### 5.2 Version Information (1.0.5)

**Screenshots:**
- Upload screenshots for required device sizes
- iPhone 6.5" Display (1242 × 2688px or 1284 × 2778px)
- At least 3 screenshots required

**Promotional Text (170 characters max):**
```
Discover song lyrics instantly. Search, save favorites, and take notes. Upgrade to Pro for unlimited folders, dark mode, and auto-scroll.
```

**Description (4000 characters max):**
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

**Keywords (100 characters max):**
```
lyrics, songs, music, karaoke, song lyrics, artist, search lyrics, music notes, song finder, lyrics app
```

**Support URL:**
```
https://mletras.com/support
```

**Marketing URL (Optional):**
```
https://mletras.com
```

**Version:**
```
1.0.5
```

**Copyright:**
```
© 2025 Belicon Group
```

#### 5.3 In-App Purchases

**Link Subscription to Version:**
1. Scroll to **"In-App Purchases and Subscriptions"** section
2. Click **"Edit"**
3. Select **"MLetras Pro Monthly"** (com.mletras.pro.monthly)
4. Click **"Save"**

#### 5.4 App Review Information

**Sign-In Information:**
- ✅ **Sign-in required:** Yes
- **User name:** (Your test account email)
- **Password:** (Your test account password)

**Contact Information:**
- **First name:** (Your first name)
- **Last name:** (Your last name)
- **Phone number:** (Your phone number)
- **Email:** (Your contact email)

**Notes (Optional):**
```
Test account credentials provided above. App uses email/OTP authentication. Subscription testing available via sandbox account. All features functional and ready for review.
```

#### 5.5 App Privacy

**Verify Privacy Settings:**
- ✅ Privacy Policy URL is set
- ✅ All data collection types are declared
- ✅ Terms of Use link is in App Description

---

### Step 6: Submit for Review

1. **Review All Sections**
   - Scroll through all sections and verify everything is complete
   - Look for any yellow warning icons

2. **Add Build**
   - In the **"Build"** section, click **"Select a build before you submit your app"**
   - Select build **5** (version 1.0.5)
   - Click **"Done"**

3. **Export Compliance**
   - Answer the export compliance questions
   - Usually: **"No"** (unless you use encryption)

4. **Advertising Identifier**
   - Answer: **"No"** (unless you use advertising)

5. **Content Rights**
   - Confirm you have rights to all content

6. **Submit for Review**
   - Click **"Add for Review"** button
   - Review the summary
   - Click **"Submit for Review"**

---

## ✅ Post-Submission Checklist

- [ ] Build uploaded successfully
- [ ] Build processed by Apple (green checkmark)
- [ ] Version 1.0.5 created in App Store Connect
- [ ] All metadata completed
- [ ] Screenshots uploaded
- [ ] Terms of Use link added to App Description
- [ ] Privacy Policy URL verified
- [ ] In-App Purchase linked to version
- [ ] Test account credentials provided
- [ ] App submitted for review

---

## 📝 Important Notes

### Build Processing Time
- Initial processing: 10-60 minutes
- If build fails processing, check email for details
- Common issues: missing icons, invalid entitlements

### Review Time
- Typical review time: 24-48 hours
- Can take up to 7 days during busy periods
- You'll receive email notifications for status changes

### If Build Fails
- Check email from Apple for specific errors
- Common fixes:
  - Missing app icons
  - Invalid code signing
  - Missing required files
  - Version conflicts

### Testing Before Submission
- ✅ Test on physical device
- ✅ Test subscription purchase flow
- ✅ Test restore purchases
- ✅ Verify all links work
- ✅ Test on different iPhone sizes

---

## 🚨 Critical Reminders

1. **Terms of Use Link:** Must be in App Description (already added in template above)
2. **Privacy Policy URL:** Must be set in App Information
3. **Paid Apps Agreement:** Must be accepted before in-app purchases work
4. **Sandbox Testing:** Ensure sandbox tester account is set up
5. **Build Number:** Must increment with each submission (currently 5)

---

## 📞 Support Resources

- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Xcode Documentation](https://developer.apple.com/documentation/xcode)

---

## 🎯 Quick Reference

**Version:** 1.0.5  
**Build:** 5  
**Bundle ID:** com.mletras.com  
**Product ID:** com.mletras.pro.monthly  

**Key URLs:**
- Privacy Policy: https://mletras.com/privacy
- Terms of Use: https://mletras.com/terms
- Support: https://mletras.com/support

---

Good luck with your submission! 🚀

