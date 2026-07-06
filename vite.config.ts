import { defineConfig } from "vitest/config";

// Relative base so the built site works whether served from the domain root
// (strategictitans.ca) or a subpath.
export default defineConfig({
  base: "./",
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
});
