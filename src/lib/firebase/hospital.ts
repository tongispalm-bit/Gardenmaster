// ────────────────────────────────────────────────────────────
// 🏥 HOSPITAL Functions
// ────────────────────────────────────────────────────────────

import { collection, addDoc, getDocsFromServer, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from './config';
import type { HospitalRecord } from './types';

export async function addHospitalRecord(record: Omit<HospitalRecord, 'id'>) {
  const docRef = await addDoc(collection(db, 'hospitalRecords'), record);
  return docRef.id;
}

export async function getHospitalRecords(orchardId?: string) {
  const snapshot = await getDocsFromServer(collection(db, 'hospitalRecords'));
  const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as HospitalRecord[];
  const filtered = orchardId ? records.filter(r => r.orchardId === orchardId) : records;
  return filtered.sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateHospitalRecord(id: string, data: Partial<Omit<HospitalRecord, 'id'>>) {
  await updateDoc(doc(db, 'hospitalRecords', id), { ...data, updatedAt: Date.now() });
}

export async function deleteHospitalRecord(id: string) {
  await deleteDoc(doc(db, 'hospitalRecords', id));
}
