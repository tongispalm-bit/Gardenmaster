import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc, query, orderBy, where, getDocsFromServer } from 'firebase/firestore';

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

// ── User Authentication ─────────────────────────────────────
export type UserRole = 'admin' | 'user';

export type AppUser = {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  displayName: string;
  createdAt: number;
  updatedAt: number;
};

/**
 * Hash password ด้วย SHA-256 + salt
 * NOTE: SHA-256 บน client ไม่ปลอดภัยเท่า bcrypt server-side
 * ใช้ได้สำหรับระดับการใช้งานทีมเล็ก/ครอบครัว
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = 'garden-master-salt-v1';
  const data = new TextEncoder().encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function getUserByUsername(username: string): Promise<AppUser | null> {
  const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() } as AppUser;
}

export async function getAllUsers(): Promise<AppUser[]> {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AppUser[];
}

export async function getUserById(id: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AppUser;
}

export async function createUser(input: {
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
}): Promise<string> {
  const username = input.username.toLowerCase().trim();
  const existing = await getUserByUsername(username);
  if (existing) throw new Error('USERNAME_TAKEN');

  const passwordHash = await hashPassword(input.password);
  const now = Date.now();
  const docRef = await addDoc(collection(db, 'users'), {
    username,
    passwordHash,
    role: input.role,
    displayName: input.displayName.trim() || username,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateUser(
  id: string,
  patch: Partial<{ username: string; role: UserRole; displayName: string }>
) {
  const data: Record<string, unknown> = { updatedAt: Date.now() };
  if (patch.username !== undefined) {
    const newUsername = patch.username.toLowerCase().trim();
    // ตรวจซ้ำ
    const existing = await getUserByUsername(newUsername);
    if (existing && existing.id !== id) throw new Error('USERNAME_TAKEN');
    data.username = newUsername;
  }
  if (patch.role !== undefined) data.role = patch.role;
  if (patch.displayName !== undefined) data.displayName = patch.displayName.trim();
  await updateDoc(doc(db, 'users', id), data);
}

export async function resetUserPassword(id: string, newPassword: string) {
  if (!newPassword || newPassword.length < 4) throw new Error('PASSWORD_TOO_SHORT');
  const passwordHash = await hashPassword(newPassword);
  await updateDoc(doc(db, 'users', id), {
    passwordHash,
    updatedAt: Date.now(),
  });
}

export async function deleteUser(id: string) {
  await deleteDoc(doc(db, 'users', id));
}

/**
 * Login — return user หรือ null
 */
export async function loginWithCredentials(
  username: string,
  password: string
): Promise<AppUser | null> {
  const user = await getUserByUsername(username);
  if (!user) return null;
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) return null;
  return user;
}

/**
 * เช็คว่ามี user ใน DB ไหม ถ้าไม่มี → seed admin คนแรก
 */
export async function ensureAdminSeeded(): Promise<void> {
  const all = await getAllUsers();
  if (all.length > 0) return;
  await createUser({
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    displayName: 'ผู้ดูแลระบบ',
  });
}

// ── Sale Records (การซื้อขาย) ───────────────────────────────
export type DurianGrade = 'AB' | 'C' | 'D' | 'ตกไซร์' | 'อินโด' | 'จัมโบ้' | 'เข้าห้องเย็น' | 'เอาไว้เอง';

export type SaleRecord = {
  id: string;
  orchardId: string;
  date: string;
  grade: DurianGrade;
  weight: number;        // กิโลกรัม
  pricePerKg: number;    // บาท/กก
  totalAmount: number;   // น้ำหนัก × ราคา/กก
  cutRate: number;       // 5-10 บาท/กก
  cutCost: number;       // cutRate × weight
  netAmount: number;     // totalAmount - cutCost
  note: string;
  createdAt: number;
};

export async function addSaleRecord(record: Omit<SaleRecord, 'id'>) {
  const docRef = await addDoc(collection(db, 'saleRecords'), record);
  return docRef.id;
}

export async function getSaleRecords(orchardId?: string) {
  const snapshot = await getDocs(collection(db, 'saleRecords'));
  const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as SaleRecord[];
  return orchardId ? records.filter(r => r.orchardId === orchardId) : records;
}

export async function deleteSaleRecord(id: string) {
  await deleteDoc(doc(db, 'saleRecords', id));
}

// ── Hospital Records (ห้องพยาบาล) ──────────────────────────
export type Severity = 'mild' | 'moderate' | 'severe';
export type TreatmentResult = 'better' | 'same' | 'worse';
export type HospitalStatus = 'treating' | 'recovered';

export type MedicineItem = {
  name: string;
  amount: string;
};

export type HospitalRecord = {
  id: string;
  orchardId: string;
  treeId: string;          // TreeProfile id
  treeNumber: string;      // รหัสต้น (เก็บไว้แสดงผล)
  dateFound: string;       // วันที่พบอาการ
  symptoms: string;        // อาการที่พบ
  photos: string[];        // base64 หรือ URL (1-6 รูป)
  severity: Severity;
  medicines: MedicineItem[];
  treatmentResult: TreatmentResult | null;
  recoveryDate: string;    // วันหายป่วย
  status: HospitalStatus;
  note: string;
  createdAt: number;
  updatedAt: number;
};

export async function addHospitalRecord(record: Omit<HospitalRecord, 'id'>) {
  const docRef = await addDoc(collection(db, 'hospitalRecords'), record);
  return docRef.id;
}

export async function getHospitalRecords(orchardId?: string) {
  // ใช้ getDocsFromServer เพื่อบังคับดึงจาก Firestore server ไม่ใช่ cache
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

// ── Water Settings & Records ────────────────────────────────
export type WaterSetting = {
  id: string;
  orchardId: string;
  flowRate: number;   // ลิตร/นาที ต่อหัว
  headCount: number;  // จำนวนหัวน้ำ
  updatedAt: number;
};

export type DurianGrowthStage =
  | 'post_harvest'
  | 'stress'
  | 'flowering'
  | 'full_bloom'
  | 'tail'
  | 'fruit';

export const DURIAN_GROWTH_STAGE_LABEL: Record<DurianGrowthStage, string> = {
  post_harvest: 'ระยะหลังเก็บเกี่ยว',
  stress:       'ระยะกักโศก',
  flowering:    'ระยะออกดอก',
  full_bloom:   'ระยะดอกบาน',
  tail:         'ระยะหางแย้',
  fruit:        'ระยะลูก',
};

export type WaterRecord = {
  id: string;
  orchardId: string;
  date: string;
  minutes: number;
  liters: number;
  growthStage: DurianGrowthStage;
  createdAt: number;
};

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

// ── Fertilizer Formulas & Records ───────────────────────────
export type GrowthStage = 'leaf' | 'flower' | 'fruit' | 'recovery';
export const GROWTH_STAGE_LABEL: Record<GrowthStage, string> = {
  leaf: 'บำรุงใบ',
  flower: 'ออกดอก',
  fruit: 'ติดผล',
  recovery: 'หลังเก็บเกี่ยว',
};

export type FertilizerFormula = {
  id: string;
  orchardId: string;
  name: string;
  npk: string;        // เช่น 30-10-10
  stage: GrowthStage;
  createdAt: number;
};

export type FertilizerRecord = {
  id: string;
  orchardId: string;
  date: string;
  formulaId: string;
  formulaName: string;
  npk: string;
  stage: GrowthStage;
  amount: number;
  unit: string;       // กิโลกรัม / ลิตร
  createdAt: number;
};

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

// ── Spray Records ────────────────────────────────────────────
export type SprayMedicine = { name: string; amount: string; unit: string };

export type SprayRecord = {
  id: string;
  orchardId: string;
  date: string;
  purpose: string;        // วัตถุประสงค์
  pestDisease: string;    // ชื่อโรค/แมลง
  medicines: SprayMedicine[];
  note: string;
  createdAt: number;
};

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

// ── General Expense (รายจ่ายทั่วไป) ─────────────────────────
export type WorkType =
  | 'trim_tree'
  | 'prune_branch'
  | 'mow'
  | 'spray'
  | 'water'
  | 'trim_flower'
  | 'trim_fruit'
  | 'cut_rope'
  | 'other';

export const WORK_TYPE_LABEL: Record<WorkType, string> = {
  trim_tree:    'แต่งต้น',
  prune_branch: 'สอยแขนง',
  mow:          'ตัดหญ้า',
  spray:        'พ่นยา',
  water:        'ให้น้ำ',
  trim_flower:  'แต่งดอก',
  trim_fruit:   'แต่งลูก',
  cut_rope:     'ตัดเชือก',
  other:        'อื่นๆ',
};

export type GeneralExpense = {
  id: string;
  orchardId: string;
  date: string;
  workType: WorkType;
  customWork: string;   // ใช้เมื่อ workType === 'other'
  amount: number;
  note: string;
  createdAt: number;
};

export async function addGeneralExpense(record: Omit<GeneralExpense, 'id'>) {
  const docRef = await addDoc(collection(db, 'generalExpenses'), record);
  return docRef.id;
}

export async function getGeneralExpenses(orchardId: string): Promise<GeneralExpense[]> {
  const snapshot = await getDocs(collection(db, 'generalExpenses'));
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as GeneralExpense[];
  return all.filter(r => r.orchardId === orchardId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteGeneralExpense(id: string) {
  await deleteDoc(doc(db, 'generalExpenses', id));
}

// ── Upgrade Expense (ค่าปรับปรุงสวน) ────────────────────────
export type UpgradeExpense = {
  id: string;
  orchardId: string;
  date: string;
  item: string;       // รายการ
  amount: number;     // ราคา
  note: string;
  createdAt: number;
};

export async function addUpgradeExpense(record: Omit<UpgradeExpense, 'id'>) {
  const docRef = await addDoc(collection(db, 'upgradeExpenses'), record);
  return docRef.id;
}

export async function getUpgradeExpenses(orchardId: string): Promise<UpgradeExpense[]> {
  const snapshot = await getDocs(collection(db, 'upgradeExpenses'));
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as UpgradeExpense[];
  return all.filter(r => r.orchardId === orchardId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteUpgradeExpense(id: string) {
  await deleteDoc(doc(db, 'upgradeExpenses', id));
}

// ── Durian Fruit Record (ทำลูกทุเรียน) ──────────────────────
export type DurianFruitRecord = {
  id: string;
  orchardId: string;
  treeId: string;
  treeNumber: string;
  batch: string;            // รุ่นที่ 1 / 2 / 3
  pollinationDate: string;
  expectedHarvestDate: string;
  note: string;
  createdAt: number;
};

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
