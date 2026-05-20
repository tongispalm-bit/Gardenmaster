'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards,
  getTransactions,
  deleteTransaction,
  addTransaction,
  type Orchard,
  type Transaction,
} from '@/lib/firebase';
import { BarChart3 } from 'lucide-react';
import SubMenuTabs from '../_components/SubMenuTabs';
import SubPageHeader from '../_components/SubPageHeader';

export default function ExpenseClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [transForm, setTransForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'expense' as const,
    amount: 0,
    description: '',
    category: '',
  });

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

      const data = await getTransactions(orchardId);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!transForm.date || !transForm.amount || !transForm.description) return;
    try {
      await addTransaction({
        ...transForm,
        orchardId,
        createdAt: Date.now(),
      });
      setTransForm({
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        amount: 0,
        description: '',
        category: '',
      });
      await loadData();
    } catch (error) {
      alert('บันทึกไม่สำเร็จ!');
    }
  };

  const expenses = transactions.filter((t) => t.type === 'expense');

  if (!orchard || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isDurianBackyard = orchard.name === 'ทุเรียนหลังบ้าน';

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
      <SubPageHeader
        orchardName={orchard.name}
        orchardColor={orchard.color}
        orchardId={orchardId}
        isDurianBackyard={isDurianBackyard}
        title="รายจ่ายทั่วไป"
        Icon={BarChart3}
      />
      {isDurianBackyard && null}

      <div className="px-6 py-6 max-w-4xl mx-auto">
        {/* Add Form */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm mb-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold mb-4 text-blue-800 dark:text-blue-400">
            เพิ่มรายจ่าย
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={transForm.date}
                onChange={(e) =>
                  setTransForm({ ...transForm, date: e.target.value })
                }
                className="p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ring-blue-500"
              />
              <input
                type="text"
                placeholder="หมวดหมู่"
                value={transForm.category}
                onChange={(e) =>
                  setTransForm({ ...transForm, category: e.target.value })
                }
                className="p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ring-blue-500"
              />
            </div>
            <input
              type="text"
              placeholder="รายละเอียดงาน"
              value={transForm.description}
              onChange={(e) =>
                setTransForm({ ...transForm, description: e.target.value })
              }
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ring-blue-500"
            />
            <input
              type="number"
              placeholder="ราคา (บาท)"
              value={transForm.amount || ''}
              onChange={(e) =>
                setTransForm({ ...transForm, amount: Number(e.target.value) })
              }
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ring-blue-500"
            />
            <button
              onClick={handleAdd}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all"
            >
              บันทึกรายจ่าย
            </button>
          </div>
        </div>

        {/* Expenses List */}
        <div className="space-y-3">
          {expenses.length === 0 ? (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              ยังไม่มีรายจ่าย
            </div>
          ) : (
            expenses.map((record) => (
              <div
                key={record.id}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between"
              >
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">
                    {record.description}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {record.category} • {record.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600">-{record.amount}฿</p>
                  <button
                    onClick={() => deleteTransaction(record.id).then(loadData)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
