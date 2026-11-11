import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kognocore',
        short_name: 'Kognocore',
        description: 'Cuestionarios y seguimiento de estudio',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#faf8f2',
        theme_color: '#0f3e61',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The app shell is cached; data always goes to the network.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Admin screens and diagram libraries are not downloaded at install time;
        // they are cached the first time they are used (runtimeCaching below).
        globIgnores: [
          '**/Admin*.js', '**/CourseManagement-*.js', '**/AttemptQuizReviewer-*.js',
          '**/*Diagram-*.js', '**/*diagram-*.js', '**/elk-*.js', '**/cytoscape*.js', '**/cynefin-*.js',
          '**/mermaid*.js', '**/dagre-*.js', '**/graph-*.js', '**/layout-*.js', '**/treemap-*.js',
          '**/html2canvas*.js', '**/index.es-*.js', '**/purify.es-*.js', '**/vector-chart-pro.html',
        ],
        runtimeCaching: [{
          urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/'),
          handler: 'CacheFirst',
          options: { cacheName: 'app-assets', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } },
        }],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /\/[^/?]+\.[^/]+$/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});
