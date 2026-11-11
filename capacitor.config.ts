import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.wintercore.zoya",
  appName: "Zoya",
  webDir: "dist",
  backgroundColor: "#101318",
  // Capacitor's debug logging prints every plugin result and request URL to
  // logcat, which would expose decrypted credentials and session tokens.
  loggingBehavior: "none",
  plugins: {
    SplashScreen: {
      backgroundColor: "#101318",
      launchShowDuration: 0,
    },
    // Edge-to-edge: the page pads itself with the injected --safe-area-inset-* values.
    SystemBars: {
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
      style: "DARK",
    },
  },
};

export default config;
