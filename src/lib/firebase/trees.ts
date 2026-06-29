// ────────────────────────────────────────────────────────────
// 🌳 TREE PROFILE Functions
// ────────────────────────────────────────────────────────────

import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from './config';
import type { TreeProfile } from './types';

export async function addTreeProfile(record: Omit<TreeProfile, 'id'>) {
  const docRef = await addDoc(collection(db, 'treeProfiles'), record);
  return docRef.id;
}

export async function getTreeProfiles(orchardId?: string) {
  if (!orchardId) {
    const snapshot = await getDocs(collection(db, 'treeProfiles'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TreeProfile[];
  }
  
  // ✅ Optimized: filter ฝั่ง server
  const q = query(
    collection(db, 'treeProfiles'),
    where('orchardId', '==', orchardId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TreeProfile[];
}

export async function updateTreeProfile(id: string, data: Partial<Omit<TreeProfile, 'id'>>) {
  await updateDoc(doc(db, 'treeProfiles', id), data);
}

export async function deleteTreeProfile(id: string) {
  await deleteDoc(doc(db, 'treeProfiles', id));
}

