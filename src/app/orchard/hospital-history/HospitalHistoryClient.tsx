'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchard,
  getTreeProfiles,
  getHospitalRecords,
  type Orchard,
  type TreeProfile,
  type HospitalRecord,
  type Severity,
} from '@/lib/firebase';
import { ChevronRight } from 'lucide-react';
import DurianHeader from '../_components/DurianHeader';
import ImageViewerModal from '../_components/ImageViewerModal';

const SEVERITY_BG: Record<Severity, { bg: string; bgDark: string; label: string; textColor: string }> = {
  mild:     { bg: 'bg-yellow-100', bgDark: 'dark:bg-yellow-900/40', label: 'เล็กน้อย', textColor: 'text-yellow-700 dark:text-yellow-400' },
  moderate: { bg: 'bg-orange-100', bgDark: 'dark:bg-orange-900/40', label: 'ปานกลาง', textColor: 'text-orange-700 dark:text-orange-400' },
  severe:   { bg: 'bg-red-100',    bgDark: 'dark:bg-red-900/40',    label: 'รุนแรง',   textColor: 'text-red-700 dark:text-red-400' },
};

export default function HospitalHistoryClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [trees, setTrees] = useState<TreeProfile[]>([]);
  const [hospitalRecords, setHospitalRecords] = useState<HospitalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<'all' | 'treating' | 'recovered'>('all');
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');

  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  useEffect(() => {
    if (!orchardId) {
      router.push('/');
      return;
    }
    loadData();
  }, [orchardId]);

  const loadData = async () => {
    try {
      const [orchardData, treeData, hospData] = await Promise.all([
        getOrchard(orchardId),
        getTreeProfiles(orchardId),
        getHospitalRecords(orchardId),
      ]);

      setOrchard(orchardData);
      setTrees(treeData);
      setHospitalRecords(hospData);
    } catch (error) {
      console.error('Error loading hospital history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group records by tree
  const recordsByTree = useMemo(() => {
    const map = new Map<string, HospitalRecord[]>();
    
    for (const record of hospitalRecords) {
      const existing = map.get(record.treeId) || [];
      map.set(record.treeId, [...existing, record]);
    }

    // Sort records within each tree by date (newest first)
    for (const [treeId, records] of map) {
      records.sort((a, b) => b.createdAt - a.createdAt);
    }

    return map;
  }, [hospitalRecords]);

  // Filter and sort trees with records
  const filteredTreesWithRecords = useMemo(() => {
    const treesWithRecords: Array<{
      tree: TreeProfile;
      records: HospitalRecord[];
      latestRecord: HospitalRecord;
      treatingCount: number;
      recoveredCount: number;
    }> = [];

    for (const tree of trees) {
      const records = recordsByTree.get(tree.id);
      if (!records || records.length === 0) continue;

      const latestRecord = records[0];
      const treatingCount = records.filter(r => r.status === 'treating').length;
      const recoveredCount = records.filter(r => r.status === 'recovered').length;

      // Apply filters
      if (filterStatus !== 'all' && latestRecord.status !== filterStatus) continue;
      if (filterSeverity !== 'all' && latestRecord.severity !== filterSeverity) continue;

      treesWithRecords.push({
        tree,
        records,
        latestRecord,
        treatingCount,
        recoveredCount,
      });
    }

    // Sort by latest record date
    treesWithRecords.sort((a, b) => b.latestRecord.createdAt - a.latestRecord.createdAt);

    return treesWithRecords;
  }, [trees, recordsByTree, filterStatus, filterSeverity]);

  // Summary stats
  const stats = useMemo(() => {
    let totalRecords = 0;
    let activelySick = 0;
    let recovered = 0;
    const severityCounts = { mild: 0, moderate: 0, severe: 0 };

    for (const records of recordsByTree.values()) {
      totalRecords += records.length;
      const latest = records[0];
      if (latest.status === 'treating') {
        activelySick++;
        severityCounts[latest.severity]++;
      } else {
        recovered++;
      }
    }

    return { totalRecords, activelySick, recovered, severityCounts };
  }, [recordsByTree]);

  const openLightbox = (images: string[], startIndex: number) => {
    setLightboxImages(images);
    setLightboxIndex(startIndex);
    setShowLightbox(true);
  };

  if (!orchard || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300 pb-20">
      {/* Header */}
      <DurianHeader
        orchardId={orchardId}
        orchardName={orchard.name}
        orchardColor={orchard.color}
        orchardIcon={orchard.icon}
        activeTab="hospital-history"
        centerLabel="ประวัติการป่วย"
        hideTabs
      />

      <div className="px-3 sm:px-6 py-4 max-w-4xl mx-auto">
        {/* Title */}
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          🏥 ประวัติการป่วย
        </h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">บันทึกทั้งหมด</p>
            <p className="text-2xl font-extrabold text-slate-700 dark:text-slate-200 mt-1">{stats.totalRecords}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-600 dark:text-red-400">กำลังรักษา</p>
            <p className="text-2xl font-extrabold text-red-600 dark:text-red-400 mt-1">{stats.activelySick}</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
            <p className="text-xs text-emerald-600 dark:text-emerald-400">หายแล้ว</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{stats.recovered}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 border border-purple-200 dark:border-purple-800">
            <p className="text-xs text-purple-600 dark:text-purple-400">ต้นที่เคยป่วย</p>
            <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">{recordsByTree.size}</p>
          </div>
        </div>

        {/* Severity breakdown (if there are active cases) */}
        {stats.activelySick > 0 && (
          <div className="flex gap-2 mb-4 text-xs">
            <div className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-900/20 px-2.5 py-1.5 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <span className="font-bold text-yellow-700 dark:text-yellow-400">เล็กน้อย</span>
              <span className="text-yellow-600 dark:text-yellow-500">{stats.severityCounts.mild}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 px-2.5 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800">
              <span className="font-bold text-orange-700 dark:text-orange-400">ปานกลาง</span>
              <span className="text-orange-600 dark:text-orange-500">{stats.severityCounts.moderate}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800">
              <span className="font-bold text-red-700 dark:text-red-400">รุนแรง</span>
              <span className="text-red-600 dark:text-red-500">{stats.severityCounts.severe}</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 mb-4">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">🔍 กรอง</p>
          
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">สถานะ</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full p-2 text-xs bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white"
              >
                <option value="all">ทั้งหมด</option>
                <option value="treating">กำลังรักษา</option>
                <option value="recovered">หายแล้ว</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">ความรุนแรง</label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as any)}
                className="w-full p-2 text-xs bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white"
              >
                <option value="all">ทั้งหมด</option>
                <option value="mild">เล็กน้อย</option>
                <option value="moderate">ปานกลาง</option>
                <option value="severe">รุนแรง</option>
              </select>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
            แสดง {filteredTreesWithRecords.length} ต้น
          </p>
        </div>

        {/* Tree List with Records */}
        {filteredTreesWithRecords.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-5xl">🌳</span>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
              {hospitalRecords.length === 0 
                ? 'ยังไม่มีประวัติการป่วย'
                : 'ไม่พบข้อมูลตามเงื่อนไขที่เลือก'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTreesWithRecords.map(({ tree, records, latestRecord, treatingCount, recoveredCount }) => {
              const severityMeta = SEVERITY_BG[latestRecord.severity];
              const isActivelySick = latestRecord.status === 'treating';
              
              return (
                <div
                  key={tree.id}
                  className={`rounded-2xl border p-4 transition-all hover:shadow-lg ${
                    isActivelySick
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {/* Tree Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-lg">
                        🌳
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800 dark:text-white">{tree.treeNumber}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          R{tree.row}C{tree.col} · {tree.variety}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${severityMeta.bg} ${severityMeta.bgDark} ${severityMeta.textColor}`}>
                        {severityMeta.label}
                      </span>
                      {isActivelySick && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500 text-white">
                          กำลังรักษา
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Latest Record Summary */}
                  <div className="bg-white dark:bg-slate-900/50 rounded-xl p-3 mb-3 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400">อาการล่าสุด</p>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {new Date(latestRecord.createdAt).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">
                      {latestRecord.symptoms}
                    </p>

                    {latestRecord.photos && latestRecord.photos.length > 0 && (
                      <div className="flex gap-1.5 mb-2">
                        {latestRecord.photos.slice(0, 4).map((photo, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => openLightbox(latestRecord.photos || [], idx)}
                            className="relative w-14 h-14 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden hover:ring-2 hover:ring-rose-400 transition-all group cursor-pointer"
                          >
                            <img
                              src={photo}
                              alt={`อาการ ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <span className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                🔍
                              </span>
                            </div>
                          </button>
                        ))}
                        {latestRecord.photos.length > 4 && (
                          <div className="w-14 h-14 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 font-bold">
                            +{latestRecord.photos.length - 4}
                          </div>
                        )}
                      </div>
                    )}

                    {latestRecord.medicines && latestRecord.medicines.length > 0 && latestRecord.medicines[0].name && (
                      <div className="text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                        <strong>ยา:</strong> {latestRecord.medicines.map(m => m.name).filter(Boolean).join(', ')}
                      </div>
                    )}

                    {latestRecord.treatmentResult && (
                      <div className="text-[10px] text-slate-600 dark:text-slate-400">
                        <strong>ผลการรักษา:</strong>{' '}
                        {latestRecord.treatmentResult === 'better' ? '✅ ดีขึ้น' :
                         latestRecord.treatmentResult === 'worse' ? '❌ แย่ลง' : '➡️ ไม่เปลี่ยน'}
                      </div>
                    )}
                  </div>

                  {/* Stats & Action */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-[10px]">
                      <span className="text-slate-500 dark:text-slate-400">
                        📝 บันทึกทั้งหมด: <strong className="text-slate-700 dark:text-slate-300">{records.length}</strong>
                      </span>
                      {treatingCount > 0 && (
                        <span className="text-red-600 dark:text-red-400">
                          🏥 รักษา: <strong>{treatingCount}</strong>
                        </span>
                      )}
                      {recoveredCount > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          ✅ หาย: <strong>{recoveredCount}</strong>
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => router.push(`/orchard/hospital?id=${orchardId}&viewTreeId=${tree.id}`)}
                      className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
                    >
                      ดูทั้งหมด
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      {showLightbox && (
        <ImageViewerModal
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </div>
  );
}
