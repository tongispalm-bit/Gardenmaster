import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAAXAgFYqnLfvqEQJw6Y4_QoavDo6yCOhI",
  authDomain: "gardanmaster-2d5db.firebaseapp.com",
  projectId: "gardanmaster-2d5db",
  storageBucket: "gardanmaster-2d5db.firebasestorage.app",
  messagingSenderId: "871678518614",
  appId: "1:871678518614:web:25f87462b286e338c9e2f7"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

export type Orchard = {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: number;
};

export type CareRecord = {
  id: string;
  orchardId: string;
  date: string;
  type: 'water' | 'fertilize' | 'pesticide';
  plant: string;
  note: string;
  createdAt: number;
};

export type Transaction = {
  id: string;
  orchardId: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  createdAt: number;
};

export type TreeProfile = {
  id: string;
  orchardId: string;
  row: number;
  col: number;
  treeNumber: string;
  variety: string;
  age: number;
  status: 'normal' | 'watch' | 'seedling';
  note: string;
  createdAt: number;
  updatedAt: number;
};

export type FertilizerProfile = {
  id: string;
  orchardId: string;
  name: string;
  npk: string;
  stage: 'leaf' | 'flower' | 'fruit' | 'post-harvest';
  createdAt: number;
};

export async function addOrchard(orchard: Omit<Orchard, 'id'>) {
  const docRef = await addDoc(collection(db, 'orchards'), orchard);
  return docRef.id;
}

export async function getOrchards() {
  const q = query(collection(db, 'orchards'), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Orchard[];
}

export async function addCareRecord(record: Omit<CareRecord, 'id'>) {
  const docRef = await addDoc(collection(db, 'careRecords'), record);
  return docRef.id;
}

export async function getCareRecords(orchardId?: string) {
  let q;
  if (orchardId) {
    q = query(collection(db, 'careRecords'), 
      orderBy('createdAt', 'desc')
    );
  } else {
    q = query(collection(db, 'careRecords'), orderBy('createdAt', 'desc'));
  }
  const snapshot = await getDocs(q);
  const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CareRecord[];
  return orchardId ? records.filter(r => r.orchardId === orchardId) : records;
}

export async function deleteCareRecord(id: string) {
  await deleteDoc(doc(db, 'careRecords', id));
}

export async function addTransaction(record: Omit<Transaction, 'id'>) {
  const docRef = await addDoc(collection(db, 'transactions'), record);
  return docRef.id;
}

export async function getTransactions(orchardId?: string) {
  const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
  return orchardId ? records.filter(r => r.orchardId === orchardId) : records;
}

export async function deleteTransaction(id: string) {
  await deleteDoc(doc(db, 'transactions', id));
}

export async function addTreeProfile(record: Omit<TreeProfile, 'id'>) {
  const docRef = await addDoc(collection(db, 'treeProfiles'), record);
  return docRef.id;
}

export async function getTreeProfiles(orchardId?: string) {
  const snapshot = await getDocs(collection(db, 'treeProfiles'));
  const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TreeProfile[];
  return orchardId ? records.filter(r => r.orchardId === orchardId) : records;
}

export async function updateTreeProfile(id: string, data: Partial<Omit<TreeProfile, 'id'>>) {
  await updateDoc(doc(db, 'treeProfiles', id), data);
}

export async function deleteTreeProfile(id: string) {
  await deleteDoc(doc(db, 'treeProfiles', id));
}
