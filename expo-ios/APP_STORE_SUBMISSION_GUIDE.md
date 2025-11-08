# MLetras iOS App Store Submission Guide

This guide will help you submit your MLetras app to the Apple App Store using Expo and EAS Build, even without a Mac.

## Prerequisites

1. **Apple Developer Account** ($99/year)
   - Sign up at [developer.apple.com](https://developer.apple.com)
   - You'll need this to submit apps to the App Store

2. **Expo Account** (Free)
   - Sign up at [expo.dev](https://expo.dev)
   - This is required for EAS Build

3. **Node.js and npm** (Already installed)

## Step 1: Set Up Your Expo Account

1. Go to [expo.dev](https://expo.dev) and create an account
2. Install Expo CLI globally (if not already done):
   ```bash
   npm install -g @expo/cli eas-cli
   ```

3. Login to Expo:
   ```bash
   eas login
   ```

## Step 2: Configure Your Project

1. Navigate to your expo-ios folder:
   ```bash
   cd expo-ios
   ```

2. Initialize EAS Build:
   ```bash
   eas build:configure
   ```

3. Update the `eas.json` file with your Apple Developer details:
   - Replace `your-apple-id@example.com` with your Apple ID email
   - Replace `your-app-store-connect-app-id` with your App Store Connect app ID
   - Replace `your-apple-team-id` with your Apple Developer Team ID

## Step 3: Apple Developer Setup

### 3.1 Create App Store Connect App

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" → "+" → "New App"
3. Fill in the details:
   - **Platform**: iOS
   - **Name**: MLetras
   - **Primary Language**: English
   - **Bundle ID**: com.mletras.app (must match your app.json)
   - **SKU**: mletras-app-ios
   - **User Access**: Full Access

### 3.2 Get Your Apple Developer Team ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Click on "Membership" in the sidebar
3. Copy your "Team ID" (10-character string)

### 3.3 Create App Store Connect API Key (Optional but Recommended)

1. In App Store Connect, go to "Users and Access" → "Keys" → "App Store Connect API"
2. Click "+" to create a new key
3. Give it a name like "MLetras iOS Build"
4. Select "Developer" role
5. Download the `.p8` file and note the Key ID

## Step 4: Build Your iOS App

### 4.1 First Build (Development)

```bash
eas build --platform ios --profile development
```

This will:
- Create a development build
- Install on your device via Expo Go or TestFlight
- Help you test the app before production

### 4.2 Production Build

```bash
eas build --platform ios --profile production
```

This will:
- Create a production-ready build
- Sign it with your Apple Developer certificate
- Prepare it for App Store submission

## Step 5: Submit to App Store

### 5.1 Automatic Submission (Recommended)

```bash
eas submit --platform ios --profile production
```

This will automatically upload your app to App Store Connect.

### 5.2 Manual Submission

If automatic submission fails:

1. Download the `.ipa` file from the EAS Build dashboard
2. Use Transporter app (free from Mac App Store) or Xcode to upload
3. Or use the web interface at App Store Connect

## Step 6: App Store Connect Configuration

### 6.1 App Information

1. Go to your app in App Store Connect
2. Fill in the required information:
   - **App Description**: Describe your lyrics and music notes app
   - **Keywords**: lyrics, music, notes, songs, karaoke
   - **Support URL**: Your website or support email
   - **Marketing URL**: Your website

### 6.2 App Screenshots

You'll need screenshots for:
- iPhone 6.7" (iPhone 14 Pro Max)
- iPhone 6.5" (iPhone 11 Pro Max)
- iPhone 5.5" (iPhone 8 Plus)

Take screenshots of your app running on these devices or simulators.

### 6.3 App Icon

- Size: 1024x1024 pixels
- Format: PNG
- No transparency
- No rounded corners (Apple will add them)

### 6.4 App Review Information

- **Contact Information**: Your email
- **Demo Account**: If your app requires login
- **Notes**: Any special instructions for reviewers

## Step 7: Submit for Review

1. In App Store Connect, click "Submit for Review"
2. Wait for Apple's review (usually 24-48 hours)
3. You'll receive an email when approved or if changes are needed

## Troubleshooting

### Common Issues

1. **Build Fails**: Check your Apple Developer account status and certificates
2. **Bundle ID Mismatch**: Ensure the bundle ID in app.json matches App Store Connect
3. **Missing Screenshots**: Upload screenshots for all required device sizes
4. **App Rejected**: Read Apple's feedback and make necessary changes

### Getting Help

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)

## Cost Breakdown

- **Apple Developer Account**: $99/year
- **Expo Account**: Free (with limitations)
- **EAS Build**: Free tier includes 30 builds/month
- **Total**: $99/year for Apple Developer Account

## Next Steps After Approval

1. **Monitor Analytics**: Use App Store Connect analytics
2. **Update App**: Use EAS Build for future updates
3. **Marketing**: Promote your app on social media
4. **User Feedback**: Respond to reviews and improve the app

## Important Notes

- You can build iOS apps without a Mac using EAS Build
- The build process happens on Expo's servers
- You only need a Mac for advanced native development
- Updates can be pushed over-the-air using Expo Updates

## Support

If you encounter issues:
1. Check the Expo documentation
2. Join the Expo Discord community
3. Contact Expo support for EAS Build issues
4. Contact Apple Developer support for App Store issues

Good luck with your app submission! 🚀
