'use client';

import { Suspense } from 'react';
import { FlaskConical } from 'lucide-react';
import StockListClient, { type StockItem, type StockApi } from '../../_components/StockListClient';
import {
  getNutrientItems,
  addNutrientItem,
  updateNutrientItem,
  deleteNutrientItem,
  type NutrientItemRecord,
} from '@/lib/firebase';

const HORMONE_API: StockApi = {
  list: (orchardId) => getNutrientItems(orchardId, 'hormone') as Promise<StockItem[]>,
  add: (record) => addNutrientItem({ ...(record as Omit<NutrientItemRecord, 'id'>), type: 'hormone' }),
  update: (id, data) => updateNutrientItem(id, data as Partial<NutrientItemRecord>),
  remove: (id) => deleteNutrientItem(id),
};

// ช่วงเวลาการใช้ฮอร์โมน — แทนที่ "ยาร้อน/ยาเย็น"
const HORMONE_CATEGORIES = [
  { value: 'recovery',    label: 'ระยะฟื้นต้น',     icon: '🌱', color: 'emerald', unit: 'cc' as const },
  { value: 'preBloom',    label: 'ระยะก่อนออกดอก', icon: '🌸', color: 'pink',    unit: 'cc' as const },
  { value: 'fruiting',    label: 'ระยะติดผล',       icon: '🍎', color: 'rose',    unit: 'cc' as const },
];

// 5 กลุ่มฮอร์โมนพืช + ไม่ระบุ — ใช้ value 0-5
const HORMONE_GROUPS = [
  { value: 0, label: 'ไม่ระบุ' },
  { value: 1, label: 'ออกซิน (Auxin)' },
  { value: 2, label: 'ไซโตไคนิน (Cytokinin)' },
  { value: 3, label: 'จิบเบอเรลลิน (Gibberellin)' },
  { value: 4, label: 'เอทิลีน (Ethylene)' },
  { value: 5, label: 'กรดแอบไซซิก (ABA)' },
];

export default function HormonePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500"></div>
      </div>
    }>
      <StockListClient
        api={HORMONE_API}
        title="ฮอร์โมน"
        Icon={FlaskConical}
        accent="rose"
        categories={HORMONE_CATEGORIES}
        categoryLabel="ช่วงเวลา"
        nameLabel="ชื่อฮอร์โมน"
        namePlaceholder="เช่น แพคโคลบิวทราโซล, ไซโตไคนิน..."
        categoryCols={3}
        showGroup={true}
        groupLabel="กลุ่มฮอร์โมน"
        groupOptions={HORMONE_GROUPS}
      />
    </Suspense>
  );
}
