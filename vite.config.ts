/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const BASE = '/mergulho-do-gustavo/';
const THEME = '#0277BD';

export default defineConfig({
  base: BASE,
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // Os arquivos de public/ já entram pelo globPatterns abaixo.
      includeManifestIcons: false,
      manifest: {
        name: 'Mergulho do Gustavo',
        short_name: 'Mergulho',
        description: 'Mergulhe no fundo do mar com os pets para resgatar as letras nas bolhas e fotografar os bichos do mar, sem propagandas.',
        lang: 'pt-BR',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'any',
        background_color: THEME,
        theme_color: THEME,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { host: true },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
