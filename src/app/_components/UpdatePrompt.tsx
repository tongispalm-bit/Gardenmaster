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

  // วัดความสูงของ header sticky ในหน้าปัจจุบัน เพื่อวางแถบใต้ header
  useEffect(() => {
    if (!showPrompt) return;

    const measure = () => {
      // หา element ที่ sticky/fixed อยู่ติดขอบบน (top: 0) แล้วเอาตัวที่สูงสุด
      let maxBottom = 0;
      const candidates = document.querySelectorAll('header, [class*="sticky"], [class*="fixed"]');
      candidates.forEach((el) => {
        const node = el as HTMLElement;
        // ข้ามตัวแถบอัปเดตเอง
        if (node.dataset.updatePrompt === 'true') return;
        const style = window.getComputedStyle(node);
        if (style.position !== 'sticky' && style.position !== 'fixed') return;
        const rect = node.getBoundingClientRect();
        // นับเฉพาะตัวที่ติดขอบบน (top ใกล้ 0) และมองเห็นอยู่
        if (rect.top <= 1 && rect.height > 0 && rect.bottom > maxBottom) {
          maxBottom = rect.bottom;
        }
      });
      // ถ้าไม่เจอ header → ใช้ค่า default 16px, ถ้าเจอ → วางใต้ header + เว้น 8px
      setTopOffset(maxBottom > 0 ? maxBottom + 8 : 16);
    };

    measure();
    // วัดซ้ำเมื่อ resize/scroll (เผื่อ header เปลี่ยนขนาด)
    window.addEventListener('resize', measure);
    const t = setTimeout(measure, 300); // เผื่อ header render ช้า
    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(t);
    };
  }, [showPrompt]);

  const handleUpdate = () => {
    // ซ่อนแถบทันทีเมื่อกดอัปเดต
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
      className="fixed top-0 inset-x-0 z-[9999] px-3 pt-[calc(env(safe-area-inset-top,0px)+8px)]"
    >
      <div className="max-w-sm mx-auto bg-emerald-500 text-white rounded-2xl shadow-2xl p-3 flex items-center gap-3">
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
