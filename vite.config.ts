import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// Build identity baked in at build time (no runtime fetch). buildTime always
// works; the git short SHA is best-effort (the build context includes .git).
const buildTime = new Date().toISOString()
let commit = 'unknown'
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()
} catch {
  // no git / shallow clone — buildTime still identifies the build
}

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
    __BUILD_COMMIT__: JSON.stringify(commit),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      // We register the SW in code (usePwaUpdate) so the offline toggle can gate
      // update checks; 'prompt' keeps the new SW waiting until we apply it.
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Majorsystemet',
        short_name: 'Major',
        description: 'Major System mnemonic trainer',
        id: '/',
        start_url: '/',
        scope: '/',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
      interval: 5000,
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    },
  },
})
