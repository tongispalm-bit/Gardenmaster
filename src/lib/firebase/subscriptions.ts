// ────────────────────────────────────────────────────────────
// 📡 REALTIME SUBSCRIPTIONS
// Generic realtime helpers ใช้กับ collection ต่างๆ
// ────────────────────────────────────────────────────────────

import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './config';

/**
 * Subscribe collection ทั่วไปแบบ realtime + filter ตาม orchardId
 * ✅ Optimized: ใช้ where() query แทน client-side filter
 */
export function subscribeCollection<T>(
  collectionName: string,
  orchardId: string,
  callback: (items: T[]) => void
): () => void {
  const q = query(
    collection(db, collectionName),
    where('orchardId', '==', orchardId)
  );
  
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as T[];
    callback(items);
  }, (err) => {
    console.error(`[subscribe ${collectionName}] error:`, err);
  });
}

/**
 * Subscribe single doc by orchardId 
 * สำหรับ collection ที่มีแค่ 1 doc ต่อสวน (waterSetting, orchardStats, farmMapConfig)
 * ✅ Optimized: ใช้ where() query แทน client-side filter
 */
export function subscribeDocByOrchard<T>(
  collectionName: string,
  orchardId: string,
  callback: (item: T | null) => void
): () => void {
  const q = query(
    collection(db, collectionName),
    where('orchardId', '==', orchardId)
  );
  
  return onSnapshot(q, (snapshot) => {
    const found = snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as T;
    callback(found);
  }, (err) => {
    console.error(`[subscribeDocByOrchard ${collectionName}] error:`, err);
  });
}

