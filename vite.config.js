import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function socialMetaUrlPlugin() {
  const rawHost =
    process.env.VITE_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    '';
  const baseUrl = rawHost
    ? (rawHost.startsWith('http') ? rawHost : `https://${rawHost}`).replace(/\/$/, '')
    : '';

  return {
    name: 'social-meta-url',
    transformIndexHtml(html) {
      let out = html.replaceAll('__OG_BASE_URL__', baseUrl);
      if (baseUrl) {
        out = out.replace(
          '<!--__SOCIAL_URL_TAGS__-->',
          `<link rel="canonical" href="${baseUrl}/" />\n    <meta property="og:url" content="${baseUrl}/" />\n    <meta property="og:image:secure_url" content="${baseUrl}/og-card.png" />`
        );
      } else {
        out = out.replace(/\s*<!--__SOCIAL_URL_TAGS__-->/, '');
      }
      return out;
    },
  };
}

export default defineConfig({
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
  plugins: [
    socialMetaUrlPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Apex Rush - Car Racing',
        short_name: 'Apex Rush',
        description: 'Apex Rush - Car Racing: fast-paced arcade car racing game built as an installable offline-ready PWA.',
        theme_color: '#090d16',
        background_color: '#090d16',
        display: 'standalone',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'any',
        scope: '/',
        start_url: '/',
        categories: ['games', 'racing', 'arcade'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
