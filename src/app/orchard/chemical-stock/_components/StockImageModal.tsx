'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface StockImageModalProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

/**
 * Popup ดูรูปสำหรับหน้าคลังสารเคมี (แยกออกมาเฉพาะ)
 * - ปุ่มปิด (X) เว้นระยะ safe-area ด้านบน ไม่ชนกับ status bar / notch
 * - ปัดซ้ายขวาเพื่อเปลี่ยนรูป + ปุ่มลูกศร + คีย์บอร์ด
 */
export default function StockImageModal({ images, initialIndex, onClose }: StockImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // คีย์บอร์ด
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, onClose]);

  // ล็อก scroll ของ body ระหว่างเปิด popup
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) goNext();
    if (distance < -minSwipeDistance) goPrev();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* แถบบน — เว้น safe-area ไม่ให้ปุ่ม X ล้นไปชน status bar/header */}
      <div
        className="relative flex items-center justify-between px-3 pb-2 flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-bold">
          {currentIndex + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          aria-label="ปิด"
        >
          <X size={22} />
        </button>
      </div>

      {/* รูป */}
      <div
        className="relative flex-1 flex items-center justify-center px-2 pb-4 min-h-0"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="รูปก่อนหน้า"
          >
            <ChevronLeft size={26} />
          </button>
        )}

        <img
          src={images[currentIndex]}
          alt={`รูปที่ ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        />

        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="รูปถัดไป"
          >
            <ChevronRight size={26} />
          </button>
        )}
      </div>

      {/* hint ปัดดูรูป (เฉพาะมือถือ + มีหลายรูป) */}
      {images.length > 1 && (
        <div className="flex-shrink-0 pb-4 flex justify-center md:hidden" onClick={(e) => e.stopPropagation()}>
          <span className="px-3 py-1.5 rounded-full bg-black/50 text-white text-[10px]">
            ← ปัดเพื่อดูรูปอื่น →
          </span>
        </div>
      )}
    </div>
  );
}
