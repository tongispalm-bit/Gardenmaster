'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards,
  getTreeProfiles,
  getHospitalRecords,
  updateTreeProfile,
  deleteTreeProfile,
  getVarietiesFor,
  type Orchard,
  type TreeProfile,
  type HospitalRecord,
  type Status,
} from '@/lib/firebase';
import { Home, Moon, Sun, Plus } from 'lucide-react';
import { useTheme } from '@/lib/useTheme';
import SubMenuTabs from '../_components/SubMenuTabs';
import TreeInfoModal from '../farm-map/TreeInfoModal';

const STATUS_META: Record<Status, { label: string; bg: string; bgDark: string; icon: string }> = {
  normal:   { label: 'ปกติ',     bg: 'bg-emerald-100', bgDark: 'dark:bg-emerald-900/40', icon: '🌳' },
  watch:    { label: 'เฝ้าระวัง', bg: 'bg-rose-100',    bgDark: 'dark:bg-rose-900/40',    icon: '🌲' },
  seedling: { label: 'ต้นกล้า',   bg: 'bg-sky-100',     bgDark: 'dark:bg-sky-900/40',     icon: '🌴' },
};

function defaultTreeNumber(orchardName: string | undefined, row: number, col: number): string {
  return `R${row}C${col}`;
}

export default function TreeInfoClient() {
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
  const [existingTree, setExistingTree] = useState<TreeProfile | null>(null);

  useEffect(() => {
    if (!orchardId) {
      router.push('/');
      return;
    }
    loadData();
  }, [orchardId]);

  const loadData = async () => {
    try {
      const [orchards, treeData, hospData] = await Promise.all([
        getOrchards(),
        getTreeProfiles(orchardId),
        getHospitalRecords(orchardId),
      ]);

      setOrchard(orchards.find((o) => o.id === orchardId) || null);
      setHospitalRecords(hospData);

      // Auto-sync status
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
      console.error('Error loading tree info:', error);
    } finally {
      setLoading(false);
    }
  };

  const latestRecordByTree = useMemo(() => {
    const m = new Map<string, HospitalRecord>();
    for (const r of hospitalRecords) {
      const existing = m.get(r.treeId);
      if (!existing || r.createdAt > existing.createdAt) m.set(r.treeId, r);
    }
    return m;
  }, [hospitalRecords]);

  const treeIdsActivelySick = useMemo(() => {
    const s = new Set<string>();
    for (const [treeId, latest] of latestRecordByTree) {
      if (latest.status === 'treating') s.add(treeId);
    }
    return s;
  }, [latestRecordByTree]);

  const sortedTrees = useMemo(() => {
    return [...trees].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
  }, [trees]);

  const openEdit = async (tree: TreeProfile) => {
    setEditing({ row: tree.row, col: tree.col });
    setExistingTree(tree);

    // Sync status
    if (tree.status !== 'seedling') {
      const latest = latestRecordByTree.get(tree.id);
      const effStatus: Status = latest?.status === 'treating' ? 'watch' : 'normal';
      if (tree.status !== effStatus) {
        try {
          await updateTreeProfile(tree.id, { status: effStatus, updatedAt: Date.now() });
          setTrees(prev => prev.map(t => t.id === tree.id ? { ...t, status: effStatus } : t));
        } catch {}
      }
    }
  };

  const closeModal = () => {
    setEditing(null);
    setExistingTree(null);
  };

  const handleSave = async (formData: any) => {
    if (!editing || !existingTree) return;
    setSaving(true);
    try {
      await updateTreeProfile(existingTree.id, {
        treeNumber: formData.treeNumber,
        status: formData.status,
        variety: formData.variety,
        age: Number(formData.age) || 0,
        zone: formData.zone ?? null,
        note: formData.note,
        updatedAt: Date.now(),
      });
      await loadData();
      closeModal();
    } catch (error) {
      console.error('[TreeInfoClient] Save error:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingTree) return;
    if (!confirm(`ลบต้น ${existingTree.treeNumber}?`)) return;
    setSaving(true);
    try {
      await deleteTreeProfile(existingTree.id);
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

  const isMango = orchard.name === 'สวนมังคุด';

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300 pb-20">
      <div className="sticky top-0 z-40">
      <header className="text-white px-4 pt-4 pb-4" style={{ backgroundColor: orchard.color }}>
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/')} className="p-1.5 hover:bg-white/20 rounded-full">
            <Home size={18} />
          </button>
          <div className="flex items-center gap-2 text-center">
            <span className="text-2xl">{orchard.icon}</span>
            <h1 className="text-lg font-bold">{orchard.name}</h1>
          </div>
          <button onClick={toggleTheme} className="p-1.5 hover:bg-white/20 rounded-full">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <SubMenuTabs activeTab="tree-info" orchardId={orchardId} orchardName={orchard.name} />
      </div>

      <div className="px-4 py-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            📋 ข้อมูลต้น ({trees.length})
          </h2>
        </div>

        {trees.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-5xl">🌱</span>
            <p className="text-slate-500 dark:text-slate-400 mt-4">
              ยังไม่มีข้อมูลต้น<br/>
              <span className="text-sm">กรอกข้อมูลในผังสวนก่อน</span>
            </p>
            <button
              onClick={() => router.push(`/orchard/farm-map?id=${orchardId}`)}
              className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors"
            >
              ไปที่ผังสวน
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedTrees.map((tree) => {
              const dbStatus: Status = (tree.status ?? 'normal') as Status;
              let effStatus: Status = dbStatus;
              if (dbStatus !== 'seedling') {
                const latest = latestRecordByTree.get(tree.id);
                effStatus = latest && latest.status === 'treating' ? 'watch' : 'normal';
              }
              const meta = STATUS_META[effStatus];
              const treeRecords = hospitalRecords.filter(r => r.treeId === tree.id);

              return (
                <button
                  key={tree.id}
                  onClick={() => openEdit(tree)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${meta.bg} ${meta.bgDark} border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md active:scale-[0.98]`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{meta.icon}</span>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">
                          {tree.treeNumber}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          R{tree.row}C{tree.col}
                          {!isMango && tree.variety && ` • ${tree.variety}`}
                          {tree.age > 0 && ` • ${tree.age} ปี`}
                          {!isMango && tree.zone && ` • โซน ${tree.zone}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${meta.bg} ${meta.bgDark} border border-slate-300 dark:border-slate-600`}>
                        {meta.label}
                      </span>
                      {!isMango && treeRecords.length > 0 && (
                        <span className="text-[10px] text-red-600 dark:text-red-400 font-bold">
                          🏥 {treeRecords.length} รายการ
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tree Info Modal */}
      {editing && (
        <TreeInfoModal
          editing={editing}
          existingTree={existingTree}
          orchardId={orchardId}
          orchardName={orchard.name}
          isMango={isMango}
          trees={trees}
          hospitalRecords={hospitalRecords}
          treeIdsActivelySick={treeIdsActivelySick}
          defaultTreeNumber={defaultTreeNumber}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={handleDelete}
          saving={saving}
        />
      )}
    </div>
  );
}
