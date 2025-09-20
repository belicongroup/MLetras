import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "0.0.0.0", // Allow external connections (Android emulator)
    port: 8080,
    proxy: {
      "/api/musixmatch": {
        target: "https://api.musixmatch.com/ws/1.1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/musixmatch/, ""),
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            // Add API key to the request
            const url = new URL(proxyReq.path, "https://api.musixmatch.com");
            url.searchParams.set("apikey", "4d54e92614bedfaaffcab9fdbf56cdf3");
            proxyReq.path = url.pathname + url.search;
            console.log("Sending Request to the Target:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log(
              "Received Response from the Target:",
              proxyRes.statusCode,
              req.url,
            );
          });
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
