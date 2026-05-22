'use client';

import { useEffect } from 'react';

/**
 * Register service worker for PWA installability.
 * - ใน development: unregister SW เพื่อไม่ให้ block Firestore / hot reload
 * - ใน production (static export): register ปกติ
 */
export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const isDev =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.startsWith('192.168.'));

    // ใน dev: unregister SW เก่าทั้งหมด + clear caches เพื่อไม่ให้รบกวน Firestore
    if (isDev) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => {
          r.unregister().then((ok) => {
            if (ok) console.log('[PWA] dev: unregistered old SW');
          });
        });
      });
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys
            .filter((k) => k.startsWith('gm-'))
            .forEach((k) => caches.delete(k));
        });
      }
      return;
    }

    // production: register SW
    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          const interval = setInterval(() => {
            reg.update().catch(() => {});
          }, 60_000);
          return () => clearInterval(interval);
        })
        .catch((err) => {
          console.warn('[PWA] SW register failed:', err);
        });
    };

    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });

    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
