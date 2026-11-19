'use client';

import { useEffect } from 'react';

/**
 * Registers /sw.js so Chrome on Android offers "Install app".
 * Skipped in development, where a service worker only gets in the way of hot reload.
 */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
        console.warn('[pwa] service worker registration failed', err);
      });
    };

    // Wait for the page to finish loading so registration never slows the first paint.
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
