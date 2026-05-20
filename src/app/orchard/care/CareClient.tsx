'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getOrchards, type Orchard } from '@/lib/firebase';
import { LeafIcon, Leaf, Bug, Droplets, Sprout } from 'lucide-react';
import SubMenuTabs from '../_components/SubMenuTabs';
import SubPageHeader from '../_components/SubPageHeader';

type CareMenuItem = {
  id: string;
  path: string;
  label: string;
  renderIcon: (className: string) => React.ReactNode;
  iconBg: string;
  borderColor: string;
};

const CARE_MENU: CareMenuItem[] = [
  {
    id: 'water',
    path: '/orchard/care/water',
    label: 'รดน้ำ',
    renderIcon: (cls) => <Droplets size={28} className={cls} strokeWidth={2} />,
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  {
    id: 'fertilize',
    path: '/orchard/care/fertilize',
    label: 'ใส่ปุ๋ย',
    renderIcon: (cls) => <Leaf size={28} className={cls} strokeWidth={2} />,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  {
    id: 'spray',
    path: '/orchard/care/spray',
    label: 'พ่นยา',
    renderIcon: (cls) => <Bug size={28} className={cls} strokeWidth={2} />,
    iconBg: 'bg-orange-100 dark:bg-orange-900/40',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
  {
    id: 'durian-fruit',
    path: '/orchard/care/durian-fruit',
    label: 'ทำลูกทุเรียน',
    renderIcon: (cls) => <Sprout size={28} className={cls} strokeWidth={2} />,
    iconBg: 'bg-lime-100 dark:bg-lime-900/40',
    borderColor: 'border-lime-200 dark:border-lime-800',
  },
];

export default function CareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const loadData = async () => {
    try {
      const orchards = await getOrchards();
      const found = orchards.find((o) => o.id === orchardId);
      setOrchard(found || null);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!orchard || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const isDurianBackyard = orchard.name === 'ทุเรียนหลังบ้าน';

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
      <SubPageHeader
        orchardName={orchard.name}
        orchardColor={orchard.color}
        orchardId={orchardId}
        isDurianBackyard={isDurianBackyard}
        title="การดูแล"
        Icon={LeafIcon}
      />
      {isDurianBackyard && null}

      <div className="px-5 py-6 max-w-4xl mx-auto">
        <h2 className="font-bold text-slate-800 dark:text-white mb-4">เลือกประเภทการดูแล</h2>

        {/* Grid 3 คอลัมน์ */}
        <div className="grid grid-cols-2 gap-3">
          {CARE_MENU.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(`${item.path}?id=${orchardId}`)}
              className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 ${item.borderColor} bg-white dark:bg-slate-800 hover:scale-[1.03] active:scale-[0.97] transition-all shadow-sm hover:shadow-md`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.iconBg}`}>
                {item.renderIcon(
                  item.id === 'water' ? 'text-blue-500' :
                  item.id === 'fertilize' ? 'text-emerald-500' :
                  item.id === 'spray' ? 'text-orange-500' : 'text-lime-600'
                )}
              </div>
              <span className="font-bold text-sm text-slate-700 dark:text-slate-200">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
