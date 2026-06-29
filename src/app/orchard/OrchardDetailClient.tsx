'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '@/lib/useTheme';
import {
  getOrchard, isDurianFarm, type Orchard
} from '@/lib/firebase';
import {
  Home,
  LeafIcon,
  BarChart3,
  Wrench,
  ShoppingCart,
  Stethoscope,
  Moon,
  Sun,
  ChevronRight,
  FlaskConical,
  Wallet,
} from 'lucide-react';

const MENU_ITEMS = [
  {
    id: 'care',
    path: '/orchard/care',
    label: 'การดูแล',
    Icon: LeafIcon,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
  },
  {
    id: 'expense',
    path: '/orchard/expense',
    label: 'รายจ่ายทั่วไป',
    Icon: BarChart3,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
  },
  {
    id: 'upgrade',
    path: '/orchard/upgrade',
    label: 'ค่าปรับปรุง',
    Icon: Wrench,
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/10',
  },
  {
    id: 'sales',
    path: '/orchard/sales',
    label: 'การซื้อขาย',
    Icon: ShoppingCart,
    iconColor: 'text-pink-400',
    iconBg: 'bg-pink-500/10',
  },
  {
    id: 'chemical-stock',
    path: '/orchard/chemical-stock',
    label: 'คลังสารเคมี',
    Icon: FlaskConical,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
  },
  {
    id: 'expense-summary',
    path: '/orchard/expense-summary',
    label: 'สรุปรายจ่าย',
    Icon: Wallet,
    iconColor: 'text-teal-400',
    iconBg: 'bg-teal-500/10',
  },
  {
    id: 'hospital',
    path: '/orchard/hospital',
    label: 'ห้องพยาบาล',
    Icon: Stethoscope,
    iconColor: 'text-red-400',
    iconBg: 'bg-red-500/10',
  },
];

export default function OrchardDetailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDark, toggleTheme } = useTheme();
  const orchardId = searchParams.get('id') || '';

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orchardId) {
      router.push('/');
      return;
    }
    loadData();
  }, [orchardId]);

  // Redirect ไปหน้าผังสวนทันทีถ้าเป็นสวนที่มี farm map
  useEffect(() => {
    if (orchard && isDurianFarm(orchard.name)) {
      router.replace(`/orchard/farm-map?id=${orchardId}`);
    }
  }, [orchard, orchardId, router]);

  const loadData = async () => {
    try {
      const found = await getOrchard(orchardId);
      setOrchard(found || null);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!orchard || loading || isDurianFarm(orchard.name)) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300 overflow-x-hidden">
      {/* Header */}
      <header
        className="text-white px-6 pt-6 pb-12"
        style={{ backgroundColor: orchard.color }}
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="หน้าแรก"
          >
            <Home size={22} />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        <div className="text-center">
          <div className="text-5xl mb-2">{orchard.icon}</div>
          <h1 className="text-3xl font-bold">{orchard.name}</h1>
          <p className="text-white/80 mt-1">เลือกเมนูที่ต้องการ</p>
        </div>
      </header>

      {/* Menu Grid */}
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 gap-4">
          {MENU_ITEMS.map((item) => {
            const Icon = item.Icon;
            return (
              <button
                key={item.id}
                onClick={() => router.push(`${item.path}?id=${orchardId}`)}
                className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-200 border-2 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 hover:scale-[1.02] active:scale-[0.98]"
              >
                <ChevronRight
                  size={18}
                  className="absolute top-3 right-3 text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors"
                />
                <div className="flex flex-col items-center justify-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center ${item.iconBg}`}
                  >
                    <Icon size={36} className={item.iconColor} strokeWidth={2} />
                  </div>
                  <span className="font-bold text-base text-slate-700 dark:text-slate-200 text-center">
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
