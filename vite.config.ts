/// <reference types="vitest" />
import react from "@vitejs/plugin-react"
import { visualizer } from "rollup-plugin-visualizer"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: "",
  build: {
    rollupOptions: {
      // external: [] // Removed to force bundling of all dependencies
    },
  },
  plugins: [
    react(),
    visualizer({
      filename: "stats.html",
      open: true, // Open the stats page in browser
    }),
  ],
  server: {
    host: true, // needed for the Docker Container port mapping to work
    strictPort: true,
    port: 5173, // you can replace this port with any port
    watch: {
      usePolling: true, // needed for Docker on macOS/Windows
      ignored: ["**/node_modules/**", "**/.antigravity/**"],
    },
    proxy: {
      "/api": {
        target: "http://backend:3001",
        changeOrigin: true,
      },
    },
    fs: {
      // Allow serving files from the public directory
      strict: false,
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
  },
})
