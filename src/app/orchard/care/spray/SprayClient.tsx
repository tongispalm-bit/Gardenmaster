'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards, addSprayRecord, getSprayRecords, deleteSprayRecord,
  getMedicineItems, getNutrientItems, deductFromStock,
  SPRAY_GROUP_LABEL, MEDICINE_UNIT_LABEL,
  isDurianFarm,
  type Orchard, type SprayRecord, type SprayMedicine, type SprayMedicineGroup,
  type MedicineItemRecord, type NutrientItemRecord,
} from '@/lib/firebase';
import { Bug, Plus, Trash2, ChevronLeft, ChevronRight, Sprout, FlaskConical, Leaf, X } from 'lucide-react';
import SubPageHeader from '../../_components/SubPageHeader';

type GroupMeta = {
  id: SprayMedicineGroup;
  label: string;
  Icon: typeof Bug;
  color: string;
};

const GROUP_META: GroupMeta[] = [
  { id: 'insecticide', label: 'ยาฆ่าแมลง', Icon: Bug,         color: 'rose' },
  { id: 'fungicide',   label: 'ยารา',     Icon: Sprout,      color: 'emerald' },
  { id: 'hormone',     label: 'ฮอร์โมน', Icon: FlaskConical, color: 'pink' },
  { id: 'fertilizer',  label: 'ปุ๋ย',     Icon: Leaf,        color: 'amber' },
];

// item จาก stock พร้อม group
type StockOption = {
  id: string;
  group: SprayMedicineGroup;
  name: string;
  unit: string;
  remain: number;
};

export default function SprayClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [records, setRecords] = useState<SprayRecord[]>([]);
  const [stocks, setStocks] = useState<StockOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // popup state
  const [showAddModal, setShowAddModal] = useState(false);

  // ปฏิทินประวัติ
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // medicines แยกเป็น 4 กลุ่ม
  type GroupedForm = Record<SprayMedicineGroup, SprayMedicine[]>;
  const emptyGroupedMeds: GroupedForm = {
    insecticide: [],
    fungicide: [],
    hormone: [],
    fertilizer: [],
  };

  const emptyForm = {
    date: new Date().toISOString().split('T')[0],
    purpose: '',
    pestDisease: '',
    medicines: emptyGroupedMeds,
    note: '',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!orchardId) { router.push('/'); return; }
    loadData();
  }, [orchardId]);

  const loadData = async () => {
    try {
      const [orchards, r, medItems, nutrItems] = await Promise.all([
        getOrchards(),
        getSprayRecords(orchardId),
        getMedicineItems(orchardId),
        getNutrientItems(orchardId),
      ]);
      setOrchard(orchards.find(o => o.id === orchardId) || null);
      setRecords(r);
      // รวมทั้ง 4 กลุ่มเข้าเป็น stocks
      const combined: StockOption[] = [
        ...medItems.map((m: MedicineItemRecord) => ({
          id: m.id,
          group: m.type as SprayMedicineGroup, // 'insecticide' | 'fungicide'
          name: m.name,
          unit: m.unit,
          remain: m.amount,
        })),
        ...nutrItems.map((n: NutrientItemRecord) => ({
          id: n.id,
          group: n.type as SprayMedicineGroup, // 'hormone' | 'fertilizer'
          name: n.name,
          unit: n.unit,
          remain: n.amount,
        })),
      ];
      setStocks(combined);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // stocks แยกตามกลุ่ม
  const stocksByGroup = useMemo(() => {
    const m: Record<SprayMedicineGroup, StockOption[]> = {
      insecticide: [], fungicide: [], hormone: [], fertilizer: [],
    };
    for (const s of stocks) {
      if (m[s.group]) m[s.group].push(s);
    }
    return m;
  }, [stocks]);

  // ── ข้อมูลปฏิทิน ──
  // map: 'YYYY-MM-DD' → SprayRecord[] ของวันนั้น
  const recordsByDate = useMemo(() => {
    const m = new Map<string, SprayRecord[]>();
    for (const r of records) {
      if (!r.date) continue;
      if (!m.has(r.date)) m.set(r.date, []);
      m.get(r.date)!.push(r);
    }
    return m;
  }, [records]);

  // grid ปฏิทินสำหรับเดือนที่เลือก
  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay(); // 0=อาทิตย์
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

  // จำนวนการพ่นในเดือนปัจจุบัน
  const monthSprayCount = useMemo(() => {
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

  const addMed = (group: SprayMedicineGroup) => {
    setForm(p => ({
      ...p,
      medicines: {
        ...p.medicines,
        [group]: [...p.medicines[group], { group, name: '', amount: '', unit: '', stockId: '' }],
      },
    }));
  };

  const removeMed = (group: SprayMedicineGroup, idx: number) => {
    setForm(p => ({
      ...p,
      medicines: {
        ...p.medicines,
        [group]: p.medicines[group].filter((_, i) => i !== idx),
      },
    }));
  };

  const updateMed = (group: SprayMedicineGroup, idx: number, patch: Partial<SprayMedicine>) => {
    setForm(p => {
      const list = [...p.medicines[group]];
      list[idx] = { ...list[idx], ...patch };
      return {
        ...p,
        medicines: { ...p.medicines, [group]: list },
      };
    });
  };

  // เลือกชื่อยาจาก dropdown → autofill unit + stockId
  const handleSelectStock = (group: SprayMedicineGroup, idx: number, stockId: string) => {
    if (!stockId) {
      updateMed(group, idx, { stockId: '', name: '', unit: '' });
      return;
    }
    const stock = stocks.find(s => s.id === stockId);
    if (stock) {
      updateMed(group, idx, {
        stockId: stock.id,
        name: stock.name,
        unit: stock.unit,
      });
    }
  };

  const allMedsFlat = (): SprayMedicine[] => {
    const out: SprayMedicine[] = [];
    for (const g of (Object.keys(form.medicines) as SprayMedicineGroup[])) {
      for (const m of form.medicines[g]) {
        if (m.name.trim()) out.push({ ...m, group: g });
      }
    }
    return out;
  };

  const handleAdd = async () => {
    if (!form.purpose) return;
    const meds = allMedsFlat();
    setSaving(true);
    try {
      // 1) บันทึก spray record
      await addSprayRecord({
        orchardId, date: form.date, purpose: form.purpose,
        pestDisease: form.pestDisease,
        medicines: meds,
        note: form.note,
        createdAt: Date.now(),
      });

      // 2) หักปริมาณจาก stock — เฉพาะรายการที่มี stockId
      const toDeduct = meds.filter(m => m.stockId && m.amount);
      if (toDeduct.length > 0) {
        const results = await deductFromStock(toDeduct);
        const failed = results.filter(r => !r.ok);
        if (failed.length > 0) {
          // eslint-disable-next-line no-console
          console.warn('[Spray] Some stock deductions failed:', failed);
        }
      }

      setForm({ ...emptyForm, medicines: { insecticide: [], fungicide: [], hormone: [], fertilizer: [] } });
      await loadData();
      setShowAddModal(false);
    } catch { alert('บันทึกไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  if (!orchard || loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-8">
      <SubPageHeader orchardName={orchard.name} orchardColor={orchard.color} orchardId={orchardId} isDurianBackyard={isDurianFarm(orchard.name)} title="พ่นยา" Icon={Bug} />

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">

        {/* ── ปุ่มเปิด popup บันทึกการพ่นยา ── */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 shadow-md"
        >
          <Plus size={18} /> บันทึกการพ่นยา
        </button>

        {/* ── ประวัติการพ่นยา (ปฏิทิน) ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header เดือน */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-orange-50 dark:bg-orange-900/20">
            <button onClick={goPrevMonth} className="p-1.5 rounded-lg hover:bg-white/40 text-orange-700 dark:text-orange-400">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <h2 className="font-bold text-sm text-orange-700 dark:text-orange-400">
                {THAI_MONTHS_FULL[calendarMonth.getMonth()]} {calendarMonth.getFullYear() + 543}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">พ่นยา {monthSprayCount} ครั้ง</p>
            </div>
            <button onClick={goNextMonth} className="p-1.5 rounded-lg hover:bg-white/40 text-orange-700 dark:text-orange-400">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d, i) => (
                <div key={i} className={`text-[11px] font-bold py-1 ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
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
                        ? 'bg-orange-200 dark:bg-orange-900/50 border-orange-500 ring-2 ring-orange-400 scale-105'
                        : hasData
                          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 font-bold'
                          : isToday
                            ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className={`text-[11px] font-bold ${
                      isSelected
                        ? 'text-orange-700 dark:text-orange-300'
                        : hasData
                          ? 'text-orange-700 dark:text-orange-400'
                          : dow === 0
                            ? 'text-rose-500'
                            : dow === 6
                              ? 'text-blue-500'
                              : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {day}
                    </span>
                    {cellRecords && (
                      <span className="text-[8px] font-bold leading-none mt-0.5 text-orange-600 dark:text-orange-400">
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

      {/* ── Popup: บันทึกการพ่นยา ── */}
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
                <Bug size={18} /> บันทึกการพ่นยา
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">วันที่</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-orange-500 text-sm text-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ชื่อโรค / แมลง</label>
                  <input type="text" value={form.pestDisease} onChange={e => setForm({ ...form, pestDisease: e.target.value })}
                    placeholder="เช่น ราน้ำค้าง, เพลี้ย"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-orange-500 text-sm text-slate-800 dark:text-white" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">วัตถุประสงค์ <span className="text-red-500">*</span></label>
                <input type="text" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })}
                  placeholder="เช่น ป้องกันราน้ำค้าง + เพิ่มธาตุอาหาร"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-orange-500 text-sm text-slate-800 dark:text-white" />
              </div>

              {GROUP_META.map(meta => {
                const Icon = meta.Icon;
                const list = form.medicines[meta.id];
                const stockOptions = stocksByGroup[meta.id];
                return (
                  <div key={meta.id} className={`rounded-xl border bg-${meta.color}-50/50 dark:bg-${meta.color}-900/10 border-${meta.color}-200 dark:border-${meta.color}-800 p-3 space-y-2`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-${meta.color}-100 dark:bg-${meta.color}-900/30 text-${meta.color}-600 dark:text-${meta.color}-400`}>
                          <Icon size={14} />
                        </div>
                        <span className={`text-xs font-bold text-${meta.color}-700 dark:text-${meta.color}-400`}>
                          รายการยาที่ใช้ ({meta.label})
                        </span>
                      </div>
                      <button onClick={() => addMed(meta.id)} className={`text-xs text-${meta.color}-600 dark:text-${meta.color}-400 font-bold flex items-center gap-1`}>
                        <Plus size={12} /> เพิ่ม
                      </button>
                    </div>

                    {list.length === 0 && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 italic text-center py-1">— ยังไม่มี —</p>
                    )}

                    {list.map((m, i) => (
                      <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-2 space-y-1.5 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-1.5">
                          <select value={m.stockId ?? ''}
                            onChange={e => handleSelectStock(meta.id, i, e.target.value)}
                            className={`flex-1 min-w-0 p-2 bg-slate-50 dark:bg-slate-700 rounded-lg outline-none focus:ring-2 ring-${meta.color}-500 text-xs text-slate-800 dark:text-white`}>
                            <option value="">-- เลือกชื่อยา --</option>
                            {stockOptions.length === 0 ? (
                              <option disabled>(ไม่มีในคลัง — เพิ่มก่อนใน {meta.label})</option>
                            ) : (
                              stockOptions.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name} (เหลือ {s.remain} {MEDICINE_UNIT_LABEL[s.unit as keyof typeof MEDICINE_UNIT_LABEL] ?? s.unit})
                                </option>
                              ))
                            )}
                          </select>
                          <button onClick={() => removeMed(meta.id, i)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <input type="number" inputMode="decimal" min="0" step="0.01"
                            value={m.amount}
                            onChange={e => updateMed(meta.id, i, { amount: e.target.value })}
                            placeholder="ปริมาณที่ใช้"
                            className={`p-2 bg-slate-50 dark:bg-slate-700 rounded-lg outline-none focus:ring-2 ring-${meta.color}-500 text-xs text-slate-800 dark:text-white`} />
                          <input type="text"
                            value={m.unit ? (MEDICINE_UNIT_LABEL[m.unit as keyof typeof MEDICINE_UNIT_LABEL] ?? m.unit) : ''}
                            readOnly placeholder="หน่วย"
                            className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg outline-none text-xs text-slate-600 dark:text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">หมายเหตุ</label>
                <input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
                  placeholder="หมายเหตุเพิ่มเติม..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-orange-500 text-sm text-slate-800 dark:text-white" />
              </div>

              <p className="text-[10px] text-slate-400 text-center">
                * ระบบจะหักปริมาณจากคลังสารเคมีอัตโนมัติเมื่อบันทึก
              </p>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <button onClick={() => setShowAddModal(false)} disabled={saving}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm disabled:opacity-50">
                ยกเลิก
              </button>
              <button onClick={handleAdd} disabled={saving || !form.purpose}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Popup ประวัติการพ่นยาของวันที่เลือก ── */}
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
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-orange-50 dark:bg-orange-900/20 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-base text-orange-700 dark:text-orange-400">
                  {(() => {
                    const [y, m, d] = selectedDate.split('-').map(Number);
                    return `${d} ${THAI_MONTHS_FULL[m - 1]} ${y + 543}`;
                  })()}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  พ่นยา {(recordsByDate.get(selectedDate) ?? []).length} ครั้ง
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
                  <Bug className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    ไม่มีการพ่นยาในวันนี้
                  </p>
                </div>
              ) : (
                (recordsByDate.get(selectedDate) ?? []).map(r => (
                  <div key={r.id} className="bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{r.purpose}</p>
                      {r.pestDisease && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{r.pestDisease}</p>
                      )}
                    </div>

                    {/* group by group */}
                    {GROUP_META.map(meta => {
                      const items = r.medicines.filter(m => m.group === meta.id);
                      if (items.length === 0) return null;
                      return (
                        <div key={meta.id} className="space-y-1">
                          <p className={`text-[10px] font-bold text-${meta.color}-600 dark:text-${meta.color}-400`}>
                            {SPRAY_GROUP_LABEL[meta.id]}
                          </p>
                          {items.map((m, i) => (
                            <div key={i} className="flex justify-between text-xs bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                              <span className="text-slate-700 dark:text-slate-200">{m.name}</span>
                              <span className="text-slate-500 dark:text-slate-400">
                                {m.amount} {MEDICINE_UNIT_LABEL[m.unit as keyof typeof MEDICINE_UNIT_LABEL] ?? m.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {/* รายการเก่าที่ไม่มี group */}
                    {(() => {
                      const legacy = r.medicines.filter(m => !m.group);
                      if (legacy.length === 0) return null;
                      return (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-500">รายการเก่า</p>
                          {legacy.map((m, i) => (
                            <div key={i} className="flex justify-between text-xs bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                              <span className="text-slate-700 dark:text-slate-200">{m.name}</span>
                              <span className="text-slate-500 dark:text-slate-400">{m.amount} {m.unit}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {r.note && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">{r.note}</p>
                    )}

                    <button
                      onClick={() => {
                        if (confirm('ลบบันทึกนี้?')) {
                          deleteSprayRecord(r.id).then(() => {
                            loadData();
                            setSelectedDate(null);
                          });
                        }
                      }}
                      className="text-xs text-red-500 font-bold"
                    >
                      🗑️ ลบ
                    </button>
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
