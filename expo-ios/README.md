# MLetras iOS App

This is the iOS version of MLetras, built with Expo and React Native for Apple App Store submission.

## Quick Start

1. **Run the setup script:**
   ```bash
   setup.bat
   ```

2. **Test the app locally:**
   ```bash
   npm run web
   ```

3. **Follow the submission guide:**
   - Read `APP_STORE_SUBMISSION_GUIDE.md` for detailed instructions
   - Create an Expo account at [expo.dev](https://expo.dev)
   - Set up Apple Developer account

## Project Structure

```
expo-ios/
├── src/
│   ├── components/     # React Native components
│   ├── contexts/       # React contexts (Auth, Theme, Settings)
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # App screens/pages
│   ├── services/       # API services
│   └── lib/            # Utility functions
├── assets/             # Images and icons
├── app.json           # Expo configuration
├── eas.json           # EAS Build configuration
└── tailwind.config.js # Tailwind CSS configuration
```

## Key Features

- **Authentication**: Email-based login with OTP verification
- **Theme Support**: Light/dark mode (Pro users only)
- **Settings**: User preferences and app configuration
- **Offline Support**: Cached user data for offline use
- **Cross-platform**: Built with React Native for iOS and Android

## Dependencies

- **Expo**: React Native framework
- **NativeWind**: Tailwind CSS for React Native
- **React Query**: Data fetching and caching
- **AsyncStorage**: Local data persistence
- **Radix UI**: Accessible UI components

## Building for iOS

### Development Build
```bash
npm run build:ios:dev
```

### Production Build
```bash
npm run build:ios
```

### Submit to App Store
```bash
npm run submit:ios
```

## Configuration

### App Configuration (`app.json`)
- App name: MLetras
- Bundle ID: com.mletras.app
- Version: 1.0.0

### EAS Build (`eas.json`)
- Development profile for testing
- Production profile for App Store
- Automatic version incrementing

## Requirements

- Node.js 18+
- Expo CLI
- EAS CLI
- Apple Developer Account ($99/year)
- Expo Account (free)

## Troubleshooting

1. **Build fails**: Check Apple Developer account status
2. **Bundle ID mismatch**: Ensure consistency across all configs
3. **Missing dependencies**: Run `npm install --legacy-peer-deps`
4. **Authentication issues**: Check API endpoints in AuthContext

## Support

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)

## Next Steps

1. Complete the setup process
2. Test the app thoroughly
3. Build and submit to App Store
4. Monitor analytics and user feedback
5. Plan future updates and features

Good luck with your app submission! 🚀
