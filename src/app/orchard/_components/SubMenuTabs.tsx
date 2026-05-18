'use client';

import { useRouter } from 'next/navigation';
import {
  LeafIcon,
  BarChart3,
  Wrench,
  ShoppingCart,
  Stethoscope,
  Map as MapIcon,
  type LucideIcon,
} from 'lucide-react';

type TabItem = {
  id: string;
  path: string;
  label: string;
  Icon: LucideIcon;
  activeColor: string;
};

const TABS: TabItem[] = [
  { id: 'farm-map', path: '/orchard/farm-map', label: 'ผังสวน',       Icon: MapIcon,     activeColor: 'text-amber-500 border-amber-500' },
  { id: 'care',     path: '/orchard/care',     label: 'การดูแล',      Icon: LeafIcon,    activeColor: 'text-emerald-500 border-emerald-500' },
  { id: 'expense',  path: '/orchard/expense',  label: 'รายจ่าย',       Icon: BarChart3,   activeColor: 'text-blue-500 border-blue-500' },
  { id: 'upgrade',  path: '/orchard/upgrade',  label: 'ค่าปรับปรุง',   Icon: Wrench,      activeColor: 'text-orange-500 border-orange-500' },
  { id: 'sales',    path: '/orchard/sales',    label: 'การซื้อขาย',    Icon: ShoppingCart, activeColor: 'text-pink-500 border-pink-500' },
  { id: 'hospital', path: '/orchard/hospital', label: 'ห้องพยาบาล',    Icon: Stethoscope, activeColor: 'text-red-500 border-red-500' },
];

type Props = {
  /** id ของ tab ปัจจุบัน เพื่อ highlight */
  activeTab: string;
  /** orchardId ของสวน */
  orchardId: string;
};

export default function SubMenuTabs({ activeTab, orchardId }: Props) {
  const router = useRouter();

  return (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm">
      <div className="max-w-6xl mx-auto overflow-x-auto">
        <div className="flex gap-1 px-2 sm:px-4 min-w-max">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            const Icon = tab.Icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (!isActive) router.push(`${tab.path}?id=${orchardId}`);
                }}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? tab.activeColor
                    : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
