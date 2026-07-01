'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchard,
  getTreeProfiles,
  addTreeProfile,
  updateTreeProfile,
  deleteTreeProfile,
  getHospitalRecords,
  getFarmMapConfig,
  saveFarmMapConfig,
  getVarietiesFor,
  isMangosteenFarm,
  type Orchard,
  type TreeProfile,
  type HospitalRecord,
  type Severity,
} from '@/lib/firebase';
import {
  X, Home, Moon, Sun,
  Edit3, MapPin, Plus, Minus, Eye, Trash2,
} from 'lucide-react';
import { useTheme } from '@/lib/useTheme';
import SubMenuTabs from '../_components/SubMenuTabs';
import DurianHeader from '../_components/DurianHeader';
import FixedHeaderShell from '../_components/FixedHeaderShell';
import TreeInfoModal from './TreeInfoModal';

// ── Constants ────────────────────────────────────────────────
const DEFAULT_ROWS = 11;
const DEFAULT_COLS = 9;
const MAX_ROWS = 30;
const MAX_COLS = 20;
// default blocked: R1C1-R1C8 (จากสเปกเดิม)
const DEFAULT_BLOCKED = ['1,1','1,2','1,3','1,4','1,5','1,6','1,7','1,8'];

type Status = 'normal' | 'watch' | 'seedling';
type Mode = 'view' | 'edit-grid' | 'edit-zone';
type Zone = 'A' | 'B' | null | undefined;

const STATUS_META: Record<Status, { label: string; bg: string; bgDark: string; icon: string; ring: string }> = {
  normal:   { label: 'ปกติ',     bg: 'bg-emerald-100', bgDark: 'dark:bg-emerald-900/40', icon: '🌳', ring: 'ring-emerald-400' },
  watch:    { label: 'เฝ้าระวัง', bg: 'bg-rose-100',    bgDark: 'dark:bg-rose-900/40',    icon: '🌲', ring: 'ring-rose-400' },
  seedling: { label: 'ต้นกล้า',   bg: 'bg-sky-100',     bgDark: 'dark:bg-sky-900/40',     icon: '🌴', ring: 'ring-sky-400' },
};

const SEVERITY_BG: Record<Severity, { bg: string; bgDark: string; label: string }> = {
  mild:     { bg: 'bg-yellow-200', bgDark: 'dark:bg-yellow-800/60', label: 'เล็กน้อย' },
  moderate: { bg: 'bg-orange-200', bgDark: 'dark:bg-orange-800/60', label: 'ปานกลาง' },
  severe:   { bg: 'bg-red-200',    bgDark: 'dark:bg-red-800/60',    label: 'รุนแรง' },
};

// แถบสีโซน (ขอบซ้าย)
const ZONE_RING: Record<'A' | 'B', string> = {
  A: 'ring-2 ring-violet-500',
  B: 'ring-2 ring-cyan-500',
};

const ZONE_BADGE: Record<'A' | 'B', string> = {
  A: 'bg-violet-500 text-white',
  B: 'bg-cyan-500 text-white',
};

function defaultTreeNumber(orchardName: string | undefined, row: number, col: number): string {
  return `R${row}C${col}`;
}

export default function FarmMapClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDark, toggleTheme } = useTheme();
  const orchardId = searchParams.get('id') || '';

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [trees, setTrees] = useState<TreeProfile[]>([]);
  const [hospitalRecords, setHospitalRecords] = useState<HospitalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // เก็บ config เป็น state แยก เพื่อให้แก้ระหว่าง edit mode ได้
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [cols, setCols] = useState(DEFAULT_COLS);
  const [blockedCells, setBlockedCells] = useState<Set<string>>(new Set(DEFAULT_BLOCKED));

  // Modal state
  const [editing, setEditing] = useState<{ row: number; col: number } | null>(null);

  // Mode
  const [mode, setMode] = useState<Mode>('view');
  const [zoneBrush, setZoneBrush] = useState<Zone>('A'); // โซนที่จะทาลงใน edit-zone

  useEffect(() => {
    if (!orchardId) {
      router.push('/');
      return;
    }
    loadData();
  }, [orchardId]);

  // สวนมังคุดไม่มีหน้าผังสวน — redirect ไปหน้าการดูแล
  useEffect(() => {
    if (orchard && orchard.name === 'สวนมังคุด') {
      router.replace(`/orchard/care?id=${orchardId}`);
    }
  }, [orchard, orchardId, router]);

  const loadData = async () => {
    try {
      const [orchard, treeData, hospData, cfg] = await Promise.all([
        getOrchard(orchardId), // ✅ ดึงเฉพาะสวนเดียว แทนทั้งหมด
        getTreeProfiles(orchardId),
        getHospitalRecords(orchardId),
        getFarmMapConfig(orchardId),
      ]);

      setOrchard(orchard);
      setHospitalRecords(hospData);

      if (cfg) {
        setRows(cfg.rows);
        setCols(cfg.cols);
        setBlockedCells(new Set(cfg.blockedCells));
      } else {
        // ใช้ default
        setRows(DEFAULT_ROWS);
        setCols(DEFAULT_COLS);
        setBlockedCells(new Set(DEFAULT_BLOCKED));
      }

      // Auto-sync จาก hospital records
      const latestByTree = new Map<string, HospitalRecord>();
      for (const r of hospData) {
        const existing = latestByTree.get(r.treeId);
        if (!existing || r.createdAt > existing.createdAt) latestByTree.set(r.treeId, r);
      }
      const desync: { id: string; to: 'normal' | 'watch' }[] = [];
      for (const t of treeData) {
        if (t.status === 'seedling') continue;
        const latest = latestByTree.get(t.id);
        const expected: 'normal' | 'watch' = latest?.status === 'treating' ? 'watch' : 'normal';
        if (t.status !== expected) desync.push({ id: t.id, to: expected });
      }
      if (desync.length > 0) {
        await Promise.all(desync.map(d => updateTreeProfile(d.id, { status: d.to, updatedAt: Date.now() })));
        setTrees(treeData.map(t => {
          const fix = desync.find(d => d.id === t.id);
          return fix ? { ...t, status: fix.to } : t;
        }));
      } else {
        setTrees(treeData);
      }
    } catch (error) {
      console.error('Error loading farm map:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ──
  const hasTreeAt = (r: number, c: number) => !blockedCells.has(`${r},${c}`);

  const treeMap = useMemo(() => {
    const m = new Map<string, TreeProfile>();
    for (const t of trees) m.set(`${t.row},${t.col}`, t);
    return m;
  }, [trees]);

  const latestRecordByTree = useMemo(() => {
    const m = new Map<string, HospitalRecord>();
    for (const r of hospitalRecords) {
      const existing = m.get(r.treeId);
      if (!existing || r.createdAt > existing.createdAt) m.set(r.treeId, r);
    }
    return m;
  }, [hospitalRecords]);

  const hospitalMap = useMemo(() => {
    const m = new Map<string, Severity>();
    for (const [treeId, latest] of latestRecordByTree) {
      if (latest.status === 'treating') m.set(treeId, latest.severity);
    }
    return m;
  }, [latestRecordByTree]);

  const treeIdsActivelySick = useMemo(() => {
    const s = new Set<string>();
    for (const [treeId, latest] of latestRecordByTree) {
      if (latest.status === 'treating') s.add(treeId);
    }
    return s;
  }, [latestRecordByTree]);

  const summary = useMemo(() => {
    let total = 0, normal = 0, watch = 0, seedling = 0, hospital = 0;
    let zoneA = 0, zoneB = 0, zoneNone = 0;
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        if (!hasTreeAt(r, c)) continue;
        total++;
        const t = treeMap.get(`${r},${c}`);
        const dbStatus: Status = (t?.status ?? 'normal') as Status;
        let effStatus: Status = dbStatus;
        if (t && dbStatus !== 'seedling') {
          const latest = latestRecordByTree.get(t.id);
          effStatus = latest && latest.status === 'treating' ? 'watch' : 'normal';
        }
        if (effStatus === 'seedling') seedling++;
        else if (effStatus === 'watch') watch++;
        else normal++;
        if (t && hospitalMap.has(t.id)) hospital++;
        if (t?.zone === 'A') zoneA++;
        else if (t?.zone === 'B') zoneB++;
        else zoneNone++;
      }
    }
    return { total, normal, watch, seedling, hospital, zoneA, zoneB, zoneNone };
  }, [treeMap, hospitalMap, latestRecordByTree, rows, cols, blockedCells]);

  // ── Edit Grid actions ──
  const persistConfig = async (nextRows: number, nextCols: number, nextBlocked: Set<string>) => {
    setSaving(true);
    try {
      await saveFarmMapConfig(orchardId, {
        rows: nextRows,
        cols: nextCols,
        blockedCells: Array.from(nextBlocked),
      });
    } catch (e) {
      console.error('save config failed', e);
      alert('บันทึกผังไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const addRow = async () => {
    if (rows >= MAX_ROWS) return;
    const nextRows = rows + 1;
    setRows(nextRows);
    await persistConfig(nextRows, cols, blockedCells);
  };

  const removeRow = async () => {
    if (rows <= 1) return;
    const nextRows = rows - 1;
    // ลบต้นในแถวที่ถูกตัดออก
    const treesToRemove = trees.filter(t => t.row === rows);
    if (treesToRemove.length > 0) {
      const ok = confirm(`ลบแถว R${rows}? (มีต้น ${treesToRemove.length} ต้น จะถูกลบด้วย)`);
      if (!ok) return;
      await Promise.all(treesToRemove.map(t => deleteTreeProfile(t.id)));
    }
    // ลบ blocked cells ในแถวนั้น
    const nextBlocked = new Set(blockedCells);
    for (const k of blockedCells) {
      const [r] = k.split(',').map(Number);
      if (r === rows) nextBlocked.delete(k);
    }
    setRows(nextRows);
    setBlockedCells(nextBlocked);
    await persistConfig(nextRows, cols, nextBlocked);
    await loadData();
  };

  const addCol = async () => {
    if (cols >= MAX_COLS) return;
    const nextCols = cols + 1;
    setCols(nextCols);
    await persistConfig(rows, nextCols, blockedCells);
  };

  const removeCol = async () => {
    if (cols <= 1) return;
    const nextCols = cols - 1;
    const treesToRemove = trees.filter(t => t.col === cols);
    if (treesToRemove.length > 0) {
      const ok = confirm(`ลบคอลัมน์ C${cols}? (มีต้น ${treesToRemove.length} ต้น จะถูกลบด้วย)`);
      if (!ok) return;
      await Promise.all(treesToRemove.map(t => deleteTreeProfile(t.id)));
    }
    const nextBlocked = new Set(blockedCells);
    for (const k of blockedCells) {
      const [, c] = k.split(',').map(Number);
      if (c === cols) nextBlocked.delete(k);
    }
    setCols(nextCols);
    setBlockedCells(nextBlocked);
    await persistConfig(rows, nextCols, nextBlocked);
    await loadData();
  };

  const toggleCell = async (r: number, c: number) => {
    const key = `${r},${c}`;
    const isBlocked = blockedCells.has(key);
    const nextBlocked = new Set(blockedCells);

    if (isBlocked) {
      // เปิดต้น
      nextBlocked.delete(key);
    } else {
      // ปิดต้น — ลบต้นที่ตำแหน่งนี้ถ้ามี
      const existing = treeMap.get(key);
      if (existing) {
        const ok = confirm(`ลบต้น ${existing.treeNumber} (R${r}C${c})?`);
        if (!ok) return;
        await deleteTreeProfile(existing.id);
        await loadData();
      }
      nextBlocked.add(key);
    }

    setBlockedCells(nextBlocked);
    await persistConfig(rows, cols, nextBlocked);
  };

  // ── Edit Zone actions ──
  const applyZone = async (r: number, c: number) => {
    const existing = treeMap.get(`${r},${c}`);
    if (!existing) {
      // สร้างต้นพร้อมโซน
      try {
        const varieties = getVarietiesFor(orchard?.name);
        await addTreeProfile({
          orchardId,
          row: r, col: c,
          treeNumber: defaultTreeNumber(orchard?.name, r, c),
          status: 'normal',
          variety: varieties[0],
          age: 0,
          zone: zoneBrush,
          note: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await loadData();
      } catch (e) {
        console.error(e);
      }
      return;
    }
    // toggle: ถ้าโซนปัจจุบัน = brush → ลบโซน
    const nextZone: Zone = existing.zone === zoneBrush ? null : zoneBrush;
    try {
      await updateTreeProfile(existing.id, { zone: nextZone, updatedAt: Date.now() });
      setTrees(prev => prev.map(t => t.id === existing.id ? { ...t, zone: nextZone } : t));
    } catch (e) {
      console.error(e);
    }
  };

  // ── Modal (แก้รายต้น) ──
  const openEdit = async (row: number, col: number) => {
    const existing = treeMap.get(`${row},${col}`);
    setEditing({ row, col });
    
    // Sync status
    if (existing && existing.status !== 'seedling') {
      const latest = latestRecordByTree.get(existing.id);
      const effStatus: Status = latest?.status === 'treating' ? 'watch' : 'normal';
      if (existing.status !== effStatus) {
        try {
          await updateTreeProfile(existing.id, { status: effStatus, updatedAt: Date.now() });
          setTrees(prev => prev.map(t => t.id === existing.id ? { ...t, status: effStatus } : t));
        } catch {}
      }
    }
  };

  const closeModal = () => {
    setEditing(null);
  };

  const handleSave = async (formData: any) => {
    if (!editing) {
      console.error('[FarmMapClient] handleSave: editing is null');
      throw new Error('ไม่สามารถบันทึกได้ เนื่องจากไม่มีข้อมูลตำแหน่ง');
    }
    
    setSaving(true);
    try {
      console.log('[FarmMapClient] handleSave start:', { editing, formData, orchardId });
      
      const existing = treeMap.get(`${editing.row},${editing.col}`);
      
      if (existing) {
        console.log('[FarmMapClient] Updating existing tree:', existing.id);
        await updateTreeProfile(existing.id, {
          treeNumber: formData.treeNumber,
          status: formData.status,
          variety: formData.variety,
          age: Number(formData.age) || 0,
          zone: formData.zone ?? null,
          note: formData.note,
          updatedAt: Date.now(),
        });
      } else {
        console.log('[FarmMapClient] Creating new tree at:', editing);
        await addTreeProfile({
          orchardId,
          row: editing.row, 
          col: editing.col,
          treeNumber: formData.treeNumber,
          status: formData.status,
          variety: formData.variety,
          age: Number(formData.age) || 0,
          zone: formData.zone ?? null,
          note: formData.note,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      
      console.log('[FarmMapClient] Save successful, reloading data...');
      await loadData();
      closeModal();
    } catch (error) {
      console.error('[FarmMapClient] Save error:', error);
      alert(`บันทึกไม่สำเร็จ: ${error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'}`);
      // Re-throw error เพื่อให้ TreeInfoModal รับรู้ว่าบันทึกไม่สำเร็จ
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTree = async () => {
    if (!editing) return;
    const existing = treeMap.get(`${editing.row},${editing.col}`);
    if (!existing) return;
    if (!confirm(`ลบต้น ${existing.treeNumber}?`)) return;
    setSaving(true);
    try {
      await deleteTreeProfile(existing.id);
      await loadData();
      closeModal();
    } catch {
      alert('ลบไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (!orchard || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  // ── สวนมังคุด: ใช้ flow แบบเรียบง่าย (ไม่มีโซน/พยาบาล/พันธุ์/สถานะ) ──
  const isMango = isMangosteenFarm(orchard.name);

  // Force ปิดโหมด edit-zone ในสวนมังคุด
  const effectiveMode: Mode = isMango && mode === 'edit-zone' ? 'view' : mode;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300 pb-8 overflow-x-clip">
      {isMango ? (
        <FixedHeaderShell backgroundColor={orchard.color}>
          <header className="text-white px-2.5" style={{ backgroundColor: orchard.color }}>
            <div className="flex items-center justify-between h-16">
              <button onClick={() => router.push('/')} className="w-11 h-11 flex items-center justify-center hover:bg-white/20 rounded-full">
                <Home size={22} />
              </button>
              <div className="flex items-center gap-2 text-center">
                <span className="text-2xl">{orchard.icon}</span>
                <h1 className="text-lg font-bold">{orchard.name}</h1>
              </div>
              <button onClick={toggleTheme} className="w-11 h-11 flex items-center justify-center hover:bg-white/20 rounded-full">
                {isDark ? <Sun size={22} /> : <Moon size={22} />}
              </button>
            </div>
          </header>
          <SubMenuTabs activeTab="farm-map" orchardId={orchardId} orchardName={orchard.name} />
        </FixedHeaderShell>
      ) : (
        <DurianHeader
          orchardId={orchardId}
          orchardName={orchard.name}
          orchardColor={orchard.color}
          orchardIcon={orchard.icon}
          activeTab="farm-map"
        />
      )}

      <div className="px-3 sm:px-6 py-3 max-w-6xl mx-auto">
        {/* Summary Cards */}
        {isMango ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">จำนวนต้นมังคุดทั้งหมด</p>
            <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
              {summary.total} <span className="text-sm font-bold text-slate-500">ต้น</span>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 mb-3">
            <SummaryCard label="ทั้งหมด" value={summary.total} accent="text-slate-700 dark:text-slate-200" />
            <SummaryCard label="ปกติ" value={summary.normal} accent="text-emerald-500 dark:text-emerald-400" />
            <SummaryCard label="เฝ้าระวัง" value={summary.watch} accent="text-rose-500 dark:text-rose-400" />
            <SummaryCard label="ต้นกล้า" value={summary.seedling} accent="text-sky-500 dark:text-sky-400" />
          </div>
        )}

        {/* Zone Summary — ซ่อนในสวนมังคุด */}
        {!isMango && (summary.zoneA > 0 || summary.zoneB > 0) && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-2 text-center">
              <p className="text-[10px] text-violet-600 dark:text-violet-400">โซน A</p>
              <p className="text-lg font-extrabold text-violet-700 dark:text-violet-300">{summary.zoneA}</p>
            </div>
            <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-xl p-2 text-center">
              <p className="text-[10px] text-cyan-600 dark:text-cyan-400">โซน B</p>
              <p className="text-lg font-extrabold text-cyan-700 dark:text-cyan-300">{summary.zoneB}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-center">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">ไม่มีโซน</p>
              <p className="text-lg font-extrabold text-slate-600 dark:text-slate-300">{summary.zoneNone}</p>
            </div>
          </div>
        )}

        {!isMango && summary.hospital > 0 && (
          <div className="flex items-center gap-2 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
            <span className="text-sm">🏥</span>
            <span className="text-xs font-bold text-red-700 dark:text-red-400">กำลังรักษา {summary.hospital} ต้น</span>
          </div>
        )}

        {/* ── Mode Toggle ── */}
        <div className={`grid ${isMango ? 'grid-cols-2' : 'grid-cols-3'} gap-1.5 mb-3 bg-slate-100 dark:bg-slate-800 rounded-xl p-1`}>
          <button
            onClick={() => setMode('view')}
            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all ${
              effectiveMode === 'view'
                ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Eye size={14} /> ดู
          </button>
          <button
            onClick={() => setMode('edit-grid')}
            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all ${
              effectiveMode === 'edit-grid'
                ? 'bg-amber-500 text-white shadow'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Edit3 size={14} /> แก้ไขผัง
          </button>
          {!isMango && (
            <button
              onClick={() => setMode('edit-zone')}
              className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all ${
                effectiveMode === 'edit-zone'
                  ? 'bg-violet-500 text-white shadow'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <MapPin size={14} /> กำหนดโซน
            </button>
          )}
        </div>

        {/* Edit Grid controls */}
        {effectiveMode === 'edit-grid' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-3 space-y-2">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              👆 กดที่ cell เพื่อ <strong>เปิด/ปิด</strong> ต้น · ปุ่มด้านล่างเพื่อเพิ่ม/ลบแถว/คอลัมน์
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-2">
                <p className="text-[10px] text-slate-500 mb-1 text-center">แถว (R) — {rows}</p>
                <div className="flex gap-1.5">
                  <button onClick={removeRow} disabled={saving || rows <= 1}
                    className="flex-1 py-1.5 bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 text-rose-600 dark:text-rose-400 rounded-lg disabled:opacity-50 flex items-center justify-center">
                    <Minus size={14} />
                  </button>
                  <button onClick={addRow} disabled={saving || rows >= MAX_ROWS}
                    className="flex-1 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 text-emerald-600 dark:text-emerald-400 rounded-lg disabled:opacity-50 flex items-center justify-center">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-2">
                <p className="text-[10px] text-slate-500 mb-1 text-center">คอลัมน์ (C) — {cols}</p>
                <div className="flex gap-1.5">
                  <button onClick={removeCol} disabled={saving || cols <= 1}
                    className="flex-1 py-1.5 bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 text-rose-600 dark:text-rose-400 rounded-lg disabled:opacity-50 flex items-center justify-center">
                    <Minus size={14} />
                  </button>
                  <button onClick={addCol} disabled={saving || cols >= MAX_COLS}
                    className="flex-1 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 text-emerald-600 dark:text-emerald-400 rounded-lg disabled:opacity-50 flex items-center justify-center">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Zone controls — ซ่อนในสวนมังคุด */}
        {!isMango && effectiveMode === 'edit-zone' && (
          <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-3 mb-3 space-y-2">
            <p className="text-xs text-violet-700 dark:text-violet-400">
              👆 เลือกโซนด้านล่าง แล้วกดที่ต้นในผังเพื่อกำหนด/ยกเลิก
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button onClick={() => setZoneBrush('A')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  zoneBrush === 'A' ? 'bg-violet-500 text-white shadow ring-2 ring-violet-300' : 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400'
                }`}>
                โซน A
              </button>
              <button onClick={() => setZoneBrush('B')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  zoneBrush === 'B' ? 'bg-cyan-500 text-white shadow ring-2 ring-cyan-300' : 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400'
                }`}>
                โซน B
              </button>
              <button onClick={() => setZoneBrush(null)}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  zoneBrush === null ? 'bg-slate-500 text-white shadow ring-2 ring-slate-300' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                ลบโซน
              </button>
            </div>
          </div>
        )}

        {/* Legend — ซ่อนในสวนมังคุด */}
        {!isMango && (
          <div className="flex flex-wrap gap-2 mb-3 text-xs">
            {(Object.keys(STATUS_META) as Status[]).map((k) => (
              <div key={k} className="flex items-center gap-1">
                <span className={`inline-block w-3 h-3 rounded ${STATUS_META[k].bg} ${STATUS_META[k].bgDark}`}></span>
                <span className="text-slate-600 dark:text-slate-400">{STATUS_META[k].icon} {STATUS_META[k].label}</span>
              </div>
            ))}
            <span className="text-slate-400 dark:text-slate-500">|</span>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded ring-2 ring-violet-500"></span>
              <span className="text-slate-600 dark:text-slate-400">โซน A</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded ring-2 ring-cyan-500"></span>
              <span className="text-slate-600 dark:text-slate-400">โซน B</span>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-1.5 sm:p-2 border border-slate-200 dark:border-slate-700 overflow-hidden touch-pan-y">
          <div className="w-full min-w-0">
            {/* Column labels */}
            <div className="grid mb-0.5 min-w-0" style={{ gridTemplateColumns: `18px repeat(${cols}, minmax(0, 1fr))`, gap: '2px' }}>
              <div />
              {Array.from({ length: cols }, (_, i) => (
                <div key={i} className="flex min-w-0 items-center justify-center text-[9px] font-bold text-slate-500 dark:text-slate-400 h-5">
                  C{i + 1}
                </div>
              ))}
            </div>

            {/* Rows */}
            {Array.from({ length: rows }, (_, rIdx) => {
              const row = rIdx + 1;
              return (
                <div key={row} className="grid mb-0.5 min-w-0" style={{ gridTemplateColumns: `18px repeat(${cols}, minmax(0, 1fr))`, gap: '2px' }}>
                  <div className="flex min-w-0 items-center justify-center text-[9px] font-bold text-slate-500 dark:text-slate-400">
                    R{row}
                  </div>
                  {Array.from({ length: cols }, (_, cIdx) => {
                    const col = cIdx + 1;
                    const isBlocked = !hasTreeAt(row, col);

                    // Cell ปิด (ไม่มีต้น)
                    if (isBlocked) {
                      if (effectiveMode === 'edit-grid') {
                        return (
                          <button
                            key={col}
                            onClick={() => toggleCell(row, col)}
                            className="min-w-0 rounded-md bg-slate-100 dark:bg-slate-900/50 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:border-emerald-400 aspect-square flex items-center justify-center transition-all"
                            title="กดเพื่อเปิดต้น"
                          >
                            <Plus size={14} className="text-slate-400" />
                          </button>
                        );
                      }
                      return (
                        <div key={col}
                          className="min-w-0 rounded-md bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-700 aspect-square" />
                      );
                    }

                    // Cell มีต้น
                    const t = treeMap.get(`${row},${col}`);
                    const dbStatus: Status = (t?.status ?? 'normal') as Status;
                    let effStatus: Status = dbStatus;
                    if (t && dbStatus !== 'seedling') {
                      const latest = latestRecordByTree.get(t.id);
                      effStatus = latest?.status === 'treating' ? 'watch' : 'normal';
                    }
                    const meta = STATUS_META[effStatus];
                    const treeNumber = t?.treeNumber ?? defaultTreeNumber(orchard?.name, row, col);
                    const variety = t?.variety ?? '—';
                    const shortCode = treeNumber.length > 5 ? treeNumber.slice(0, 5) : treeNumber;
                    const hospSeverity = !isMango && t ? hospitalMap.get(t.id) : undefined;
                    // สวนมังคุด: ใช้พื้นม่วงอ่อนเรียบๆ ไม่สนสถานะ
                    const cellBg = isMango
                      ? 'bg-purple-100 dark:bg-purple-900/30'
                      : hospSeverity
                        ? `${SEVERITY_BG[hospSeverity].bg} ${SEVERITY_BG[hospSeverity].bgDark}`
                        : `${meta.bg} ${meta.bgDark}`;
                    const zone = isMango ? null : t?.zone;
                    const zoneRing = zone === 'A' || zone === 'B' ? ZONE_RING[zone] : '';
                    // ไอคอนใน cell — สวนมังคุดใช้ emoji ของสวน
                    const cellIcon = isMango ? (orchard?.icon || '🍇') : meta.icon;

                    return (
                      <button
                        key={col}
                        onClick={() => {
                          if (effectiveMode === 'edit-grid') toggleCell(row, col);
                          else if (effectiveMode === 'edit-zone') applyZone(row, col);
                          else openEdit(row, col);
                        }}
                        title={isMango ? treeNumber : `${treeNumber} · ${variety}${zone ? ` · โซน ${zone}` : ''}`}
                        className={`relative min-w-0 rounded-md ${cellBg} ${zoneRing} border border-slate-200 dark:border-slate-700 active:scale-95 transition-transform flex flex-col items-center justify-center aspect-square w-full`}
                      >
                        {effectiveMode === 'edit-grid' ? (
                          <Minus size={16} className="text-slate-700 dark:text-slate-200" />
                        ) : (
                          <>
                            <span className="text-[10px] sm:text-sm leading-none">{cellIcon}</span>
                            <span className="text-[6px] sm:text-[8px] font-bold text-slate-700 dark:text-slate-200 leading-tight mt-0.5 w-full text-center px-0.5 truncate">
                              {shortCode}
                            </span>
                          </>
                        )}
                        {/* Zone badge มุมซ้ายบน — ซ่อนในสวนมังคุด */}
                        {!isMango && (zone === 'A' || zone === 'B') && (
                          <span className={`absolute -top-1 -left-1 ${ZONE_BADGE[zone]} text-[7px] font-extrabold rounded-full w-3.5 h-3.5 flex items-center justify-center shadow`}>
                            {zone}
                          </span>
                        )}
                        {!isMango && hospSeverity && effectiveMode !== 'edit-grid' && (
                          <span className="absolute -top-0.5 -right-0.5 text-[8px] leading-none">🏥</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal แก้ต้น */}
      <TreeInfoModal
        editing={editing}
        existingTree={editing ? treeMap.get(`${editing.row},${editing.col}`) || null : null}
        orchardId={orchardId}
        orchardName={orchard?.name}
        isMango={isMango}
        trees={trees}
        hospitalRecords={hospitalRecords}
        treeIdsActivelySick={treeIdsActivelySick}
        defaultTreeNumber={defaultTreeNumber}
        onClose={closeModal}
        onSave={async (formData) => {
          if (!editing) return;
          const existing = treeMap.get(`${editing.row},${editing.col}`);
          setSaving(true);
          try {
            if (existing) {
              await updateTreeProfile(existing.id, {
                treeNumber: formData.treeNumber,
                status: formData.status,
                variety: formData.variety,
                age: Number(formData.age) || 0,
                zone: formData.zone ?? null,
                note: formData.note,
                updatedAt: Date.now(),
              });
            } else {
              await addTreeProfile({
                orchardId,
                row: editing.row, 
                col: editing.col,
                treeNumber: formData.treeNumber,
                status: formData.status,
                variety: formData.variety,
                age: Number(formData.age) || 0,
                zone: formData.zone ?? null,
                note: formData.note,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
            }
            await loadData();
            closeModal();
          } catch (error) {
            console.error('[FarmMapClient] Save error:', error);
            alert('บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง');
            throw error; // Re-throw เพื่อให้ TreeInfoModal แสดง error
          } finally {
            setSaving(false);
          }
        }}
        onDelete={handleDeleteTree}
        saving={saving}
      />
    </div>
  );
}
function SummaryCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-2 border border-slate-200 dark:border-slate-700 text-center">
      <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-lg font-extrabold ${accent}`}>{value}</p>
    </div>
  );
}
