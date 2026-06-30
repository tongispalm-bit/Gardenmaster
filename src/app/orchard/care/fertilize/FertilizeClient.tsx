'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards,
  addFertilizerRecord, getFertilizerRecords, deleteFertilizerRecord,
  getNutrientItems, deductFromStock,
  subscribeOrchard, subscribeCollection,
  GROWTH_STAGE_LABEL, MEDICINE_UNIT_LABEL,
  isDurianFarm,
  type Orchard, type FertilizerRecord, type GrowthStage,
  type NutrientItemRecord, type MedicineUnit,
} from '@/lib/firebase';
import { useHarvestYear, getRecordYear } from '@/lib/useHarvestYear';
import { Leaf, Trash2, ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import SubPageHeader from '../../_components/SubPageHeader';

const GROWTH_STAGES: GrowthStage[] = [
  'recovery', 'leaf', 'flower', 'tail',
  'small_fruit', 'milk_can', 'expand_lobe', 'harvest',
];

export default function FertilizeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';
  const { year: selectedYear } = useHarvestYear(orchardId);

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [allRecords, setAllRecords] = useState<FertilizerRecord[]>([]);
  const [stocks, setStocks] = useState<NutrientItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // popup state
  const [showAddModal, setShowAddModal] = useState(false);

  // ปฏิทินประวัติ
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const emptyForm = {
    date: new Date().toISOString().split('T')[0],
    stage: 'leaf' as GrowthStage,
    stockId: '',
    amount: '',
    note: '',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!orchardId) { router.push('/'); return; }

    const unsubs: Array<() => void> = [
      subscribeOrchard(orchardId, setOrchard),
      subscribeCollection<FertilizerRecord>('fertilizerRecords', orchardId, (items) => {
        setAllRecords([...items].sort((a, b) => b.createdAt - a.createdAt));
      }),
      subscribeCollection<NutrientItemRecord>('nutrientItems', orchardId, (items) => {
        setStocks(items.filter(it => it.type === 'fertilizer' || it.type === 'bioproduct').sort((a, b) => b.createdAt - a.createdAt));
      }),
    ];

    setLoading(false);
    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orchardId]);

  const loadData = async () => {
    try {
      const [orchards, r, fertItems] = await Promise.all([
        getOrchards(),
        getFertilizerRecords(orchardId),
        getNutrientItems(orchardId),
      ]);
      setOrchard(orchards.find(o => o.id === orchardId) || null);
      setAllRecords(r);
      setStocks(fertItems.filter(it => it.type === 'fertilizer' || it.type === 'bioproduct'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── ปฏิทิน ──
  // กรองเฉพาะบันทึกของปีที่เลือก (รอบการเก็บเกี่ยว)
  const records = useMemo(
    () => allRecords.filter(r => getRecordYear(r) === selectedYear),
    [allRecords, selectedYear]
  );

  const recordsByDate = useMemo(() => {
    const m = new Map<string, FertilizerRecord[]>();
    for (const r of records) {
      if (!r.date) continue;
      if (!m.has(r.date)) m.set(r.date, []);
      m.get(r.date)!.push(r);
    }
    return m;
  }, [records]);

  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calendarMonth]);

  const THAI_MONTHS_FULL = [
    'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
  ];

  const monthCount = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    let count = 0;
    for (const r of records) {
      if (!r.date) continue;
      const [y, m] = r.date.split('-').map(Number);
      if (y === year && m - 1 === month) count++;
    }
    return count;
  }, [records, calendarMonth]);

  const goPrevMonth = () => { setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelectedDate(null); };
  const goNextMonth = () => { setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelectedDate(null); };

  const selectedStock = stocks.find(s => s.id === form.stockId);

  const handleAdd = async () => {
    if (!form.stockId || !form.amount || !selectedStock) return;
    const used = Number(form.amount);
    if (!used || used <= 0) return;

    setSaving(true);
    try {
      // 1) บันทึก fertilizer record
      await addFertilizerRecord({
        orchardId,
        date: form.date,
        stockId: selectedStock.id,
        formulaName: selectedStock.name,
        npk: selectedStock.formula || '-',
        stage: form.stage,
        amount: used,
        unit: selectedStock.unit,
        note: form.note,
        year: selectedYear,
        createdAt: Date.now(),
      });

      // 2) หักจากคลัง — ใช้กลุ่ม 'fertilizer' (nutrientItems collection)
      const deductResults = await deductFromStock([{
        group: 'fertilizer',
        stockId: selectedStock.id,
        amount: String(used),
        unit: selectedStock.unit,
      }]);
      const failed = deductResults.filter(r => !r.ok);
      if (failed.length > 0) {
        // eslint-disable-next-line no-console
        console.warn('[Fertilize] Stock deduction failed:', failed);
      }

      setForm(emptyForm);
      await loadData();
      setShowAddModal(false);
    } catch { alert('บันทึกไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  if (!orchard || loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-8 overflow-x-clip">
      <SubPageHeader orchardName={orchard.name} orchardColor={orchard.color} orchardId={orchardId} isDurianBackyard={isDurianFarm(orchard.name)} title="ใส่ปุ๋ย" Icon={Leaf} />

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">

        {/* ── ปุ่มเปิด popup บันทึกการใส่ปุ๋ย ── */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 shadow-md"
        >
          <Plus size={18} /> บันทึกการใส่ปุ๋ย
        </button>

        {/* ── ประวัติการใส่ปุ๋ย (ปฏิทิน) ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-900/20">
            <button onClick={goPrevMonth} className="p-1.5 rounded-lg hover:bg-white/40 text-emerald-700 dark:text-emerald-400">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <h2 className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                {THAI_MONTHS_FULL[calendarMonth.getMonth()]} {calendarMonth.getFullYear() + 543}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">ใส่ปุ๋ย {monthCount} ครั้ง</p>
            </div>
            <button onClick={goNextMonth} className="p-1.5 rounded-lg hover:bg-white/40 text-emerald-700 dark:text-emerald-400">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="p-3 space-y-3">
            <div className="grid grid-cols-7 gap-1 text-center">
              {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d, i) => (
                <div key={i} className={`text-[11px] font-bold py-1 ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400'}`}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarGrid.map((day, i) => {
                if (day === null) return <div key={i} className="aspect-square" />;
                const year = calendarMonth.getFullYear();
                const month = calendarMonth.getMonth();
                const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const cellRecords = recordsByDate.get(key);
                const today = new Date();
                const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                const isSelected = selectedDate === key;
                const dow = (i % 7);
                const hasData = !!cellRecords;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedDate(isSelected ? null : key)}
                    className={`aspect-square rounded-lg border flex flex-col items-center justify-center text-[10px] p-0.5 transition-all cursor-pointer hover:scale-105 ${
                      isSelected
                        ? 'bg-emerald-200 dark:bg-emerald-900/50 border-emerald-500 ring-2 ring-emerald-400 scale-105'
                        : hasData
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 font-bold'
                          : isToday
                            ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className={`text-[11px] font-bold ${
                      isSelected
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : hasData
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : dow === 0
                            ? 'text-rose-500'
                            : dow === 6
                              ? 'text-blue-500'
                              : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {day}
                    </span>
                    {cellRecords && (
                      <span className="text-[8px] font-bold leading-none mt-0.5 text-emerald-600 dark:text-emerald-400">
                        {cellRecords.length}×
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Popup: บันทึกการใส่ปุ๋ย ── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-900/20 rounded-t-2xl">
              <h3 className="font-bold text-base text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <Leaf size={18} /> บันทึกการใส่ปุ๋ย
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  1. วันที่ <span className="text-red-500">*</span>
                </label>
                <input type="date" value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-sm text-slate-800 dark:text-white" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  2. ช่วงการเจริญเติบโต <span className="text-red-500">*</span>
                </label>
                <select value={form.stage}
                  onChange={e => setForm({ ...form, stage: e.target.value as GrowthStage })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-sm text-slate-800 dark:text-white">
                  {GROWTH_STAGES.map(s => (
                    <option key={s} value={s}>{GROWTH_STAGE_LABEL[s]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  3. สูตรปุ๋ย / ชีวภัณฑ์ <span className="text-red-500">*</span>
                </label>
                <select value={form.stockId}
                  onChange={e => setForm({ ...form, stockId: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-sm text-slate-800 dark:text-white">
                  <option value="">-- เลือกสูตรปุ๋ยหรือชีวภัณฑ์ --</option>
                  {stocks.length === 0 ? (
                    <option disabled>(ไม่มีในคลัง — เพิ่มก่อนใน คลังสารเคมี)</option>
                  ) : (
                    stocks.map(s => (
                      <option key={s.id} value={s.id}>
                        [{s.type === 'bioproduct' ? 'ชีวภัณฑ์' : 'ปุ๋ย'}] {s.name}{s.formula ? ` (${s.formula})` : ''} · เหลือ {s.amount} {MEDICINE_UNIT_LABEL[s.unit] ?? s.unit}
                      </option>
                    ))
                  )}
                </select>
                {stocks.length === 0 && (
                  <button type="button"
                    onClick={() => router.push(`/orchard/chemical-stock?id=${orchardId}`)}
                    className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold underline">
                    → ไปที่คลังสารเคมี เพื่อเพิ่มสูตร
                  </button>
                )}
              </div>

              {selectedStock && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold">{selectedStock.name}</span>
                    {selectedStock.formula && <span>N-P-K: {selectedStock.formula}</span>}
                  </div>
                  <div className="text-emerald-600/80 dark:text-emerald-400/70">
                    คงเหลือในคลัง: {selectedStock.amount} {MEDICINE_UNIT_LABEL[selectedStock.unit] ?? selectedStock.unit}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  4. ปริมาณที่ใช้ <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input type="number" inputMode="decimal" min="0" step="0.01"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0"
                    className="flex-1 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-sm text-slate-800 dark:text-white" />
                  <div className="px-4 py-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-sm text-slate-600 dark:text-slate-400 min-w-[80px] text-center">
                    {selectedStock ? (MEDICINE_UNIT_LABEL[selectedStock.unit] ?? selectedStock.unit) : '—'}
                  </div>
                </div>
                {selectedStock && form.amount && Number(form.amount) > selectedStock.amount && (
                  <p className="mt-1 text-[11px] text-rose-500 font-bold">
                    ⚠️ เกินปริมาณในคลัง (เหลือ {selectedStock.amount} {MEDICINE_UNIT_LABEL[selectedStock.unit] ?? selectedStock.unit})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">หมายเหตุ</label>
                <input type="text" value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  placeholder="หมายเหตุเพิ่มเติม..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-sm text-slate-800 dark:text-white" />
              </div>

              <p className="text-[10px] text-slate-400 text-center">
                * ระบบจะหักปริมาณปุ๋ยจากคลังสารเคมีอัตโนมัติเมื่อบันทึก
              </p>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <button onClick={() => setShowAddModal(false)} disabled={saving}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm disabled:opacity-50">
                ยกเลิก
              </button>
              <button onClick={handleAdd}
                disabled={saving || !form.stockId || !form.amount || Number(form.amount) <= 0}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Popup ประวัติการใส่ปุ๋ยของวันที่เลือก ── */}
      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-900/20 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-base text-emerald-700 dark:text-emerald-400">
                  {(() => {
                    const [y, m, d] = selectedDate.split('-').map(Number);
                    return `${d} ${THAI_MONTHS_FULL[m - 1]} ${y + 543}`;
                  })()}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ใส่ปุ๋ย {(recordsByDate.get(selectedDate) ?? []).length} ครั้ง
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-1.5 rounded-lg hover:bg-white/40 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {(recordsByDate.get(selectedDate) ?? []).length === 0 ? (
                <div className="text-center py-8">
                  <Leaf className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    ไม่มีการใส่ปุ๋ยในวันนี้
                  </p>
                </div>
              ) : (
                (recordsByDate.get(selectedDate) ?? []).map(r => (
                  <div key={r.id} className="bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{r.formulaName}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                          {GROWTH_STAGE_LABEL[r.stage] ?? r.stage}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('ลบบันทึกนี้?')) {
                            deleteFertilizerRecord(r.id).then(() => {
                              loadData();
                              setSelectedDate(null);
                            });
                          }
                        }}
                        className="text-slate-400 hover:text-red-500 flex-shrink-0 ml-2"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex justify-between text-xs bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                      <span className="text-slate-500 dark:text-slate-400">N-P-K</span>
                      <span className="text-slate-700 dark:text-slate-200 font-bold">{r.npk}</span>
                    </div>
                    <div className="flex justify-between text-xs bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                      <span className="text-slate-500 dark:text-slate-400">ปริมาณ</span>
                      <span className="text-slate-700 dark:text-slate-200 font-bold">
                        {r.amount} {MEDICINE_UNIT_LABEL[r.unit as MedicineUnit] ?? r.unit}
                      </span>
                    </div>
                    {r.note && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic px-1">
                        💬 {r.note}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSelectedDate(null)}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm"
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
