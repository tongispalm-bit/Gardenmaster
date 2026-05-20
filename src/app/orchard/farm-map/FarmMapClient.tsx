'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards,
  getTreeProfiles,
  addTreeProfile,
  updateTreeProfile,
  type Orchard,
  type TreeProfile,
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
      setTrees(data);
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

  // Summary
  const summary = useMemo(() => {
    let total = 0;
    let normal = 0;
    let watch = 0;
    let seedling = 0;
    for (let r = 1; r <= ROWS; r++) {
      for (let c = 1; c <= COLS; c++) {
        if (!hasTree(r, c)) continue;
        total++;
        const t = treeMap.get(`${r},${c}`);
        const status = t?.status ?? 'normal';
        if (status === 'normal') normal++;
        else if (status === 'watch') watch++;
        else if (status === 'seedling') seedling++;
      }
    }
    return { total, normal, watch, seedling };
  }, [treeMap]);

  const openEdit = (row: number, col: number) => {
    const existing = treeMap.get(`${row},${col}`);
    setEditing({ row, col });
    setFormError(null);
    if (existing) {
      setForm({
        treeNumber: existing.treeNumber,
        status: existing.status,
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

        {/* Legend — เล็กลง */}
        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          {(Object.keys(STATUS_META) as Status[]).map((k) => (
            <div key={k} className="flex items-center gap-1">
              <span className={`inline-block w-3 h-3 rounded ${STATUS_META[k].bg} ${STATUS_META[k].bgDark}`}></span>
              <span className="text-slate-600 dark:text-slate-400">{STATUS_META[k].icon} {STATUS_META[k].label}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-2xl p-2 sm:p-4 border border-slate-200 dark:border-slate-700">
          <div className="min-w-0">
            {/* Column labels */}
            <div className="flex gap-0.5 sm:gap-1.5 mb-0.5 sm:mb-2 pl-6 sm:pl-10">
              {Array.from({ length: COLS }, (_, i) => (
                <div
                  key={i}
                  className="w-8 h-5 sm:w-12 sm:h-6 flex items-center justify-center text-[9px] sm:text-xs font-bold text-slate-500 dark:text-slate-400"
                >
                  C{i + 1}
                </div>
              ))}
            </div>

            {/* Rows */}
            {Array.from({ length: ROWS }, (_, rIdx) => {
              const row = rIdx + 1;
              return (
                <div key={row} className="flex gap-0.5 sm:gap-1.5 mb-0.5 sm:mb-1.5 items-center">
                  {/* Row label */}
                  <div className="w-5 sm:w-9 h-8 sm:h-12 flex items-center justify-center text-[9px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                    R{row}
                  </div>
                  {Array.from({ length: COLS }, (_, cIdx) => {
                    const col = cIdx + 1;
                    if (!hasTree(row, col)) {
                      return (
                        <div
                          key={col}
                          className="w-8 h-8 sm:w-12 sm:h-12 rounded-md sm:rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-700"
                        />
                      );
                    }
                    const t = treeMap.get(`${row},${col}`);
                    const status: Status = t?.status ?? 'normal';
                    const meta = STATUS_META[status];
                    const treeNumber = t?.treeNumber ?? defaultTreeNumber(row, col);
                    const variety = t?.variety ?? '—';
                    return (
                      <button
                        key={col}
                        onClick={() => openEdit(row, col)}
                        title={`${treeNumber} · ${variety} · ${meta.label}`}
                        className={`group relative w-8 h-8 sm:w-12 sm:h-12 rounded-md sm:rounded-lg ${meta.bg} ${meta.bgDark} border border-slate-200 dark:border-slate-700 hover:scale-[1.3] hover:z-10 hover:shadow-lg transition-transform duration-150 flex flex-col items-center justify-center`}
                      >
                        <span className="text-sm sm:text-xl leading-none">{meta.icon}</span>
                        <span className="text-[7px] sm:text-[10px] font-bold text-slate-700 dark:text-slate-200 leading-tight mt-0 sm:mt-0.5 hidden sm:block">
                          {treeNumber}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
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
                แก้ไขข้อมูลต้น R{editing.row}C{editing.col}
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

              <div className="flex gap-2 pt-2">
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
