'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** ใช้ useLayoutEffect ฝั่ง client, fallback เป็น useEffect กัน warning ตอน prerender */
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type Props = {
  /** สีพื้นหลัง header (สีสวน) — เติมพื้นที่ notch ให้เนียน */
  backgroundColor?: string;
  children: ReactNode;
};

/**
 * เปลือก header แบบ "fixed จริง" สำหรับหน้าในสวน (ทุเรียนหลังบ้าน ฯลฯ)
 *
 * ทำไมไม่ใช้ position: sticky:
 * - หน้าในสวนมี ancestor ที่ตั้ง `overflow-x: clip` ซึ่งบนมือถือรุ่นเก่า
 *   (โดยเฉพาะ iOS Safari < 16) จะ fallback เป็น `overflow: hidden`
 *   ทำให้เกิด scroll-container ซ้อน → sticky เลื่อนตามเนื้อหา ไม่ปักบนสุด
 * - position: fixed ไม่สนใจ overflow ของ ancestor (สนใจแค่ transform/filter)
 *   จึงปักบนสุดได้จริงทุกเครื่อง
 *
 * กลไก:
 * - header จริงถูก render แบบ fixed (ออกนอก flow)
 * - render "spacer" ที่สูงเท่า header ไว้ใน flow เพื่อดันเนื้อหาลงมาไม่ให้ทับ
 * - วัดความสูงด้วย ResizeObserver → sync อัตโนมัติเมื่อเปิด dropdown ปี/หมุนจอ
 * - paddingTop = safe-area-inset-top เพื่อดันเนื้อหา header ให้พ้น notch/Dynamic Island
 *   (ตัว body มี padding safe-area อยู่แล้ว spacer จึงใช้แค่ความสูงเนื้อหา header)
 */
export default function FixedHeaderShell({ backgroundColor, children }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useIsoLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const update = () => setHeight(el.offsetHeight);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('orientationchange', update);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 z-40"
        style={{ backgroundColor, paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div ref={contentRef}>{children}</div>
      </div>

      {/* ตัวเว้นระยะแทนที่ความสูง header ที่หลุดออกจาก flow */}
      <div aria-hidden style={{ height }} />
    </>
  );
}
