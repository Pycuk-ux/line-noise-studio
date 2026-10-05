import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, host: true },
  build: {
    rollupOptions: {
      input: {
        studio: resolve(__dirname, "index.html"),
        // Partner Element marketing site — "Use cases" page (served at /website/).
        website: resolve(__dirname, "website/index.html"),
      },
    },
  },
});
