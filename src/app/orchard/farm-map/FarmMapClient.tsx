'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards,
  getTreeProfiles,
  addTreeProfile,
  updateTreeProfile,
  getHospitalRecords,
  type Orchard,
  type TreeProfile,
  type HospitalRecord,
  type Severity,
} from '@/lib/firebase';
import { X, Home } from 'lucide-react';
import { useTheme } from '@/lib/useTheme';
import { Moon, Sun } from 'lucide-react';
import SubMenuTabs from '../_components/SubMenuTabs';

// ── Constants ────────────────────────────────────────────────
const ROWS = 11;
const COLS = 9;

const VARIETIES = [
  'หมอนทอง',
  'ชะนี',
  'กระดุม',
  'พวงมณี',
  'ก้านยาว',
  'มูซานคิง',
  'โอฉี',
  'นวลทองจันทร์',
];

type Status = 'normal' | 'watch' | 'seedling';

const STATUS_META: Record<Status, { label: string; bg: string; bgDark: string; icon: string; ring: string }> = {
  normal:   { label: 'ปกติ',      bg: 'bg-emerald-100', bgDark: 'dark:bg-emerald-900/40', icon: '🌳', ring: 'ring-emerald-400' },
  watch:    { label: 'เฝ้าระวัง',  bg: 'bg-rose-100',    bgDark: 'dark:bg-rose-900/40',    icon: '🌲', ring: 'ring-rose-400' },
  seedling: { label: 'ต้นกล้า',    bg: 'bg-sky-100',     bgDark: 'dark:bg-sky-900/40',     icon: '🌴', ring: 'ring-sky-400' },
};

// สีความรุนแรงจากห้องพยาบาล (override สีปกติ)
const SEVERITY_BG: Record<Severity, { bg: string; bgDark: string; label: string }> = {
  mild:     { bg: 'bg-yellow-200', bgDark: 'dark:bg-yellow-800/60', label: 'เล็กน้อย' },
  moderate: { bg: 'bg-orange-200', bgDark: 'dark:bg-orange-800/60', label: 'ปานกลาง' },
  severe:   { bg: 'bg-red-200',    bgDark: 'dark:bg-red-800/60',    label: 'รุนแรง' },
};

// กำหนดว่า cell ไหนมีต้น (ตามสเปก ข้อ 2)
function hasTree(row: number, col: number): boolean {
  // R1C1–R1C8 ว่าง, R1C9 มีต้น
  if (row === 1) return col === 9;
  // R2–R11 ทุก cell มีต้น
  return true;
}

// รหัสต้นเริ่มต้น B0304 = R3C4
function defaultTreeNumber(row: number, col: number): string {
  return `B${String(row).padStart(2, '0')}${String(col).padStart(2, '0')}`;
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

  // Modal state
  const [editing, setEditing] = useState<{ row: number; col: number } | null>(null);
  const [form, setForm] = useState({
    treeNumber: '',
    status: 'normal' as Status,
    variety: 'หมอนทอง',
    age: 0,
    note: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

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

      const data = await getTreeProfiles(orchardId);
      const hospData = await getHospitalRecords(orchardId);

      // ── Auto-sync: ใช้ "ประวัติการป่วยล่าสุด" เป็นแหล่งความจริง ──
      // ดึงประวัติล่าสุดของแต่ละต้น
      const latestByTree = new Map<string, HospitalRecord>();
      for (const r of hospData) {
        const existing = latestByTree.get(r.treeId);
        if (!existing || r.createdAt > existing.createdAt) {
          latestByTree.set(r.treeId, r);
        }
      }

      // หาต้นที่ DB กับ "ประวัติล่าสุด" ไม่ตรงกัน → sync
      const desync: { id: string; from: string; to: 'normal' | 'watch'; treeNumber: string }[] = [];
      for (const t of data) {
        if (t.status === 'seedling') continue; // ต้นกล้า ไม่แตะ
        const latest = latestByTree.get(t.id);
        if (!latest) {
          // ไม่มีประวัติเลย → status ควรเป็น normal
          if (t.status !== 'normal') {
            desync.push({ id: t.id, from: t.status, to: 'normal', treeNumber: t.treeNumber });
          }
        } else {
          const expected: 'normal' | 'watch' = latest.status === 'treating' ? 'watch' : 'normal';
          if (t.status !== expected) {
            desync.push({ id: t.id, from: t.status, to: expected, treeNumber: t.treeNumber });
          }
        }
      }

      if (desync.length > 0) {
        // eslint-disable-next-line no-console
        console.log('[FarmMap] Auto-sync from latest hospital record:', desync);
        await Promise.all(
          desync.map(d => updateTreeProfile(d.id, { status: d.to, updatedAt: Date.now() }))
        );
        const synced = data.map(t => {
          const fix = desync.find(d => d.id === t.id);
          return fix ? { ...t, status: fix.to } : t;
        });
        setTrees(synced);
      } else {
        setTrees(data);
      }

      setHospitalRecords(hospData);
    } catch (error) {
      console.error('Error loading farm map:', error);
    } finally {
      setLoading(false);
    }
  };

  // Index trees by row,col for fast lookup
  const treeMap = useMemo(() => {
    const m = new Map<string, TreeProfile>();
    for (const t of trees) m.set(`${t.row},${t.col}`, t);
    return m;
  }, [trees]);

  // ประวัติการป่วย "ล่าสุด" ของแต่ละต้น (createdAt มากสุด)
  // เป็น single source of truth สำหรับสถานะสุขภาพและสีในผังสวน
  const latestRecordByTree = useMemo(() => {
    const m = new Map<string, HospitalRecord>();
    for (const r of hospitalRecords) {
      const existing = m.get(r.treeId);
      if (!existing || r.createdAt > existing.createdAt) {
        m.set(r.treeId, r);
      }
    }
    return m;
  }, [hospitalRecords]);

  // Hospital map: treeId → severity จาก "ประวัติล่าสุด" เท่านั้น
  // ถ้าประวัติล่าสุด = recovered → ไม่มี override → กลับสีปกติ
  const hospitalMap = useMemo(() => {
    const m = new Map<string, Severity>();
    for (const [treeId, latest] of latestRecordByTree) {
      if (latest.status === 'treating') {
        m.set(treeId, latest.severity);
      }
    }
    return m;
  }, [latestRecordByTree]);

  // Set ของ treeId ที่ "ยังป่วยอยู่" — ใช้กับปุ่มในฟอร์ม
  // ตรงกับ "ประวัติล่าสุด.status === treating"
  const treeIdsActivelySick = useMemo(() => {
    const s = new Set<string>();
    for (const [treeId, latest] of latestRecordByTree) {
      if (latest.status === 'treating') s.add(treeId);
    }
    return s;
  }, [latestRecordByTree]);

  // Summary
  const summary = useMemo(() => {
    let total = 0;
    let normal = 0;
    let watch = 0;
    let seedling = 0;
    let hospital = 0;
    for (let r = 1; r <= ROWS; r++) {
      for (let c = 1; c <= COLS; c++) {
        if (!hasTree(r, c)) continue;
        total++;
        const t = treeMap.get(`${r},${c}`);
        const dbStatus: Status = (t?.status ?? 'normal') as Status;
        // ใช้ effective status (จากประวัติล่าสุด) ยกเว้น seedling
        let effStatus: Status = dbStatus;
        if (t && dbStatus !== 'seedling') {
          const latest = latestRecordByTree.get(t.id);
          effStatus = latest && latest.status === 'treating' ? 'watch' : 'normal';
        }
        if (effStatus === 'seedling') seedling++;
        else if (effStatus === 'watch') watch++;
        else normal++;
        if (t && hospitalMap.has(t.id)) hospital++;
      }
    }
    return { total, normal, watch, seedling, hospital };
  }, [treeMap, hospitalMap, latestRecordByTree]);

  const openEdit = async (row: number, col: number) => {
    const existing = treeMap.get(`${row},${col}`);
    setEditing({ row, col });
    setFormError(null);
    if (existing) {
      // ── ใช้ประวัติการป่วยล่าสุดเป็นตัวกำหนดสถานะสุขภาพอัตโนมัติ ──
      // - ประวัติล่าสุด = treating → watch (เฝ้าระวัง)
      // - ประวัติล่าสุด = recovered → normal (ปกติ)
      // - ไม่มีประวัติ → normal (ปกติ)
      // ยกเว้น seedling (ต้นกล้า) — เก็บค่าตาม DB
      const latest = latestRecordByTree.get(existing.id);
      let effectiveStatus: Status;
      if (existing.status === 'seedling') {
        effectiveStatus = 'seedling';
      } else if (latest) {
        effectiveStatus = latest.status === 'treating' ? 'watch' : 'normal';
      } else {
        effectiveStatus = 'normal';
      }

      // Sync DB ถ้าไม่ตรงกับสถานะที่ควรเป็น
      if (existing.status !== effectiveStatus && existing.status !== 'seedling') {
        try {
          await updateTreeProfile(existing.id, { status: effectiveStatus, updatedAt: Date.now() });
          setTrees(prev => prev.map(t => t.id === existing.id ? { ...t, status: effectiveStatus } : t));
        } catch (e) {
          console.error('auto-sync failed', e);
        }
      }

      setForm({
        treeNumber: existing.treeNumber,
        status: effectiveStatus,
        variety: existing.variety || 'หมอนทอง',
        age: existing.age || 0,
        note: existing.note || '',
      });
    } else {
      setForm({
        treeNumber: defaultTreeNumber(row, col),
        status: 'normal',
        variety: 'หมอนทอง',
        age: 0,
        note: '',
      });
    }
  };

  const closeModal = () => {
    setEditing(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    const tn = form.treeNumber.trim();
    if (!tn) {
      setFormError('กรุณากรอกรหัสต้น');
      return;
    }
    if (tn.length > 20) {
      setFormError('รหัสต้นต้องไม่เกิน 20 ตัวอักษร');
      return;
    }
    // ป้องกันรหัสซ้ำ
    const existing = treeMap.get(`${editing.row},${editing.col}`);
    const dup = trees.find(
      (t) => t.treeNumber === tn && t.id !== existing?.id
    );
    if (dup) {
      setFormError(`รหัสนี้ซ้ำกับต้นที่ R${dup.row}C${dup.col}`);
      return;
    }

    setSaving(true);
    try {
      if (existing) {
        await updateTreeProfile(existing.id, {
          treeNumber: tn,
          status: form.status,
          variety: form.variety,
          age: Number(form.age) || 0,
          note: form.note,
          updatedAt: Date.now(),
        });
      } else {
        await addTreeProfile({
          orchardId,
          row: editing.row,
          col: editing.col,
          treeNumber: tn,
          status: form.status,
          variety: form.variety,
          age: Number(form.age) || 0,
          note: form.note,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      await loadData();
      closeModal();
    } catch (error) {
      setFormError('บันทึกไม่สำเร็จ ลองอีกครั้ง');
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

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
      {/* Header — หน้าแรกของสวนทุเรียนหลังบ้าน */}
      <header
        className="text-white px-4 pt-4 pb-4"
        style={{ backgroundColor: orchard.color }}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            title="หน้าแรก"
          >
            <Home size={18} />
          </button>
          <div className="flex items-center gap-2 text-center">
            <span className="text-2xl">{orchard.icon}</span>
            <h1 className="text-lg font-bold">{orchard.name}</h1>
          </div>
          <button
            onClick={toggleTheme}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Sub Menu Tabs */}
      <SubMenuTabs activeTab="farm-map" orchardId={orchardId} />

      <div className="px-3 sm:px-6 py-3 max-w-6xl mx-auto">
        {/* Summary Cards — แถวเดียว 4 ช่อง */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <SummaryCard label="ทั้งหมด" value={summary.total} accent="text-slate-700 dark:text-slate-200" />
          <SummaryCard label="ปกติ" value={summary.normal} accent="text-emerald-500 dark:text-emerald-400" />
          <SummaryCard label="เฝ้าระวัง" value={summary.watch} accent="text-rose-500 dark:text-rose-400" />
          <SummaryCard label="ต้นกล้า" value={summary.seedling} accent="text-sky-500 dark:text-sky-400" />
        </div>
        {summary.hospital > 0 && (
          <div className="flex items-center gap-2 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
            <span className="text-sm">🏥</span>
            <span className="text-xs font-bold text-red-700 dark:text-red-400">กำลังรักษา {summary.hospital} ต้น</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          {(Object.keys(STATUS_META) as Status[]).map((k) => (
            <div key={k} className="flex items-center gap-1">
              <span className={`inline-block w-3 h-3 rounded ${STATUS_META[k].bg} ${STATUS_META[k].bgDark}`}></span>
              <span className="text-slate-600 dark:text-slate-400">{STATUS_META[k].icon} {STATUS_META[k].label}</span>
            </div>
          ))}
          <span className="text-slate-400 dark:text-slate-500">|</span>
          {(Object.keys(SEVERITY_BG) as Severity[]).map((k) => (
            <div key={k} className="flex items-center gap-1">
              <span className={`inline-block w-3 h-3 rounded ${SEVERITY_BG[k].bg} ${SEVERITY_BG[k].bgDark}`}></span>
              <span className="text-slate-600 dark:text-slate-400">🏥 {SEVERITY_BG[k].label}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 border border-slate-200 dark:border-slate-700">
          {/* Column labels */}
          <div
            className="grid mb-0.5"
            style={{ gridTemplateColumns: `20px repeat(${COLS}, 1fr)`, gap: '2px' }}
          >
            <div />
            {Array.from({ length: COLS }, (_, i) => (
              <div
                key={i}
                className="flex items-center justify-center text-[9px] font-bold text-slate-500 dark:text-slate-400 h-5"
              >
                C{i + 1}
              </div>
            ))}
          </div>

          {/* Rows */}
          {Array.from({ length: ROWS }, (_, rIdx) => {
            const row = rIdx + 1;
            return (
              <div
                key={row}
                className="grid mb-0.5"
                style={{ gridTemplateColumns: `20px repeat(${COLS}, 1fr)`, gap: '2px' }}
              >
                {/* Row label */}
                <div className="flex items-center justify-center text-[9px] font-bold text-slate-500 dark:text-slate-400">
                  R{row}
                </div>
                {Array.from({ length: COLS }, (_, cIdx) => {
                  const col = cIdx + 1;
                  if (!hasTree(row, col)) {
                    return (
                      <div
                        key={col}
                        className="rounded-md bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-700 aspect-square"
                      />
                    );
                  }
                  const t = treeMap.get(`${row},${col}`);
                  // ── คำนวณสถานะที่ "ควรจะเป็น" จากประวัติการป่วยล่าสุด ──
                  // ตรงกับ logic ใน openEdit: ประวัติล่าสุด = treating → watch / recovered → normal
                  // ยกเว้น seedling (ต้นกล้า) — เก็บค่าเดิม
                  const dbStatus: Status = (t?.status ?? 'normal') as Status;
                  let effStatus: Status = dbStatus;
                  if (t && dbStatus !== 'seedling') {
                    const latest = latestRecordByTree.get(t.id);
                    if (latest) {
                      effStatus = latest.status === 'treating' ? 'watch' : 'normal';
                    } else {
                      effStatus = 'normal';
                    }
                  }
                  const meta = STATUS_META[effStatus];
                  const treeNumber = t?.treeNumber ?? defaultTreeNumber(row, col);
                  const variety = t?.variety ?? '—';
                  const shortCode = treeNumber.length > 5 ? treeNumber.slice(0, 5) : treeNumber;
                  const hospSeverity = t ? hospitalMap.get(t.id) : undefined;
                  const cellBg = hospSeverity
                    ? `${SEVERITY_BG[hospSeverity].bg} ${SEVERITY_BG[hospSeverity].bgDark}`
                    : `${meta.bg} ${meta.bgDark}`;
                  return (
                    <button
                      key={col}
                      onClick={() => openEdit(row, col)}
                      title={`${treeNumber} · ${variety} · ${hospSeverity ? `🏥 ${SEVERITY_BG[hospSeverity].label}` : meta.label}`}
                      className={`relative rounded-md ${cellBg} border border-slate-200 dark:border-slate-700 active:scale-95 transition-transform flex flex-col items-center justify-center aspect-square w-full`}
                    >
                      <span className="text-[10px] sm:text-sm leading-none">{meta.icon}</span>
                      <span className="text-[6px] sm:text-[8px] font-bold text-slate-700 dark:text-slate-200 leading-tight mt-0.5 w-full text-center px-0.5 truncate">
                        {shortCode}
                      </span>
                      {hospSeverity && (
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

      {/* Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                ข้อมูลต้น R{editing.row}C{editing.col}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {/* รหัสต้น */}
              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">
                  รหัสต้น <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={form.treeNumber}
                  onChange={(e) => setForm({ ...form, treeNumber: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ring-amber-500 text-slate-800 dark:text-white"
                  placeholder="เช่น T-001, A0101"
                />
              </div>

              {/* สถานะสุขภาพ */}
              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">
                  สถานะสุขภาพ
                </label>
                <select
                  value={form.status}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'normal' || v === 'watch' || v === 'seedling') {
                      setForm({ ...form, status: v });
                    }
                  }}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ring-amber-500 text-slate-800 dark:text-white"
                >
                  <option value="normal">🌳 ปกติ</option>
                  <option value="watch">🌲 เฝ้าระวัง</option>
                  <option value="seedling">🌴 ต้นกล้า</option>
                </select>
              </div>

              {/* พันธุ์ */}
              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">
                  พันธุ์
                </label>
                <select
                  value={form.variety}
                  onChange={(e) => setForm({ ...form, variety: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ring-amber-500 text-slate-800 dark:text-white"
                >
                  {VARIETIES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* อายุ */}
              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">
                  อายุต้นทุเรียน (ปี)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.age || ''}
                  onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ring-amber-500 text-slate-800 dark:text-white"
                  placeholder="0"
                />
              </div>

              {/* หมายเหตุ */}
              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">
                  หมายเหตุ
                </label>
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ring-amber-500 text-slate-800 dark:text-white resize-none"
                  placeholder="พิมพ์หมายเหตุ..."
                />
              </div>

              {formError && (
                <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg">
                  ⚠ {formError}
                </div>
              )}

              <div className="space-y-2 pt-2">
                {/* ปุ่มห้องพยาบาล — เปลี่ยนตามว่ามีบันทึก treating ค้างอยู่ไหม */}
                {(() => {
                  const existingTree = editing ? treeMap.get(`${editing.row},${editing.col}`) : null;
                  const isActivelySick = existingTree ? treeIdsActivelySick.has(existingTree.id) : false;
                  return (
                    <button
                      onClick={async () => {
                        if (existingTree) {
                          closeModal();
                          if (isActivelySick) {
                            // กำลังรักษาอยู่ → ไปหน้าประวัติของต้นนั้น (filter + preselect)
                            router.push(`/orchard/hospital?id=${orchardId}&viewTreeId=${existingTree.id}&treeId=${existingTree.id}`);
                          } else {
                            // หายแล้ว/ยังไม่เคยป่วย → เปิดฟอร์มบันทึกใหม่
                            router.push(`/orchard/hospital?id=${orchardId}&treeId=${existingTree.id}`);
                          }
                        } else if (editing) {
                          // ต้นยังไม่มีข้อมูล → ตรวจ dup แล้วสร้าง แล้ว navigate
                          setSaving(true);
                          try {
                            const tn = form.treeNumber.trim() || defaultTreeNumber(editing.row, editing.col);
                            const dup = trees.find(t => t.treeNumber === tn);
                            if (dup) {
                              alert(`รหัสต้น "${tn}" ซ้ำกับต้นที่ R${dup.row}C${dup.col}`);
                              setSaving(false);
                              return;
                            }
                            const newId = await addTreeProfile({
                              orchardId,
                              row: editing.row,
                              col: editing.col,
                              treeNumber: tn,
                              status: 'watch',
                              variety: form.variety,
                              age: Number(form.age) || 0,
                              note: form.note,
                              createdAt: Date.now(),
                              updatedAt: Date.now(),
                            });
                            closeModal();
                            router.push(`/orchard/hospital?id=${orchardId}&treeId=${newId}`);
                          } catch {
                            alert('เกิดข้อผิดพลาด');
                          } finally {
                            setSaving(false);
                          }
                        }
                      }}
                      disabled={saving}
                      className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border disabled:opacity-50 ${
                        isActivelySick
                          ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                          : 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                      }`}
                    >
                      {isActivelySick ? '📋 ประวัติการป่วย' : '🏥 ส่งห้องพยาบาล'}
                    </button>
                  );
                })()}
                <div className="flex gap-2">
                  <button
                    onClick={closeModal}
                    disabled={saving}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                  >
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
