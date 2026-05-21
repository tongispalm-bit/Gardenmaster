'use client';

import { Suspense } from 'react';
import { Bug } from 'lucide-react';
import StockListClient, { type StockItem, type StockApi } from '../../_components/StockListClient';
import {
  getMedicineItems,
  addMedicineItem,
  updateMedicineItem,
  deleteMedicineItem,
  type MedicineItemRecord,
} from '@/lib/firebase';

const INSECTICIDE_API: StockApi = {
  list: (orchardId) => getMedicineItems(orchardId, 'insecticide') as Promise<StockItem[]>,
  add: (record) => addMedicineItem({ ...(record as Omit<MedicineItemRecord, 'id'>), type: 'insecticide' }),
  update: (id, data) => updateMedicineItem(id, data as Partial<MedicineItemRecord>),
  remove: (id) => deleteMedicineItem(id),
};

export default function InsecticidePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500"></div>
      </div>
    }>
      <StockListClient
        api={INSECTICIDE_API}
        title="ยาฆ่าแมลง"
        Icon={Bug}
        accent="rose"
        unitOptions={['liter', 'cc']}
      />
    </Suspense>
  );
}
