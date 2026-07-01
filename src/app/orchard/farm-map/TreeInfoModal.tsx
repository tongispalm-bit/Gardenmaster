'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  type TreeProfile,
  type HospitalRecord,
  type Severity,
  type Status,
  type Zone,
  getVarietiesFor,
  addTreeProfile,
  updateTreeProfile,
  deleteTreeProfile,
} from '@/lib/firebase';
import { X, Trash2 } from 'lucide-react';
import ImageViewerModal from '../_components/ImageViewerModal';

const SEVERITY_BG: Record<Severity, { bg: string; bgDark: string; label: string }> = {
  mild:     { bg: 'bg-yellow-200', bgDark: 'dark:bg-yellow-800/60', label: 'เล็กน้อย' },
  moderate: { bg: 'bg-orange-200', bgDark: 'dark:bg-orange-800/60', label: 'ปานกลาง' },
  severe:   { bg: 'bg-red-200',    bgDark: 'dark:bg-red-800/60',    label: 'รุนแรง' },
};

interface TreeInfoModalProps {
  editing: { row: number; col: number } | null;
  existingTree: TreeProfile | null;
  orchardId: string;
  orchardName: string | undefined;
  isMango: boolean;
  trees: TreeProfile[];
  hospitalRecords: HospitalRecord[];
  treeIdsActivelySick: Set<string>;
  defaultTreeNumber: (orchardName: string | undefined, row: number, col: number) => string;
  onClose: () => void;
  onSave: (form: any) => Promise<void>;
  onDelete: () => Promise<void>;
  saving: boolean;
}

export default function TreeInfoModal({
  editing,
  existingTree,
  orchardId,
  orchardName,
  isMango,
  trees,
  hospitalRecords,
  treeIdsActivelySick,
  defaultTreeNumber,
  onClose,
  onSave,
  onDelete,
  saving,
}: TreeInfoModalProps) {
  const router = useRouter();
  const [modalTab, setModalTab] = useState<'info' | 'history'>('info');
  const [form, setForm] = useState({
    treeNumber: existingTree?.treeNumber || (editing ? defaultTreeNumber(orchardName, editing.row, editing.col) : ''),
    status: (existingTree?.status || 'normal') as Status,
    variety: existingTree?.variety || getVarietiesFor(orchardName)[0],
    age: existingTree?.age || 0,
    zone: (existingTree?.zone ?? null) as Zone,
    note: existingTree?.note || '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  
  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  // ⭐ Sync form เมื่อ existingTree เปลี่ยน (หลังบันทึกแล้ว reload)
  useEffect(() => {
    if (existingTree) {
      setForm({
        treeNumber: existingTree.treeNumber,
        status: existingTree.status,
        variety: existingTree.variety,
        age: existingTree.age,
        zone: existingTree.zone ?? null,
        note: existingTree.note,
      });
    } else if (editing) {
      setForm({
        treeNumber: defaultTreeNumber(orchardName, editing.row, editing.col),
        status: 'normal',
        variety: getVarietiesFor(orchardName)[0],
        age: 0,
        zone: null,
        note: '',
      });
    }
  }, [existingTree, editing, orchardName]); // dependencies

  if (!editing) return null;

  const treeRecords = hospitalRecords
    .filter(r => r.treeId === existingTree?.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  const isActivelySick = existingTree ? treeIdsActivelySick.has(existingTree.id) : false;

  const handleSaveClick = async () => {
    const tn = form.treeNumber.trim();
    if (!tn) { setFormError('กรุณากรอกรหัสต้น'); return; }
    if (tn.length > 20) { setFormError('รหัสต้นต้องไม่เกิน 20 ตัวอักษร'); return; }
    const dup = trees.find(t => t.treeNumber === tn && t.id !== existingTree?.id);
    if (dup) { setFormError(`รหัสนี้ซ้ำกับต้นที่ R${dup.row}C${dup.col}`); return; }
    setFormError(null);
    
    try {
      await onSave(form);
    } catch (error) {
      console.error('[TreeInfoModal] Save error:', error);
      setFormError('บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง');
    }
  };

  const openLightbox = (images: string[], startIndex: number) => {
    setLightboxImages(images);
    setLightboxIndex(startIndex);
    setShowLightbox(true);
  };

  // Debug: log to confirm component loaded
  console.log('[TreeInfoModal] Rendering - CENTERED POPUP version', { editing, existingTree });

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center p-3 sm:p-4"
        onClick={onClose}
      >
        {/* Modal Content - Centered Popup (mobile optimized) */}
        <div 
          className="bg-white dark:bg-slate-800 w-full max-w-[95vw] sm:max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0 rounded-t-2xl">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white truncate pr-2">
              ข้อมูลต้น {form.treeNumber.trim() || `R${editing.row}C${editing.col}`}
            </h2>
            <button 
              onClick={onClose} 
              className="p-2 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0 active:scale-95 transition-transform"
            >
              <X size={20} />
            </button>
          </div>

        {/* Ribbon Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 shrink-0 sticky top-0 z-10">
          <button
            onClick={() => setModalTab('info')}
            className={`flex-1 py-3 px-2 text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              modalTab === 'info'
                ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500 bg-white dark:bg-slate-800'
                : 'text-slate-500 dark:text-slate-400 active:text-slate-700 dark:active:text-slate-300 active:bg-slate-100 dark:active:bg-slate-800/50'
            }`}
          >
            📋 ข้อมูลต้น
          </button>
          <button
            onClick={() => setModalTab('history')}
            className={`flex-1 py-3 px-2 text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              modalTab === 'history'
                ? 'text-red-600 dark:text-red-400 border-b-2 border-red-500 bg-white dark:bg-slate-800'
                : 'text-slate-500 dark:text-slate-400 active:text-slate-700 dark:active:text-slate-300 active:bg-slate-100 dark:active:bg-slate-800/50'
            }`}
          >
            🏥 ประวัติการป่วย {treeRecords.length > 0 && `(${treeRecords.length})`}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 pb-safe">
          {modalTab === 'info' ? (
            // ── แท็บ: ข้อมูลต้น ──
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  รหัสต้น <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  maxLength={20} 
                  value={form.treeNumber}
                  onChange={(e) => setForm({ ...form, treeNumber: e.target.value })}
                  className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-amber-500 text-slate-800 dark:text-white"
                  placeholder="เช่น T-001" 
                />
              </div>

              {!isMango && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">สถานะสุขภาพ</label>
                  <select 
                    value={form.status}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === 'normal' || v === 'watch' || v === 'seedling') setForm({ ...form, status: v });
                    }}
                    className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-amber-500 text-slate-800 dark:text-white"
                  >
                    <option value="normal">🌳 ปกติ</option>
                    <option value="watch">🌲 เฝ้าระวัง</option>
                    <option value="seedling">🌴 ต้นกล้า</option>
                  </select>
                </div>
              )}

              {/* โซน */}
              {!isMango && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">โซน</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button 
                      type="button" 
                      onClick={() => setForm({ ...form, zone: null })}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        !form.zone ? 'bg-slate-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      ไม่ระบุ
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setForm({ ...form, zone: 'A' })}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        form.zone === 'A' ? 'bg-violet-500 text-white' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
                      }`}
                    >
                      โซน A
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setForm({ ...form, zone: 'B' })}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        form.zone === 'B' ? 'bg-cyan-500 text-white' : 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400'
                      }`}
                    >
                      โซน B
                    </button>
                  </div>
                </div>
              )}

              {/* พันธุ์ */}
              {!isMango && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">พันธุ์</label>
                  <select 
                    value={form.variety}
                    onChange={(e) => setForm({ ...form, variety: e.target.value })}
                    className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-amber-500 text-slate-800 dark:text-white"
                  >
                    {getVarietiesFor(orchardName).map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">อายุต้น (ปี)</label>
                <input 
                  type="number" 
                  min={0} 
                  value={form.age || ''}
                  onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
                  className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-amber-500 text-slate-800 dark:text-white"
                  placeholder="0" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">หมายเหตุ</label>
                <textarea 
                  rows={2} 
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-amber-500 text-slate-800 dark:text-white resize-none"
                  placeholder="พิมพ์หมายเหตุ..." 
                />
              </div>

              {formError && (
                <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-lg">
                  ⚠ {formError}
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                {/* ปุ่มห้องพยาบาล */}
                {!isMango && existingTree && (
                  <>
                    {/* กรณีมีประวัติการป่วย → ปุ่มดูประวัติ */}
                    {treeRecords.length > 0 ? (
                      <button
                        onClick={() => {
                          onClose();
                          router.push(`/orchard/hospital?id=${orchardId}&viewTreeId=${existingTree.id}`);
                        }}
                        disabled={saving}
                        className="w-full py-3 sm:py-2.5 rounded-xl font-bold text-sm border disabled:opacity-50 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 active:bg-blue-200 dark:active:bg-blue-900/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 transition-colors active:scale-95"
                      >
                        📋 ดูประวัติการป่วย ({treeRecords.length} รายการ)
                      </button>
                    ) : (
                      /* กรณียังไม่เคยป่วย → ปุ่มส่งห้องพยาบาล */
                      <button
                        onClick={() => {
                          onClose();
                          router.push(`/orchard/hospital?id=${orchardId}&treeId=${existingTree.id}`);
                        }}
                        disabled={saving}
                        className="w-full py-3 sm:py-2.5 rounded-xl font-bold text-sm border disabled:opacity-50 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 active:bg-red-200 dark:active:bg-red-900/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 transition-colors active:scale-95"
                      >
                        🏥 ส่งห้องพยาบาล
                      </button>
                    )}
                  </>
                )}

                {/* กรณียังไม่มีต้น → สร้างต้นแล้วส่งห้องพยาบาล */}
                {!isMango && !existingTree && editing && (
                  <button
                    onClick={async () => {
                      try {
                        const tn = form.treeNumber.trim() || defaultTreeNumber(orchardName, editing.row, editing.col);
                        const dup = trees.find(t => t.treeNumber === tn);
                        if (dup) { alert(`รหัสต้น "${tn}" ซ้ำ`); return; }
                        const newId = await addTreeProfile({
                          orchardId, 
                          row: editing.row, 
                          col: editing.col,
                          treeNumber: tn, 
                          status: 'watch',
                          variety: form.variety, 
                          age: Number(form.age) || 0,
                          zone: form.zone ?? null, 
                          note: form.note,
                          createdAt: Date.now(), 
                          updatedAt: Date.now(),
                        });
                        onClose();
                        router.push(`/orchard/hospital?id=${orchardId}&treeId=${newId}`);
                      } catch { alert('เกิดข้อผิดพลาด'); }
                    }}
                    disabled={saving}
                    className="w-full py-3 sm:py-2.5 rounded-xl font-bold text-sm border disabled:opacity-50 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 active:bg-red-200 dark:active:bg-red-900/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 transition-colors active:scale-95"
                  >
                    🏥 ส่งห้องพยาบาล
                  </button>
                )}

                {/* ปุ่มลบต้น */}
                {existingTree && (
                  <button 
                    onClick={onDelete} 
                    disabled={saving}
                    className="w-full py-2.5 sm:py-2 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 active:bg-rose-200 dark:active:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors active:scale-95"
                  >
                    <Trash2 size={14} /> ลบต้นนี้
                  </button>
                )}

                <div className="flex gap-2 pt-1">
                  <button 
                    onClick={onClose} 
                    disabled={saving}
                    className="flex-1 py-3 sm:py-2.5 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500 text-slate-700 dark:text-slate-200 rounded-xl font-bold disabled:opacity-50 transition-colors active:scale-95"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    onClick={handleSaveClick} 
                    disabled={saving}
                    className="flex-1 py-3 sm:py-2.5 text-sm bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors active:scale-95"
                  >
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // ── แท็บ: ประวัติการป่วย ──
            <div className="space-y-2.5">
              {!existingTree ? (
                <div className="text-center py-6">
                  <span className="text-3xl">🌱</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    ยังไม่มีข้อมูลต้น<br/>กรุณาบันทึกข้อมูลต้นก่อน
                  </p>
                </div>
              ) : treeRecords.length === 0 ? (
                <div className="text-center py-6">
                  <span className="text-3xl">🌳</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    ไม่มีประวัติการป่วย<br/>ต้นนี้สุขภาพดี!
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      router.push(`/orchard/hospital?id=${orchardId}&treeId=${existingTree.id}`);
                    }}
                    className="mt-3 px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 active:bg-red-200 dark:active:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl font-bold text-xs transition-colors active:scale-95"
                  >
                    🏥 บันทึกอาการ
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      พบ {treeRecords.length} รายการ
                    </p>
                    <button
                      onClick={() => {
                        onClose();
                        router.push(`/orchard/hospital?id=${orchardId}&viewTreeId=${existingTree.id}`);
                      }}
                      className="text-[10px] text-red-600 dark:text-red-400 font-bold hover:underline"
                    >
                      ดูทั้งหมด →
                    </button>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {treeRecords.map((record) => {
                      const severityMeta = SEVERITY_BG[record.severity];
                      const isActive = record.status === 'treating';
                      
                      return (
                        <div
                          key={record.id}
                          className={`p-3 rounded-xl border ${
                            isActive
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${severityMeta.bg} ${severityMeta.bgDark}`}>
                                {severityMeta.label}
                              </span>
                              {isActive && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500 text-white">
                                  กำลังรักษา
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {new Date(record.createdAt).toLocaleDateString('th-TH', { 
                                day: 'numeric', 
                                month: 'short',
                                year: '2-digit'
                              })}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">
                            <strong>อาการ:</strong> {record.symptoms}
                          </p>

                          {record.photos && record.photos.length > 0 && (
                            <div className="flex gap-1 mb-2">
                              {record.photos.slice(0, 3).map((photo, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => openLightbox(record.photos || [], idx)}
                                  className="relative w-12 h-12 rounded border border-slate-200 dark:border-slate-600 overflow-hidden hover:ring-2 hover:ring-red-400 transition-all group cursor-pointer"
                                >
                                  <img
                                    src={photo}
                                    alt={`อาการ ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                      🔍
                                    </span>
                                  </div>
                                </button>
                              ))}
                              {record.photos.length > 3 && (
                                <div className="w-12 h-12 rounded border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                                  +{record.photos.length - 3}
                                </div>
                              )}
                            </div>
                          )}

                          {record.medicines && record.medicines.length > 0 && record.medicines[0].name && (
                            <div className="text-[10px] text-slate-600 dark:text-slate-400">
                              <strong>ยา:</strong> {record.medicines.map(m => m.name).filter(Boolean).join(', ')}
                            </div>
                          )}

                          {record.treatmentResult && (
                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                              <span className="text-[10px] text-slate-600 dark:text-slate-400">
                                ผลการรักษา: <strong>
                                  {record.treatmentResult === 'better' ? '✅ ดีขึ้น' : 
                                   record.treatmentResult === 'worse' ? '❌ แย่ลง' : '➡️ ไม่เปลี่ยน'}
                                </strong>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      router.push(`/orchard/hospital?id=${orchardId}&treeId=${existingTree.id}`);
                    }}
                    className="w-full py-3 sm:py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 active:bg-red-200 dark:active:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl font-bold text-sm transition-colors active:scale-95"
                  >
                    🏥 บันทึกอาการใหม่
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
      
      {/* Image Lightbox */}
      {showLightbox && (
        <ImageViewerModal
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
  );
}
