'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getOrchards, type Orchard } from '@/lib/firebase';
import { Share2, Droplets, Leaf, Bug, Wrench, ShoppingCart, Home, X } from 'lucide-react';

/**
 * รับ share จาก native share sheet (Web Share Target API)
 * - title/text/url ส่งมาเป็น query params
 * - ผู้ใช้เลือกสวนและประเภทบันทึก แล้ว navigate ไปหน้านั้น
 *   พร้อมส่งข้อความไปด้วยเพื่อ prefill หมายเหตุ
 */

type RecordType = {
  id: string;
  label: string;
  Icon: typeof Droplets;
  color: string;
  pathFor: (orchardId: string, note: string) => string;
};

const RECORD_TYPES: RecordType[] = [
  {
    id: 'water', label: 'รดน้ำ', Icon: Droplets, color: 'blue',
    pathFor: (id, note) => `/orchard/care/water?id=${id}&shareNote=${encodeURIComponent(note)}`,
  },
  {
    id: 'fertilize', label: 'ใส่ปุ๋ย', Icon: Leaf, color: 'emerald',
    pathFor: (id, note) => `/orchard/care/fertilize?id=${id}&shareNote=${encodeURIComponent(note)}`,
  },
  {
    id: 'spray', label: 'พ่นยา', Icon: Bug, color: 'orange',
    pathFor: (id, note) => `/orchard/care/spray?id=${id}&shareNote=${encodeURIComponent(note)}`,
  },
  {
    id: 'expense', label: 'รายจ่าย', Icon: ShoppingCart, color: 'pink',
    pathFor: (id, note) => `/orchard/expense?id=${id}&shareNote=${encodeURIComponent(note)}`,
  },
  {
    id: 'upgrade', label: 'ค่าปรับปรุง', Icon: Wrench, color: 'amber',
    pathFor: (id, note) => `/orchard/upgrade?id=${id}&shareNote=${encodeURIComponent(note)}`,
  },
];

export default function ShareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sharedTitle = searchParams.get('title') ?? '';
  const sharedText = searchParams.get('text') ?? '';
  const sharedUrl = searchParams.get('url') ?? '';
  const combinedNote = useMemo(
    () => [sharedTitle, sharedText, sharedUrl].filter(Boolean).join(' · '),
    [sharedTitle, sharedText, sharedUrl]
  );

  const [orchards, setOrchards] = useState<Orchard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrchard, setSelectedOrchard] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOrchards()
      .then((list) => {
        if (cancelled) return;
        setOrchards(list);
        if (list.length === 1) setSelectedOrchard(list[0].id);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-8 overflow-x-hidden">
      <header className="bg-emerald-500 text-white px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="p-1.5 hover:bg-white/20 rounded-full"
          title="หน้าแรก"
        >
          <Home size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Share2 size={18} />
          <span className="font-bold text-sm">รับเนื้อหาที่แชร์</span>
        </div>
        <button
          onClick={() => router.push('/')}
          className="p-1.5 hover:bg-white/20 rounded-full"
          title="ปิด"
        >
          <X size={18} />
        </button>
      </header>

      <div className="px-4 py-4 max-w-md mx-auto space-y-4">
        {/* แสดงเนื้อหาที่แชร์มา */}
        {combinedNote ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">เนื้อหาที่แชร์</p>
            <p className="text-sm text-slate-800 dark:text-white break-words">{combinedNote}</p>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              ไม่พบเนื้อหาที่แชร์ — ลองเลือกสวนและประเภทบันทึกด้านล่างได้
            </p>
          </div>
        )}

        {/* เลือกสวน */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">1. เลือกสวน</p>
          {orchards.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">ยังไม่มีสวน</p>
          ) : (
            <div className="space-y-1.5">
              {orchards.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedOrchard(o.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                    selectedOrchard === o.id
                      ? 'border-emerald-500 ring-2 ring-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600'
                  }`}
                >
                  <span className="text-lg">{o.icon}</span>
                  <span>{o.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* เลือกประเภท */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">2. เลือกประเภทบันทึก</p>
          <div className="grid grid-cols-2 gap-2">
            {RECORD_TYPES.map((t) => {
              const Icon = t.Icon;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    if (!selectedOrchard) {
                      alert('กรุณาเลือกสวนก่อน');
                      return;
                    }
                    router.push(t.pathFor(selectedOrchard, combinedNote));
                  }}
                  disabled={!selectedOrchard}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 border-${t.color}-200 dark:border-${t.color}-800 hover:scale-[1.02]`}
                >
                  <Icon size={20} className={`text-${t.color}-500`} />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{t.label}</span>
                </button>
              );
            })}
          </div>
          {!selectedOrchard && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-2">
              👆 เลือกสวนก่อน
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
