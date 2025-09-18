import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mletras.com",
  appName: "MLetras",
  webDir: "dist",
  plugins: {
    ScreenOrientation: {
      orientation: "all",
    },
  },
};

export default config;
