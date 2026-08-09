import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Standalone config so tests don't load vite.config.ts (which pulls in the
// ESM-only Tailwind plugin). Unit tests here are pure logic — no Vite needed.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    environmentMatchGlobs: [
      // Tests that access localStorage directly must run under jsdom.
      ['src/features/world-countries/**/*.test.ts', 'jsdom'],
    ],
    setupFiles: ['./src/testSetup.ts'],
  },
})
