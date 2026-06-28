'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

/**
 * แจ้งเตือนเมื่อมี Service Worker เวอร์ชันใหม่ (มีการ deploy ใหม่)
 * ทำงาน:
 * 1. ฟัง event `controllerchange` — เมื่อ SW ใหม่ activate
 * 2. ตรวจ `reg.update()` ทุก 30 วิ
 * 3. ถ้าเจอเวอร์ชันใหม่ที่ waiting → แสดง prompt ให้ผู้ใช้กดอัปเดต
 */
export default function UpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // dev: ไม่ทำอะไร
    const isDev =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.');
    if (isDev) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    navigator.serviceWorker.ready.then((reg) => {
      // เช็คว่ามี SW waiting อยู่แล้วไหม
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setShowPrompt(true);
      }

      // ฟัง updatefound — มี SW ใหม่ install
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // มี SW ใหม่ติดตั้งสำเร็จ + มี controller (ไม่ใช่ครั้งแรก)
            setWaitingWorker(newWorker);
            setShowPrompt(true);
          }
        });
      });

      // เช็คอัปเดตทุก 10 วิ (ลดจาก 30 วิ)
      interval = setInterval(() => {
        reg.update().catch(() => {});
      }, 10_000);

      // เช็คอัปเดตเมื่อ tab กลับมา visible
      const onVisible = () => {
        if (document.visibilityState === 'visible') {
          reg.update().catch(() => {});
        }
      };
      document.addEventListener('visibilitychange', onVisible);

      return () => {
        document.removeEventListener('visibilitychange', onVisible);
      };
    });

    // ฟัง controllerchange — เมื่อ SW ใหม่ active แล้ว reload
    let refreshing = false;
    const onChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      if (interval) clearInterval(interval);
    };
  }, []);

  const handleUpdate = () => {
    if (!waitingWorker) {
      window.location.reload();
      return;
    }
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    // controllerchange event จะ trigger reload อัตโนมัติ
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-[calc(100%-2rem)]">
      <div className="bg-emerald-500 text-white rounded-2xl shadow-2xl p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <Download size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">มีเวอร์ชันใหม่</p>
          <p className="text-[11px] opacity-90">กดเพื่ออัปเดตแอป</p>
        </div>
        <button
          onClick={handleUpdate}
          className="px-3 py-1.5 bg-white text-emerald-600 rounded-lg text-xs font-extrabold hover:bg-emerald-50 transition-colors"
        >
          อัปเดต
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="text-white/80 hover:text-white p-1"
          title="ปิด"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
