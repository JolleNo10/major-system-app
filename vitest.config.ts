import { defineConfig } from 'vitest/config'

// Standalone config so tests don't load vite.config.ts (which pulls in the
// ESM-only Tailwind plugin). Unit tests here are pure logic — no Vite needed.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
