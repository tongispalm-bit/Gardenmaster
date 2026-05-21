'use client';

import { useRouter } from 'next/navigation';
import {
  LeafIcon,
  BarChart3,
  Wrench,
  ShoppingCart,
  Stethoscope,
  Map as MapIcon,
  FlaskConical,
  type LucideIcon,
} from 'lucide-react';

type TabItem = {
  id: string;
  path: string;
  label: string;
  Icon: LucideIcon;
  activeColor: string;
  activeBg: string;
  activeBorder: string;
};

const TABS: TabItem[] = [
  { id: 'farm-map', path: '/orchard/farm-map', label: 'ผังสวน',     Icon: MapIcon,      activeColor: 'text-amber-600 dark:text-amber-400',   activeBg: 'bg-amber-50 dark:bg-amber-900/30',   activeBorder: 'border-amber-400 dark:border-amber-600' },
  { id: 'care',     path: '/orchard/care',     label: 'การดูแล',    Icon: LeafIcon,     activeColor: 'text-emerald-600 dark:text-emerald-400', activeBg: 'bg-emerald-50 dark:bg-emerald-900/30', activeBorder: 'border-emerald-400 dark:border-emerald-600' },
  { id: 'expense',  path: '/orchard/expense',  label: 'รายจ่าย',     Icon: BarChart3,    activeColor: 'text-blue-600 dark:text-blue-400',     activeBg: 'bg-blue-50 dark:bg-blue-900/30',     activeBorder: 'border-blue-400 dark:border-blue-600' },
  { id: 'upgrade',  path: '/orchard/upgrade',  label: 'ปรับปรุง',    Icon: Wrench,       activeColor: 'text-orange-600 dark:text-orange-400', activeBg: 'bg-orange-50 dark:bg-orange-900/30', activeBorder: 'border-orange-400 dark:border-orange-600' },
  { id: 'sales',    path: '/orchard/sales',    label: 'ซื้อขาย',     Icon: ShoppingCart, activeColor: 'text-pink-600 dark:text-pink-400',     activeBg: 'bg-pink-50 dark:bg-pink-900/30',     activeBorder: 'border-pink-400 dark:border-pink-600' },
  { id: 'hospital', path: '/orchard/hospital', label: 'พยาบาล',     Icon: Stethoscope,  activeColor: 'text-red-600 dark:text-red-400',       activeBg: 'bg-red-50 dark:bg-red-900/30',       activeBorder: 'border-red-400 dark:border-red-600' },
  { id: 'chemical-stock', path: '/orchard/chemical-stock', label: 'คลังสารเคมี', Icon: FlaskConical, activeColor: 'text-purple-600 dark:text-purple-400', activeBg: 'bg-purple-50 dark:bg-purple-900/30', activeBorder: 'border-purple-400 dark:border-purple-600' },
];

type Props = {
  activeTab: string;
  orchardId: string;
};

export default function SubMenuTabs({ activeTab, orchardId }: Props) {
  const router = useRouter();

  return (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-3">
      <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.Icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (!isActive) router.push(`${tab.path}?id=${orchardId}`);
              }}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${
                isActive
                  ? `${tab.activeBg} ${tab.activeBorder} ${tab.activeColor} border-2`
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[11px] font-bold leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
