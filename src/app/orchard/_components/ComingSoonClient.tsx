'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getOrchards, isDurianFarm, type Orchard } from '@/lib/firebase';
import { AlertCircle, type LucideIcon } from 'lucide-react';
import SubMenuTabs from './SubMenuTabs';
import SubPageHeader from './SubPageHeader';

type Props = {
  /** ใช้สำหรับ highlight tab ในแถบเมนู */
  tabId: string;
  title: string;
  Icon: LucideIcon;
  accentClass: string;
};

export default function ComingSoonClient({ tabId, title, Icon, accentClass }: Props) {
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
        <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${accentClass.replace('text-', 'border-')}`}></div>
      </div>
    );
  }

  const isDurianBackyard = isDurianFarm(orchard.name);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300 overflow-x-hidden">
      <SubPageHeader
        orchardName={orchard.name}
        orchardColor={orchard.color}
        orchardId={orchardId}
        isDurianBackyard={isDurianBackyard}
        title={title}
        Icon={Icon}
      />
      {isDurianBackyard && null}

      <div className="px-6 py-12 max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl text-center border border-slate-200 dark:border-slate-700">
          <AlertCircle size={64} className={`mx-auto mb-4 ${accentClass}`} />
          <p className="text-slate-700 dark:text-slate-200 text-xl font-bold mb-2">
            ฟีเจอร์นี้กำลังพัฒนา
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            มาตามรอการอัปเดตฉบับต่อไปกัน
          </p>
        </div>
      </div>
    </div>
  );
}
