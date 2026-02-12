/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      workbox: {
        // Workbox is Google's Service Worker library
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Specifies file patterns to cache
        // ** means all directories, * means all files

        runtimeCaching: [
          {
            // API request caching
            urlPattern: /^https:\/\/api\.example\.com\/.*/i,
            // Caches API requests matching this pattern

            handler: 'NetworkFirst',
            // NetworkFirst: Try network first, use cache if it fails
            // CacheFirst: Check cache first, make network request if not found
            // StaleWhileRevalidate: Show cache first, update in background

            options: {
              cacheName: 'api-cache',
              // Name for this cache

              expiration: {
                maxEntries: 50,
                // Store maximum of 50 items in cache
                maxAgeSeconds: 60 * 60 * 24,
                // Cache expires after 24 hours (86400 seconds)
              },

              cacheableResponse: {
                statuses: [0, 200],
                // Only cache status codes 0 (CORS) and 200 (success)
              },
            },
          },
          {
            // Image caching
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            // Cache requests for image file extensions

            handler: 'CacheFirst',
            // Images don't change often, so prioritize cache

            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60,
                // 30 days
              },
            },
          },
        ],
      },
      manifest: {
        name: 'insane-react-pwa',
        short_name: 'insane-pwa',
        description: 'Store & share notes, lists, links and others!',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'logo192.png', sizes: '192x192', type: 'image/png' },
          { src: 'logo512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    css: true,
    coverage: {
      include: ['src/**/*.{ts,tsx}'], // Include all TypeScript and TSX files
      exclude: [
        'src/main.tsx', // Entry point file
        'src/vite-env.d.ts', // Vite-specific environment types
        'src/setupTests.ts', // Test setup file
        'src/**/*.stories.{ts,tsx}', // Storybook files, if any
        'src/**/*.mock.{ts,tsx}', // Mock files for tests
        '**/*.d.ts', // TypeScript declaration files
        'node_modules/**', // Dependencies
        'dist/**', // Build output
      ],
    },
  },
});
