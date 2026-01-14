import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mletras.com",
  appName: "MLetras",
  webDir: "dist",
  server: {
    androidScheme: "https",  // Always use HTTPS for production APIs
    allowNavigation: [
      "localhost",
      "10.0.0.*",
      "192.168.*",
      "*.local",
      "10.0.2.2:8787",  // Android emulator host IP for localhost (if needed)
      "mletras.vercel.app",  // Production domain
      "*.vercel.app",  // Vercel domains
      "mletras-auth-api-dev.belicongroup.workers.dev",  // Production API
      "*.workers.dev"  // Cloudflare Workers domains
    ]
  },
  plugins: {
    ScreenOrientation: {
      orientation: "all",
    },
  },
  android: {
    allowMixedContent: false,  // Disable mixed content for production APIs
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development'
  },
  ios: {
    // Disable web view debugging in production for better performance
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development',
    // Allow navigation to app-bound domains (set to false for better security, but may affect some features)
    limitsNavigationsToAppBoundDomains: false
  }
};

export default config;
