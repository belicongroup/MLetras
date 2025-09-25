import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mletras.com",
  appName: "MLetras",
  webDir: "dist",
  server: {
    androidScheme: process.env.NODE_ENV === 'development' ? "http" : "https",
    allowNavigation: [
      "localhost",
      "10.0.0.*",
      "192.168.*",
      "*.local",
      "10.0.2.2:8787",  // Android emulator host IP for localhost
      "mletras.vercel.app",  // Production domain
      "*.vercel.app"  // Vercel domains
    ]
  },
  plugins: {
    ScreenOrientation: {
      orientation: "all",
    },
  },
  android: {
    allowMixedContent: process.env.NODE_ENV === 'development',
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development'
  }
};

export default config;
