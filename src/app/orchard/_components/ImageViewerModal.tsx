'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageViewerModalProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

/**
 * Popup ดูรูปแบบเต็มจอ (shared)
 * - ปุ่มปิด (X) อยู่ในแถบบน เว้นระยะ safe-area ไม่ชนกับ status bar / notch / header
 * - ปัดซ้ายขวาเพื่อเปลี่ยนรูป + ปุ่มลูกศร + คีย์บอร์ด
 */
export default function ImageViewerModal({ images, initialIndex, onClose }: ImageViewerModalProps) {
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
        className="relative flex items-center justify-between px-4 pb-3 flex-shrink-0"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 16px), 16px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-bold">
          {currentIndex + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 text-white flex items-center justify-center transition-colors shadow-lg"
          aria-label="ปิด"
        >
          <X size={26} strokeWidth={2.5} />
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
            className="absolute left-3 z-10 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 text-white flex items-center justify-center transition-colors shadow-lg"
            aria-label="รูปก่อนหน้า"
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
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
            className="absolute right-3 z-10 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 text-white flex items-center justify-center transition-colors shadow-lg"
            aria-label="รูปถัดไป"
          >
            <ChevronRight size={28} strokeWidth={2.5} />
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
