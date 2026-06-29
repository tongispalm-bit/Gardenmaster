'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards,
  getTreeProfiles,
  addDurianFruitRecord,
  getDurianFruitRecords,
  deleteDurianFruitRecord,
  getFarmMapConfig,
  isDurianFarm,
  type Orchard,
  type TreeProfile,
  type DurianFruitRecord,
} from '@/lib/firebase';
import { Sprout, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import SubPageHeader from '../../_components/SubPageHeader';
import FarmMapGrid from '../../_components/FarmMapGrid';
import { useHarvestYear } from '@/lib/useHarvestYear';

// ทุเรียนใช้เวลา 100 วันจากปัดดอกถึงแก่
const DAYS_TO_HARVEST = 100;

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ── หาปี พ.ศ. ของบันทึก (รองรับข้อมูลเก่าที่ไม่มี field year) ──
function recordYear(r: DurianFruitRecord): number {
  if (r.year) return r.year;
  const ce = new Date(r.pollinationDate).getFullYear();
  return ce + 543;
}

export default function DurianFruitClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';
  const { year: selectedYear } = useHarvestYear(orchardId);

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [trees, setTrees] = useState<TreeProfile[]>([]);
  const [records, setRecords] = useState<DurianFruitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedTree, setExpandedTree] = useState<string | null>(null);

  // ── ผังสวน config (ตรงกับหน้า farm-map) ──
  const [mapRows, setMapRows] = useState(11);
  const [mapCols, setMapCols] = useState(9);
  const [blockedCells, setBlockedCells] = useState<Set<string>>(
    new Set(['1,1', '1,2', '1,3', '1,4', '1,5', '1,6', '1,7', '1,8'])
  );

  // Multi-select trees
  const [selectedTreeIds, setSelectedTreeIds] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    batch: 'รุ่นที่ 1',
    pollinationDate: new Date().toISOString().split('T')[0],
    note: '',
  });

  useEffect(() => {
    if (!orchardId) { router.push('/'); return; }
    loadData();
  }, [orchardId]);

  const loadData = async () => {
    try {
      const [orchards, treeData, recordData, cfg] = await Promise.all([
        getOrchards(),
        getTreeProfiles(orchardId),
        getDurianFruitRecords(orchardId),
        getFarmMapConfig(orchardId),
      ]);
      setOrchard(orchards.find(o => o.id === orchardId) || null);
      setTrees(treeData);
      setRecords(recordData);
      if (cfg) {
        setMapRows(cfg.rows);
        setMapCols(cfg.cols);
        setBlockedCells(new Set(cfg.blockedCells));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleToggleTree = (t: TreeProfile) => {
    setSelectedTreeIds(prev => {
      const next = new Set(prev);
      if (next.has(t.id)) next.delete(t.id);
      else next.add(t.id);
      return next;
    });
  };

  const selectedTrees = trees.filter(t => selectedTreeIds.has(t.id));

  const expectedHarvestDate = form.pollinationDate
    ? addDays(form.pollinationDate, DAYS_TO_HARVEST)
    : '';

  const handleAdd = async () => {
    if (selectedTreeIds.size === 0 || !form.pollinationDate) return;
    setSaving(true);
    try {
      for (const t of selectedTrees) {
        await addDurianFruitRecord({
          orchardId,
          treeId: t.id,
          treeNumber: t.treeNumber,
          batch: form.batch,
          pollinationDate: form.pollinationDate,
          expectedHarvestDate,
          year: selectedYear,
          note: form.note,
          createdAt: Date.now(),
        });
      }
      setSelectedTreeIds(new Set());
      setForm({ batch: 'รุ่นที่ 1', pollinationDate: new Date().toISOString().split('T')[0], note: '' });
      await loadData();
    } catch { alert('บันทึกไม่สำเร็จ!'); }
    finally { setSaving(false); }
  };

  // ── กรองเฉพาะบันทึกของปีที่เลือก (รอบการเก็บเกี่ยว) ──
  const yearRecords = useMemo(
    () => records.filter(r => recordYear(r) === selectedYear),
    [records, selectedYear]
  );

  // จัดกลุ่มตามต้น (เฉพาะปีที่เลือก)
  const byTree = useMemo(() => {
    const map: Record<string, DurianFruitRecord[]> = {};
    for (const r of yearRecords) {
      if (!map[r.treeNumber]) map[r.treeNumber] = [];
      map[r.treeNumber].push(r);
    }
    return map;
  }, [yearRecords]);

  // นับ active (ยังไม่แก่) — เฉพาะปีที่เลือก
  // ── สรุปยอดของปีที่เลือก ──
  const yearSummary = useMemo(() => {
    const treeSet = new Set(yearRecords.map(r => r.treeNumber));
    const harvested = yearRecords.filter(r => daysUntil(r.expectedHarvestDate) <= 0).length;
    const batchSet = new Set(yearRecords.map(r => r.batch));
    return {
      total: yearRecords.length,
      trees: treeSet.size,
      active: yearRecords.length - harvested,
      harvested,
      batches: batchSet.size,
    };
  }, [yearRecords]);

  if (!orchard || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-500"></div>
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
        title={orchard.name === 'สวนมังคุด' ? 'ทำดอกมังคุด' : 'ทำลูกทุเรียน'}
        Icon={Sprout}
      />

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">

        {/* ── แถบแสดงรอบปีที่เลือก (เปลี่ยนปีได้ที่หน้าผังสวน) ── */}
        <div className="flex items-center gap-2 bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800 rounded-2xl px-4 py-2.5">
          <span className="text-lg">🗓️</span>
          <div>
            <p className="text-[11px] text-lime-600 dark:text-lime-400 leading-none">รอบการเก็บเกี่ยว</p>
            <p className="text-base font-extrabold text-lime-700 dark:text-lime-300 leading-tight">ปี พ.ศ. {selectedYear}</p>
          </div>
        </div>

        {/* ── สรุปยอดของปีที่เลือก ── */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800 rounded-2xl p-3 text-center">
            <p className="text-[10px] text-lime-600 dark:text-lime-400">บันทึกทั้งหมด</p>
            <p className="text-xl font-extrabold text-lime-700 dark:text-lime-300">{yearSummary.total}</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 text-center">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">กำลังทำลูก</p>
            <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">{yearSummary.active}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-3 text-center">
            <p className="text-[10px] text-orange-600 dark:text-orange-400">เก็บแล้ว</p>
            <p className="text-xl font-extrabold text-orange-700 dark:text-orange-300">{yearSummary.harvested}</p>
          </div>
        </div>

        {/* ── ผังสวน — กดต้นเพื่อเลือก (หลายต้นได้) ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-sm text-slate-800 dark:text-white">📍 กดต้นเพื่อเลือก</h2>
            {selectedTreeIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-lime-700 dark:text-lime-400 bg-lime-100 dark:bg-lime-900/30 px-2 py-0.5 rounded-full">
                  เลือก {selectedTreeIds.size} ต้น
                </span>
                <button
                  onClick={() => setSelectedTreeIds(new Set())}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-red-500"
                >
                  ล้าง
                </button>
              </div>
            )}
          </div>
          <FarmMapGrid
            trees={trees}
            fruitRecords={yearRecords}
            selectedTreeIds={selectedTreeIds}
            onToggleTree={handleToggleTree}
            rows={mapRows}
            cols={mapCols}
            blockedCells={blockedCells}
          />
          {selectedTreeIds.size > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedTrees.map(t => (
                <span key={t.id} className="text-xs font-bold bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  {t.treeNumber}
                  <button onClick={() => handleToggleTree(t)} className="text-lime-500 hover:text-red-500 leading-none">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── ฟอร์มบันทึก ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-bold text-sm text-lime-700 dark:text-lime-400">🌺 บันทึกการปัดดอก</h2>
          </div>
          <div className="p-4 space-y-3">
            {/* วันปัดดอก + รุ่น */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  วันปัดดอก <span className="text-red-500">*</span>
                </label>
                <input type="date" value={form.pollinationDate}
                  onChange={e => setForm({ ...form, pollinationDate: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-lime-500 text-sm text-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">รุ่น</label>
                <select value={form.batch}
                  onChange={e => setForm({ ...form, batch: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-lime-500 text-sm text-slate-800 dark:text-white">
                  <option>รุ่นที่ 1</option>
                  <option>รุ่นที่ 2</option>
                  <option>รุ่นที่ 3</option>
                </select>
              </div>
            </div>

            {/* วันคาดแก่ (auto) */}
            {expectedHarvestDate && (
              <div className="bg-lime-50 dark:bg-lime-900/20 rounded-xl p-3 flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-300">วันคาดแก่ (+{DAYS_TO_HARVEST} วัน)</span>
                <span className="font-extrabold text-lime-700 dark:text-lime-400">{expectedHarvestDate}</span>
              </div>
            )}

            {/* หมายเหตุ */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">หมายเหตุ</label>
              <input type="text" value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                placeholder="เช่น จำนวนดอก, พันธุ์"
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-lime-500 text-sm text-slate-800 dark:text-white" />
            </div>

            <button onClick={handleAdd}
              disabled={saving || selectedTreeIds.size === 0 || !form.pollinationDate}
              className="w-full py-3 bg-lime-500 hover:bg-lime-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all">
              {saving
                ? 'กำลังบันทึก...'
                : selectedTreeIds.size === 0
                  ? 'กดเลือกต้นในผังก่อน'
                  : `บันทึก ${selectedTreeIds.size} ต้น`}
            </button>
          </div>
        </div>

        {/* ── ประวัติแยกตามต้น ── */}
        <h2 className="font-bold text-sm text-slate-800 dark:text-white">
          📋 ประวัติการทำลูก ปี {selectedYear}
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">({yearRecords.length} รายการ)</span>
        </h2>

        {yearRecords.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 text-sm py-6">ยังไม่มีบันทึกในปี {selectedYear}</p>
        ) : (
          Object.entries(byTree).map(([treeNum, treeRecords]) => (
            <div key={treeNum} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Tree header */}
              <button
                onClick={() => setExpandedTree(expandedTree === treeNum ? null : treeNum)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-700/50"
              >
                <span className="font-bold text-sm text-slate-800 dark:text-white">🌳 ต้น {treeNum}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{treeRecords.length} ครั้ง</span>
                  {expandedTree === treeNum ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
              </button>

              {expandedTree === treeNum && (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {treeRecords.map(r => {
                    const days = daysUntil(r.expectedHarvestDate);
                    const isHarvested = days <= 0;
                    return (
                      <div key={r.id} className="px-4 py-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-bold text-lime-700 dark:text-lime-400 bg-lime-100 dark:bg-lime-900/30 px-2 py-0.5 rounded-full">
                                {r.batch || 'รุ่นที่ 1'}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">ปัดดอก: {r.pollinationDate}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">→ คาดแก่: {r.expectedHarvestDate}</span>
                            </div>
                            {/* Countdown */}
                            {isHarvested ? (
                              <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                ✅ ครบกำหนดแล้ว
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                                  days <= 14
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                    : 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400'
                                }`}>
                                  ⏳ อีก {days} วัน
                                </span>
                                {/* Progress bar */}
                                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-lime-500 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, ((DAYS_TO_HARVEST - days) / DAYS_TO_HARVEST) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {r.note && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{r.note}</p>}
                          </div>
                          <button
                            onClick={() => { if (confirm('ลบรายการนี้?')) deleteDurianFruitRecord(r.id).then(loadData); }}
                            className="text-slate-400 hover:text-red-500 ml-3 flex-shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
