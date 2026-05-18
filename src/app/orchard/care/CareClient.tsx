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
import { LeafIcon } from 'lucide-react';
import SubMenuTabs from '../_components/SubMenuTabs';
import SubPageHeader from '../_components/SubPageHeader';

export default function CareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [careRecords, setCareRecords] = useState<CareRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [careForm, setCareForm] = useState<{
    date: string;
    type: 'water' | 'fertilize' | 'pesticide';
    plant: string;
    note: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    type: 'water',
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
      setCareRecords(data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!careForm.date || !careForm.plant) return;
    try {
      await addCareRecord({
        ...careForm,
        orchardId,
        createdAt: Date.now(),
      });
      setCareForm({
        date: new Date().toISOString().split('T')[0],
        type: 'water',
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
      {isDurianBackyard && <SubMenuTabs activeTab="care" orchardId={orchardId} />}

      <div className="px-6 py-6 max-w-4xl mx-auto">
        {/* Add Form */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm mb-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold mb-4 text-emerald-800 dark:text-emerald-400">
            บันทึกการดูแล
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={careForm.date}
                onChange={(e) =>
                  setCareForm({ ...careForm, date: e.target.value })
                }
                className="p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ring-emerald-500"
              />
              <select
                value={careForm.type}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'water' || val === 'fertilize' || val === 'pesticide') {
                    setCareForm({ ...careForm, type: val });
                  }
                }}
                className="p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ring-emerald-500"
              >
                <option value="water">💧 รดน้ำ</option>
                <option value="fertilize">🌿 ใส่ปุ๋ย</option>
                <option value="pesticide">🐛 ฉีดยา</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="ชื่อต้นไม้"
              value={careForm.plant}
              onChange={(e) =>
                setCareForm({ ...careForm, plant: e.target.value })
              }
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ring-emerald-500"
            />
            <input
              type="text"
              placeholder="หมายเหตุ"
              value={careForm.note}
              onChange={(e) =>
                setCareForm({ ...careForm, note: e.target.value })
              }
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ring-emerald-500"
            />
            <button
              onClick={handleAdd}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all"
            >
              บันทึกการดูแล
            </button>
          </div>
        </div>

        {/* Records List */}
        <div className="space-y-3">
          {careRecords.length === 0 ? (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              ยังไม่มีบันทึกการดูแล
            </div>
          ) : (
            careRecords.map((record) => (
              <div
                key={record.id}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">
                    {record.plant}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {record.date} • {record.note}
                  </p>
                </div>
                <button
                  onClick={() => deleteCareRecord(record.id).then(loadData)}
                  className="text-red-500 hover:text-red-700"
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
