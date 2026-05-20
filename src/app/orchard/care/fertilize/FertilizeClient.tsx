'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards, getFertilizerFormulas, addFertilizerFormula,
  updateFertilizerFormula, deleteFertilizerFormula,
  addFertilizerRecord, getFertilizerRecords, deleteFertilizerRecord,
  GROWTH_STAGE_LABEL,
  type Orchard, type FertilizerFormula, type FertilizerRecord, type GrowthStage,
} from '@/lib/firebase';
import { Leaf, Plus, Trash2, Pencil, X, ChevronDown, ChevronUp } from 'lucide-react';
import SubPageHeader from '../../_components/SubPageHeader';

const DEFAULT_FORMULAS = [
  { name: 'สูตรบำรุงใบ', npk: '30-10-10', stage: 'leaf' as GrowthStage },
  { name: 'สูตรออกดอก', npk: '10-30-20', stage: 'flower' as GrowthStage },
  { name: 'สูตรติดผล', npk: '10-10-30', stage: 'fruit' as GrowthStage },
  { name: 'สูตรฟื้นฟู', npk: '15-15-15', stage: 'recovery' as GrowthStage },
];

export default function FertilizeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [formulas, setFormulas] = useState<FertilizerFormula[]>([]);
  const [records, setRecords] = useState<FertilizerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);
  const [editingFormula, setEditingFormula] = useState<FertilizerFormula | null>(null);
  const [showAddFormula, setShowAddFormula] = useState(false);

  const [formulaForm, setFormulaForm] = useState({ name: '', npk: '', stage: 'leaf' as GrowthStage });
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    formulaId: '',
    amount: 0,
    unit: 'กิโลกรัม',
  });

  useEffect(() => {
    if (!orchardId) { router.push('/'); return; }
    loadData();
  }, [orchardId]);

  const loadData = async () => {
    try {
      const [orchards, f, r] = await Promise.all([
        getOrchards(), getFertilizerFormulas(orchardId), getFertilizerRecords(orchardId),
      ]);
      setOrchard(orchards.find(o => o.id === orchardId) || null);
      setFormulas(f);
      setRecords(r);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSeedFormulas = async () => {
    setSaving(true);
    try {
      for (const f of DEFAULT_FORMULAS) {
        await addFertilizerFormula({ orchardId, ...f, createdAt: Date.now() });
      }
      await loadData();
    } catch { alert('เพิ่มสูตรไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  const handleSaveFormula = async () => {
    if (!formulaForm.name || !formulaForm.npk) return;
    setSaving(true);
    try {
      if (editingFormula) {
        await updateFertilizerFormula(editingFormula.id, formulaForm);
      } else {
        await addFertilizerFormula({ orchardId, ...formulaForm, createdAt: Date.now() });
      }
      setFormulaForm({ name: '', npk: '', stage: 'leaf' });
      setEditingFormula(null);
      setShowAddFormula(false);
      await loadData();
    } catch { alert('บันทึกไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  const selectedFormula = formulas.find(f => f.id === form.formulaId);

  const handleAdd = async () => {
    if (!form.formulaId || !form.amount || !selectedFormula) return;
    setSaving(true);
    try {
      await addFertilizerRecord({
        orchardId, date: form.date,
        formulaId: form.formulaId,
        formulaName: selectedFormula.name,
        npk: selectedFormula.npk,
        stage: selectedFormula.stage,
        amount: form.amount,
        unit: form.unit,
        createdAt: Date.now(),
      });
      setForm({ date: new Date().toISOString().split('T')[0], formulaId: '', amount: 0, unit: 'กิโลกรัม' });
      await loadData();
    } catch { alert('บันทึกไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  if (!orchard || loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-8">
      <SubPageHeader orchardName={orchard.name} orchardColor={orchard.color} orchardId={orchardId} isDurianBackyard={orchard.name === 'ทุเรียนหลังบ้าน'} title="ใส่ปุ๋ย" Icon={Leaf} />

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">

        {/* ── จัดการสูตรปุ๋ย ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button onClick={() => setShowFormulas(!showFormulas)}
            className="w-full flex items-center justify-between px-4 py-3">
            <span className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              🌿 สูตรปุ๋ย <span className="text-xs text-slate-500 dark:text-slate-400">({formulas.length} สูตร)</span>
            </span>
            {showFormulas ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          {showFormulas && (
            <div className="border-t border-slate-100 dark:border-slate-700">
              {formulas.length === 0 ? (
                <div className="p-4 text-center space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">ยังไม่มีสูตรปุ๋ย</p>
                  <button onClick={handleSeedFormulas} disabled={saving}
                    className="text-xs text-emerald-600 font-bold border border-emerald-300 px-3 py-1.5 rounded-lg">
                    + เพิ่มสูตรตัวอย่าง 4 สูตร
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {formulas.map(f => (
                    <div key={f.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{f.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{f.npk} · {GROWTH_STAGE_LABEL[f.stage]}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setFormulaForm({ name: f.name, npk: f.npk, stage: f.stage }); setEditingFormula(f); setShowAddFormula(true); }}
                          className="text-slate-400 hover:text-emerald-500"><Pencil size={14} /></button>
                        <button onClick={() => { if (confirm('ลบสูตรนี้?')) deleteFertilizerFormula(f.id).then(loadData); }}
                          className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add/Edit formula form */}
              {showAddFormula ? (
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{editingFormula ? 'แก้ไขสูตร' : 'เพิ่มสูตรใหม่'}</span>
                    <button onClick={() => { setShowAddFormula(false); setEditingFormula(null); setFormulaForm({ name: '', npk: '', stage: 'leaf' }); }}><X size={16} className="text-slate-400" /></button>
                  </div>
                  <input type="text" value={formulaForm.name} onChange={e => setFormulaForm({ ...formulaForm, name: e.target.value })}
                    placeholder="ชื่อสูตร" className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-sm text-slate-800 dark:text-white" />
                  <input type="text" value={formulaForm.npk} onChange={e => setFormulaForm({ ...formulaForm, npk: e.target.value })}
                    placeholder="N-P-K เช่น 30-10-10" className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-sm text-slate-800 dark:text-white" />
                  <select value={formulaForm.stage} onChange={e => setFormulaForm({ ...formulaForm, stage: e.target.value as GrowthStage })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-sm text-slate-800 dark:text-white">
                    {Object.entries(GROWTH_STAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button onClick={handleSaveFormula} disabled={saving}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm">
                    {editingFormula ? 'บันทึกการแก้ไข' : 'เพิ่มสูตร'}
                  </button>
                </div>
              ) : (
                <div className="p-3 border-t border-slate-100 dark:border-slate-700">
                  <button onClick={() => setShowAddFormula(true)}
                    className="w-full py-2 border border-dashed border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                    <Plus size={12} /> เพิ่มสูตรใหม่
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── บันทึกการใส่ปุ๋ย ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h2 className="font-bold text-sm text-emerald-700 dark:text-emerald-400">บันทึกการใส่ปุ๋ย</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">วันที่</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-sm text-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">สูตรปุ๋ย</label>
              <select value={form.formulaId} onChange={e => setForm({ ...form, formulaId: e.target.value })}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-sm text-slate-800 dark:text-white">
                <option value="">-- เลือกสูตร --</option>
                {formulas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
          {selectedFormula && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2.5 rounded-xl text-xs text-emerald-700 dark:text-emerald-400">
              N-P-K: {selectedFormula.npk} · {GROWTH_STAGE_LABEL[selectedFormula.stage]}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ปริมาณ</label>
              <input type="number" min={0} value={form.amount || ''} onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-sm text-slate-800 dark:text-white" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">หน่วย</label>
              <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-sm text-slate-800 dark:text-white">
                <option>กิโลกรัม</option>
                <option>ลิตร</option>
                <option>กรัม</option>
              </select>
            </div>
          </div>
          <button onClick={handleAdd} disabled={saving || !form.formulaId || !form.amount}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm">
            บันทึกการใส่ปุ๋ย
          </button>
        </div>

        {/* ── ประวัติ ── */}
        <h2 className="font-bold text-sm text-slate-800 dark:text-white">ประวัติการใส่ปุ๋ย ({records.length})</h2>
        {records.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 text-sm py-6">ยังไม่มีบันทึก</p>
        ) : (
          <div className="space-y-2">
            {records.map(r => (
              <div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex justify-between items-start">
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-white">{r.formulaName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{r.npk} · {GROWTH_STAGE_LABEL[r.stage]}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{r.date} · {r.amount} {r.unit}</p>
                </div>
                <button onClick={() => deleteFertilizerRecord(r.id).then(loadData)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
