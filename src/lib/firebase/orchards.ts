// ────────────────────────────────────────────────────────────
// 🏞️ ORCHARD Functions
// ────────────────────────────────────────────────────────────

import { collection, addDoc, getDocs, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from './config';
import type { Orchard, FarmMapConfig, OrchardStats } from './types';

// ══════════════════════════════════════════════════════════
// Orchard CRUD
// ══════════════════════════════════════════════════════════

export async function addOrchard(orchard: Omit<Orchard, 'id'>) {
  const docRef = await addDoc(collection(db, 'orchards'), orchard);
  return docRef.id;
}

export async function getOrchard(orchardId: string): Promise<Orchard | null> {
  const { doc: docRef, getDoc } = await import('firebase/firestore');
  const snapshot = await getDoc(docRef(db, 'orchards', orchardId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Orchard : null;
}

export async function getOrchards() {
  const q = query(collection(db, 'orchards'), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Orchard[];
}

export function subscribeOrchards(callback: (orchards: Orchard[]) => void): () => void {
  const q = query(collection(db, 'orchards'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Orchard[];
    callback(data);
  }, (err) => {
    console.error('[subscribeOrchards] error:', err);
  });
}

export function subscribeOrchard(orchardId: string, callback: (o: Orchard | null) => void): () => void {
  return onSnapshot(collection(db, 'orchards'), (snapshot) => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Orchard[];
    callback(items.find(o => o.id === orchardId) ?? null);
  });
}

// ══════════════════════════════════════════════════════════
// Farm Map Config
// ══════════════════════════════════════════════════════════

export async function getFarmMapConfig(orchardId: string): Promise<FarmMapConfig | null> {
  const q = query(
    collection(db, 'farmMapConfigs'),
    where('orchardId', '==', orchardId)
  );
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as FarmMapConfig;
}

export async function saveFarmMapConfig(
  orchardId: string,
  data: { rows: number; cols: number; blockedCells: string[] }
): Promise<string> {
  const { doc: docRef, updateDoc } = await import('firebase/firestore');
  const existing = await getFarmMapConfig(orchardId);
  
  if (existing) {
    await updateDoc(docRef(db, 'farmMapConfigs', existing.id), {
      ...data,
      updatedAt: Date.now(),
    });
    return existing.id;
  }
  
  const ref = await addDoc(collection(db, 'farmMapConfigs'), {
    orchardId,
    ...data,
    updatedAt: Date.now(),
  });
  return ref.id;
}

// ══════════════════════════════════════════════════════════
// Orchard Stats
// ══════════════════════════════════════════════════════════

export async function getOrchardStats(orchardId: string): Promise<OrchardStats | null> {
  const q = query(
    collection(db, 'orchardStats'),
    where('orchardId', '==', orchardId)
  );
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as OrchardStats;
}

export async function saveOrchardStats(orchardId: string, treeCount: number): Promise<string> {
  const { doc: docRef, updateDoc } = await import('firebase/firestore');
  const existing = await getOrchardStats(orchardId);
  
  if (existing) {
    await updateDoc(docRef(db, 'orchardStats', existing.id), {
      treeCount,
      updatedAt: Date.now(),
    });
    return existing.id;
  }
  
  const ref = await addDoc(collection(db, 'orchardStats'), {
    orchardId,
    treeCount,
    updatedAt: Date.now(),
  });
  return ref.id;
}
