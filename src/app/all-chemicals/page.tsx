'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  getOrchards, getMedicineItems, getNutrientItems,
  MEDICINE_UNIT_LABEL,
  type Orchard, type MedicineItemRecord, type NutrientItemRecord,
} from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';
import { FlaskConical, Bug, Sprout, Leaf } from 'lucide-react';
import BottomNav from '../_components/BottomNav';

type StockRow = {
  id: string;
  orchardName: string;
  orchardColor: string;
  group: string;
  name: string;
  amount: number;
  unit: string;
  price: number;
};

const GROUP_META: Record<string, { label: string; Icon: typeof Bug; color: string }> = {
  fungicide:   { label: 'ยารา',       Icon: Sprout,       color: 'text-emerald-600 dark:text-emerald-400' },
  insecticide: { label: 'ยาฆ่าแมลง', Icon: Bug,          color: 'text-rose-600 dark:text-rose-400' },
  fertilizer:  { label: 'ปุ๋ย',       Icon: Leaf,         color: 'text-amber-600 dark:text-amber-400' },
  hormone:     { label: 'ฮอร์โมน',   Icon: FlaskConical, color: 'text-pink-600 dark:text-pink-400' },
};

export default function AllChemicalsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [orchards, setOrchards] = useState<Orchard[]>([]);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGroup, setFilterGroup] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const orch = await getOrchards();
      setOrchards(orch);
      const allRows: StockRow[] = [];
      for (const o of orch) {
        const [meds, nutrs] = await Promise.all([
          getMedicineItems(o.id),
          getNutrientItems(o.id),
        ]);
        for (const m of meds) {
          allRows.push({
            id: m.id, orchardName: o.name, orchardColor: o.color,
            group: m.type, name: m.name, amount: m.amount,
            unit: m.unit, price: Number(m.price) || 0,
          });
        }
        for (const n of nutrs) {
          allRows.push({
            id: n.id, orchardName: o.name, orchardColor: o.color,
            group: n.type, name: n.name, amount: n.amount,
            unit: n.unit, price: Number(n.price) || 0,
          });
        }
      }
      setRows(allRows);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() =>
    filterGroup === 'all' ? rows : rows.filter(r => r.group === filterGroup),
    [rows, filterGroup]
  );

  const totalPrice = useMemo(() => filtered.reduce((s, r) => s + r.price, 0), [filtered]);

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Header */}
      <header className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-700 dark:to-purple-900 text-white px-5 pt-6 pb-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <FlaskConical size={24} />
          <h1 className="text-xl font-extrabold">คลังสารเคมีรวม</h1>
        </div>
        <p className="text-sm opacity-90">{orchards.length} สวน · {rows.length} รายการ · ฿{totalPrice.toLocaleString()}</p>
      </header>

      {/* Filter */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {[
          { id: 'all', label: 'ทั้งหมด' },
          { id: 'fungicide', label: 'ยารา' },
          { id: 'insecticide', label: 'ยาฆ่าแมลง' },
          { id: 'fertilizer', label: 'ปุ๋ย' },
          { id: 'hormone', label: 'ฮอร์โมน' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilterGroup(f.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              filterGroup === f.id
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500">
            <FlaskConical size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">ไม่มีรายการ</p>
          </div>
        ) : (
          filtered.map(r => {
            const meta = GROUP_META[r.group];
            const Icon = meta?.Icon || FlaskConical;
            return (
              <div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className={meta?.color || 'text-slate-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{r.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {r.orchardName} · {meta?.label} · เหลือ {r.amount} {MEDICINE_UNIT_LABEL[r.unit as keyof typeof MEDICINE_UNIT_LABEL] ?? r.unit}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                    ฿{r.price.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNav activeId="chemicals" />
    </div>
  );
}
