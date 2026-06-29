'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards,
  addGeneralExpense,
  getGeneralExpenses,
  deleteGeneralExpense,
  WORK_TYPE_LABEL,
  isDurianFarm,
  subscribeOrchard, subscribeCollection,
  type Orchard,
  type GeneralExpense,
  type WorkType,
} from '@/lib/firebase';
import { BarChart3, Trash2, X, Plus, ListChecks } from 'lucide-react';
import SubPageHeader from '../_components/SubPageHeader';

const WORK_TYPES = Object.entries(WORK_TYPE_LABEL) as [WorkType, string][];

const THAI_MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
];

export default function ExpenseClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [records, setRecords] = useState<GeneralExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // popup state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const [form, setForm] = useState({
    date: now.toISOString().split('T')[0],
    workType: 'trim_tree' as WorkType,
    customWork: '',
    amount: '',
    note: '',
  });

  useEffect(() => {
    if (!orchardId) { router.push('/'); return; }

    const unsubs: Array<() => void> = [
      subscribeOrchard(orchardId, setOrchard),
      subscribeCollection<GeneralExpense>('generalExpenses', orchardId, (items) => {
        setRecords([...items].sort((a, b) => b.createdAt - a.createdAt));
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
        getGeneralExpenses(orchardId),
      ]);
      setOrchard(orchards.find(o => o.id === orchardId) || null);
      setRecords(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!form.date || !form.amount) return;
    if (form.workType === 'other' && !form.customWork.trim()) return;
    setSaving(true);
    try {
      await addGeneralExpense({
        orchardId,
        date: form.date,
        workType: form.workType,
        customWork: form.workType === 'other' ? form.customWork.trim() : '',
        amount: Number(form.amount),
        note: form.note,
        createdAt: Date.now(),
      });
      setForm({ date: now.toISOString().split('T')[0], workType: 'trim_tree', customWork: '', amount: '', note: '' });
      await loadData();
      setShowAddModal(false);
    } catch { alert('บันทึกไม่สำเร็จ!'); }
    finally { setSaving(false); }
  };

  // ชื่อแสดงของประเภทงาน
  const workLabel = (r: GeneralExpense) =>
    r.workType === 'other' && r.customWork ? r.customWork : WORK_TYPE_LABEL[r.workType];

  // กรองตามเดือน
  const filteredRecords = useMemo(
    () => records.filter(r => r.date.startsWith(filterMonth)),
    [records, filterMonth]
  );

  // เดือนที่มีข้อมูล
  const availableMonths = useMemo(() => {
    const months = new Set(records.map(r => r.date.slice(0, 7)));
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    months.add(cur);
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [records]);

  // สรุปรายเดือน
  const monthlySummary = useMemo(() => {
    const total = filteredRecords.reduce((s, r) => s + r.amount, 0);
    const byType: Record<string, number> = {};
    for (const r of filteredRecords) {
      const label = workLabel(r);
      byType[label] = (byType[label] || 0) + r.amount;
    }
    return { total, byType };
  }, [filteredRecords]);

  const monthDisplay = (ym: string) => {
    const [y, m] = ym.split('-');
    return `${THAI_MONTHS[Number(m) - 1]} ${Number(y) + 543}`;
  };

  if (!orchard || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-8 overflow-x-clip">
      <SubPageHeader
        orchardName={orchard.name}
        orchardColor={orchard.color}
        orchardId={orchardId}
        isDurianBackyard={isDurianFarm(orchard.name)}
        title="รายจ่ายทั่วไป"
        Icon={BarChart3}
      />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* ── ปุ่มลอย: เปิด popup ── */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 shadow-md"
          >
            <Plus size={18} /> บันทึกรายจ่าย
          </button>
          <button
            onClick={() => setShowHistoryModal(true)}
            className="py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5"
          >
            <ListChecks size={18} /> ประวัติรายการ
            {records.length > 0 && (
              <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
                {records.length}
              </span>
            )}
          </button>
        </div>

        {/* ── สรุปรายเดือน ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-bold text-sm text-slate-800 dark:text-white">📊 สรุป {monthDisplay(filterMonth)}</h2>
            <select value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="p-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-[11px] font-bold outline-none text-slate-800 dark:text-white">
              {availableMonths.map(m => (
                <option key={m} value={m}>{monthDisplay(m)}</option>
              ))}
            </select>
          </div>
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-700/50">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">รวม</span>
            <span className="font-extrabold text-red-600 dark:text-red-400 text-lg">
              -{monthlySummary.total.toLocaleString()}฿
            </span>
          </div>

          {Object.keys(monthlySummary.byType).length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 text-xs py-4">ไม่มีข้อมูล</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {Object.entries(monthlySummary.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([label, total]) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                      -{total.toLocaleString()}฿
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Popup: บันทึกรายจ่าย ── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20 rounded-t-2xl">
              <h3 className="font-bold text-base text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <BarChart3 size={18} /> บันทึกรายจ่าย
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">วันที่</label>
                  <input type="date" value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-sm text-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ประเภทงาน</label>
                  <select value={form.workType}
                    onChange={e => setForm({ ...form, workType: e.target.value as WorkType, customWork: '' })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-sm text-slate-800 dark:text-white">
                    {WORK_TYPES.map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              {form.workType === 'other' && (
                <input type="text" value={form.customWork}
                  onChange={e => setForm({ ...form, customWork: e.target.value })}
                  placeholder="ระบุประเภทงาน *"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-sm text-slate-800 dark:text-white" />
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ราคา (บาท)</label>
                  <input type="number" inputMode="numeric" min={0} value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-sm text-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">หมายเหตุ</label>
                  <input type="text" value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    placeholder="ไม่บังคับ"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-sm text-slate-800 dark:text-white" />
                </div>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <button onClick={() => setShowAddModal(false)} disabled={saving}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm disabled:opacity-50">
                ยกเลิก
              </button>
              <button onClick={handleAdd}
                disabled={saving || !form.amount || (form.workType === 'other' && !form.customWork.trim())}
                className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Popup: ประวัติรายการ ── */}
      {showHistoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                  <ListChecks size={18} /> ประวัติรายการ
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {monthDisplay(filterMonth)} · {filteredRecords.length} รายการ
                </p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500">
                <X size={20} />
              </button>
            </div>
            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
              <select value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs font-bold outline-none text-slate-800 dark:text-white">
                {availableMonths.map(m => (
                  <option key={m} value={m}>{monthDisplay(m)}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredRecords.length === 0 ? (
                <p className="text-center text-slate-500 dark:text-slate-400 text-sm py-10">ยังไม่มีรายการในเดือนนี้</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredRecords.map(r => (
                    <div key={r.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{workLabel(r)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {r.date}{r.note ? ` · ${r.note}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-extrabold text-red-600 dark:text-red-400 text-sm">
                          -{Number(r.amount).toLocaleString()}฿
                        </span>
                        <button onClick={() => { if (confirm('ลบรายการนี้?')) deleteGeneralExpense(r.id).then(loadData); }}
                          className="text-slate-400 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
