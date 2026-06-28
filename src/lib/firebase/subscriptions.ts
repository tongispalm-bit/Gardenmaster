// ────────────────────────────────────────────────────────────
// 📡 REALTIME SUBSCRIPTIONS
// Generic realtime helpers ใช้กับ collection ต่างๆ
// ────────────────────────────────────────────────────────────

import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './config';

/**
 * Subscribe collection ทั่วไปแบบ realtime + filter ตาม orchardId
 */
export function subscribeCollection<T>(
  collectionName: string,
  orchardId: string,
  callback: (items: T[]) => void
): () => void {
  return onSnapshot(collection(db, collectionName), (snapshot) => {
    const items = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((item: any) => item.orchardId === orchardId) as T[];
    callback(items);
  }, (err) => {
    console.error(`[subscribe ${collectionName}] error:`, err);
  });
}

/**
 * Subscribe single doc by orchardId 
 * สำหรับ collection ที่มีแค่ 1 doc ต่อสวน (waterSetting, orchardStats, farmMapConfig)
 */
export function subscribeDocByOrchard<T>(
  collectionName: string,
  orchardId: string,
  callback: (item: T | null) => void
): () => void {
  return onSnapshot(collection(db, collectionName), (snapshot) => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    const found = items.find(it => it.orchardId === orchardId) as T | undefined;
    callback(found ?? null);
  }, (err) => {
    console.error(`[subscribeDocByOrchard ${collectionName}] error:`, err);
  });
}
