'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards,
  addUpgradeExpense,
  getUpgradeExpenses,
  deleteUpgradeExpense,
  isDurianFarm,
  subscribeOrchard, subscribeCollection,
  type Orchard,
  type UpgradeExpense,
} from '@/lib/firebase';
import { Wrench, Trash2, X, Plus } from 'lucide-react';
import { useHarvestYear, getRecordYear } from '@/lib/useHarvestYear';
import SubPageHeader from '../_components/SubPageHeader';

const THAI_MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
];

export default function UpgradeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';
  const { year: selectedYear } = useHarvestYear(orchardId);

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [allRecords, setAllRecords] = useState<UpgradeExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const now = new Date();
  const [form, setForm] = useState({
    date: now.toISOString().split('T')[0],
    item: '',
    amount: '',
    note: '',
  });

  useEffect(() => {
    if (!orchardId) { router.push('/'); return; }

    const unsubs: Array<() => void> = [
      subscribeOrchard(orchardId, setOrchard),
      subscribeCollection<UpgradeExpense>('upgradeExpenses', orchardId, (items) => {
        setAllRecords([...items].sort((a, b) => b.createdAt - a.createdAt));
      }),
    ];

    setLoading(false);
    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orchardId]);

  const loadData = async () => {
    try {
      const [orchards, data] = await Promise.all([
        getOrchards(),
        getUpgradeExpenses(orchardId),
      ]);
      setOrchard(orchards.find(o => o.id === orchardId) || null);
      setAllRecords(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!form.date || !form.item.trim() || !form.amount) return;
    setSaving(true);
    try {
      await addUpgradeExpense({
        orchardId,
        date: form.date,
        item: form.item.trim(),
        amount: Number(form.amount),
        note: form.note,
        year: selectedYear,
        createdAt: Date.now(),
      });
      setForm({ date: now.toISOString().split('T')[0], item: '', amount: '', note: '' });
      await loadData();
      setShowAddModal(false);
    } catch { alert('บันทึกไม่สำเร็จ!'); }
    finally { setSaving(false); }
  };

  // กรองเฉพาะบันทึกของปีที่เลือก (รอบการเก็บเกี่ยว)
  const records = useMemo(
    () => allRecords.filter(r => getRecordYear(r) === selectedYear),
    [allRecords, selectedYear]
  );

  const totalAll = useMemo(() => records.reduce((s, r) => s + r.amount, 0), [records]);

  const monthDisplay = (date: string) => {
    const [y, m] = date.split('-');
    return `${THAI_MONTHS[Number(m) - 1]} ${Number(y) + 543}`;
  };

  if (!orchard || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-8 overflow-x-clip">
      <SubPageHeader
        orchardName={orchard.name}
        orchardColor={orchard.color}
        orchardIcon={orchard.icon}
        orchardId={orchardId}
        isDurianBackyard={isDurianFarm(orchard.name)}
        title="ค่าปรับปรุงสวน"
        Icon={Wrench}
      />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* ── ปุ่มเปิด popup บันทึกค่าปรับปรุง ── */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 shadow-md"
        >
          <Plus size={18} /> บันทึกค่าปรับปรุง
        </button>

        {/* Summary card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">ค่าปรับปรุงรวมทั้งหมด</p>
            <p className="text-2xl font-extrabold text-orange-600 dark:text-orange-400">
              {totalAll.toLocaleString()} ฿
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{records.length} รายการ</p>
        </div>

        {/* ปุ่มประวัติ */}
        <button
          onClick={() => setShowHistory(true)}
          className="w-full py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
        >
          📋 ประวัติรายการ ({records.length})
        </button>

      </div>

      {/* ── Popup: บันทึกค่าปรับปรุง ── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-orange-50 dark:bg-orange-900/20 rounded-t-2xl">
              <h3 className="font-bold text-base text-orange-700 dark:text-orange-400 flex items-center gap-2">
                <Wrench size={18} /> บันทึกค่าปรับปรุง
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">วันที่</label>
                <input type="date" value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-orange-500 text-sm text-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">รายการ <span className="text-red-500">*</span></label>
                <input type="text" value={form.item}
                  onChange={e => setForm({ ...form, item: e.target.value })}
                  placeholder="เช่น ซื้อท่อน้ำ, ซ่อมรั้ว, ปรับพื้นที่"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-orange-500 text-sm text-slate-800 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ราคา (บาท) <span className="text-red-500">*</span></label>
                  <input type="number" inputMode="numeric" min={0} value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-orange-500 text-sm text-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">หมายเหตุ</label>
                  <input type="text" value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    placeholder="ไม่บังคับ"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-orange-500 text-sm text-slate-800 dark:text-white" />
                </div>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <button onClick={() => setShowAddModal(false)} disabled={saving}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm disabled:opacity-50">
                ยกเลิก
              </button>
              <button onClick={handleAdd}
                disabled={saving || !form.item.trim() || !form.amount}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ประวัติ ── */}
      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <div>
                <h2 className="font-bold text-slate-800 dark:text-white">📋 ประวัติรายการ</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  รวม {totalAll.toLocaleString()} ฿ · {records.length} รายการ
                </p>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {records.length === 0 ? (
                <p className="text-center text-slate-500 dark:text-slate-400 text-sm py-10">ยังไม่มีรายการ</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {records.map(r => (
                    <div key={r.id} className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{r.item}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {r.date}{r.note ? ` · ${r.note}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <span className="font-extrabold text-orange-600 dark:text-orange-400 text-sm">
                          -{Number(r.amount).toLocaleString()}฿
                        </span>
                        <button
                          onClick={() => { if (confirm('ลบรายการนี้?')) deleteUpgradeExpense(r.id).then(loadData); }}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
