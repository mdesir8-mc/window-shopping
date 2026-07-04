import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/version": "http://localhost:3000"
    }
  },
  build: {
    outDir: "server/public",
    // Must stay false: server/public also holds hand-maintained static files (the
    // prototype *.jsx demos + api.js, one of which is exercised by
    // server/tests/frontend-bootstrap.test.ts). emptyOutDir: true would wipe them.
    emptyOutDir: false
  }
});
