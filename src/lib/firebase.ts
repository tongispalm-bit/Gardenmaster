import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc, query, orderBy, where, getDocsFromServer, onSnapshot } from 'firebase/firestore';

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

/** สวนที่ใช้ flow แบบมีผังสวน + sub-menu tabs (ทุเรียน + มังคุด) */
export const FARM_MAP_ORCHARDS = ['ทุเรียนหลังบ้าน', 'ทุเรียนหมื่นซ่อง', 'สวนมังคุด'] as const;

/** เช็คว่าสวนนี้ใช้ flow ผังสวน + tabs หรือไม่ */
export function hasFarmMap(orchardName: string | undefined | null): boolean {
  if (!orchardName) return false;
  return (FARM_MAP_ORCHARDS as readonly string[]).includes(orchardName);
}

// ── alias ของเดิม (deprecated แต่เก็บไว้เพื่อ backward compat) ──
export const DURIAN_FARM_NAMES = FARM_MAP_ORCHARDS;
export const isDurianFarm = hasFarmMap;

/** เช็คว่าเป็นสวนมังคุด — ใช้ flow ผังสวนแบบเรียบง่าย (ไม่มีโซน/พยาบาล/พันธุ์) */
export function isMangosteenFarm(orchardName: string | undefined | null): boolean {
  return orchardName === 'สวนมังคุด';
}

/** พันธุ์ของพืชในแต่ละสวน — ใช้ในผังสวน */
const DURIAN_VARIETIES = [
  'หมอนทอง','ชะนี','กระดุม','พวงมณี','ก้านยาว','มูซานคิง','โอฉี','นวลทองจันทร์',
];
const MANGOSTEEN_VARIETIES = [
  'มังคุดพื้นเมือง','มังคุดสายพันธุ์ดี','มังคุดเมขลา','มังคุดสีทอง','มังคุดเขาคิชฌกูฎ',
];

export function getVarietiesFor(orchardName: string | undefined | null): string[] {
  if (orchardName === 'สวนมังคุด') return MANGOSTEEN_VARIETIES;
  return DURIAN_VARIETIES;
}

/** Tree code prefix — B = ทุเรียน, M = มังคุด */
export function getTreeCodePrefix(orchardName: string | undefined | null): string {
  if (orchardName === 'สวนมังคุด') return 'M';
  return 'B';
}

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
  /** โซน A หรือ B — ใช้แยกกลุ่มสำหรับการรดน้ำ */
  zone?: 'A' | 'B' | null;
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

/**
 * Subscribe Firestore แบบ realtime — ใช้ onSnapshot
 * - คืน unsubscribe function
 * - callback ทำงานทุกครั้งที่ data เปลี่ยน (มี user คนอื่นแก้, ลบ, เพิ่ม)
 */
export function subscribeOrchards(callback: (orchards: Orchard[]) => void): () => void {
  const q = query(collection(db, 'orchards'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Orchard[];
    callback(data);
  }, (err) => {
    console.error('subscribeOrchards error:', err);
  });
}

/** Subscribe collection ทั่วไปแบบ realtime + filter ตาม orchardId */
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
    console.error(`subscribe ${collectionName} error:`, err);
  });
}

/** Subscribe single doc by orchardId — สำหรับ collection ที่มีแค่ 1 doc ต่อสวน (waterSetting, orchardStats, farmMapConfig) */
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
    console.error(`subscribeDocByOrchard ${collectionName} error:`, err);
  });
}

/** Subscribe orchard เดียวตาม id */
export function subscribeOrchard(orchardId: string, callback: (o: Orchard | null) => void): () => void {
  return onSnapshot(collection(db, 'orchards'), (snapshot) => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Orchard[];
    callback(items.find(o => o.id === orchardId) ?? null);
  });
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

// ── Farm Map Config (ขนาดผังและ cell ที่ไม่มีต้น) ──────────────────
export type FarmMapConfig = {
  id: string;
  orchardId: string;
  rows: number;
  cols: number;
  /** "row,col" ของ cell ที่ "ไม่มี" ต้น (default ทุก cell มีต้น) */
  blockedCells: string[];
  updatedAt: number;
};

export async function getFarmMapConfig(orchardId: string): Promise<FarmMapConfig | null> {
  const snapshot = await getDocs(collection(db, 'farmMapConfigs'));
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as FarmMapConfig[];
  return all.find(c => c.orchardId === orchardId) || null;
}

export async function saveFarmMapConfig(
  orchardId: string,
  data: { rows: number; cols: number; blockedCells: string[] }
): Promise<string> {
  const existing = await getFarmMapConfig(orchardId);
  if (existing) {
    await updateDoc(doc(db, 'farmMapConfigs', existing.id), {
      ...data,
      updatedAt: Date.now(),
    });
    return existing.id;
  }
  const docRef = await addDoc(collection(db, 'farmMapConfigs'), {
    orchardId,
    ...data,
    updatedAt: Date.now(),
  });
  return docRef.id;
}

// ── Orchard Stats (ใช้กับสวนที่ไม่มีผังสวน เช่น สวนมังคุด — กรอกจำนวนต้นเอง) ──
export type OrchardStats = {
  id: string;
  orchardId: string;
  /** จำนวนต้น (กรอกเอง) */
  treeCount: number;
  updatedAt: number;
};

export async function getOrchardStats(orchardId: string): Promise<OrchardStats | null> {
  const snapshot = await getDocs(collection(db, 'orchardStats'));
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as OrchardStats[];
  return all.find(s => s.orchardId === orchardId) || null;
}

export async function saveOrchardStats(orchardId: string, treeCount: number): Promise<string> {
  const existing = await getOrchardStats(orchardId);
  if (existing) {
    await updateDoc(doc(db, 'orchardStats', existing.id), {
      treeCount,
      updatedAt: Date.now(),
    });
    return existing.id;
  }
  const docRef = await addDoc(collection(db, 'orchardStats'), {
    orchardId,
    treeCount,
    updatedAt: Date.now(),
  });
  return docRef.id;
}

// ── User Authentication ─────────────────────────────────────
export type UserRole = 'admin' | 'user';

export type AppUser = {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  displayName: string;
  /** รูปโปรไฟล์ (base64 data URL) */
  profileImage?: string;
  createdAt: number;
  updatedAt: number;
};

/** อัปเดตข้อมูลโปรไฟล์ (displayName, profileImage) */
export async function updateUserProfile(userId: string, data: { displayName?: string; profileImage?: string }) {
  await updateDoc(doc(db, 'users', userId), { ...data, updatedAt: Date.now() });
}

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
export type DurianGrade = 'เบอร์หัว' | 'ดอกดำ' | 'เบอร์รวม';

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

/** snapshot ของข้อมูลก่อนแก้ไข — เก็บใน editHistory */
export type HospitalEditEntry = {
  editedAt: number;
  symptoms: string;
  severity: Severity;
  medicines: MedicineItem[];
  treatmentResult: TreatmentResult | null;
  status: HospitalStatus;
  recoveryDate: string;
  note: string;
};

export type HospitalRecord = {
  id: string;
  orchardId: string;
  treeId: string;
  treeNumber: string;
  dateFound: string;
  symptoms: string;
  photos: string[];
  severity: Severity;
  medicines: MedicineItem[];
  treatmentResult: TreatmentResult | null;
  recoveryDate: string;
  status: HospitalStatus;
  note: string;
  /** ประวัติการแก้ไข — เก็บ snapshot ทุกครั้งที่ update */
  editHistory?: HospitalEditEntry[];
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
  | 'post_harvest'      // หลังเก็บเกี่ยว
  | 'accumulate'        // ระยะสะสมอาหาร
  | 'make_flower'       // ระยะทำดอก
  | 'flowering'         // ระยะออกดอก
  | 'fruit_setting'     // ระยะเป็นขึ้นลูก
  | 'harvest';          // ระยะเก็บเกี่ยว

export const DURIAN_GROWTH_STAGE_LABEL: Record<DurianGrowthStage, string> = {
  post_harvest:  'หลังเก็บเกี่ยว',
  accumulate:    'ระยะสะสมอาหาร',
  make_flower:   'ระยะทำดอก',
  flowering:     'ระยะออกดอก',
  fruit_setting: 'ระยะเป็นขึ้นลูก',
  harvest:       'ระยะเก็บเกี่ยว',
};

// ── ระยะกักโศก (Stress Period) — ช่วงวันที่งดน้ำเพื่อกระตุ้นออกดอก ──
export type StressPeriod = {
  id: string;
  orchardId: string;
  /** วันที่เริ่มกักโศก YYYY-MM-DD */
  startDate: string;
  /** วันที่สิ้นสุดกักโศก YYYY-MM-DD */
  endDate: string;
  note?: string;
  createdAt: number;
};

export async function addStressPeriod(record: Omit<StressPeriod, 'id'>) {
  const docRef = await addDoc(collection(db, 'stressPeriods'), record);
  return docRef.id;
}

export async function getStressPeriods(orchardId: string): Promise<StressPeriod[]> {
  const snapshot = await getDocs(collection(db, 'stressPeriods'));
  const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as StressPeriod[];
  return all.filter(r => r.orchardId === orchardId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteStressPeriod(id: string) {
  await deleteDoc(doc(db, 'stressPeriods', id));
}

export type WaterRecord = {
  id: string;
  orchardId: string;
  date: string;
  minutes: number;
  liters: number;
  growthStage: DurianGrowthStage;
  /** โซนที่รด — 'all' = ทั้งสวน, 'A'/'B' = เฉพาะโซน */
  zone?: 'all' | 'A' | 'B';
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
export type GrowthStage =
  | 'recovery'      // ฟื้นฟูรากหลังเก็บเกี่ยว
  | 'leaf'          // บำรุงใบ
  | 'flower'        // ออกดอก/ติดผล ช่วงดอกบาน
  | 'tail'          // ระยะหางแย้
  | 'small_fruit'   // ระยะผลเล็ก/ไข่ไก่
  | 'milk_can'      // ระยะกระป๋องนม
  | 'expand_lobe'   // ระยะขยายพู
  | 'harvest';      // ระยะเก็บเกี่ยว

export const GROWTH_STAGE_LABEL: Record<GrowthStage, string> = {
  recovery:    '🌱 ฟื้นฟูรากหลังเก็บเกี่ยว',
  leaf:        '🍃 บำรุงใบ',
  flower:      '🌸 ออกดอก / ติดผล ช่วงดอกบาน',
  tail:        '🦎 ระยะหางแย้',
  small_fruit: '🥚 ระยะผลเล็ก / ไข่ไก่',
  milk_can:    '🥛 ระยะกระป๋องนม',
  expand_lobe: '🌰 ระยะขยายพู',
  harvest:     '✂️ ระยะเก็บเกี่ยว',
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
  /** id ของรายการปุ๋ยใน nutrientItems (คลังสารเคมี) */
  stockId?: string;
  /** สูตรปุ๋ยจาก nutrientItems.formula หรือ formula doc */
  formulaId?: string;
  formulaName: string;
  npk: string;
  stage: GrowthStage;
  amount: number;
  unit: string;       // กิโลกรัม / ลิตร
  note?: string;
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
/** กลุ่มของยาที่ใช้พ่น — ลิงก์กับคลังสารเคมี */
export type SprayMedicineGroup = 'insecticide' | 'fungicide' | 'hormone' | 'fertilizer';

export const SPRAY_GROUP_LABEL: Record<SprayMedicineGroup, string> = {
  insecticide: 'ยาฆ่าแมลง',
  fungicide:   'ยารา',
  hormone:     'ฮอร์โมน',
  fertilizer:  'ปุ๋ย',
};

export type SprayMedicine = {
  /** กลุ่มของยา (ลิงก์ไปยัง collection ใดใน stock) */
  group?: SprayMedicineGroup;
  /** id ของรายการใน stock (medicineItems / nutrientItems) — สำหรับหักปริมาณ */
  stockId?: string;
  name: string;
  amount: string;
  unit: string;
};

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


// ── Medicine Stock (กลุ่มยา) ────────────────────────────────
/** ประเภทยา: ร้อน (กำจัดศัตรู) / เย็น (บำรุง) */
export type MedicineCategory = 'hot' | 'cold';
/** หน่วยปริมาณ */
export type MedicineUnit = 'liter' | 'cc' | 'kg' | 'gram';
/** ชนิดของยา (เมนูย่อย) — ยารา / ยาฆ่าแมลง */
export type MedicineType = 'fungicide' | 'insecticide';

export const MEDICINE_CATEGORY_LABEL: Record<MedicineCategory, string> = {
  hot: 'ยาร้อน',
  cold: 'ยาเย็น',
};

export const MEDICINE_UNIT_LABEL: Record<MedicineUnit, string> = {
  liter: 'ลิตร',
  cc: 'ซีซี',
  kg: 'กิโล',
  gram: 'กรัม',
};

export const MEDICINE_TYPE_LABEL: Record<MedicineType, string> = {
  fungicide: 'ยารา',
  insecticide: 'ยาฆ่าแมลง',
};

export type MedicineItemRecord = {
  id: string;
  orchardId: string;
  /** ยารา / ยาฆ่าแมลง (เมนูย่อย) */
  type: MedicineType;
  category: MedicineCategory;
  name: string;
  amount: number;
  unit: MedicineUnit;
  /** กลุ่มยา 1-9 */
  group: number;
  /** ราคา (บาท) */
  price?: number;
  /** วันที่ซื้อ (YYYY-MM-DD) — ใช้คำนวณรายจ่ายเดือน/ปี */
  purchaseDate?: string;
  /** รูปภาพ (base64) สูงสุด 6 รูป */
  photos?: string[];
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export async function addMedicineItem(record: Omit<MedicineItemRecord, 'id'>) {
  const docRef = await addDoc(collection(db, 'medicineItems'), record);
  return docRef.id;
}

export async function getMedicineItems(orchardId: string, type?: MedicineType): Promise<MedicineItemRecord[]> {
  const snapshot = await getDocs(collection(db, 'medicineItems'));
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as MedicineItemRecord[];
  return items
    .filter(i => i.orchardId === orchardId && (type ? i.type === type : true))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateMedicineItem(id: string, data: Partial<Omit<MedicineItemRecord, 'id'>>) {
  await updateDoc(doc(db, 'medicineItems', id), { ...data, updatedAt: Date.now() });
}

export async function deleteMedicineItem(id: string) {
  await deleteDoc(doc(db, 'medicineItems', id));
}


// ── Nutrient Stock (ธาตุอาหาร) — ใช้ schema เดียวกับ MedicineItemRecord ────
/** ชนิดธาตุอาหาร — ปุ๋ย / ฮอร์โมน (placeholder ปรับภายหลัง) */
export type NutrientType = 'fertilizer' | 'hormone';

export const NUTRIENT_TYPE_LABEL: Record<NutrientType, string> = {
  fertilizer: 'ปุ๋ย',
  hormone: 'ฮอร์โมน',
};

export type NutrientItemRecord = {
  id: string;
  orchardId: string;
  type: NutrientType;
  category: MedicineCategory; // ใช้ ร้อน/เย็น เหมือนยา (overridden เป็น powder/liquid/organic ฯลฯ ผ่าน UI)
  name: string;
  /** สูตร เช่น 15-15-15, 25-7-7 */
  formula?: string;
  amount: number;
  unit: MedicineUnit;
  group: number;
  price?: number;
  purchaseDate?: string;
  photos?: string[];
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export async function addNutrientItem(record: Omit<NutrientItemRecord, 'id'>) {
  const docRef = await addDoc(collection(db, 'nutrientItems'), record);
  return docRef.id;
}

export async function getNutrientItems(orchardId: string, type?: NutrientType): Promise<NutrientItemRecord[]> {
  const snapshot = await getDocs(collection(db, 'nutrientItems'));
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as NutrientItemRecord[];
  return items
    .filter(i => i.orchardId === orchardId && (type ? i.type === type : true))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateNutrientItem(id: string, data: Partial<Omit<NutrientItemRecord, 'id'>>) {
  await updateDoc(doc(db, 'nutrientItems', id), { ...data, updatedAt: Date.now() });
}

export async function deleteNutrientItem(id: string) {
  await deleteDoc(doc(db, 'nutrientItems', id));
}


// ── Stock deduction helper (หักปริมาณจากคลังเมื่อพ่นยา) ────────
/**
 * หักปริมาณจาก stock — ลดจากค่า amount ที่มี
 * - กลุ่ม medicine (insecticide/fungicide) → medicineItems
 * - กลุ่ม nutrient (hormone/fertilizer) → nutrientItems
 * - ถ้าผลลัพธ์ <= 0 จะไม่ลบ record (เก็บไว้แต่ amount=0)
 * - หน่วยใน spray ต่างจาก stock จะ skip การหัก (เก็บแค่ log)
 *
 * @returns รายงานผล: { stockId, oldAmount, newAmount, deducted }[]
 */
export async function deductFromStock(
  items: Array<{ group?: SprayMedicineGroup; stockId?: string; amount: string; unit: string }>
): Promise<Array<{ stockId: string; ok: boolean; reason?: string }>> {
  const results: Array<{ stockId: string; ok: boolean; reason?: string }> = [];
  for (const it of items) {
    if (!it.stockId || !it.group) {
      results.push({ stockId: it.stockId ?? '', ok: false, reason: 'no stock link' });
      continue;
    }
    const used = Number(it.amount);
    if (!used || isNaN(used) || used <= 0) {
      results.push({ stockId: it.stockId, ok: false, reason: 'invalid amount' });
      continue;
    }
    try {
      const isMedicine = it.group === 'insecticide' || it.group === 'fungicide';
      const collectionName = isMedicine ? 'medicineItems' : 'nutrientItems';
      const ref = doc(db, collectionName, it.stockId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        results.push({ stockId: it.stockId, ok: false, reason: 'not found' });
        continue;
      }
      const data = snap.data() as { amount: number; unit: string };
      // ตรวจหน่วย — ถ้าต่างกันให้ skip (ไม่หัก เพื่อไม่ให้ข้อมูลเพี้ยน)
      if (data.unit !== it.unit) {
        results.push({ stockId: it.stockId, ok: false, reason: `unit mismatch (stock=${data.unit}, used=${it.unit})` });
        continue;
      }
      const newAmount = Math.max(0, (data.amount ?? 0) - used);
      await updateDoc(ref, { amount: newAmount, updatedAt: Date.now() });
      results.push({ stockId: it.stockId, ok: true });
    } catch (e) {
      console.error('[deductFromStock] error', e);
      results.push({ stockId: it.stockId, ok: false, reason: 'error' });
    }
  }
  return results;
}
