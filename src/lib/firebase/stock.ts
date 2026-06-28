// ────────────────────────────────────────────────────────────
// 📦 STOCK (คลังสารเคมี) Functions
// Medicine & Nutrient Items + Stock Deduction
// ────────────────────────────────────────────────────────────

import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from './config';
import type { MedicineItemRecord, MedicineType, NutrientItemRecord, NutrientType, SprayMedicineGroup } from './types';

// ══════════════════════════════════════════════════════════
// 💊 MEDICINE ITEMS
// ══════════════════════════════════════════════════════════

export async function addMedicineItem(record: Omit<MedicineItemRecord, 'id'>) {
  const docRef = await addDoc(collection(db, 'medicineItems'), record);
  return docRef.id;
}

export async function getMedicineItems(orchardId: string, type?: MedicineType): Promise<MedicineItemRecord[]> {
  const snapshot = await getDocs(collection(db, 'medicineItems'));
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as MedicineItemRecord[];
  return items
    .filter(i => i.orchardId === orchardId && (type ? i.type === type : true))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateMedicineItem(id: string, data: Partial<Omit<MedicineItemRecord, 'id'>>) {
  await updateDoc(doc(db, 'medicineItems', id), { ...data, updatedAt: Date.now() });
}

export async function deleteMedicineItem(id: string) {
  await deleteDoc(doc(db, 'medicineItems', id));
}

// ══════════════════════════════════════════════════════════
// 🌱 NUTRIENT ITEMS
// ══════════════════════════════════════════════════════════

export async function addNutrientItem(record: Omit<NutrientItemRecord, 'id'>) {
  const docRef = await addDoc(collection(db, 'nutrientItems'), record);
  return docRef.id;
}

export async function getNutrientItems(orchardId: string, type?: NutrientType): Promise<NutrientItemRecord[]> {
  const snapshot = await getDocs(collection(db, 'nutrientItems'));
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as NutrientItemRecord[];
  return items
    .filter(i => i.orchardId === orchardId && (type ? i.type === type : true))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateNutrientItem(id: string, data: Partial<Omit<NutrientItemRecord, 'id'>>) {
  await updateDoc(doc(db, 'nutrientItems', id), { ...data, updatedAt: Date.now() });
}

export async function deleteNutrientItem(id: string) {
  await deleteDoc(doc(db, 'nutrientItems', id));
}

// ══════════════════════════════════════════════════════════
// ⚡ STOCK DEDUCTION (หักปริมาณจากคลัง)
// ══════════════════════════════════════════════════════════

export async function deductFromStock(
  items: Array<{ group?: SprayMedicineGroup; stockId?: string; amount: string; unit: string }>
): Promise<Array<{ stockId: string; ok: boolean; reason?: string }>> {
  const results: Array<{ stockId: string; ok: boolean; reason?: string }> = [];
  
  for (const it of items) {
    if (!it.stockId || !it.group) {
      results.push({ stockId: it.stockId ?? '', ok: false, reason: 'no stock link' });
      continue;
    }
    
    const used = Number(it.amount);
    if (!used || isNaN(used) || used <= 0) {
      results.push({ stockId: it.stockId, ok: false, reason: 'invalid amount' });
      continue;
    }
    
    try {
      const isMedicine = it.group === 'insecticide' || it.group === 'fungicide';
      const collectionName = isMedicine ? 'medicineItems' : 'nutrientItems';
      const ref = doc(db, collectionName, it.stockId);
      const snap = await getDoc(ref);
      
      if (!snap.exists()) {
        results.push({ stockId: it.stockId, ok: false, reason: 'not found' });
        continue;
      }
      
      const data = snap.data() as { amount: number; unit: string };
      
      // ตรวจหน่วย — ถ้าต่างกันให้ skip
      if (data.unit !== it.unit) {
        results.push({ 
          stockId: it.stockId, 
          ok: false, 
          reason: `unit mismatch (stock=${data.unit}, used=${it.unit})` 
        });
        continue;
      }
      
      const newAmount = Math.max(0, (data.amount ?? 0) - used);
      await updateDoc(ref, { amount: newAmount, updatedAt: Date.now() });
      results.push({ stockId: it.stockId, ok: true });
    } catch (e) {
      console.error('[deductFromStock] error', e);
      results.push({ stockId: it.stockId, ok: false, reason: 'error' });
    }
  }
  
  return results;
}
