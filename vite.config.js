import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  test: {
    // This is the core configuration for Vitest
    globals: true, // Makes test, expect, etc. globally available
    environment: "jsdom", // Use jsdom for a DOM-like environment
    include: ["src/**/*.{test,spec}.{js,ts}"], // Pattern to find test files
    setupFiles: ["./vitest-setup.js"], // A setup file for global configurations
  },
});
