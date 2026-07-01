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

export async function getTreeProfiles(orchardId?: string, year?: number) {
  if (!orchardId) {
    const snapshot = await getDocs(collection(db, 'treeProfiles'));
    const trees = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TreeProfile[];
    // Filter ตามปีถ้ามีการระบุ
    return year ? trees.filter(t => t.year === year) : trees;
  }
  
  // ✅ Optimized: filter orchardId ฝั่ง server
  const q = query(
    collection(db, 'treeProfiles'),
    where('orchardId', '==', orchardId)
  );
  const snapshot = await getDocs(q);
  const trees = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TreeProfile[];
  
  // Filter ตามปีถ้ามีการระบุ (client-side filter เนื่องจาก Firestore ไม่รองรับ compound query กับ optional field)
  return year ? trees.filter(t => t.year === year) : trees;
}

export async function updateTreeProfile(id: string, data: Partial<Omit<TreeProfile, 'id'>>) {
  await updateDoc(doc(db, 'treeProfiles', id), data);
}

export async function deleteTreeProfile(id: string) {
  await deleteDoc(doc(db, 'treeProfiles', id));
}

