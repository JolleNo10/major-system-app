import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Standalone config so tests don't load vite.config.ts (which pulls in the
// ESM-only Tailwind plugin). Focused logic and jsdom UI tests run without Vite.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    environmentMatchGlobs: [
      // Tests that access localStorage directly must run under jsdom.
      ['src/features/world-countries/**/*.test.ts', 'jsdom'],
      ['src/features/world-countries/**/*.test.tsx', 'jsdom'],
    ],
    setupFiles: ['./src/testSetup.ts'],
  },
})
