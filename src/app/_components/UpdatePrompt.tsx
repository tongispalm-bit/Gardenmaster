'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

/**
 * แจ้งเตือนเมื่อมี Service Worker เวอร์ชันใหม่ (มีการ deploy ใหม่)
 * แสดงเป็น popup กลางจอ
 * ทำงาน:
 * 1. ฟัง event `controllerchange` — เมื่อ SW ใหม่ activate
 * 2. ตรวจ `reg.update()` เป็นระยะ
 * 3. ถ้าเจอเวอร์ชันใหม่ที่ waiting → แสดง popup ให้ผู้ใช้กดอัปเดต
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

      // เช็คอัปเดตทุก 10 วิ
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
    // ซ่อน popup ทันทีเมื่อกดอัปเดต
    setShowPrompt(false);
    // ส่งสัญญาณให้ SW ที่รออยู่ activate (ถ้ามี)
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    // ลบ cache ทั้งหมดเพื่อบังคับโหลดไฟล์ใหม่ แล้ว reload
    // (fallback กรณี controllerchange ไม่ยิง เช่น SW activate ไปแล้ว)
    const forceReload = async () => {
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        /* ignore */
      }
      window.location.reload();
    };
    // ให้เวลา controllerchange ทำงานก่อน ถ้าไม่ reload ใน 800ms → บังคับเอง
    setTimeout(forceReload, 800);
  };

  if (!showPrompt) return null;

  return (
    <div
      data-update-prompt="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-xs bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* ไอคอน + ข้อความ */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
            <Download size={30} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">มีเวอร์ชันใหม่</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            อัปเดตเพื่อใช้งานฟีเจอร์และการแก้ไขล่าสุด
          </p>
        </div>

        {/* ปุ่ม */}
        <div className="px-4 pb-4 flex flex-col gap-2">
          <button
            onClick={handleUpdate}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl font-extrabold text-sm transition-colors"
          >
            อัปเดตเดี๋ยวนี้
          </button>
          <button
            onClick={() => setShowPrompt(false)}
            className="w-full py-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl font-bold text-sm transition-colors"
          >
            ไว้ภายหลัง
          </button>
        </div>
      </div>
    </div>
  );
}
