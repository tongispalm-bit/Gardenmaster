// ────────────────────────────────────────────────────────────
// 💰 FINANCE Functions
// Transaction, General Expense, Upgrade Expense, Sales
// ────────────────────────────────────────────────────────────

import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from './config';
import type { Transaction, GeneralExpense, UpgradeExpense, SaleRecord, OrchardGradesConfig, DEFAULT_GRADES } from './types';

// ══════════════════════════════════════════════════════════
// Transaction (Legacy)
// ══════════════════════════════════════════════════════════

export async function addTransaction(record: Omit<Transaction, 'id'>) {
  const docRef = await addDoc(collection(db, 'transactions'), record);
  return docRef.id;
}

export async function getTransactions(orchardId?: string) {
  const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[];
  return orchardId ? records.filter(r => r.orchardId === orchardId) : records;
}

export async function deleteTransaction(id: string) {
  await deleteDoc(doc(db, 'transactions', id));
}

// ══════════════════════════════════════════════════════════
// 📊 GENERAL EXPENSE
// ══════════════════════════════════════════════════════════

export async function addGeneralExpense(record: Omit<GeneralExpense, 'id'>) {
  const docRef = await addDoc(collection(db, 'generalExpenses'), record);
  return docRef.id;
}

export async function getGeneralExpenses(orchardId: string): Promise<GeneralExpense[]> {
  const snapshot = await getDocs(collection(db, 'generalExpenses'));
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as GeneralExpense[];
  return all.filter(r => r.orchardId === orchardId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteGeneralExpense(id: string) {
  await deleteDoc(doc(db, 'generalExpenses', id));
}

// ══════════════════════════════════════════════════════════
// 🔧 UPGRADE EXPENSE
// ══════════════════════════════════════════════════════════

export async function addUpgradeExpense(record: Omit<UpgradeExpense, 'id'>) {
  const docRef = await addDoc(collection(db, 'upgradeExpenses'), record);
  return docRef.id;
}

export async function getUpgradeExpenses(orchardId: string): Promise<UpgradeExpense[]> {
  const snapshot = await getDocs(collection(db, 'upgradeExpenses'));
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as UpgradeExpense[];
  return all.filter(r => r.orchardId === orchardId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteUpgradeExpense(id: string) {
  await deleteDoc(doc(db, 'upgradeExpenses', id));
}

// ══════════════════════════════════════════════════════════
// 🛒 SALES
// ══════════════════════════════════════════════════════════

export async function getOrchardGrades(orchardId: string, orchardName: string): Promise<string[]> {
  const { DEFAULT_GRADES } = await import('./types');
  const snapshot = await getDocs(collection(db, 'orchardGradesConfigs'));
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as OrchardGradesConfig[];
  const config = all.find(c => c.orchardId === orchardId);
  
  if (config) return config.grades;
  return DEFAULT_GRADES[orchardName] || DEFAULT_GRADES['ทุเรียนหลังบ้าน'];
}

export async function saveOrchardGrades(orchardId: string, grades: string[]): Promise<string> {
  const snapshot = await getDocs(collection(db, 'orchardGradesConfigs'));
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as OrchardGradesConfig[];
  const existing = all.find(c => c.orchardId === orchardId);
  
  if (existing) {
    await updateDoc(doc(db, 'orchardGradesConfigs', existing.id), {
      grades,
      updatedAt: Date.now(),
    });
    return existing.id;
  }
  
  const docRef = await addDoc(collection(db, 'orchardGradesConfigs'), {
    orchardId,
    grades,
    updatedAt: Date.now(),
  });
  return docRef.id;
}

export async function addSaleRecord(record: Omit<SaleRecord, 'id'>) {
  const docRef = await addDoc(collection(db, 'saleRecords'), record);
  return docRef.id;
}

export async function getSaleRecords(orchardId?: string) {
  const snapshot = await getDocs(collection(db, 'saleRecords'));
  const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as SaleRecord[];
  return orchardId ? records.filter(r => r.orchardId === orchardId) : records;
}

export async function deleteSaleRecord(id: string) {
  await deleteDoc(doc(db, 'saleRecords', id));
}
