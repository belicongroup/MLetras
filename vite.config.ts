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
            // Proxy error handling - logged server-side
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            // API key removed from client - handled by smart proxy
            // Request proxied to Musixmatch API
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            // Response received from Musixmatch API
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          vendor: ['react', 'react-dom'],
          // Router and state management
          routing: ['react-router-dom', '@tanstack/react-query'],
          // UI component libraries
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip'
          ],
          // Utility libraries
          utils: ['clsx', 'tailwind-merge', 'class-variance-authority'],
          // Icons and UI helpers
          icons: ['lucide-react', 'sonner'],
          // Date and gesture utilities
          helpers: ['date-fns', '@use-gesture/react']
        }
      }
    },
    // Increase chunk size warning limit since we're splitting
    chunkSizeWarningLimit: 1000
  },
}));
