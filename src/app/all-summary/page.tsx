'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  getOrchards, getTransactions, getUpgradeExpenses,
  getMedicineItems, getNutrientItems,
  type Orchard, type Transaction, type UpgradeExpense,
  type MedicineItemRecord, type NutrientItemRecord,
} from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';
import { Wallet, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import BottomNav from '../_components/BottomNav';

const formatBaht = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

type OrchardSummary = {
  id: string;
  name: string;
  color: string;
  icon: string;
  income: number;
  expense: number;
  chemicalCost: number;
  upgradeCost: number;
  profit: number;
};

export default function AllSummaryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [summaries, setSummaries] = useState<OrchardSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const orchards = await getOrchards();
      const results: OrchardSummary[] = [];

      for (const o of orchards) {
        const [tx, upg, meds, nutrs] = await Promise.all([
          getTransactions(o.id),
          getUpgradeExpenses(o.id),
          getMedicineItems(o.id),
          getNutrientItems(o.id),
        ]);

        let income = 0, expense = 0;
        for (const t of (tx as Transaction[])) {
          if (t.type === 'income') income += Number(t.amount) || 0;
          else expense += Number(t.amount) || 0;
        }

        const chemicalCost = [
          ...meds.map(m => Number(m.price) || 0),
          ...nutrs.map(n => Number(n.price) || 0),
        ].reduce((s, v) => s + v, 0);

        const upgradeCost = upg.reduce((s, u) => s + (Number(u.amount) || 0), 0);

        const totalExpense = expense + chemicalCost + upgradeCost;
        const profit = income - totalExpense;

        results.push({
          id: o.id, name: o.name, color: o.color, icon: o.icon,
          income, expense: totalExpense, chemicalCost, upgradeCost, profit,
        });
      }

      setSummaries(results);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const totals = useMemo(() => {
    const income = summaries.reduce((s, o) => s + o.income, 0);
    const expense = summaries.reduce((s, o) => s + o.expense, 0);
    const profit = income - expense;
    return { income, expense, profit };
  }, [summaries]);

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Header */}
      <header className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-700 dark:to-emerald-900 text-white px-5 pt-6 pb-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <Wallet size={24} />
          <h1 className="text-xl font-extrabold">สรุปกำไรสุทธิ</h1>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-80">กำไรสุทธิรวมทุกสวน</p>
            <p className="text-3xl font-extrabold mt-0.5">
              {totals.profit >= 0 ? '+' : ''}฿{formatBaht(totals.profit)}
            </p>
          </div>
          {totals.profit >= 0 ? (
            <TrendingUp size={40} className="opacity-60" />
          ) : (
            <TrendingDown size={40} className="opacity-60" />
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/15 rounded-xl p-2.5 text-center">
            <p className="text-[10px] opacity-80">รายได้รวม</p>
            <p className="text-lg font-extrabold">฿{formatBaht(totals.income)}</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2.5 text-center">
            <p className="text-[10px] opacity-80">รายจ่ายรวม</p>
            <p className="text-lg font-extrabold">฿{formatBaht(totals.expense)}</p>
          </div>
        </div>
      </header>

      {/* Per-orchard cards */}
      <div className="px-4 py-4 space-y-3">
        <h2 className="font-bold text-sm text-slate-800 dark:text-white">แยกตามสวน</h2>
        {summaries.map(o => {
          const imgSrc = o.name.includes('มังคุด') ? '/images/mangosteen.png'
            : o.name.includes('หลังบ้าน') ? '/images/durian.png'
            : o.name.includes('หมื่นซ่อง') ? '/images/durian-cut.png'
            : null;
          return (
          <button
            key={o.id}
            onClick={() => router.push(`/orchard/expense-summary?id=${o.id}`)}
            className="w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-left active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {imgSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgSrc} alt={o.name} className="w-full h-full object-contain p-0.5" />
                  ) : (
                    <span className="text-xl">{o.icon}</span>
                  )}
                </div>
                <span className="font-bold text-slate-800 dark:text-white">{o.name}</span>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">รายได้</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  ฿{formatBaht(o.income)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">รายจ่าย</p>
                <p className="text-sm font-bold text-red-600 dark:text-red-400">
                  ฿{formatBaht(o.expense)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">กำไร</p>
                <p className={`text-sm font-bold ${
                  o.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {o.profit >= 0 ? '+' : ''}฿{formatBaht(o.profit)}
                </p>
              </div>
            </div>
          </button>
          );
        })}
      </div>

      <BottomNav activeId="summary" />
    </div>
  );
}
