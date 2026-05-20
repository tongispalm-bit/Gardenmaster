'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards,
  getTreeProfiles,
  getHospitalRecords,
  addHospitalRecord,
  updateHospitalRecord,
  deleteHospitalRecord,
  updateTreeProfile,
  type Orchard,
  type TreeProfile,
  type HospitalRecord,
  type Severity,
  type TreatmentResult,
  type HospitalStatus,
  type MedicineItem,
} from '@/lib/firebase';
import { Stethoscope, Plus, Trash2, X, ChevronDown, ChevronUp, Camera } from 'lucide-react';
import SubPageHeader from '../_components/SubPageHeader';

const SEVERITY_LABEL: Record<Severity, string> = {
  mild: 'เล็กน้อย',
  moderate: 'ปานกลาง',
  severe: 'รุนแรง',
};
const SEVERITY_COLOR: Record<Severity, string> = {
  mild: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  moderate: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const EMPTY_FORM = {
  treeId: '',
  treeNumber: '',
  dateFound: '',
  symptoms: '',
  photos: [] as string[],
  severity: 'mild' as Severity,
  medicines: [{ name: '', amount: '' }] as MedicineItem[],
  treatmentResult: null as TreatmentResult | null,
  recoveryDate: '',
  status: 'treating' as HospitalStatus,
  note: '',
};
const RESULT_LABEL: Record<TreatmentResult, string> = {
  better: '✅ ดีขึ้น',
  same: '➡️ ไม่เปลี่ยน',
  worse: '❌ แย่ลง',
};
const STATUS_LABEL: Record<HospitalStatus, string> = {
  treating: '🏥 กำลังรักษา',
  recovered: '✅ หายแล้ว',
};

export default function HospitalClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';
  const preselectedTreeId = searchParams.get('treeId') || '';

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [trees, setTrees] = useState<TreeProfile[]>([]);
  const [records, setRecords] = useState<HospitalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    dateFound: new Date().toISOString().split('T')[0],
  }));

  useEffect(() => {
    if (!orchardId) { router.push('/'); return; }
    loadData();
  }, [orchardId]);

  const loadData = async () => {
    try {
      const [orchards, treeData, recordData] = await Promise.all([
        getOrchards(),
        getTreeProfiles(orchardId),
        getHospitalRecords(orchardId),
      ]);
      setOrchard(orchards.find(o => o.id === orchardId) || null);
      setTrees(treeData);
      setRecords(recordData);

      // Auto-select ต้นถ้ามี treeId จาก query string
      if (preselectedTreeId && treeData.length > 0) {
        const preTree = treeData.find(t => t.id === preselectedTreeId);
        if (preTree) {
          setForm(prev => ({ ...prev, treeId: preTree.id, treeNumber: preTree.treeNumber }));
          setShowForm(true);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Photo handler — convert to base64
  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 6 - form.photos.length;
    const toProcess = files.slice(0, remaining);
    toProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setForm(prev => ({
          ...prev,
          photos: [...prev.photos, ev.target?.result as string],
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removePhoto = (idx: number) => {
    setForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));
  };

  const addMedicine = () => {
    setForm(prev => ({ ...prev, medicines: [...prev.medicines, { name: '', amount: '' }] }));
  };

  const removeMedicine = (idx: number) => {
    setForm(prev => ({ ...prev, medicines: prev.medicines.filter((_, i) => i !== idx) }));
  };

  const updateMedicine = (idx: number, field: keyof MedicineItem, value: string) => {
    setForm(prev => {
      const meds = [...prev.medicines];
      meds[idx] = { ...meds[idx], [field]: value };
      return { ...prev, medicines: meds };
    });
  };

  const handleTreeSelect = (treeId: string) => {
    const tree = trees.find(t => t.id === treeId);
    setForm(prev => ({ ...prev, treeId, treeNumber: tree?.treeNumber || '' }));
  };

  const handleSubmit = async () => {
    if (!form.treeId || !form.symptoms) return;
    setSaving(true);
    try {
      const payload = {
        orchardId,
        treeId: form.treeId,
        treeNumber: form.treeNumber,
        dateFound: form.dateFound,
        symptoms: form.symptoms,
        photos: form.photos,
        severity: form.severity,
        medicines: form.medicines.filter(m => m.name.trim()),
        treatmentResult: form.treatmentResult,
        recoveryDate: form.recoveryDate,
        status: form.status,
        note: form.note,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      if (editingId) {
        await updateHospitalRecord(editingId, payload);
      } else {
        await addHospitalRecord(payload);
      }

      // Auto-update TreeProfile status
      if (form.treeId) {
        if (payload.status === 'treating') {
          // กำลังรักษา → เปลี่ยนเป็นเฝ้าระวัง
          await updateTreeProfile(form.treeId, { status: 'watch', updatedAt: Date.now() });
        } else if (payload.status === 'recovered') {
          // หายแล้ว → ดึงข้อมูลล่าสุดจาก Firestore server แล้วตรวจว่ายังมีบันทึกอื่นที่กำลังรักษาอยู่ไหม
          const freshRecords = await getHospitalRecords(orchardId);
          const stillTreating = freshRecords.some(
            r => r.treeId === form.treeId && r.status === 'treating'
          );
          if (!stillTreating) {
            await updateTreeProfile(form.treeId, { status: 'normal', updatedAt: Date.now() });
          }
        }
      }
      setForm({ ...EMPTY_FORM, dateFound: new Date().toISOString().split('T')[0] });
      setShowForm(false);
      setEditingId(null);
      await loadData();
    } catch {
      alert('บันทึกไม่สำเร็จ!');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (r: HospitalRecord) => {
    setForm({
      treeId: r.treeId,
      treeNumber: r.treeNumber,
      dateFound: r.dateFound,
      symptoms: r.symptoms,
      photos: r.photos || [],
      severity: r.severity,
      medicines: r.medicines.length ? r.medicines : [{ name: '', amount: '' }],
      treatmentResult: r.treatmentResult,
      recoveryDate: r.recoveryDate || '',
      status: r.status,
      note: r.note || '',
    });
    setEditingId(r.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ลบบันทึกนี้?')) return;
    await deleteHospitalRecord(id);
    await loadData();
  };

  if (!orchard || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  const isDurianBackyard = orchard.name === 'ทุเรียนหลังบ้าน';

  // Group records by tree
  const byTree: Record<string, HospitalRecord[]> = {};
  for (const r of records) {
    if (!byTree[r.treeNumber]) byTree[r.treeNumber] = [];
    byTree[r.treeNumber].push(r);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-8">
      <SubPageHeader
        orchardName={orchard.name}
        orchardColor={orchard.color}
        orchardId={orchardId}
        isDurianBackyard={isDurianBackyard}
        title="ห้องพยาบาล"
        Icon={Stethoscope}
      />

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {/* ปุ่มเพิ่ม */}
        {!showForm && (
          <button
            onClick={() => { setForm({ ...EMPTY_FORM, dateFound: new Date().toISOString().split('T')[0] }); setEditingId(null); setShowForm(true); }}
            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Plus size={18} /> บันทึกอาการใหม่
          </button>
        )}

        {/* ── ฟอร์มบันทึก ── */}
        {showForm && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-red-50 dark:bg-red-900/20">
              <h2 className="font-bold text-red-700 dark:text-red-400">
                {editingId ? 'แก้ไขบันทึก' : 'บันทึกอาการใหม่'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* เลือกต้น */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">เลือกต้น <span className="text-red-500">*</span></label>
                {trees.length === 0 ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">ยังไม่มีข้อมูลต้น — กรอกข้อมูลในผังสวนก่อน</p>
                    <button type="button" onClick={() => router.push(`/orchard/farm-map?id=${orchardId}`)}
                      className="text-xs font-bold text-amber-700 dark:text-amber-400 underline">
                      → ไปผังสวน
                    </button>
                  </div>
                ) : (
                  <select
                    value={form.treeId}
                    onChange={e => handleTreeSelect(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-red-500 text-slate-800 dark:text-white text-sm"
                  >
                    <option value="">-- เลือกต้น --</option>
                    {trees.map(t => (
                      <option key={t.id} value={t.id}>{t.treeNumber}{t.variety ? ` · ${t.variety}` : ''}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* วันที่ + ความรุนแรง */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">วันที่พบอาการ</label>
                  <input type="date" value={form.dateFound}
                    onChange={e => setForm({ ...form, dateFound: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-red-500 text-slate-800 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ความรุนแรง</label>
                  <select value={form.severity}
                    onChange={e => setForm({ ...form, severity: e.target.value as Severity })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-red-500 text-slate-800 dark:text-white text-sm">
                    <option value="mild">เล็กน้อย</option>
                    <option value="moderate">ปานกลาง</option>
                    <option value="severe">รุนแรง</option>
                  </select>
                </div>
              </div>

              {/* อาการ */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">อาการที่พบ <span className="text-red-500">*</span></label>
                <textarea rows={2} value={form.symptoms}
                  onChange={e => setForm({ ...form, symptoms: e.target.value })}
                  placeholder="เช่น ใบเหลือง รากเน่า มีแมลง..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-red-500 text-slate-800 dark:text-white text-sm resize-none" />
              </div>

              {/* รูปภาพ */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  รูปภาพอาการ ({form.photos.length}/6)
                </label>
                <div className="flex flex-wrap gap-2">
                  {form.photos.map((p, i) => (
                    <div key={i} className="relative w-16 h-16">
                      <img src={p} alt="" className="w-full h-full object-cover rounded-xl border border-slate-200 dark:border-slate-600" />
                      <button onClick={() => removePhoto(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                        ✕
                      </button>
                    </div>
                  ))}
                  {form.photos.length < 6 && (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400 hover:border-red-400 hover:text-red-400 transition-colors cursor-pointer">
                      <Camera size={18} />
                      <span className="text-[9px] mt-0.5">เพิ่ม</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotos}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* ยาที่ใช้ */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">รายการยาที่ใช้</label>
                  <button onClick={addMedicine} className="text-xs text-red-500 font-bold flex items-center gap-1">
                    <Plus size={12} /> เพิ่มยา
                  </button>
                </div>
                <div className="space-y-2">
                  {form.medicines.map((m, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input type="text" value={m.name}
                        onChange={e => updateMedicine(i, 'name', e.target.value)}
                        placeholder="ชื่อยา"
                        className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-red-500 text-slate-800 dark:text-white text-sm" />
                      <input type="text" value={m.amount}
                        onChange={e => updateMedicine(i, 'amount', e.target.value)}
                        placeholder="ปริมาณ"
                        className="w-24 p-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-red-500 text-slate-800 dark:text-white text-sm" />
                      {form.medicines.length > 1 && (
                        <button onClick={() => removeMedicine(i)} className="text-slate-400 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ผลการรักษา + สถานะ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ผลการรักษา</label>
                  <select value={form.treatmentResult || ''}
                    onChange={e => setForm({ ...form, treatmentResult: (e.target.value || null) as TreatmentResult | null })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-red-500 text-slate-800 dark:text-white text-sm">
                    <option value="">-- ยังไม่ระบุ --</option>
                    <option value="better">ดีขึ้น</option>
                    <option value="same">ไม่เปลี่ยน</option>
                    <option value="worse">แย่ลง</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">สถานะ</label>
                  <select value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value as HospitalStatus })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-red-500 text-slate-800 dark:text-white text-sm">
                    <option value="treating">กำลังรักษา</option>
                    <option value="recovered">หายแล้ว</option>
                  </select>
                </div>
              </div>

              {/* วันหายป่วย */}
              {form.status === 'recovered' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">วันหายป่วย</label>
                  <input type="date" value={form.recoveryDate}
                    onChange={e => setForm({ ...form, recoveryDate: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-red-500 text-slate-800 dark:text-white text-sm" />
                </div>
              )}

              {/* หมายเหตุ */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">หมายเหตุ</label>
                <input type="text" value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  placeholder="หมายเหตุเพิ่มเติม..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-red-500 text-slate-800 dark:text-white text-sm" />
              </div>

              {/* ปุ่ม */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowForm(false); setEditingId(null); }} disabled={saving}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 text-sm">
                  ยกเลิก
                </button>
                <button onClick={handleSubmit} disabled={saving || !form.treeId || !form.symptoms}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all">
                  {saving ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'บันทึก'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ประวัติแยกตามต้น ── */}
        <h2 className="font-bold text-slate-800 dark:text-white text-sm">
          ประวัติการป่วย ({records.length} รายการ)
        </h2>

        {records.length === 0 ? (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400 text-sm">
            ยังไม่มีบันทึก
          </div>
        ) : (
          Object.entries(byTree).map(([treeNum, treeRecords]) => (
            <div key={treeNum} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Tree header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <span className="font-bold text-sm text-slate-800 dark:text-white">🌳 ต้น {treeNum}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{treeRecords.length} ครั้ง</span>
              </div>

              {/* Records */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {treeRecords.map(r => (
                  <div key={r.id}>
                    {/* Summary row */}
                    <button
                      onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEVERITY_COLOR[r.severity]}`}>
                            {SEVERITY_LABEL[r.severity]}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.status === 'treating'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          }`}>
                            {r.status === 'treating' ? '🏥 รักษา' : '✅ หาย'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-200 mt-1 truncate">{r.symptoms}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{r.dateFound}</p>
                      </div>
                      {expandedId === r.id ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0 ml-2" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0 ml-2" />}
                    </button>

                    {/* Expanded detail */}
                    {expandedId === r.id && (
                      <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-3">
                        {/* รูปภาพ */}
                        {r.photos && r.photos.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {r.photos.map((p, i) => (
                              <img key={i} src={p} alt="" className="w-16 h-16 object-cover rounded-xl border border-slate-200 dark:border-slate-600" />
                            ))}
                          </div>
                        )}

                        {/* ยา */}
                        {r.medicines.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ยาที่ใช้</p>
                            <div className="space-y-1">
                              {r.medicines.map((m, i) => (
                                <div key={i} className="flex justify-between text-sm bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg">
                                  <span className="text-slate-700 dark:text-slate-200">{m.name}</span>
                                  <span className="text-slate-500 dark:text-slate-400">{m.amount}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ผลการรักษา + วันหาย */}
                        <div className="flex flex-wrap gap-3 text-sm">
                          {r.treatmentResult && (
                            <span className="text-slate-700 dark:text-slate-200">
                              ผล: {RESULT_LABEL[r.treatmentResult]}
                            </span>
                          )}
                          {r.recoveryDate && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              หายวันที่ {r.recoveryDate}
                            </span>
                          )}
                        </div>

                        {r.note && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic">{r.note}</p>
                        )}

                        {/* ปุ่ม */}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => handleEdit(r)}
                            className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
                            ✏️ แก้ไข
                          </button>
                          <button onClick={() => handleDelete(r.id)}
                            className="flex-1 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl text-xs font-bold text-red-600 dark:text-red-400">
                            🗑️ ลบ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
