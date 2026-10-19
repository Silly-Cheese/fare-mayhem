import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/fare-mayhem/',
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'art/the-orb-original.webp'],
    manifest: {
      name: 'Fare Mayhem',
      short_name: 'Fare Mayhem',
      description: 'Terrible drivers. Excellent battles.',
      theme_color: '#10151a',
      background_color: '#10151a',
      display: 'standalone',
      start_url: '/fare-mayhem/',
      scope: '/fare-mayhem/',
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
      navigateFallback: '/fare-mayhem/index.html',
      runtimeCaching: []
    }
  })]
})
