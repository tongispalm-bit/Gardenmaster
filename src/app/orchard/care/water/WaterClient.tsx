'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards, getWaterSetting, saveWaterSetting,
  addWaterRecord, getWaterRecords, deleteWaterRecord,
  addStressPeriod, getStressPeriods, deleteStressPeriod,
  subscribeOrchard, subscribeCollection,
  DURIAN_GROWTH_STAGE_LABEL,
  isDurianFarm,
  type Orchard, type WaterSetting, type WaterRecord, type DurianGrowthStage,
  type StressPeriod,
} from '@/lib/firebase';
import { Droplets, Trash2, ChevronLeft, ChevronRight, X, Plus, Settings, AlertTriangle } from 'lucide-react';
import SubPageHeader from '../../_components/SubPageHeader';

const THAI_MONTHS_FULL = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
];

/** แสดงเวลาแบบอ่านง่าย: <1 ชม. → นาที, ตัวเลขกลม → ไม่มีทศนิยม, ที่เหลือ → 1 ตำแหน่ง */
function formatHours(h: number): string {
  if (!h || h <= 0) return '0';
  if (h < 1) return `${Math.round(h * 60)}น.`;
  // แสดงเป็นชั่วโมง
  const isWhole = Math.abs(h - Math.round(h)) < 0.05;
  return `${isWhole ? Math.round(h) : h.toFixed(1)}ชม.`;
}

export default function WaterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [setting, setSetting] = useState<WaterSetting | null>(null);
  const [records, setRecords] = useState<WaterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSetting, setSavingSetting] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [settingDirty, setSettingDirty] = useState(false);

  // popup state
  const [showSettingModal, setShowSettingModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStressModal, setShowStressModal] = useState(false);

  // stress periods
  const [stressPeriods, setStressPeriods] = useState<StressPeriod[]>([]);
  const [stressForm, setStressForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    note: '',
  });
  const [savingStress, setSavingStress] = useState(false);

  // ปฏิทิน
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [settingForm, setSettingForm] = useState({ flowRate: '', headCount: '' });
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    duration: '',
    durationUnit: 'hour' as 'minute' | 'hour',
    zone: 'all' as 'all' | 'A' | 'B',
    growthStage: 'post_harvest' as DurianGrowthStage,
  });

  useEffect(() => {
    if (!orchardId) { router.push('/'); return; }

    // Subscribe realtime
    const unsubs: Array<() => void> = [
      subscribeOrchard(orchardId, setOrchard),
      subscribeCollection<WaterRecord>('waterRecords', orchardId, (items) => {
        setRecords([...items].sort((a, b) => b.createdAt - a.createdAt));
      }),
      subscribeCollection<StressPeriod>('stressPeriods', orchardId, (items) => {
        setStressPeriods([...items].sort((a, b) => b.createdAt - a.createdAt));
      }),
    ];

    // Water setting (1 doc/orchard) — โหลดครั้งแรกเท่านั้น (เพื่อไม่ overwrite settingForm ตอน user แก้)
    getWaterSetting(orchardId).then((s) => {
      setSetting(s);
      if (s) setSettingForm({ flowRate: String(s.flowRate), headCount: String(s.headCount) });
    });

    setLoading(false);
    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orchardId]);

  const loadData = async () => {
    try {
      const [orchards, s, r, sp] = await Promise.all([
        getOrchards(), getWaterSetting(orchardId), getWaterRecords(orchardId), getStressPeriods(orchardId),
      ]);
      setOrchard(orchards.find(o => o.id === orchardId) || null);
      setSetting(s);
      if (s) {
        setSettingForm({ flowRate: String(s.flowRate), headCount: String(s.headCount) });
      }
      setRecords(r);
      setStressPeriods(sp);
      setSettingDirty(false);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSaveStress = async () => {
    if (!stressForm.startDate || !stressForm.endDate) return;
    if (stressForm.startDate > stressForm.endDate) {
      alert('วันที่เริ่มต้นต้องมาก่อนวันที่สิ้นสุด');
      return;
    }
    setSavingStress(true);
    try {
      await addStressPeriod({
        orchardId,
        startDate: stressForm.startDate,
        endDate: stressForm.endDate,
        note: stressForm.note,
        createdAt: Date.now(),
      });
      setStressForm({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        note: '',
      });
      await loadData();
      setShowStressModal(false);
    } catch { alert('บันทึกไม่สำเร็จ'); }
    finally { setSavingStress(false); }
  };

  const handleSaveSetting = async () => {
    const fr = Number(settingForm.flowRate);
    const hc = Number(settingForm.headCount);
    if (!fr || !hc) return;
    setSavingSetting(true);
    try {
      await saveWaterSetting(orchardId, { flowRate: fr, headCount: hc });
      await loadData();
      setShowSettingModal(false);
    } catch { alert('บันทึกไม่สำเร็จ'); }
    finally { setSavingSetting(false); }
  };

  // คำนวณปริมาณน้ำ
  const flowRate = Number(settingForm.flowRate) || 0;
  const headCount = Number(settingForm.headCount) || 0;
  const durationVal = Number(form.duration) || 0;
  // แปลงเป็นชั่วโมงเสมอเพื่อบันทึก
  const hours = form.durationUnit === 'minute' ? durationVal / 60 : durationVal;
  const liters = flowRate * headCount * hours;

  const handleAdd = async () => {
    if (!durationVal || !flowRate || !headCount) return;
    setSavingRecord(true);
    try {
      await addWaterRecord({
        orchardId,
        date: form.date,
        minutes: hours,
        liters,
        growthStage: form.growthStage,
        zone: form.zone,
        createdAt: Date.now(),
      });
      setForm({
        date: new Date().toISOString().split('T')[0],
        duration: '',
        durationUnit: form.durationUnit,
        zone: form.zone,
        growthStage: 'post_harvest',
      });
      await loadData();
      setShowAddModal(false);
    } catch { alert('บันทึกไม่สำเร็จ'); }
    finally { setSavingRecord(false); }
  };

  // ── ข้อมูลปฏิทิน ──
  const recordsByDate = useMemo(() => {
    const m = new Map<string, WaterRecord[]>();
    for (const r of records) {
      if (!r.date) continue;
      if (!m.has(r.date)) m.set(r.date, []);
      m.get(r.date)!.push(r);
    }
    return m;
  }, [records]);

  // เช็คว่าวันที่ (YYYY-MM-DD) อยู่ใน stress period ไหม
  const isInStressPeriod = (dateKey: string): boolean => {
    return stressPeriods.some(p => dateKey >= p.startDate && dateKey <= p.endDate);
  };

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

  const monthLiters = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    let sum = 0;
    for (const r of records) {
      if (!r.date) continue;
      const [y, m] = r.date.split('-').map(Number);
      if (y === year && m - 1 === month) sum += r.liters || 0;
    }
    return sum;
  }, [records, calendarMonth]);

  const goPrevMonth = () => { setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelectedDate(null); };
  const goNextMonth = () => { setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelectedDate(null); };

  if (!orchard || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isDurianBackyard = isDurianFarm(orchard.name);
  const settingReady = flowRate > 0 && headCount > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-8 overflow-x-hidden">
      <SubPageHeader
        orchardName={orchard.name}
        orchardColor={orchard.color}
        orchardId={orchardId}
        isDurianBackyard={isDurianBackyard}
        title="รดน้ำ"
        Icon={Droplets}
      />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* ── ปุ่มลอย: เปิด popup ── */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettingModal(true)}
            className="flex-1 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5"
          >
            <Settings size={16} /> ตั้งค่าหัวน้ำ
          </button>
          <button
            onClick={() => settingReady && setShowAddModal(true)}
            disabled={!settingReady}
            className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
          >
            <Plus size={16} /> บันทึกการรดน้ำ
          </button>
        </div>

        {/* ปุ่มระยะกักโศก */}
        <button
          onClick={() => setShowStressModal(true)}
          className="w-full py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
        >
          <AlertTriangle size={16} /> ระยะกักโศก
          {stressPeriods.length > 0 && (
            <span className="text-[10px] bg-red-200 dark:bg-red-900/60 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full">
              {stressPeriods.length} ช่วง
            </span>
          )}
        </button>

        {!settingReady && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 text-xs text-amber-700 dark:text-amber-400 text-center">
            ⚠️ กรุณาตั้งค่าหัวน้ำก่อนบันทึกการรดน้ำ
          </div>
        )}

        {/* ── ส่วนที่ 3: ปฏิทินประวัติ ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20">
            <button onClick={goPrevMonth} className="p-1.5 rounded-lg hover:bg-white/40 text-blue-700 dark:text-blue-400">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <h2 className="font-bold text-sm text-blue-700 dark:text-blue-400">
                {THAI_MONTHS_FULL[calendarMonth.getMonth()]} {calendarMonth.getFullYear() + 543}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                รดน้ำ {monthCount} ครั้ง · {monthLiters.toLocaleString()} ล.
              </p>
            </div>
            <button onClick={goNextMonth} className="p-1.5 rounded-lg hover:bg-white/40 text-blue-700 dark:text-blue-400">
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
                const inStress = isInStressPeriod(key);

                // รวมปริมาณ + เวลาของวันนั้น
                const totalLiters = hasData ? cellRecords!.reduce((s, r) => s + (r.liters || 0), 0) : 0;
                const totalMinutes = hasData ? cellRecords!.reduce((s, r) => s + (r.minutes || 0), 0) : 0;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedDate(isSelected ? null : key)}
                    className={`relative aspect-square rounded-lg border flex flex-col items-center justify-center text-[10px] p-0.5 transition-all cursor-pointer hover:scale-105 ${
                      isSelected
                        ? 'bg-blue-200 dark:bg-blue-900/50 border-blue-500 ring-2 ring-blue-400 scale-105'
                        : inStress
                          ? 'bg-red-100 dark:bg-red-900/40 border-red-400 dark:border-red-700'
                          : hasData
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                            : isToday
                              ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {/* ไอคอนหยดน้ำมุมซ้ายบน */}
                    {hasData && (
                      <Droplets
                        size={10}
                        className="absolute top-0.5 left-0.5 text-blue-500 dark:text-blue-400"
                        fill="currentColor"
                      />
                    )}

                    {/* ไอคอนระยะกักโศกมุมขวาบน */}
                    {inStress && (
                      <span
                        className="absolute top-0.5 right-0.5 text-[8px] leading-none"
                        title="ระยะกักโศก"
                      >
                        🚫
                      </span>
                    )}

                    {/* ตัวเลขวันที่ */}
                    <span className={`text-[11px] font-bold leading-none ${
                      isSelected
                        ? 'text-blue-700 dark:text-blue-300'
                        : inStress
                          ? 'text-red-700 dark:text-red-300'
                          : hasData
                            ? 'text-blue-700 dark:text-blue-400'
                            : dow === 0
                              ? 'text-rose-500'
                              : dow === 6
                                ? 'text-blue-500'
                                : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {day}
                    </span>

                    {/* ปริมาณน้ำ + เวลา ใต้ตัวเลข */}
                    {hasData && (
                      <div className="flex flex-col items-center leading-none mt-0.5">
                        <span className="text-[7px] font-bold text-blue-600 dark:text-blue-400">
                          {totalLiters >= 1000
                            ? `${(totalLiters / 1000).toFixed(1)}k`
                            : totalLiters.toLocaleString()}ล.
                        </span>
                        <span className="text-[7px] text-blue-500/80 dark:text-blue-400/80 mt-0.5">
                          {formatHours(totalMinutes)}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Popup: ตั้งค่าหัวน้ำ ── */}
      {showSettingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowSettingModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-t-2xl">
              <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <Settings size={18} /> ตั้งค่าหัวน้ำ
              </h3>
              <button
                onClick={() => setShowSettingModal(false)}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    อัตราไหล (ล./ชั่วโมง/หัว)
                  </label>
                  <input
                    type="number" inputMode="decimal" min={0} step={0.1}
                    value={settingForm.flowRate}
                    onChange={e => { setSettingForm({ ...settingForm, flowRate: e.target.value }); setSettingDirty(true); }}
                    placeholder="เช่น 120"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-sm text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    จำนวนหัวน้ำ
                  </label>
                  <input
                    type="number" inputMode="numeric" min={1}
                    value={settingForm.headCount}
                    onChange={e => { setSettingForm({ ...settingForm, headCount: e.target.value }); setSettingDirty(true); }}
                    placeholder="เช่น 4"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-sm text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {settingReady && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                  ปริมาณน้ำ = {flowRate} × {headCount} × เวลา (ชม.) = <strong>{(flowRate * headCount).toFixed(0)} ล./ชม.</strong>
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <button
                onClick={() => setShowSettingModal(false)}
                disabled={savingSetting}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveSetting}
                disabled={savingSetting || !settingForm.flowRate || !settingForm.headCount}
                className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm"
              >
                {savingSetting ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Popup: ระยะกักโศก ── */}
      {showStressModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowStressModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-red-50 dark:bg-red-900/20 rounded-t-2xl">
              <h3 className="font-bold text-base text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle size={18} /> ระยะกักโศก
              </h3>
              <button
                onClick={() => setShowStressModal(false)}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                กักโศก = งดน้ำเพื่อกระตุ้นการออกดอก ช่วงวันที่ที่เลือกจะแสดงพื้นหลังสีแดงในปฏิทิน
              </p>

              {/* ฟอร์มเพิ่มช่วงใหม่ */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">เพิ่มช่วงใหม่</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">เริ่มต้น</label>
                    <input
                      type="date"
                      value={stressForm.startDate}
                      onChange={e => setStressForm({ ...stressForm, startDate: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-slate-600 rounded-lg outline-none focus:ring-2 ring-red-500 text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">สิ้นสุด</label>
                    <input
                      type="date"
                      value={stressForm.endDate}
                      onChange={e => setStressForm({ ...stressForm, endDate: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-slate-600 rounded-lg outline-none focus:ring-2 ring-red-500 text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  value={stressForm.note}
                  onChange={e => setStressForm({ ...stressForm, note: e.target.value })}
                  placeholder="หมายเหตุ (ไม่บังคับ)"
                  className="w-full p-2.5 bg-white dark:bg-slate-600 rounded-lg outline-none focus:ring-2 ring-red-500 text-xs text-slate-800 dark:text-white"
                />
                <button
                  onClick={handleSaveStress}
                  disabled={savingStress || !stressForm.startDate || !stressForm.endDate}
                  className="w-full py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg font-bold text-xs"
                >
                  {savingStress ? 'กำลังบันทึก...' : '+ เพิ่มช่วงกักโศก'}
                </button>
              </div>

              {/* รายการช่วงปัจจุบัน */}
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                  ช่วงที่บันทึกไว้ ({stressPeriods.length})
                </p>
                {stressPeriods.length === 0 ? (
                  <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-4">
                    ยังไม่มีช่วงกักโศก
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {stressPeriods.map(p => (
                      <div key={p.id} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-red-700 dark:text-red-400">
                            {p.startDate} → {p.endDate}
                          </p>
                          {p.note && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              {p.note}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            if (!confirm('ลบช่วงนี้?')) return;
                            await deleteStressPeriod(p.id);
                            await loadData();
                          }}
                          className="text-slate-400 hover:text-red-500 flex-shrink-0 ml-2"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowStressModal(false)}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Popup: บันทึกการรดน้ำ ── */}
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
                <Droplets size={18} fill="currentColor" /> บันทึกการรดน้ำ
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">วันที่</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-sm text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">เวลาที่ใช้</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number" inputMode="decimal" min={0} step={form.durationUnit === 'minute' ? 1 : 0.5}
                      value={form.duration}
                      onChange={e => setForm({ ...form, duration: e.target.value })}
                      placeholder={form.durationUnit === 'minute' ? 'เช่น 30' : 'เช่น 1.5'}
                      className="flex-1 min-w-0 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-sm text-slate-800 dark:text-white"
                    />
                    <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-0.5">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, durationUnit: 'minute' })}
                        className={`px-2.5 text-xs font-bold rounded-lg transition-all ${
                          form.durationUnit === 'minute'
                            ? 'bg-blue-500 text-white shadow'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        นาที
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, durationUnit: 'hour' })}
                        className={`px-2.5 text-xs font-bold rounded-lg transition-all ${
                          form.durationUnit === 'hour'
                            ? 'bg-blue-500 text-white shadow'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        ชม.
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">โซนที่รด</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button type="button" onClick={() => setForm({ ...form, zone: 'all' })}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                      form.zone === 'all' ? 'bg-blue-500 text-white shadow ring-2 ring-blue-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>
                    ทั้งสวน
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, zone: 'A' })}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                      form.zone === 'A' ? 'bg-violet-500 text-white shadow ring-2 ring-violet-300' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
                    }`}>
                    โซน A
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, zone: 'B' })}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                      form.zone === 'B' ? 'bg-cyan-500 text-white shadow ring-2 ring-cyan-300' : 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400'
                    }`}>
                    โซน B
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ระยะการเจริญเติบโต</label>
                <select value={form.growthStage}
                  onChange={e => setForm({ ...form, growthStage: e.target.value as DurianGrowthStage })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-sm text-slate-800 dark:text-white">
                  {Object.entries(DURIAN_GROWTH_STAGE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">ปริมาณน้ำ (คำนวณอัตโนมัติ)</span>
                <span className="font-extrabold text-blue-600 dark:text-blue-400 text-xl">
                  {liters > 0 ? liters.toLocaleString() : '—'} <span className="text-sm font-bold">ลิตร</span>
                </span>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={savingRecord}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAdd}
                disabled={savingRecord || !form.duration}
                className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm"
              >
                {savingRecord ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Popup ประวัติการรดน้ำของวันที่เลือก ── */}
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
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-base text-blue-700 dark:text-blue-400">
                  {(() => {
                    const [y, m, d] = selectedDate.split('-').map(Number);
                    return `${d} ${THAI_MONTHS_FULL[m - 1]} ${y + 543}`;
                  })()}
                </h3>
                {(() => {
                  const list = recordsByDate.get(selectedDate) ?? [];
                  const ttlL = list.reduce((s, r) => s + (r.liters || 0), 0);
                  const ttlH = list.reduce((s, r) => s + (r.minutes || 0), 0);
                  return (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      รดน้ำ {list.length} ครั้ง · {ttlL.toLocaleString()} ล. · {formatHours(ttlH)}
                    </p>
                  );
                })()}
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
                  <Droplets className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    ไม่มีการรดน้ำในวันนี้
                  </p>
                </div>
              ) : (
                (recordsByDate.get(selectedDate) ?? []).map(r => (
                  <div key={r.id} className="bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Droplets size={16} className="text-blue-500 dark:text-blue-400" fill="currentColor" />
                          <p className="text-sm font-bold text-slate-800 dark:text-white">
                            {r.liters.toLocaleString()} ลิตร
                          </p>
                          {r.zone && r.zone !== 'all' && (
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                              r.zone === 'A' ? 'bg-violet-500 text-white' : 'bg-cyan-500 text-white'
                            }`}>
                              โซน {r.zone}
                            </span>
                          )}
                          {r.zone === 'all' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300">
                              ทั้งสวน
                            </span>
                          )}
                        </div>
                        {r.growthStage && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">
                            {DURIAN_GROWTH_STAGE_LABEL[r.growthStage] ?? r.growthStage}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('ลบรายการนี้?')) {
                            deleteWaterRecord(r.id).then(() => {
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
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex justify-between text-xs bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                        <span className="text-slate-500 dark:text-slate-400">เวลา</span>
                        <span className="text-slate-700 dark:text-slate-200 font-bold">
                          {formatHours(r.minutes)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                        <span className="text-slate-500 dark:text-slate-400">ปริมาณ</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          {r.liters.toLocaleString()} ล.
                        </span>
                      </div>
                    </div>
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
