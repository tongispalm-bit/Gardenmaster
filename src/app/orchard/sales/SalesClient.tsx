'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards,
  getSaleRecords,
  addSaleRecord,
  deleteSaleRecord,
  isDurianFarm,
  isMangosteenFarm,
  subscribeOrchard, subscribeCollection,
  type Orchard,
  type SaleRecord,
  type DurianGrade,
  type MangosteenGrade,
  type FruitGrade,
} from '@/lib/firebase';
import { ShoppingCart, Trash2, Plus, X } from 'lucide-react';
import SubMenuTabs from '../_components/SubMenuTabs';
import SubPageHeader from '../_components/SubPageHeader';

const DURIAN_GRADES: DurianGrade[] = ['AB', 'C', 'D', 'อินโด', 'ตกไซร้', 'จัมโบ้-เข้', 'ห้องเย็น', 'สทและเอาไว้เอา'];
const MANGOSTEEN_GRADES: MangosteenGrade[] = ['เบอร์หัว', 'ดอกดำ', 'เบอร์รวม'];
const CUT_RATES = [4, 5, 6, 7, 8, 9, 10];

export default function SalesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // เช็คว่าเป็นสวนมังคุดหรือไม่
  const isMangosteen = orchard ? isMangosteenFarm(orchard.name) : false;
  
  // เลือก grades ตามประเภทสวน
  const GRADES: FruitGrade[] = isMangosteen ? MANGOSTEEN_GRADES : DURIAN_GRADES;
  const defaultGrade: FruitGrade = isMangosteen ? 'เบอร์หัว' : 'AB';

  // Form state
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    grade: defaultGrade,
    weight: 0,
    pricePerKg: 0,
    cutRate: 5,
    note: '',
  });

  // Year filter for summary
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    if (!orchardId) { router.push('/'); return; }
    loadData();
  }, [orchardId]);

  // อัปเดต form.grade เมื่อเปลี่ยนสวน
  useEffect(() => {
    if (orchard) {
      setForm(prev => ({ ...prev, grade: defaultGrade }));
    }
  }, [orchard, defaultGrade]);

  const loadData = async () => {
    try {
      const orchards = await getOrchards();
      setOrchard(orchards.find((o) => o.id === orchardId) || null);
      const data = await getSaleRecords(orchardId);
      setRecords(data.sort((a, b) => b.createdAt - a.createdAt));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Computed values
  const totalAmount = form.weight * form.pricePerKg;
  const cutCost = form.cutRate * form.weight;
  const netAmount = totalAmount - cutCost;

  const handleAdd = async () => {
    if (!form.weight || !form.pricePerKg) return;
    setSaving(true);
    try {
      await addSaleRecord({
        orchardId,
        date: form.date,
        grade: form.grade,
        weight: form.weight,
        pricePerKg: form.pricePerKg,
        totalAmount,
        cutRate: form.cutRate,
        cutCost,
        netAmount,
        note: form.note,
        createdAt: Date.now(),
      });
      setForm({
        date: new Date().toISOString().split('T')[0],
        grade: defaultGrade,
        weight: 0,
        pricePerKg: 0,
        cutRate: 5,
        note: '',
      });
      await loadData();
      setShowAddModal(false);
    } catch {
      alert('บันทึกไม่สำเร็จ!');
    } finally {
      setSaving(false);
    }
  };

  // Year summary
  const yearRecords = useMemo(
    () => records.filter((r) => r.date.startsWith(String(selectedYear))),
    [records, selectedYear]
  );

  const summary = useMemo(() => {
    const totalSales = yearRecords.reduce((s, r) => s + r.totalAmount, 0);
    const totalWeight = yearRecords.reduce((s, r) => s + r.weight, 0);
    const totalCut = yearRecords.reduce((s, r) => s + r.cutCost, 0);
    const totalNet = yearRecords.reduce((s, r) => s + r.netAmount, 0);

    const byGrade: Record<string, { weight: number; amount: number }> = {};
    for (const r of yearRecords) {
      if (!byGrade[r.grade]) byGrade[r.grade] = { weight: 0, amount: 0 };
      byGrade[r.grade].weight += r.weight;
      byGrade[r.grade].amount += r.netAmount;
    }
    return { totalSales, totalWeight, totalCut, totalNet, byGrade };
  }, [yearRecords]);

  // Available years
  const availableYears = useMemo(() => {
    const years = new Set(records.map((r) => Number(r.date.slice(0, 4))));
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [records, currentYear]);

  // Daily summary — จัดกลุ่มตามวัน
  const dailySummaries = useMemo(() => {
    const grouped: Record<string, { totalAmount: number; cutCost: number; netAmount: number; weight: number; count: number }> = {};
    for (const r of records) {
      if (!grouped[r.date]) grouped[r.date] = { totalAmount: 0, cutCost: 0, netAmount: 0, weight: 0, count: 0 };
      grouped[r.date].totalAmount += r.totalAmount;
      grouped[r.date].cutCost += r.cutCost;
      grouped[r.date].netAmount += r.netAmount;
      grouped[r.date].weight += r.weight;
      grouped[r.date].count += 1;
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, data]) => ({ date, ...data }));
  }, [records]);

  if (!orchard || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  const isDurianBackyard = isDurianFarm(orchard.name);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300 pb-8 overflow-x-hidden">
      <SubPageHeader
        orchardName={orchard.name}
        orchardColor={orchard.color}
        orchardId={orchardId}
        isDurianBackyard={isDurianBackyard}
        title="การซื้อขาย"
        Icon={ShoppingCart}
      />
      {isDurianBackyard && null}

      <div className="px-5 py-6 max-w-4xl mx-auto space-y-6">
        {/* ── ปุ่มเปิด popup บันทึกการขาย ── */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 shadow-md"
        >
          <Plus size={18} /> บันทึกการขาย
        </button>

        {/* ── สรุปรายวัน ── */}
        {dailySummaries.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-3">สรุปรายวัน</h2>
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {dailySummaries.map((day) => (
                <div
                  key={day.date}
                  className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{day.date}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{day.count} รายการ · {day.weight.toLocaleString()} กก.</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">ยอดขาย</p>
                      <p className="text-sm font-extrabold text-pink-600 dark:text-pink-400">{day.totalAmount.toLocaleString()}฿</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">ค่าตัด</p>
                      <p className="text-sm font-extrabold text-red-600 dark:text-red-400">-{day.cutCost.toLocaleString()}฿</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">ยอดสุทธิ</p>
                      <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{day.netAmount.toLocaleString()}฿</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── สรุปรายปี ── */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">สรุปรายปี</h2>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="p-2 bg-slate-50 dark:bg-slate-700 rounded-xl text-sm font-bold outline-none text-slate-800 dark:text-white"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y + 543}</option>
              ))}
            </select>
          </div>

          {yearRecords.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-4">ยังไม่มีข้อมูลปีนี้</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <SummaryCard label="ยอดขายรวม" value={`${summary.totalSales.toLocaleString()} ฿`} color="text-pink-600 dark:text-pink-400" />
                <SummaryCard label="น้ำหนักรวม" value={`${summary.totalWeight.toLocaleString()} กก.`} color="text-blue-600 dark:text-blue-400" />
                <SummaryCard label="ค่าตัดรวม" value={`${summary.totalCut.toLocaleString()} ฿`} color="text-red-600 dark:text-red-400" />
                <SummaryCard label="กำไรสุทธิ" value={`${summary.totalNet.toLocaleString()} ฿`} color="text-emerald-600 dark:text-emerald-400" />
              </div>

              {/* แยกตามประเภท */}
              <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">แยกตามประเภท</h3>
              <div className="space-y-1.5">
                {Object.entries(summary.byGrade).map(([grade, data]) => (
                  <div key={grade} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-xl">
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{grade}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {data.weight.toLocaleString()} กก. · {data.amount.toLocaleString()} ฿
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── ปุ่มดูประวัติรายการ ── */}
        <button
          onClick={() => setShowHistory(true)}
          className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-2"
        >
          📋 ดูประวัติรายการ ({records.length})
        </button>
      </div>

      {/* ── Popup: บันทึกการขาย ── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-pink-50 dark:bg-pink-900/20 rounded-t-2xl">
              <h3 className="font-bold text-base text-pink-700 dark:text-pink-400 flex items-center gap-2">
                <ShoppingCart size={18} /> บันทึกการขาย
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">วันที่</label>
                  <input type="date" value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-pink-500 text-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ประเภท</label>
                  <select value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value as FruitGrade })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-pink-500 text-slate-800 dark:text-white">
                    {GRADES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">น้ำหนัก (กก.)</label>
                  <input type="number" min={0} value={form.weight || ''}
                    onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-pink-500 text-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ราคา/กก. (บาท)</label>
                  <input type="number" min={0} value={form.pricePerKg || ''}
                    onChange={(e) => setForm({ ...form, pricePerKg: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-pink-500 text-slate-800 dark:text-white" />
                </div>
              </div>

              <div className="bg-pink-50 dark:bg-pink-900/20 p-3 rounded-xl">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">จำนวนเงิน</span>
                  <span className="font-bold text-pink-700 dark:text-pink-300">
                    {totalAmount.toLocaleString()} ฿
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ค่าเก็บ (บาท/กก.)</label>
                <select value={form.cutRate}
                  onChange={(e) => setForm({ ...form, cutRate: Number(e.target.value) })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-pink-500 text-slate-800 dark:text-white">
                  {CUT_RATES.map((r) => (
                    <option key={r} value={r}>{r} บาท/กก.</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">ค่าเก็บรวม ({form.cutRate}×{form.weight} กก.)</span>
                  <span className="font-bold text-red-600 dark:text-red-400">-{cutCost.toLocaleString()} ฿</span>
                </div>
                <div className="flex justify-between text-base border-t border-slate-200 dark:border-slate-600 pt-2">
                  <span className="font-bold text-slate-800 dark:text-white">ยอดสุทธิ</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-lg">
                    {netAmount.toLocaleString()} ฿
                  </span>
                </div>
              </div>

              <input type="text" value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="หมายเหตุ (ไม่บังคับ)"
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-pink-500 text-slate-800 dark:text-white" />
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <button onClick={() => setShowAddModal(false)} disabled={saving}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm disabled:opacity-50">
                ยกเลิก
              </button>
              <button onClick={handleAdd}
                disabled={saving || !form.weight || !form.pricePerKg}
                className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ประวัติรายการ ── */}
      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">📋 ประวัติรายการ</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
              >
                ✕
              </button>
            </div>

            {/* Content — แยกตามวัน */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {records.length === 0 ? (
                <p className="text-center py-10 text-slate-500 dark:text-slate-400">ยังไม่มีรายการขาย</p>
              ) : (
                dailySummaries.map((day) => {
                  const dayRecords = records.filter((r) => r.date === day.date);
                  return (
                    <div key={day.date}>
                      {/* Day header */}
                      <div className="flex items-center justify-between mb-2 sticky top-0 bg-white dark:bg-slate-800 py-1 z-10">
                        <span className="font-bold text-sm text-slate-800 dark:text-white">{day.date}</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          สุทธิ {day.netAmount.toLocaleString()}฿
                        </span>
                      </div>

                      {/* Records for this day */}
                      <div className="space-y-2">
                        {dayRecords.map((r) => (
                          <div
                            key={r.id}
                            className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl flex justify-between items-start"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-800 dark:text-white">{r.grade}</span>
                                <span className="text-xs bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded-full font-bold">
                                  {r.weight} กก.
                                </span>
                                {r.pricePerKg > 0 && (
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    @{r.pricePerKg}฿/กก.
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                <span>ค่าตัด {r.cutCost.toLocaleString()}฿</span>
                                {r.note && <span>• {r.note}</span>}
                              </div>
                              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                สุทธิ {r.netAmount.toLocaleString()} ฿
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                if (confirm('ลบรายการนี้?')) deleteSaleRecord(r.id).then(loadData);
                              }}
                              className="text-slate-400 hover:text-red-500 p-1 flex-shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
      <p className={`text-lg font-extrabold ${color}`}>{value}</p>
    </div>
  );
}
