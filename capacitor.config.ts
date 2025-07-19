import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c2dd752521b74d018f9b352efb538200',
  appName: 'lyric-muse-organizer',
  webDir: 'dist',
  server: {
    url: 'https://c2dd7525-21b7-4d01-8f9b-352efb538200.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    ScreenOrientation: {
      orientation: 'all'
    }
  }
};

export default config;