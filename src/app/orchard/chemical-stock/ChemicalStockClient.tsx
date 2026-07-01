'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards, getMedicineItems, getNutrientItems,
  isDurianFarm,
  type Orchard, type MedicineItemRecord, type NutrientItemRecord,
} from '@/lib/firebase';
import { FlaskConical, Bug, Sprout, Leaf, ChevronRight, Wallet } from 'lucide-react';
import SubPageHeader from '../_components/SubPageHeader';

type GroupKey = 'fungicide' | 'insecticide' | 'fertilizer' | 'hormone' | 'bioproduct';

type SubMenu = {
  id: GroupKey;
  path: string;
  label: string;
  description: string;
  Icon: typeof Bug;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  totalColor: string;
};

const SUB_MENUS: SubMenu[] = [
  {
    id: 'fungicide',
    path: '/orchard/chemical-stock/medicine/fungicide',
    label: 'ยารา',
    description: 'ยากำจัดเชื้อรา ป้องกันโรคพืช',
    Icon: Sprout,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    totalColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'insecticide',
    path: '/orchard/chemical-stock/medicine/insecticide',
    label: 'ยาฆ่าแมลง',
    description: 'ยากำจัดแมลงและศัตรูพืช',
    Icon: Bug,
    iconBg: 'bg-rose-100 dark:bg-rose-900/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-200 dark:border-rose-800',
    totalColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    id: 'fertilizer',
    path: '/orchard/chemical-stock/nutrient/fertilizer',
    label: 'ปุ๋ย',
    description: 'ปุ๋ย ธาตุอาหาร N-P-K',
    Icon: Leaf,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
    totalColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'hormone',
    path: '/orchard/chemical-stock/nutrient/hormone',
    label: 'ฮอร์โมน',
    description: 'ฮอร์โมนพืช สารกระตุ้นการเจริญเติบโต',
    Icon: FlaskConical,
    iconBg: 'bg-pink-100 dark:bg-pink-900/30',
    iconColor: 'text-pink-600 dark:text-pink-400',
    borderColor: 'border-pink-200 dark:border-pink-800',
    totalColor: 'text-pink-600 dark:text-pink-400',
  },
  {
    id: 'bioproduct',
    path: '/orchard/chemical-stock/nutrient/bioproduct',
    label: 'ชีวภัณฑ์',
    description: 'จุลินทรีย์ ชีวภัณฑ์ สารสกัดจากธรรมชาติ',
    Icon: Leaf,
    iconBg: 'bg-teal-100 dark:bg-teal-900/30',
    iconColor: 'text-teal-600 dark:text-teal-400',
    borderColor: 'border-teal-200 dark:border-teal-800',
    totalColor: 'text-teal-600 dark:text-teal-400',
  },
];

const formatBaht = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function ChemicalStockClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [medicineItems, setMedicineItems] = useState<MedicineItemRecord[]>([]);
  const [nutrientItems, setNutrientItems] = useState<NutrientItemRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orchardId) {
      router.push('/');
      return;
    }
    loadData();
  }, [orchardId]);

  const loadData = async () => {
    try {
      const [orchards, meds, nutrs] = await Promise.all([
        getOrchards(),
        getMedicineItems(orchardId),
        getNutrientItems(orchardId),
      ]);
      setOrchard(orchards.find((o) => o.id === orchardId) || null);
      setMedicineItems(meds);
      setNutrientItems(nutrs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // สรุปยอดรายจ่ายและจำนวนรายการของแต่ละกลุ่ม
  const summaryByGroup = useMemo(() => {
    const m: Record<GroupKey, { total: number; count: number }> = {
      fungicide:   { total: 0, count: 0 },
      insecticide: { total: 0, count: 0 },
      fertilizer:  { total: 0, count: 0 },
      hormone:     { total: 0, count: 0 },
      bioproduct:  { total: 0, count: 0 },
    };
    for (const it of medicineItems) {
      const k = it.type as GroupKey;
      if (m[k]) {
        m[k].total += Number(it.price) || 0;
        m[k].count += 1;
      }
    }
    for (const it of nutrientItems) {
      const k = it.type as GroupKey;
      if (m[k]) {
        m[k].total += Number(it.price) || 0;
        m[k].count += 1;
      }
    }
    return m;
  }, [medicineItems, nutrientItems]);

  const grandTotal = useMemo(
    () => (Object.values(summaryByGroup) as { total: number }[]).reduce((s, x) => s + x.total, 0),
    [summaryByGroup]
  );

  if (!orchard || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const isDurianBackyard = isDurianFarm(orchard.name);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-8 overflow-x-clip">
      <SubPageHeader
        orchardName={orchard.name}
        orchardColor={orchard.color}
        orchardIcon={orchard.icon}
        orchardId={orchardId}
        isDurianBackyard={isDurianBackyard}
        title="คลังสารเคมี"
        Icon={FlaskConical}
      />

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-3">
        {/* ── สรุปรายจ่ายรวม ── */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-2xl p-4 text-white shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={18} />
            <span className="text-xs font-bold opacity-90">รายจ่ายคลังสารเคมีทั้งหมด</span>
          </div>
          <p className="text-2xl font-extrabold">฿ {formatBaht(grandTotal)}</p>
          <p className="text-[11px] opacity-80 mt-0.5">
            {medicineItems.length + nutrientItems.length} รายการ
          </p>
        </div>

        {/* ── เมนูย่อย 4 กลุ่ม ── */}
        {SUB_MENUS.map((m) => {
          const Icon = m.Icon;
          const sum = summaryByGroup[m.id];
          return (
            <button
              key={m.id}
              onClick={() => router.push(`${m.path}?id=${orchardId}`)}
              className={`w-full bg-white dark:bg-slate-800 border ${m.borderColor} rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all`}
            >
              <div className={`w-12 h-12 rounded-xl ${m.iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={24} className={m.iconColor} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-bold text-slate-800 dark:text-white text-base">{m.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {m.description}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-sm font-bold ${m.totalColor}`}>
                    ฿ {formatBaht(sum.total)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    • {sum.count} รายการ
                  </span>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-400 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
