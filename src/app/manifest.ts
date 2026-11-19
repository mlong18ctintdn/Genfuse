import type { MetadataRoute } from 'next';

/**
 * Served at /manifest.webmanifest and linked automatically by Next.js.
 * start_url "/" works for every language: the landing page sends signed-in users
 * straight to /home, and the middleware keeps each person's locale.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'GENFUSE',
    short_name: 'GENFUSE',
    description: 'A place for three generations to keep memories, understand each other, and play.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FAF8F5',
    theme_color: '#1E3A5F',
    lang: 'vi',
    categories: ['lifestyle', 'social'],
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Separate maskable file: Android may crop it into a circle or squircle.
      { src: '/icon-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
