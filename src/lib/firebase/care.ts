// ────────────────────────────────────────────────────────────
// 🌿 CARE RECORDS Functions
// รวม Water, Fertilizer, Spray, Durian Fruit
// ────────────────────────────────────────────────────────────

import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from './config';
import type {
  CareRecord,
  WaterSetting,
  WaterRecord,
  StressPeriod,
  FertilizerFormula,
  FertilizerRecord,
  SprayRecord,
  DurianFruitRecord,
} from './types';

// ══════════════════════════════════════════════════════════
// Care Records (Legacy)
// ══════════════════════════════════════════════════════════

export async function addCareRecord(record: Omit<CareRecord, 'id'>) {
  const docRef = await addDoc(collection(db, 'careRecords'), record);
  return docRef.id;
}

export async function getCareRecords(orchardId?: string) {
  const q = query(collection(db, 'careRecords'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as CareRecord[];
  return orchardId ? records.filter(r => r.orchardId === orchardId) : records;
}

export async function deleteCareRecord(id: string) {
  await deleteDoc(doc(db, 'careRecords', id));
}

// ══════════════════════════════════════════════════════════
// 💧 WATER
// ══════════════════════════════════════════════════════════

export async function getWaterSetting(orchardId: string): Promise<WaterSetting | null> {
  const snapshot = await getDocs(collection(db, 'waterSettings'));
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as WaterSetting[];
  return all.find(s => s.orchardId === orchardId) || null;
}

export async function saveWaterSetting(orchardId: string, data: { flowRate: number; headCount: number }) {
  const existing = await getWaterSetting(orchardId);
  if (existing) {
    await updateDoc(doc(db, 'waterSettings', existing.id), { ...data, updatedAt: Date.now() });
  } else {
    await addDoc(collection(db, 'waterSettings'), { orchardId, ...data, updatedAt: Date.now() });
  }
}

export async function addWaterRecord(record: Omit<WaterRecord, 'id'>) {
  const docRef = await addDoc(collection(db, 'waterRecords'), record);
  return docRef.id;
}

export async function getWaterRecords(orchardId: string): Promise<WaterRecord[]> {
  const snapshot = await getDocs(collection(db, 'waterRecords'));
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as WaterRecord[];
  return all.filter(r => r.orchardId === orchardId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteWaterRecord(id: string) {
  await deleteDoc(doc(db, 'waterRecords', id));
}

// ── Stress Period (กักโศก) ──

export async function addStressPeriod(record: Omit<StressPeriod, 'id'>) {
  const docRef = await addDoc(collection(db, 'stressPeriods'), record);
  return docRef.id;
}

export async function getStressPeriods(orchardId: string): Promise<StressPeriod[]> {
  const snapshot = await getDocs(collection(db, 'stressPeriods'));
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as StressPeriod[];
  return all.filter(r => r.orchardId === orchardId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteStressPeriod(id: string) {
  await deleteDoc(doc(db, 'stressPeriods', id));
}

// ══════════════════════════════════════════════════════════
// 🌱 FERTILIZER
// ══════════════════════════════════════════════════════════

export async function getFertilizerFormulas(orchardId: string): Promise<FertilizerFormula[]> {
  const snapshot = await getDocs(collection(db, 'fertilizerFormulas'));
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as FertilizerFormula[];
  return all.filter(f => f.orchardId === orchardId).sort((a, b) => a.createdAt - b.createdAt);
}

export async function addFertilizerFormula(record: Omit<FertilizerFormula, 'id'>) {
  const docRef = await addDoc(collection(db, 'fertilizerFormulas'), record);
  return docRef.id;
}

export async function updateFertilizerFormula(id: string, data: Partial<Omit<FertilizerFormula, 'id'>>) {
  await updateDoc(doc(db, 'fertilizerFormulas', id), data);
}

export async function deleteFertilizerFormula(id: string) {
  await deleteDoc(doc(db, 'fertilizerFormulas', id));
}

export async function addFertilizerRecord(record: Omit<FertilizerRecord, 'id'>) {
  const docRef = await addDoc(collection(db, 'fertilizerRecords'), record);
  return docRef.id;
}

export async function getFertilizerRecords(orchardId: string): Promise<FertilizerRecord[]> {
  const snapshot = await getDocs(collection(db, 'fertilizerRecords'));
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as FertilizerRecord[];
  return all.filter(r => r.orchardId === orchardId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteFertilizerRecord(id: string) {
  await deleteDoc(doc(db, 'fertilizerRecords', id));
}

// ══════════════════════════════════════════════════════════
// 💉 SPRAY
// ══════════════════════════════════════════════════════════

export async function addSprayRecord(record: Omit<SprayRecord, 'id'>) {
  const docRef = await addDoc(collection(db, 'sprayRecords'), record);
  return docRef.id;
}

export async function getSprayRecords(orchardId: string): Promise<SprayRecord[]> {
  const snapshot = await getDocs(collection(db, 'sprayRecords'));
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as SprayRecord[];
  return all.filter(r => r.orchardId === orchardId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteSprayRecord(id: string) {
  await deleteDoc(doc(db, 'sprayRecords', id));
}

// ══════════════════════════════════════════════════════════
// 🌾 DURIAN FRUIT
// ══════════════════════════════════════════════════════════

export async function addDurianFruitRecord(record: Omit<DurianFruitRecord, 'id'>) {
  const docRef = await addDoc(collection(db, 'durianFruitRecords'), record);
  return docRef.id;
}

export async function getDurianFruitRecords(orchardId: string): Promise<DurianFruitRecord[]> {
  const snapshot = await getDocs(collection(db, 'durianFruitRecords'));
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as DurianFruitRecord[];
  return all.filter(r => r.orchardId === orchardId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteDurianFruitRecord(id: string) {
  await deleteDoc(doc(db, 'durianFruitRecords', id));
}
