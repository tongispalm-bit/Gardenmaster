'use client';

import { useState, useEffect, useCallback } from 'react';

// ── ปี พ.ศ. ที่เลือกได้ (รอบการเก็บเกี่ยว) ──
export const HARVEST_YEAR_OPTIONS = [2569, 2570, 2571, 2572];
const DEFAULT_YEAR = HARVEST_YEAR_OPTIONS[0];

/**
 * หาปี พ.ศ. ของบันทึก รองรับข้อมูลเก่าที่ไม่มี field `year`
 * - ถ้ามี field year → ใช้ค่านั้น
 * - ถ้าไม่มี → คำนวณจาก date (ค.ศ. + 543); ถ้าไม่มี date ด้วย → ปีเริ่มต้น
 */
export function getRecordYear(
  record: { year?: number; date?: string; createdAt?: number },
): number {
  if (record.year) return record.year;
  if (record.date) {
    const ce = new Date(record.date).getFullYear();
    if (!isNaN(ce)) return ce + 543;
  }
  if (record.createdAt) {
    return new Date(record.createdAt).getFullYear() + 543;
  }
  return DEFAULT_YEAR;
}

function storageKey(orchardId: string) {
  return `gm-harvest-year-${orchardId}`;
}

/**
 * Hook เก็บปี พ.ศ. ของรอบการเก็บเกี่ยว แยกตามสวน (เก็บใน localStorage)
 * แชร์ข้ามหน้า เช่น หน้าผังสวน (เลือกปี) และหน้าทำลูกทุเรียน (ใช้ปีเดียวกัน)
 */
export function useHarvestYear(orchardId: string) {
  const [year, setYearState] = useState<number>(DEFAULT_YEAR);

  // โหลดค่าจาก localStorage เมื่อมี orchardId
  useEffect(() => {
    if (!orchardId || typeof window === 'undefined') return;
    const saved = localStorage.getItem(storageKey(orchardId));
    const parsed = saved ? Number(saved) : NaN;
    if (HARVEST_YEAR_OPTIONS.includes(parsed)) {
      setYearState(parsed);
    } else {
      setYearState(DEFAULT_YEAR);
    }
  }, [orchardId]);

  // ฟังการเปลี่ยนแปลงจากหน้า/แท็บอื่น
  useEffect(() => {
    if (!orchardId || typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey(orchardId) && e.newValue) {
        const v = Number(e.newValue);
        if (HARVEST_YEAR_OPTIONS.includes(v)) setYearState(v);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [orchardId]);

  const setYear = useCallback((y: number) => {
    setYearState(y);
    if (orchardId && typeof window !== 'undefined') {
      localStorage.setItem(storageKey(orchardId), String(y));
    }
  }, [orchardId]);

  return { year, setYear };
}
