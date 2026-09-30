import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { APP_NAME } from './src/config.js';

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: 'Ton argent sert un rêve — budget 100 % local',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#111111',
        theme_color: '#111111',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      injectManifest: { globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'] },
      devOptions: { enabled: false }
    })
  ],
  test: { environment: 'node' }
});
