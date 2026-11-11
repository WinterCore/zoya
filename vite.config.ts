import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // The WatchPower API is plain HTTP with no CORS headers. In the browser we
    // go through this proxy; the native app uses CapacitorHttp instead.
    proxy: {
      "/wp-api": {
        target: "http://android.shinemonitor.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/wp-api/, "/public"),
      },
    },
  },
});
