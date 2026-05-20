'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards,
  getCareRecords,
  deleteCareRecord,
  addCareRecord,
  type Orchard,
  type CareRecord,
} from '@/lib/firebase';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import SubMenuTabs from '../../_components/SubMenuTabs';
import SubPageHeader from '../../_components/SubPageHeader';

type Props = {
  /** ประเภทการดูแล */
  careType: 'water' | 'fertilize' | 'pesticide';
  /** ชื่อแสดง */
  title: string;
  /** ไอคอน */
  Icon: LucideIcon;
  /** สีหลัก */
  accentColor: string;
  /** ring color สำหรับ focus */
  ringColor: string;
};

export default function CareTypeClient({
  careType,
  title,
  Icon,
  accentColor,
  ringColor,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    plant: '',
    note: '',
  });

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

      const data = await getCareRecords(orchardId);
      // กรองเฉพาะประเภทนี้
      setRecords(data.filter((r) => r.type === careType));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.date || !form.plant) return;
    try {
      await addCareRecord({
        date: form.date,
        type: careType,
        plant: form.plant,
        note: form.note,
        orchardId,
        createdAt: Date.now(),
      });
      setForm({
        date: new Date().toISOString().split('T')[0],
        plant: '',
        note: '',
      });
      await loadData();
    } catch (error) {
      alert('บันทึกไม่สำเร็จ!');
    }
  };

  if (!orchard || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${accentColor.replace('bg-', 'border-')}`}></div>
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
        title={title}
        Icon={Icon}
      />
      {isDurianBackyard && <SubMenuTabs activeTab="care" orchardId={orchardId} />}

      <div className="px-5 py-6 max-w-4xl mx-auto">
        {/* ปุ่มกลับ */}
        <button
          onClick={() => router.push(`/orchard/care?id=${orchardId}`)}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> กลับเมนูการดูแล
        </button>

        {/* ฟอร์มเพิ่ม */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm mb-6 border border-slate-200 dark:border-slate-700">
          <h2 className={`text-lg font-bold mb-4 ${accentColor.replace('bg-', 'text-')} dark:${accentColor.replace('bg-', 'text-').replace('500', '400')}`}>
            บันทึก{title}
          </h2>
          <div className="space-y-3">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={`w-full p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ${ringColor}`}
            />
            <input
              type="text"
              placeholder="ชื่อต้นไม้ / โซน"
              value={form.plant}
              onChange={(e) => setForm({ ...form, plant: e.target.value })}
              className={`w-full p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ${ringColor}`}
            />
            <input
              type="text"
              placeholder="หมายเหตุ (ไม่บังคับ)"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className={`w-full p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ${ringColor}`}
            />
            <button
              onClick={handleAdd}
              className={`w-full py-3 ${accentColor} hover:opacity-90 text-white rounded-xl font-bold transition-all`}
            >
              บันทึก{title}
            </button>
          </div>
        </div>

        {/* รายการ */}
        <div className="space-y-2.5">
          {records.length === 0 ? (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              ยังไม่มีบันทึก{title}
            </div>
          ) : (
            records.map((record) => (
              <div
                key={record.id}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">
                    {record.plant}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {record.date}{record.note ? ` • ${record.note}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => deleteCareRecord(record.id).then(loadData)}
                  className="text-red-500 hover:text-red-700 text-lg"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
