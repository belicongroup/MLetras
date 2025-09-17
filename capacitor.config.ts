import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lyricmuse.organizer",
  appName: "MLetras",
  webDir: "dist",
  plugins: {
    ScreenOrientation: {
      orientation: "all",
    },
  },
};

export default config;
