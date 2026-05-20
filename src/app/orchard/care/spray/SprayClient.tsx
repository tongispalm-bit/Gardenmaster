'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards, addSprayRecord, getSprayRecords, deleteSprayRecord,
  type Orchard, type SprayRecord, type SprayMedicine,
} from '@/lib/firebase';
import { Bug, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import SubPageHeader from '../../_components/SubPageHeader';

export default function SprayClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [records, setRecords] = useState<SprayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const emptyForm = {
    date: new Date().toISOString().split('T')[0],
    purpose: '',
    pestDisease: '',
    medicines: [{ name: '', amount: '', unit: 'ซีซี' }] as SprayMedicine[],
    note: '',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!orchardId) { router.push('/'); return; }
    loadData();
  }, [orchardId]);

  const loadData = async () => {
    try {
      const [orchards, r] = await Promise.all([getOrchards(), getSprayRecords(orchardId)]);
      setOrchard(orchards.find(o => o.id === orchardId) || null);
      setRecords(r);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const addMed = () => setForm(p => ({ ...p, medicines: [...p.medicines, { name: '', amount: '', unit: 'ซีซี' }] }));
  const removeMed = (i: number) => setForm(p => ({ ...p, medicines: p.medicines.filter((_, idx) => idx !== i) }));
  const updateMed = (i: number, field: keyof SprayMedicine, val: string) => {
    setForm(p => { const m = [...p.medicines]; m[i] = { ...m[i], [field]: val }; return { ...p, medicines: m }; });
  };

  const handleAdd = async () => {
    if (!form.purpose) return;
    setSaving(true);
    try {
      await addSprayRecord({
        orchardId, date: form.date, purpose: form.purpose,
        pestDisease: form.pestDisease,
        medicines: form.medicines.filter(m => m.name.trim()),
        note: form.note, createdAt: Date.now(),
      });
      setForm(emptyForm);
      await loadData();
    } catch { alert('บันทึกไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  if (!orchard || loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-8">
      <SubPageHeader orchardName={orchard.name} orchardColor={orchard.color} orchardId={orchardId} isDurianBackyard={orchard.name === 'ทุเรียนหลังบ้าน'} title="พ่นยา" Icon={Bug} />

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">

        {/* ── ฟอร์มบันทึก ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h2 className="font-bold text-sm text-orange-700 dark:text-orange-400">บันทึกการพ่นยา</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">วันที่</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-orange-500 text-sm text-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ชื่อโรค / แมลง</label>
              <input type="text" value={form.pestDisease} onChange={e => setForm({ ...form, pestDisease: e.target.value })}
                placeholder="เช่น ราน้ำค้าง, เพลี้ย"
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-orange-500 text-sm text-slate-800 dark:text-white" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">วัตถุประสงค์ <span className="text-red-500">*</span></label>
            <input type="text" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })}
              placeholder="เช่น ป้องกันราน้ำค้าง + เพิ่มธาตุอาหาร"
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-orange-500 text-sm text-slate-800 dark:text-white" />
          </div>

          {/* รายการยา */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">รายการยาที่ใช้</label>
              <button onClick={addMed} className="text-xs text-orange-500 font-bold flex items-center gap-1"><Plus size={12} /> เพิ่มยา</button>
            </div>
            <div className="space-y-2">
              {form.medicines.map((m, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="text" value={m.name} onChange={e => updateMed(i, 'name', e.target.value)}
                      placeholder="ชื่อยา"
                      className="flex-1 min-w-0 p-2 bg-white dark:bg-slate-700 rounded-lg outline-none focus:ring-2 ring-orange-500 text-sm text-slate-800 dark:text-white" />
                    {form.medicines.length > 1 && (
                      <button onClick={() => removeMed(i)} className="text-slate-400 hover:text-red-500 flex-shrink-0"><Trash2 size={14} /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={m.amount} onChange={e => updateMed(i, 'amount', e.target.value)}
                      placeholder="ปริมาณ"
                      className="p-2 bg-white dark:bg-slate-700 rounded-lg outline-none focus:ring-2 ring-orange-500 text-sm text-slate-800 dark:text-white" />
                    <select value={m.unit} onChange={e => updateMed(i, 'unit', e.target.value)}
                      className="p-2 bg-white dark:bg-slate-700 rounded-lg outline-none text-sm text-slate-800 dark:text-white">
                      <option>ซีซี</option>
                      <option>มล.</option>
                      <option>กรัม</option>
                      <option>ช้อน</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">หมายเหตุ</label>
            <input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
              placeholder="หมายเหตุเพิ่มเติม..."
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-orange-500 text-sm text-slate-800 dark:text-white" />
          </div>

          <button onClick={handleAdd} disabled={saving || !form.purpose}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm">
            บันทึกการพ่นยา
          </button>
        </div>

        {/* ── ประวัติ ── */}
        <h2 className="font-bold text-sm text-slate-800 dark:text-white">ประวัติการพ่นยา ({records.length})</h2>
        {records.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 text-sm py-6">ยังไม่มีบันทึก</p>
        ) : (
          <div className="space-y-2">
            {records.map(r => (
              <div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{r.purpose}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{r.date}{r.pestDisease ? ` · ${r.pestDisease}` : ''}</p>
                  </div>
                  {expandedId === r.id ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0 ml-2" /> : <ChevronDown size={14} className="text-slate-400 flex-shrink-0 ml-2" />}
                </button>
                {expandedId === r.id && (
                  <div className="px-4 pb-3 border-t border-slate-100 dark:border-slate-700 pt-2 space-y-2">
                    {r.medicines.length > 0 && (
                      <div className="space-y-1">
                        {r.medicines.map((m, i) => (
                          <div key={i} className="flex justify-between text-xs bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg">
                            <span className="text-slate-700 dark:text-slate-200">{m.name}</span>
                            <span className="text-slate-500 dark:text-slate-400">{m.amount} {m.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {r.note && <p className="text-xs text-slate-500 dark:text-slate-400 italic">{r.note}</p>}
                    <button onClick={() => { if (confirm('ลบบันทึกนี้?')) deleteSprayRecord(r.id).then(loadData); }}
                      className="text-xs text-red-500 font-bold">🗑️ ลบ</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
