'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Subscribe Firestore collection แบบ realtime
 * - filter ตาม orchardId ถ้ามี
 * - เรียง createdAt desc โดย default (override ได้)
 *
 * Usage:
 *   const records = useCollection<WaterRecord>('waterRecords', orchardId);
 *   const all = useCollection<Orchard>('orchards', null, { sortBy: 'createdAt', order: 'asc' });
 */
export function useCollection<T extends { id: string; createdAt?: number }>(
  collectionName: string,
  orchardId: string | null,
  opts: { sortBy?: keyof T | 'createdAt'; order?: 'asc' | 'desc' } = {}
): { data: T[]; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = collection(db, collectionName);
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        let items = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as T[];
        if (orchardId) {
          items = items.filter((it: any) => it.orchardId === orchardId);
        }
        const key = (opts.sortBy as string) ?? 'createdAt';
        const ord = opts.order ?? 'desc';
        items.sort((a: any, b: any) => {
          const va = a[key] ?? 0;
          const vb = b[key] ?? 0;
          if (typeof va === 'string') {
            return ord === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
          }
          return ord === 'asc' ? va - vb : vb - va;
        });
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error(`useCollection(${collectionName}) error:`, err);
        setError(err as Error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [collectionName, orchardId, opts.sortBy, opts.order]);

  return { data, loading, error };
}

/** Subscribe single doc (เช่น orchardStats, farmMapConfig, waterSetting) */
export function useDocByOrchard<T extends { id: string; orchardId: string }>(
  collectionName: string,
  orchardId: string | null
): { data: T | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orchardId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as T[];
        setData(items.find(it => it.orchardId === orchardId) || null);
        setLoading(false);
      },
      (err) => {
        console.error(`useDocByOrchard(${collectionName}) error:`, err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [collectionName, orchardId]);

  return { data, loading };
}

/** Subscribe orchards list (sorted by createdAt asc) */
export function useOrchards() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orchards'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('useOrchards error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { data, loading };
}
