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
          // API responses are not cached: they are per user and need a fresh access token.
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
        'src/test/**', // Test helpers (MSW server, render helpers)
        'src/api/generated/**', // API types copied from insane-node-rest-api
        'src/**/*.stories.{ts,tsx}', // Storybook files, if any
        'src/**/*.mock.{ts,tsx}', // Mock files for tests
        '**/*.d.ts', // TypeScript declaration files
        'node_modules/**', // Dependencies
        'dist/**', // Build output
      ],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
    },
  },
});
