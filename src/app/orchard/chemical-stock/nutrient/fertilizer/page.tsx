'use client';

import { Suspense } from 'react';
import { Leaf } from 'lucide-react';
import StockListClient, { type StockItem, type StockApi } from '../../_components/StockListClient';
import {
  getNutrientItems,
  addNutrientItem,
  updateNutrientItem,
  deleteNutrientItem,
  type NutrientItemRecord,
} from '@/lib/firebase';

const FERTILIZER_API: StockApi = {
  list: (orchardId) => getNutrientItems(orchardId, 'fertilizer') as Promise<StockItem[]>,
  add: (record) => addNutrientItem({ ...(record as Omit<NutrientItemRecord, 'id'>), type: 'fertilizer' }),
  update: (id, data) => updateNutrientItem(id, data as Partial<NutrientItemRecord>),
  remove: (id) => deleteNutrientItem(id),
};

// 5 ตัวเลือกประเภทปุ๋ย พร้อมหน่วยเริ่มต้นที่ตรงกับชนิด
const FERTILIZER_CATEGORIES = [
  { value: 'powder',      label: 'ปุ๋ยเกล็ด',         icon: '🟡', color: 'amber',   unit: 'gram'  as const }, // กรัม
  { value: 'liquid',      label: 'ปุ๋ยน้ำ',           icon: '💧', color: 'sky',     unit: 'cc'    as const }, // ซีซี
  { value: 'organic',     label: 'ปุ๋ยอินทรีย์',      icon: '🌱', color: 'emerald', unit: 'kg'    as const }, // กิโล
  { value: 'organicChem', label: 'ปุ๋ยอินทรีย์เคมี',  icon: '🧪', color: 'lime',    unit: 'kg'    as const }, // กิโล
  { value: 'chemical',    label: 'ปุ๋ยเคมี',          icon: '⚗️', color: 'rose',    unit: 'kg'    as const }, // กิโล
];

// สูตรปุ๋ยมาตรฐานยอดนิยม (ผู้ใช้พิมพ์เพิ่มเองได้)
const STANDARD_FORMULAS = [
  '15-15-15',
  '16-16-16',
  '16-20-0',
  '21-0-0',
  '25-7-7',
  '46-0-0',
  '0-0-60',
  '13-13-21',
  '8-24-24',
  '12-24-12',
  '15-5-20',
  '15-9-20',
  '18-46-0',
  '20-20-20',
  '30-20-10',
];

export default function FertilizerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    }>
      <StockListClient
        api={FERTILIZER_API}
        title="ปุ๋ย"
        Icon={Leaf}
        accent="emerald"
        categories={FERTILIZER_CATEGORIES}
        nameLabel="ชื่อปุ๋ย"
        namePlaceholder="เช่น ทองคำ, เพชรดำ, ตรามือ..."
        categoryCols={3}
        showFormula={true}
        formulaOptions={STANDARD_FORMULAS}
        showGroup={false}
      />
    </Suspense>
  );
}
