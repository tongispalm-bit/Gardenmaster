// ────────────────────────────────────────────────────────────
// 🏥 HOSPITAL Functions
// ────────────────────────────────────────────────────────────

import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from './config';
import type { HospitalRecord } from './types';

export async function addHospitalRecord(record: Omit<HospitalRecord, 'id'>) {
  const docRef = await addDoc(collection(db, 'hospitalRecords'), record);
  return docRef.id;
}

export async function getHospitalRecords(orchardId?: string) {
  if (!orchardId) {
    const q = query(
      collection(db, 'hospitalRecords'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as HospitalRecord[];
  }
  
  // ✅ Optimized: filter + sort ฝั่ง server
  const q = query(
    collection(db, 'hospitalRecords'),
    where('orchardId', '==', orchardId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as HospitalRecord[];
}

export async function updateHospitalRecord(id: string, data: Partial<Omit<HospitalRecord, 'id'>>) {
  await updateDoc(doc(db, 'hospitalRecords', id), { ...data, updatedAt: Date.now() });
}

export async function deleteHospitalRecord(id: string) {
  await deleteDoc(doc(db, 'hospitalRecords', id));
}

