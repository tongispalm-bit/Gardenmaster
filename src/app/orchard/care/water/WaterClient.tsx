'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards, getWaterSetting, saveWaterSetting,
  addWaterRecord, getWaterRecords, deleteWaterRecord,
  DURIAN_GROWTH_STAGE_LABEL,
  type Orchard, type WaterSetting, type WaterRecord, type DurianGrowthStage,
} from '@/lib/firebase';
import { Droplets, Trash2 } from 'lucide-react';
import SubPageHeader from '../../_components/SubPageHeader';

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

  const [settingForm, setSettingForm] = useState({ flowRate: '', headCount: '' });
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    minutes: '',
    growthStage: 'post_harvest' as DurianGrowthStage,
  });

  useEffect(() => {
    if (!orchardId) { router.push('/'); return; }
    loadData();
  }, [orchardId]);

  const loadData = async () => {
    try {
      const [orchards, s, r] = await Promise.all([
        getOrchards(), getWaterSetting(orchardId), getWaterRecords(orchardId),
      ]);
      setOrchard(orchards.find(o => o.id === orchardId) || null);
      setSetting(s);
      if (s) {
        setSettingForm({ flowRate: String(s.flowRate), headCount: String(s.headCount) });
      }
      setRecords(r);
      setSettingDirty(false);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSaveSetting = async () => {
    const fr = Number(settingForm.flowRate);
    const hc = Number(settingForm.headCount);
    if (!fr || !hc) return;
    setSavingSetting(true);
    try {
      await saveWaterSetting(orchardId, { flowRate: fr, headCount: hc });
      await loadData();
    } catch { alert('บันทึกไม่สำเร็จ'); }
    finally { setSavingSetting(false); }
  };

  // คำนวณปริมาณน้ำ (flowRate หน่วย ล./ชม. × จำนวนหัว × เวลา ชั่วโมง)
  const flowRate = Number(settingForm.flowRate) || 0;
  const headCount = Number(settingForm.headCount) || 0;
  const minutes = Number(form.minutes) || 0;
  const liters = flowRate * headCount * minutes;

  const handleAdd = async () => {
    if (!minutes || !flowRate || !headCount) return;
    setSavingRecord(true);
    try {
      await addWaterRecord({
        orchardId,
        date: form.date,
        minutes,
        liters,
        growthStage: form.growthStage,
        createdAt: Date.now(),
      });
      setForm({ date: new Date().toISOString().split('T')[0], minutes: '', growthStage: 'post_harvest' });
      await loadData();
    } catch { alert('บันทึกไม่สำเร็จ'); }
    finally { setSavingRecord(false); }
  };

  if (!orchard || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isDurianBackyard = orchard.name === 'ทุเรียนหลังบ้าน';
  const settingReady = flowRate > 0 && headCount > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-8">
      <SubPageHeader
        orchardName={orchard.name}
        orchardColor={orchard.color}
        orchardId={orchardId}
        isDurianBackyard={isDurianBackyard}
        title="รดน้ำ"
        Icon={Droplets}
      />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* ── ส่วนที่ 1: ตั้งค่าหัวน้ำ ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-bold text-sm text-slate-800 dark:text-white">⚙️ ตั้งค่าหัวน้ำ</h2>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">ตั้งครั้งเดียว</span>
          </div>
          <div className="p-4 space-y-3">
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

            {/* สูตรคำนวณ */}
            {settingReady && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                ปริมาณน้ำ = {flowRate} × {headCount} × เวลา (ชม.) = <strong>{(flowRate * headCount).toFixed(0)} ล./ชม.</strong>
              </div>
            )}

            {settingDirty && (
              <button
                onClick={handleSaveSetting}
                disabled={savingSetting || !settingForm.flowRate || !settingForm.headCount}
                className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all"
              >
                {savingSetting ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
              </button>
            )}
          </div>
        </div>

        {/* ── ส่วนที่ 2: บันทึกการรดน้ำ ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-bold text-sm text-blue-700 dark:text-blue-400">💧 บันทึกการรดน้ำ</h2>
          </div>
          <div className="p-4 space-y-3">
            {!settingReady ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">
                กรุณาตั้งค่าหัวน้ำด้านบนก่อน
              </p>
            ) : (
              <>
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
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">เวลาที่ใช้ (ชั่วโมง)</label>
                    <input
                      type="number" inputMode="decimal" min={0} step={0.5}
                      value={form.minutes}
                      onChange={e => setForm({ ...form, minutes: e.target.value })}
                      placeholder="เช่น 1.5"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-sm text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* ระยะการเจริญเติบโต */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ระยะการเจริญเติบโต</label>
                  <select
                    value={form.growthStage}
                    onChange={e => setForm({ ...form, growthStage: e.target.value as DurianGrowthStage })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-blue-500 text-sm text-slate-800 dark:text-white"
                  >
                    {Object.entries(DURIAN_GROWTH_STAGE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* ปริมาณน้ำ auto */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 flex items-center justify-between">                  <span className="text-sm text-slate-600 dark:text-slate-300">ปริมาณน้ำ (คำนวณอัตโนมัติ)</span>
                  <span className="font-extrabold text-blue-600 dark:text-blue-400 text-xl">
                    {liters > 0 ? liters.toLocaleString() : '—'} <span className="text-sm font-bold">ลิตร</span>
                  </span>
                </div>

                <button
                  onClick={handleAdd}
                  disabled={savingRecord || !form.minutes}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all"
                >
                  {savingRecord ? 'กำลังบันทึก...' : 'บันทึกการรดน้ำ'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── ส่วนที่ 3: ประวัติ ── */}
        <div>
          <h2 className="font-bold text-sm text-slate-800 dark:text-white mb-2">
            📋 ประวัติการรดน้ำ
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">({records.length} ครั้ง)</span>
          </h2>

          {records.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 text-sm py-6">ยังไม่มีบันทึก</p>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[1fr_44px_68px_28px] px-3 py-2 bg-slate-50 dark:bg-slate-700/50">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">วันที่ · ระยะ</span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center">ชม.</span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-right">ปริมาณ</span>
                <span></span>
              </div>
              {/* Rows */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {records.map(r => (
                  <div key={r.id} className="grid grid-cols-[1fr_44px_68px_28px] px-3 py-2.5 items-center">
                    <div>
                      <span className="text-xs text-slate-700 dark:text-slate-200 block">{r.date}</span>
                      {r.growthStage && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-tight">
                          {DURIAN_GROWTH_STAGE_LABEL[r.growthStage] ?? r.growthStage}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-center text-slate-700 dark:text-slate-200">{r.minutes}</span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 text-right">
                      {r.liters.toLocaleString()} ล.
                    </span>
                    <button
                      onClick={() => { if (confirm('ลบรายการนี้?')) deleteWaterRecord(r.id).then(loadData); }}
                      className="text-slate-400 hover:text-red-500 flex justify-center"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
