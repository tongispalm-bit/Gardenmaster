'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchard,
  getTreeProfiles,
  getHospitalRecords,
  addHospitalRecord,
  updateHospitalRecord,
  deleteHospitalRecord,
  updateTreeProfile,
  isDurianFarm,
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
import ImageLightbox from '../farm-map/ImageLightbox';

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
  const viewTreeId = searchParams.get('viewTreeId') || '';

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [trees, setTrees] = useState<TreeProfile[]>([]);
  const [records, setRecords] = useState<HospitalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

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
      const [orchard, treeData, recordData] = await Promise.all([
        getOrchard(orchardId), // ✅ ดึงเฉพาะสวนเดียว
        getTreeProfiles(orchardId),
        getHospitalRecords(orchardId),
      ]);
      setOrchard(orchard);
      setTrees(treeData);
      setRecords(recordData);

      // Auto-select ต้นถ้ามี treeId จาก query string (เปิดฟอร์มบันทึกใหม่)
      if (preselectedTreeId) {
        if (treeData.length > 0) {
          const preTree = treeData.find(t => t.id === preselectedTreeId);
          if (preTree) {
            setForm(prev => ({ ...prev, treeId: preTree.id, treeNumber: preTree.treeNumber }));
            setShowForm(true);
          } else {
            // ต้นอาจยังไม่ปรากฏใน list (timing issue) — เปิดฟอร์มแบบไม่ preselect
            setShowForm(true);
          }
        } else {
          // ยังไม่มีต้นเลยในระบบ — เปิดฟอร์มแบบไม่ preselect
          setShowForm(true);
        }
      }

      // ถ้ามี viewTreeId — แสดงเฉพาะประวัติของต้นนั้น (filter)
      if (viewTreeId) {
        // scroll ไปที่ section ประวัติ + auto-expand บันทึกแรกของต้นนั้น
        setTimeout(() => {
          const el = document.getElementById(`tree-history-${viewTreeId}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Photo handler — iOS Safari + Android compatible
  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const currentSize = form.photos.reduce((sum, p) => sum + p.length, 0);
    const currentKB = Math.round(currentSize / 1024);
    const remaining = Math.min(3 - form.photos.length, files.length);
    
    if (remaining <= 0) {
      alert('⚠️ เพิ่มรูปได้สูงสุด 3 รูปเท่านั้น');
      e.target.value = '';
      return;
    }
    
    if (currentKB > 600) {
      alert('⚠️ รูปเต็มแล้ว!');
      e.target.value = '';
      return;
    }
    
    setProcessing(true);
    
    // Process first file only (iOS + Android compat)
    const file = files[0];
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('❌ กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      setProcessing(false);
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      const img = new Image();
      
      // Fix iOS orientation issues
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          // Calculate target size (increase from 400 to 600 for better quality)
          let w = img.width;
          let h = img.height;
          const max = 600;
          
          if (w > max || h > max) {
            if (w > h) {
              h = (h * max) / w;
              w = max;
            } else {
              w = (w * max) / h;
              h = max;
            }
          }
          
          // Create canvas
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(w);
          canvas.height = Math.round(h);
          
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            throw new Error('Canvas not supported');
          }
          
          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Draw white background + image
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Convert to WebP (เล็กกว่า JPEG ~25-35% ที่คุณภาพเท่ากัน)
          // ถ้าเบราว์เซอร์ไม่รองรับ WebP จะ fallback กลับไป JPEG อัตโนมัติ
          let dataUrl = canvas.toDataURL('image/webp', 0.8);
          const isWebp = dataUrl.startsWith('data:image/webp');
          if (!isWebp) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          }
          const sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);
          
          console.log(`📸 Photo processed: ${w}x${h}px, ${sizeKB}KB (${isWebp ? 'WebP' : 'JPEG fallback'})`);
          
          // Check total size (increased limit to 700KB)
          if (currentKB + sizeKB > 700) {
            alert('⚠️ รูปรวมจะเกิน 700KB\nลองใช้รูปที่เล็กกว่า');
            setProcessing(false);
            e.target.value = '';
            return;
          }
          
          // Update form
          setForm(prev => ({
            ...prev,
            photos: [...prev.photos, dataUrl]
          }));
          
          setProcessing(false);
          e.target.value = '';
          
        } catch (err) {
          console.error('Canvas error:', err);
          alert('❌ ไม่สามารถประมวลผลรูปได้\nลองรูปอื่นหรือเปลี่ยนเบราว์เซอร์');
          setProcessing(false);
          e.target.value = '';
        }
      };
      
      img.onerror = () => {
        alert('❌ ไม่สามารถโหลดรูปได้\nรูปอาจเสียหายหรือเป็นรูปแบบที่ไม่รองรับ');
        setProcessing(false);
        e.target.value = '';
      };
      
      img.src = evt.target?.result as string;
    };
    
    reader.onerror = () => {
      alert('❌ ไม่สามารถอ่านไฟล์ได้\nกรุณาตรวจสอบสิทธิ์การเข้าถึงไฟล์');
      setProcessing(false);
      e.target.value = '';
    };
    
    reader.readAsDataURL(file);
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
    if (!form.treeId || !form.symptoms) {
      alert('⚠️ กรุณาเลือกต้นและระบุอาการ');
      return;
    }
    
    // ตรวจสอบขนาดรวมก่อนบันทึก
    const totalPhotoSize = form.photos.reduce((sum, p) => sum + p.length, 0);
    const sizeInKB = Math.round(totalPhotoSize / 1024);
    const estimatedDocSize = sizeInKB + 50; // +50KB สำหรับข้อมูลอื่นๆ
    
    console.log(`📊 Document size estimate: ${estimatedDocSize} KB (photos: ${sizeInKB} KB)`);
    
    // Firestore limit = 1MB (1024KB) — เตือนที่ 700KB (เพื่อความปลอดภัย)
    if (estimatedDocSize > 700) {
      const confirmed = confirm(
        `⚠️ ข้อมูลมีขนาด ${estimatedDocSize} KB\n\n` +
        `Firestore อนุญาตสูงสุด 1MB (1024 KB)\n` +
        `แนะนำให้ลดจำนวนรูปเหลือ 2 รูป\n\n` +
        `ต้องการบันทึกต่อหรือไม่?`
      );
      if (!confirmed) {
        setSaving(false);
        return;
      }
    }
    
    setSaving(true);
    try {
      const now = Date.now();
      
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
        createdAt: now,
        updatedAt: now,
      };

      // ── 1) บันทึก/แก้ไข Hospital Record ──
      let savedRecordId: string;
      let oldRecord: HospitalRecord | undefined;
      if (editingId) {
        oldRecord = records.find(r => r.id === editingId);
        const editHistory = [
          ...(oldRecord?.editHistory ?? []),
          ...(oldRecord ? [{
            editedAt: now,
            symptoms: oldRecord.symptoms,
            severity: oldRecord.severity,
            medicines: oldRecord.medicines,
            treatmentResult: oldRecord.treatmentResult,
            status: oldRecord.status,
            recoveryDate: oldRecord.recoveryDate,
            note: oldRecord.note,
          }] : []),
        ];
        await updateHospitalRecord(editingId, { ...payload, editHistory });
        savedRecordId = editingId;
      } else {
        savedRecordId = await addHospitalRecord(payload);
      }

      // ── 2) คำนวณ "ประวัติล่าสุด" ของต้นนี้ จาก local records ──
      const newRecord: HospitalRecord = {
        id: savedRecordId,
        ...payload,
      } as HospitalRecord;

      const treeRecordsAfterSave: HospitalRecord[] = editingId
        ? records.map(r => r.id === savedRecordId ? newRecord : r)
        : [...records, newRecord];

      const treeOnly = treeRecordsAfterSave.filter(r => r.treeId === form.treeId);
      const latest = treeOnly.reduce<HospitalRecord | null>(
        (acc, r) => (!acc || r.createdAt >= acc.createdAt) ? r : acc,
        null
      );

      // ── 3) Sync TreeProfile.status ตามประวัติล่าสุด ──
      const expectedTreeStatus: 'normal' | 'watch' = latest && latest.status === 'treating'
        ? 'watch'
        : 'normal';

      await updateTreeProfile(form.treeId, {
        status: expectedTreeStatus,
        updatedAt: now,
      });

      // ── 4) Reset form + reload ──
      setForm({ ...EMPTY_FORM, dateFound: new Date().toISOString().split('T')[0] });
      setShowForm(false);
      setEditingId(null);
      await loadData();

      // ── 5) แสดงข้อความยืนยัน ──
      alert(
        `✅ บันทึกสำเร็จ!\n\nต้น ${form.treeNumber}\n→ ${expectedTreeStatus === 'normal' ? 'สถานะปกติ 🌳' : 'เฝ้าระวัง 🌲'}`
      );
    } catch (e: unknown) {
      console.error('[Hospital] save failed', e);
      
      // แสดง error message ที่เข้าใจง่าย
      const errorMsg = e instanceof Error ? e.message : String(e);
      
      if (errorMsg.includes('size') || errorMsg.includes('too large') || errorMsg.includes('maximum')) {
        alert(
          '❌ บันทึกไม่สำเร็จ!\n\n' +
          'ข้อมูลมีขนาดใหญ่เกินกว่าที่ Firestore รองรับ (1MB)\n\n' +
          'วิธีแก้:\n' +
          '• ลดจำนวนรูปลง (แนะนำไม่เกิน 3-4 รูป)\n' +
          '• ลบรูปบางรูปแล้วลองใหม่\n' +
          '• กดบันทึกโดยไม่ใส่รูปก่อน แล้วแก้ไขทีหลัง'
        );
      } else if (errorMsg.includes('network') || errorMsg.includes('offline')) {
        alert('❌ บันทึกไม่สำเร็จ!\n\nไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้\nกรุณาตรวจสอบการเชื่อมต่อ');
      } else if (errorMsg.includes('permission') || errorMsg.includes('denied')) {
        alert('❌ บันทึกไม่สำเร็จ!\n\nไม่มีสิทธิ์เข้าถึง Firestore\nกรุณาตรวจสอบ Firestore Rules');
      } else {
        alert(
          `❌ บันทึกไม่สำเร็จ!\n\n${errorMsg}\n\n` +
          'ลองลดจำนวนรูปภาพหรือรีเฟรชหน้าเว็บ'
        );
      }
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
    const target = records.find(r => r.id === id);
    await deleteHospitalRecord(id);

    // หลังลบ → คำนวณประวัติล่าสุดของต้นใหม่ → sync TreeProfile
    if (target) {
      const remaining = records.filter(r => r.id !== id && r.treeId === target.treeId);
      const latest = remaining.reduce<HospitalRecord | null>(
        (acc, r) => (!acc || r.createdAt >= acc.createdAt) ? r : acc,
        null
      );
      const expectedStatus: 'normal' | 'watch' = latest && latest.status === 'treating'
        ? 'watch'
        : 'normal';
      try {
        await updateTreeProfile(target.treeId, {
          status: expectedStatus,
          updatedAt: Date.now(),
        });
      } catch (e) {
        console.error('[Hospital] sync after delete failed', e);
      }
    }

    await loadData();
  };

  const openLightbox = (images: string[], startIndex: number) => {
    setLightboxImages(images);
    setLightboxIndex(startIndex);
    setShowLightbox(true);
  };

  if (!orchard || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  const isDurianBackyard = isDurianFarm(orchard.name);

  // ถ้ามี viewTreeId → filter เฉพาะต้นนั้น
  const filteredRecords = viewTreeId
    ? records.filter(r => r.treeId === viewTreeId)
    : records;

  // ชื่อต้นที่กำลัง filter
  const viewedTreeName = viewTreeId
    ? trees.find(t => t.id === viewTreeId)?.treeNumber || ''
    : '';

  // Group records by tree
  const byTree: Record<string, HospitalRecord[]> = {};
  for (const r of filteredRecords) {
    if (!byTree[r.treeNumber]) byTree[r.treeNumber] = [];
    byTree[r.treeNumber].push(r);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-8 overflow-x-clip">
      <SubPageHeader
        orchardName={orchard.name}
        orchardColor={orchard.color}
        orchardId={orchardId}
        isDurianBackyard={isDurianBackyard}
        title="ห้องพยาบาล"
        Icon={Stethoscope}
      />

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-3">

        {/* Banner: กำลังดูประวัติเฉพาะต้น */}
        {viewTreeId && viewedTreeName && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <div>
                <p className="text-xs font-bold text-blue-800 dark:text-blue-300">
                  ประวัติของต้น {viewedTreeName}
                </p>
                <p className="text-[10px] text-blue-600 dark:text-blue-400">
                  {filteredRecords.length} รายการ
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/orchard/hospital?id=${orchardId}`)}
              className="text-[10px] font-bold text-blue-700 dark:text-blue-400 hover:underline"
            >
              ดูทั้งหมด →
            </button>
          </div>
        )}

        {/* ปุ่มเพิ่ม */}
        {!showForm && (
          <button
            onClick={() => {
              // ถ้าอยู่ใน view mode → preselect ต้นนั้นใน form
              const preTree = viewTreeId ? trees.find(t => t.id === viewTreeId) : null;
              setForm({
                ...EMPTY_FORM,
                dateFound: new Date().toISOString().split('T')[0],
                treeId: preTree?.id ?? '',
                treeNumber: preTree?.treeNumber ?? '',
              });
              setEditingId(null);
              setShowForm(true);
            }}
            className="w-full py-2.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Plus size={16} /> บันทึกอาการใหม่
            {viewTreeId && viewedTreeName && (
              <span className="text-xs font-normal opacity-90">— {viewedTreeName}</span>
            )}
          </button>
        )}

        {/* ── ฟอร์มบันทึก ── */}
        {showForm && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-b border-slate-200 dark:border-slate-700 bg-red-50 dark:bg-red-900/20">
              <h2 className="text-sm font-bold text-red-700 dark:text-red-400">
                {editingId ? 'แก้ไขบันทึก' : 'บันทึกอาการใหม่'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 sm:p-4 space-y-2.5">
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
                <textarea rows={3} value={form.symptoms}
                  onChange={e => setForm({ ...form, symptoms: e.target.value })}
                  placeholder="เช่น เชื่อว่าไฟทอป, ใบเหลือง, รากเน่า, มีแมลง..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-red-500 text-slate-800 dark:text-white text-sm resize-none" />
              </div>

              {/* รูปภาพ */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  รูปภาพอาการ ({form.photos.length}/3)
                  {form.photos.length === 0 && <span className="text-slate-400 ml-1">(ไม่บังคับ)</span>}
                  {form.photos.length > 0 && (() => {
                    const totalSize = form.photos.reduce((sum, p) => sum + p.length, 0);
                    const sizeKB = Math.round(totalSize / 1024);
                    const color = sizeKB > 600 ? 'text-red-500' : sizeKB > 450 ? 'text-orange-500' : 'text-emerald-500';
                    return (
                      <span className={`ml-2 ${color} font-mono text-[10px]`}>
                        {sizeKB} KB
                        {sizeKB > 600 && ' ⚠️'}
                      </span>
                    );
                  })()}
                </label>
                <div className="flex flex-wrap gap-2">
                  {form.photos.map((p, i) => (
                    <div key={i} className="relative w-20 h-20 group">
                      <img src={p} alt="" className="w-full h-full object-cover rounded-lg border-2 border-slate-200 dark:border-slate-600 group-hover:border-red-400 transition-colors" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] py-0.5 text-center rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        {Math.round((p.length * 3) / 4 / 1024)} KB
                      </div>
                    </div>
                  ))}
                  {form.photos.length < 3 && (() => {
                    const totalSize = form.photos.reduce((sum, p) => sum + p.length, 0);
                    const sizeKB = Math.round(totalSize / 1024);
                    const canAddMore = sizeKB < 650;
                    
                    if (processing) {
                      return (
                        <div className="w-20 h-20 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-700 flex flex-col items-center justify-center text-blue-500 text-center p-1">
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                          <span className="text-[8px] mt-1 leading-tight">กำลัง<br/>ประมวลผล</span>
                        </div>
                      );
                    }
                    
                    return canAddMore ? (
                      <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400 hover:border-red-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all cursor-pointer">
                        <Camera size={20} />
                        <span className="text-[10px] mt-1 font-bold">เพิ่มรูป</span>
                        <input
                          type="file"
                          accept="image/*,image/jpeg,image/jpg,image/png,image/webp"
                          className="hidden"
                          disabled={processing}
                          onChange={handlePhotos}
                        />
                      </label>
                    ) : (
                      <div className="w-20 h-20 rounded-lg border-2 border-dashed border-red-300 dark:border-red-700 flex flex-col items-center justify-center text-red-400 text-center p-1">
                        <span className="text-[9px] font-bold leading-tight">เต็มแล้ว</span>
                        <span className="text-[8px] leading-tight">ลบก่อน</span>
                      </div>
                    );
                  })()}
                </div>
                {form.photos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      💡 รูปถูกย่อเหลือ 600px แปลงเป็น WebP สูงสุด 3 รูป
                    </p>
                    {(() => {
                      const totalSize = form.photos.reduce((sum, p) => sum + p.length, 0);
                      const sizeKB = Math.round(totalSize / 1024);
                      if (sizeKB > 600) {
                        return (
                          <p className="text-[10px] text-red-500 dark:text-red-400 font-bold">
                            ⚠️ รูปมีขนาดใหญ่ ({sizeKB} KB / 700 KB) — ลดเหลือ 2 รูป
                          </p>
                        );
                      } else if (sizeKB > 450) {
                        return (
                          <p className="text-[10px] text-orange-500 dark:text-orange-400">
                            ⚠️ รูปเริ่มใหญ่ ({sizeKB} KB) — ระวังอย่าให้เกิน 700 KB
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>

              {/* ยาที่ใช้ */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">รายการยาที่ใช้รักษา</label>
                  <button
                    type="button"
                    onClick={addMedicine}
                    className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-bold flex items-center gap-1 transition-colors"
                  >
                    <Plus size={14} /> เพิ่มยา
                  </button>
                </div>
                <div className="space-y-2">
                  {form.medicines.map((m, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={m.name}
                        onChange={e => updateMedicine(i, 'name', e.target.value)}
                        placeholder="ชื่อยา / ปุ๋ย"
                        className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-red-500 text-slate-800 dark:text-white text-sm"
                      />
                      <input
                        type="text"
                        value={m.amount}
                        onChange={e => updateMedicine(i, 'amount', e.target.value)}
                        placeholder="ปริมาณ"
                        className="w-28 p-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-red-500 text-slate-800 dark:text-white text-sm"
                      />
                      {form.medicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedicine(i)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                  💡 สามารถเพิ่มยาได้หลายรายการ (ไม่บังคับ)
                </p>
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

        {/* ── ประวัติการรักษา ── */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800 dark:text-white text-sm">
            📋 ประวัติการรักษา
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({filteredRecords.length} รายการ)
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
            <div className="text-center text-slate-400 dark:text-slate-500">
              <Stethoscope size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm font-bold">ยังไม่มีบันทึกการรักษา</p>
              <p className="text-xs mt-1">กดปุ่ม "บันทึกอาการใหม่" เพื่อเริ่มต้น</p>
            </div>
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
                              <button
                                key={i}
                                type="button"
                                onClick={() => openLightbox(r.photos || [], i)}
                                className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden hover:ring-2 hover:ring-red-400 transition-all group cursor-pointer"
                              >
                                <img 
                                  src={p} 
                                  alt={`รูปที่ ${i + 1}`} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                  <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                    🔍
                                  </span>
                                </div>
                              </button>
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

      {/* Image Lightbox */}
      {showLightbox && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </div>
  );
}
