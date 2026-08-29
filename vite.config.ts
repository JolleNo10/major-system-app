import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path, { join } from 'node:path'

// Build identity baked in at build time (no runtime fetch). buildTime always
// works; the git short SHA is best-effort (the build context includes .git).
//
// Read the SHA straight from .git first: the dev/prod containers bind-mount the
// repo but don't necessarily ship a `git` binary, so shelling out to git leaves
// the commit stuck at 'unknown' (the build identity then never changes). The
// git CLI is only a fallback for exotic setups (e.g. a worktree gitdir file).
function readGitCommit(): string {
  try {
    const gitDir = join(process.cwd(), '.git')
    const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim()
    const ref = head.match(/^ref: (.+)$/)?.[1]
    if (!ref) return head.slice(0, 7)              // detached HEAD → raw SHA
    try {
      return readFileSync(join(gitDir, ref), 'utf8').trim().slice(0, 7)
    } catch {
      // Loose ref missing → look it up in packed-refs.
      const packed = readFileSync(join(gitDir, 'packed-refs'), 'utf8')
      const line = packed.split('\n').find(l => l.endsWith(` ${ref}`))
      if (line) return line.slice(0, 7)
    }
  } catch { /* fall through to the git CLI */ }
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim()
  } catch {
    return 'unknown'
  }
}

const buildTime = new Date().toISOString()
const commit = readGitCommit()
const usePolling = process.env.VITE_USE_POLLING === 'true'
const configuredPollingInterval = Number.parseInt(process.env.VITE_POLLING_INTERVAL ?? '5000', 10)
const pollingInterval = Number.isFinite(configuredPollingInterval) && configuredPollingInterval > 0
  ? configuredPollingInterval
  : 5000

// A production service worker can keep serving an old build after switching the
// same origin back to Vite development. Vite normally serves index.html for
// /sw.js in development, so that worker can never update or unregister itself.
const DEV_PWA_CLEANUP_WORKER = `
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).map(key => caches.delete(key)))
    await self.clients.claim()
    await self.registration.unregister()
    for (const client of await self.clients.matchAll({ type: 'window' })) {
      await client.navigate(client.url)
    }
  })())
})
`

function devPwaCleanup(): Plugin {
  return {
    name: 'dev-pwa-cleanup',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
        if (pathname !== '/sw.js') return next()

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('Service-Worker-Allowed', '/')
        res.end(req.method === 'HEAD' ? undefined : DEV_PWA_CLEANUP_WORKER)
      })
    },
  }
}

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
    __BUILD_COMMIT__: JSON.stringify(commit),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  plugins: [
    devPwaCleanup(),
    tailwindcss(),
    react(),
    VitePWA({
      // We register the SW in code (usePwaUpdate) so the offline toggle can gate
      // update checks; 'prompt' keeps the new SW waiting until we apply it.
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['icon-32.png', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
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
    ...(usePolling ? {
      watch: {
        usePolling: true,
        interval: pollingInterval,
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      },
    } : {}),
  },
})
