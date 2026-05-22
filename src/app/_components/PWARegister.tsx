'use client';

import { useEffect } from 'react';

/**
 * Register service worker for PWA installability.
 * Mounted once in root layout.
 */
export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // เลื่อนการ register หลัง load เพื่อไม่บล็อก UI initial paint
    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // เช็คอัปเดตทุก 60 วินาทีเมื่อหน้าเปิดอยู่
          const interval = setInterval(() => {
            reg.update().catch(() => {});
          }, 60_000);
          return () => clearInterval(interval);
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('[PWA] SW register failed:', err);
        });
    };

    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });

    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
