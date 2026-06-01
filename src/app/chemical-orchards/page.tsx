'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getOrchards, subscribeOrchards, type Orchard } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';
import { FlaskConical, ChevronRight } from 'lucide-react';
import BottomNav from '../_components/BottomNav';

// สีกรอบพาสเทลรอบรูปสวน
function getIconBg(orchard: Orchard): string {
  if (orchard.name.includes('มังคุด'))      return 'bg-purple-200/70 dark:bg-purple-900/40';
  if (orchard.name.includes('หลังบ้าน'))    return 'bg-emerald-200/70 dark:bg-emerald-900/40';
  if (orchard.name.includes('หมื่นซ่อง'))   return 'bg-orange-200/70 dark:bg-orange-900/40';
  return 'bg-slate-200 dark:bg-slate-700';
}

// path รูปสำหรับแต่ละสวน
function getOrchardImage(orchard: Orchard): string | null {
  if (orchard.name.includes('มังคุด'))    return '/images/mangosteen.png';
  if (orchard.name.includes('หลังบ้าน'))  return '/images/durian.png';
  if (orchard.name.includes('หมื่นซ่อง')) return '/images/durian-cut.png';
  return null;
}

function getOrchardTag(orchard: Orchard): string {
  if (orchard.name.includes('หลังบ้าน')) return 'ทุเรียน · 91 ต้น';
  if (orchard.name.includes('หมื่นซ่อง')) return 'ทุเรียน';
  return 'มังคุด';
}

export default function ChemicalOrchardsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [orchards, setOrchards] = useState<Orchard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const data = await getOrchards();
        if (cancelled) return;
        setOrchards(data);
        setLoading(false);

        // Subscribe realtime
        unsubscribe = subscribeOrchards((list) => {
          if (cancelled) return;
          setOrchards(list);
        });
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading orchards:', err);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 pb-24">
      {/* Header */}
      <header className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-700 dark:to-purple-900 text-white px-5 pt-6 pb-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <FlaskConical size={24} />
          <h1 className="text-xl font-extrabold">คลังสารเคมี</h1>
        </div>
        <p className="text-sm opacity-90">เลือกสวนที่ต้องการดูคลังสารเคมี</p>
      </header>

      {/* Section title */}
      <div className="flex items-center justify-between px-5 py-3">
        <h2 className="font-bold text-slate-800 dark:text-white">สวนของคุณ</h2>
        <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">
          {orchards.length} รายการ
        </span>
      </div>

      {/* List */}
      <div className="px-5 space-y-2.5">
        {orchards.map((orchard) => {
          const imgSrc = getOrchardImage(orchard);
          return (
            <button
              key={orchard.id}
              onClick={() => router.push(`/orchard/chemical-stock?id=${orchard.id}`)}
              className="w-full bg-white dark:bg-slate-800 rounded-2xl p-3.5 flex items-center gap-3.5 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all border border-slate-100 dark:border-slate-700"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 ${getIconBg(orchard)}`}>
                {imgSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgSrc}
                    alt={orchard.name}
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement | null;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span
                  className="text-3xl w-full h-full items-center justify-center"
                  style={{ display: imgSrc ? 'none' : 'flex' }}
                >
                  {orchard.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-bold text-slate-800 dark:text-white truncate">
                  {orchard.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-purple-500 inline-block flex-shrink-0"></span>
                  {getOrchardTag(orchard)}
                </p>
              </div>
              <ChevronRight size={20} className="text-slate-400 flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Bottom Nav */}
      <BottomNav activeId="chemicals" />
    </div>
  );
}
