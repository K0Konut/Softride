import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.softride.app",
  appName: "SoftRide",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
