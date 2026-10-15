import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

// Separate configuration for cleaner structure
const pwaConfig = VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
  manifest: {
    name: 'LearningHub',
    short_name: 'LearningHub',
    description: 'LearningHub — learn programming, practise with quizzes, and track your progress.',
    theme_color: '#3b82f6',
    background_color: '#ffffff',
    display: 'standalone',
    scope: '/',
    start_url: '/',
    // Allow both portrait and landscape (tablets, foldables, desktop PWA).
    // 'portrait-primary' locked landscape users out of installed-app usage.
    orientation: 'any',
    icons: [
      {
        src: 'pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: 'pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    categories: ['education', 'productivity'],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'gstatic-fonts-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        // Stable catalog content: 24h is acceptable (courses change rarely).
        urlPattern: /.*\/(?:courses|content)\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-courses-cache',
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24, // 24h for courses/content only
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        // Volatile gamification/pricing/leaderboard: 1h max so NetworkFirst
        // never serves a day-old leaderboard or stale price as fresh.
        urlPattern: /.*\/(?:gamification|leaderboard|pricing|contest)\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-volatile-cache',
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 1, // 1h for gamification/pricing/leaderboard
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  },
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_TARGET || process.env.VITE_API_TARGET || 'http://127.0.0.1:5000'

  return {
    plugins: [
      react(),
      pwaConfig,
      process.env.ANALYZE === 'true' &&
        visualizer({
          open: false,
          gzipSize: true,
          brotliSize: true,
          filename: 'dist/stats.html',
        }),
      {
        name: 'health-endpoint',
        configureServer(server) {
          server.middlewares.use('/_health', (_req, res) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ status: 'ok', version: '1.0.0' }))
          })
        },
      },
    ].filter(Boolean),
    test: {
      globals: true,
      environment: 'jsdom',
      pool: 'forks',
      fileParallelism: false,
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          'src/mocks/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/types.ts',
        ],
        thresholds: {
          lines: 70,
          functions: 70,
          branches: 60,
          statements: 70,
        },
      },
    },
    esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {},
    build: {
      // 500kB Vite default restored so bundle bloat is reported, not masked.
      // Run `ANALYZE=true npm run build` (visualizer → dist/stats.html) to inspect
      // which chunk regressed when this warning fires.
      chunkSizeWarningLimit: 500,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Large libraries - separate chunks
              if (id.includes('framer-motion')) return 'animations'
              if (id.includes('lucide-react')) return 'icons'
              if (id.includes('highlight.js')) return 'highlight'
              if (
                id.includes('react-markdown') ||
                id.includes('remark') ||
                id.includes('micromark') ||
                id.includes('unist') ||
                id.includes('vfile') ||
                id.includes('mdast') ||
                id.includes('marked')
              )
                return 'vendor-markdown'
              if (id.includes('dompurify')) return 'vendor-dompurify'
              if (id.includes('recharts') || id.includes('victory-vendor') || id.includes('d3-'))
                return 'charts'
              if (id.includes('katex')) return 'katex'
              if (id.includes('@google/generative-ai')) return 'vendor-ai'
              if (id.includes('jspdf')) return 'pdf-jspdf'
              if (id.includes('html2canvas')) return 'pdf-canvas'
              if (id.includes('@sentry')) return 'sentry'
              if (id.includes('stripe') || id.includes('@stripe')) return 'payments'
              if (id.includes('lodash')) return 'vendor-utils'
              if (id.includes('zod')) return 'vendor-validation'

              // Code editor - only load on DSA pages
              if (
                id.includes('codemirror') ||
                id.includes('@codemirror') ||
                id.includes('@uiw/react-codemirror')
              )
                return 'editor'

              // Core libraries - ensure react-core comes before vendor to avoid circular deps
              if (
                id.includes('/react/') ||
                id.includes('\\react\\') ||
                id.includes('/react-dom/') ||
                id.includes('\\react-dom\\') ||
                id.includes('scheduler')
              )
                return 'react-core'
              if (id.includes('zustand')) return 'store'
              if (id.includes('react-router-dom') || id.includes('react-router')) return 'router'
              if (id.includes('@tanstack/react-query') || id.includes('@tanstack/query-core'))
                return 'query'
              if (id.includes('socket.io-client')) return 'socket'
              if (id.includes('i18next')) return 'i18n'

              // Additional library splits for better caching
              if (id.includes('fuse.js')) return 'search'
              if (id.includes('react-virtuoso') || id.includes('@tanstack/react-virtual'))
                return 'virtualization'
              if (id.includes('react-helmet-async')) return 'seo'
              if (
                id.includes('class-variance-authority') ||
                id.includes('clsx') ||
                id.includes('tailwind-merge')
              )
                return 'styling-utils'
              if (id.includes('workbox')) return 'pwa-workbox'

              // Everything else
              return 'vendor'
            }
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'lucide-react'],
    },
    server: {
      port: 3000,
      host: true,
      cors: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
      },
      watch: {
        ignored: ['**/backend/**', '**/django_backend/**', '**/dist/**', '**/coverage/**'],
      },
    },
  }
})
