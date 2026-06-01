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

const BIOPRODUCT_API: StockApi = {
  list: (orchardId) => getNutrientItems(orchardId, 'bioproduct') as Promise<StockItem[]>,
  add: (record) => addNutrientItem({ ...(record as Omit<NutrientItemRecord, 'id'>), type: 'bioproduct' }),
  update: (id, data) => updateNutrientItem(id, data as Partial<NutrientItemRecord>),
  remove: (id) => deleteNutrientItem(id),
};

export default function BioproductPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    }>
      <StockListClient
        api={BIOPRODUCT_API}
        title="ชีวภัณฑ์"
        Icon={Leaf}
        accent="emerald"
        categories={[
          { value: 'purpose', label: 'วัตถุประสงค์', icon: '🎯', color: 'emerald', unit: 'cc' as const },
        ]}
        categoryLabel="วัตถุประสงค์"
        nameLabel="ชื่อชีวภัณฑ์"
        namePlaceholder="เช่น EM, ไตรโคเดอร์มา, บีที..."
        categoryCols={1}
        showGroup={false}
        groupInputMode="text"
      />
    </Suspense>
  );
}
