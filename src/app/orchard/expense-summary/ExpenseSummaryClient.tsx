'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards,
  getTransactions,
  getUpgradeExpenses,
  getMedicineItems,
  getNutrientItems,
  isDurianFarm,
  type Orchard,
  type Transaction,
  type UpgradeExpense,
  type MedicineItemRecord,
  type NutrientItemRecord,
} from '@/lib/firebase';
import {
  Wallet, Bug, Sprout, Leaf, FlaskConical, BarChart3, Wrench, ShoppingCart,
  TrendingUp, TrendingDown, ChevronRight,
} from 'lucide-react';
import SubPageHeader from '../_components/SubPageHeader';

const formatBaht = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

type GroupCard = {
  id: string;
  label: string;
  icon: React.ReactNode;
  total: number;
  count: number;
  bg: string;
  border: string;
  textColor: string;
  link?: string;
};

export default function ExpenseSummaryClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [upgrades, setUpgrades] = useState<UpgradeExpense[]>([]);
  const [medicines, setMedicines] = useState<MedicineItemRecord[]>([]);
  const [nutrients, setNutrients] = useState<NutrientItemRecord[]>([]);
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
      const [orchards, tx, upg, meds, nutrs] = await Promise.all([
        getOrchards(),
        getTransactions(orchardId),
        getUpgradeExpenses(orchardId),
        getMedicineItems(orchardId),
        getNutrientItems(orchardId),
      ]);
      setOrchard(orchards.find((o) => o.id === orchardId) || null);
      setTransactions(tx as Transaction[]);
      setUpgrades(upg);
      setMedicines(meds);
      setNutrients(nutrs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── คำนวณยอดต่างๆ ──
  const summary = useMemo(() => {
    // คลังสารเคมี แยกตามกลุ่ม
    let fungicide = 0, insecticide = 0, fertilizer = 0, hormone = 0;
    let chemCount = 0;
    for (const m of medicines) {
      const p = Number(m.price) || 0;
      if (m.type === 'fungicide') fungicide += p;
      else if (m.type === 'insecticide') insecticide += p;
      chemCount++;
    }
    for (const n of nutrients) {
      const p = Number(n.price) || 0;
      if (n.type === 'fertilizer') fertilizer += p;
      else if (n.type === 'hormone') hormone += p;
      chemCount++;
    }
    const chemicalTotal = fungicide + insecticide + fertilizer + hormone;

    // รายจ่ายทั่วไป + รายได้
    let generalExpense = 0;
    let income = 0;
    let generalCount = 0;
    let incomeCount = 0;
    for (const t of transactions) {
      const a = Number(t.amount) || 0;
      if (t.type === 'expense') {
        generalExpense += a;
        generalCount++;
      } else {
        income += a;
        incomeCount++;
      }
    }

    // ค่าปรับปรุง
    const upgradeTotal = upgrades.reduce((s, u) => s + (Number(u.amount) || 0), 0);

    const totalExpense = chemicalTotal + generalExpense + upgradeTotal;
    const profit = income - totalExpense;

    return {
      fungicide, insecticide, fertilizer, hormone,
      chemicalTotal, chemCount,
      generalExpense, generalCount,
      upgradeTotal, upgradeCount: upgrades.length,
      income, incomeCount,
      totalExpense,
      profit,
    };
  }, [medicines, nutrients, transactions, upgrades]);

  if (!orchard || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const isDurianBackyard = isDurianFarm(orchard.name);

  // การ์ดหลัก
  const mainCards: GroupCard[] = [
    {
      id: 'chemical',
      label: 'คลังสารเคมี',
      icon: <FlaskConical size={22} className="text-purple-600 dark:text-purple-400" />,
      total: summary.chemicalTotal,
      count: summary.chemCount,
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      textColor: 'text-purple-700 dark:text-purple-400',
      link: `/orchard/chemical-stock?id=${orchardId}`,
    },
    {
      id: 'general',
      label: 'รายจ่ายทั่วไป',
      icon: <BarChart3 size={22} className="text-blue-600 dark:text-blue-400" />,
      total: summary.generalExpense,
      count: summary.generalCount,
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-700 dark:text-blue-400',
      link: `/orchard/expense?id=${orchardId}`,
    },
    {
      id: 'upgrade',
      label: 'ค่าปรับปรุง',
      icon: <Wrench size={22} className="text-orange-600 dark:text-orange-400" />,
      total: summary.upgradeTotal,
      count: summary.upgradeCount,
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      textColor: 'text-orange-700 dark:text-orange-400',
      link: `/orchard/upgrade?id=${orchardId}`,
    },
    {
      id: 'sales',
      label: 'รายได้',
      icon: <ShoppingCart size={22} className="text-pink-600 dark:text-pink-400" />,
      total: summary.income,
      count: summary.incomeCount,
      bg: 'bg-pink-50 dark:bg-pink-900/20',
      border: 'border-pink-200 dark:border-pink-800',
      textColor: 'text-pink-700 dark:text-pink-400',
      link: `/orchard/sales?id=${orchardId}`,
    },
  ];

  // การ์ดย่อย — แยกคลังสารเคมีตามกลุ่ม
  const chemSubCards = [
    { id: 'fungicide',   label: 'ยารา',       icon: <Sprout size={18} className="text-emerald-600 dark:text-emerald-400" />, total: summary.fungicide,   bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', textColor: 'text-emerald-700 dark:text-emerald-400' },
    { id: 'insecticide', label: 'ยาฆ่าแมลง', icon: <Bug size={18} className="text-rose-600 dark:text-rose-400" />,         total: summary.insecticide, bg: 'bg-rose-50 dark:bg-rose-900/20',     border: 'border-rose-200 dark:border-rose-800',     textColor: 'text-rose-700 dark:text-rose-400' },
    { id: 'fertilizer',  label: 'ปุ๋ย',         icon: <Leaf size={18} className="text-amber-600 dark:text-amber-400" />,        total: summary.fertilizer,  bg: 'bg-amber-50 dark:bg-amber-900/20',     border: 'border-amber-200 dark:border-amber-800',     textColor: 'text-amber-700 dark:text-amber-400' },
    { id: 'hormone',     label: 'ฮอร์โมน',     icon: <FlaskConical size={18} className="text-pink-600 dark:text-pink-400" />, total: summary.hormone,     bg: 'bg-pink-50 dark:bg-pink-900/20',       border: 'border-pink-200 dark:border-pink-800',       textColor: 'text-pink-700 dark:text-pink-400' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-8 overflow-x-hidden">
      <SubPageHeader
        orchardName={orchard.name}
        orchardColor={orchard.color}
        orchardId={orchardId}
        isDurianBackyard={isDurianBackyard}
        title="สรุปค่าใช้จ่าย"
        Icon={Wallet}
      />

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">

        {/* ── การ์ดหลัก: รวมรายจ่าย ── */}
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 dark:from-rose-600 dark:to-rose-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={18} />
            <span className="text-xs font-bold opacity-90">รายจ่ายรวมทั้งหมด</span>
          </div>
          <p className="text-3xl font-extrabold">฿ {formatBaht(summary.totalExpense)}</p>
          <p className="text-[11px] opacity-80 mt-1">
            จาก {summary.chemCount + summary.generalCount + summary.upgradeCount} รายการ
          </p>
        </div>

        {/* ── กำไร/ขาดทุน ── */}
        <div className={`rounded-2xl p-4 border-2 flex items-center justify-between ${
          summary.profit >= 0
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
        }`}>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {summary.profit >= 0 ? 'กำไรสุทธิ' : 'ขาดทุน'}
            </p>
            <p className={`text-2xl font-extrabold mt-0.5 ${
              summary.profit >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}>
              {summary.profit >= 0 ? '+' : ''}฿ {formatBaht(summary.profit)}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              รายได้ ฿{formatBaht(summary.income)} − รายจ่าย ฿{formatBaht(summary.totalExpense)}
            </p>
          </div>
          {summary.profit >= 0 ? (
            <TrendingUp size={36} className="text-emerald-500 dark:text-emerald-400" />
          ) : (
            <TrendingDown size={36} className="text-amber-500 dark:text-amber-400" />
          )}
        </div>

        {/* ── การ์ดหมวดหลัก ── */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
            แยกตามหมวด
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {mainCards.map((card) => (
              <button
                key={card.id}
                onClick={() => card.link && router.push(card.link)}
                className={`${card.bg} border ${card.border} rounded-2xl p-3 text-left active:scale-[0.98] transition-all relative`}
              >
                {card.link && (
                  <ChevronRight
                    size={14}
                    className="absolute top-3 right-3 text-slate-400 dark:text-slate-500"
                  />
                )}
                <div className="flex items-center gap-2 mb-1">
                  {card.icon}
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {card.label}
                  </span>
                </div>
                <p className={`text-lg font-extrabold ${card.textColor}`}>
                  ฿ {formatBaht(card.total)}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {card.count} รายการ
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* ── การ์ดย่อย: แยกคลังสารเคมีตามกลุ่ม ── */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
            <FlaskConical size={14} className="text-purple-500" />
            คลังสารเคมี (แยกกลุ่ม)
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {chemSubCards.map((card) => (
              <div
                key={card.id}
                className={`${card.bg} border ${card.border} rounded-xl p-2.5`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  {card.icon}
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {card.label}
                  </span>
                </div>
                <p className={`text-base font-extrabold ${card.textColor}`}>
                  ฿ {formatBaht(card.total)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── สรุปแบบรายการ ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              ภาพรวมรายจ่าย
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            <Row label="คลังสารเคมี" value={summary.chemicalTotal} total={summary.totalExpense} color="bg-purple-500" />
            <Row label="รายจ่ายทั่วไป" value={summary.generalExpense} total={summary.totalExpense} color="bg-blue-500" />
            <Row label="ค่าปรับปรุง" value={summary.upgradeTotal} total={summary.totalExpense} color="bg-orange-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="px-4 py-3 space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</span>
        <div className="text-right">
          <span className="text-sm font-extrabold text-slate-800 dark:text-white">
            ฿ {formatBaht(value)}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5">
            ({pct.toFixed(0)}%)
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
