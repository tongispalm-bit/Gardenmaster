// ────────────────────────────────────────────────────────────
// Types & Constants
// รวม types และ constants ทั้งหมดไว้ที่นี่เพื่อความชัดเจน
// ────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════
// 🏞️ ORCHARD (สวน)
// ══════════════════════════════════════════════════════════

export type Orchard = {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: number;
};

/** สวนที่ใช้ flow แบบมีผังสวน + sub-menu tabs */
export const FARM_MAP_ORCHARDS = ['ทุเรียนหลังบ้าน', 'ทุเรียนหมื่นซ่อง', 'สวนมังคุด'] as const;

/** @deprecated ใช้ FARM_MAP_ORCHARDS แทน */
export const DURIAN_FARM_NAMES = FARM_MAP_ORCHARDS;

/** พันธุ์ทุเรียน */
const DURIAN_VARIETIES = [
  'หมอนทอง','ชะนี','กระดุม','พวงมณี','ก้านยาว','มูซานคิง','โอฉี','นวลทองจันทร์','นกหยิบ',
];

/** พันธุ์มังคุด */
const MANGOSTEEN_VARIETIES = [
  'มังคุดพื้นเมือง','มังคุดสายพันธุ์ดี','มังคุดเมขลา','มังคุดสีทอง','มังคุดเขาคิชฌกูฎ',
];

/** ดึงรายชื่อพันธุ์ตามชื่อสวน */
export function getVarietiesFor(orchardName: string | undefined | null): string[] {
  if (orchardName === 'สวนมังคุด') return MANGOSTEEN_VARIETIES;
  return DURIAN_VARIETIES;
}

/** Tree code prefix — B = ทุเรียน, M = มังคุด */
export function getTreeCodePrefix(orchardName: string | undefined | null): string {
  if (orchardName === 'สวนมังคุด') return 'M';
  return 'B';
}

/** เช็คว่าสวนนี้ใช้ flow ผังสวน + tabs หรือไม่ */
export function hasFarmMap(orchardName: string | undefined | null): boolean {
  if (!orchardName) return false;
  return (FARM_MAP_ORCHARDS as readonly string[]).includes(orchardName);
}

/** @deprecated ใช้ hasFarmMap แทน */
export const isDurianFarm = hasFarmMap;

/** เช็คว่าเป็นสวนมังคุด */
export function isMangosteenFarm(orchardName: string | undefined | null): boolean {
  return orchardName === 'สวนมังคุด';
}

// ══════════════════════════════════════════════════════════
// 🗺️ FARM MAP CONFIG
// ══════════════════════════════════════════════════════════

export type FarmMapConfig = {
  id: string;
  orchardId: string;
  rows: number;
  cols: number;
  /** "row,col" ของ cell ที่ไม่มีต้น */
  blockedCells: string[];
  updatedAt: number;
};

export type OrchardStats = {
  id: string;
  orchardId: string;
  treeCount: number;
  updatedAt: number;
};

// ══════════════════════════════════════════════════════════
// 🌳 TREE PROFILE
// ══════════════════════════════════════════════════════════

export type TreeProfile = {
  id: string;
  orchardId: string;
  row: number;
  col: number;
  treeNumber: string;
  variety: string;
  age: number;
  status: 'normal' | 'watch' | 'seedling';
  zone?: 'A' | 'B' | null;
  note: string;
  createdAt: number;
  updatedAt: number;
};

// ══════════════════════════════════════════════════════════
// 👤 USER & AUTH
// ══════════════════════════════════════════════════════════

export type UserRole = 'admin' | 'user';

export type AppUser = {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  displayName: string;
  profileImage?: string;
  createdAt: number;
  updatedAt: number;
};

// ══════════════════════════════════════════════════════════
// 🌿 CARE RECORDS (การดูแล)
// ══════════════════════════════════════════════════════════

export type CareRecord = {
  id: string;
  orchardId: string;
  date: string;
  type: 'water' | 'fertilize' | 'pesticide';
  plant: string;
  note: string;
  createdAt: number;
};

// ── 💧 WATER (รดน้ำ) ──

export type DurianGrowthStage =
  | 'post_harvest'
  | 'accumulate'
  | 'make_flower'
  | 'flowering'
  | 'fruit_setting'
  | 'harvest';

export const DURIAN_GROWTH_STAGE_LABEL: Record<DurianGrowthStage, string> = {
  post_harvest:  'หลังเก็บเกี่ยว',
  accumulate:    'ระยะสะสมอาหาร',
  make_flower:   'ระยะทำดอก',
  flowering:     'ระยะออกดอก',
  fruit_setting: 'ระยะเป็นขึ้นลูก',
  harvest:       'ระยะเก็บเกี่ยว',
};

export type WaterSetting = {
  id: string;
  orchardId: string;
  flowRate: number;
  headCount: number;
  updatedAt: number;
};

export type WaterRecord = {
  id: string;
  orchardId: string;
  date: string;
  minutes: number;
  liters: number;
  growthStage: DurianGrowthStage;
  zone?: 'all' | 'A' | 'B';
  /** ปี พ.ศ. ของรอบการเก็บเกี่ยว */
  year?: number;
  createdAt: number;
};

export type StressPeriod = {
  id: string;
  orchardId: string;
  startDate: string;
  endDate: string;
  note?: string;
  createdAt: number;
};

// ── 🌱 FERTILIZER (ปุ๋ย) ──

export type GrowthStage =
  | 'recovery'
  | 'leaf'
  | 'flower'
  | 'tail'
  | 'small_fruit'
  | 'milk_can'
  | 'expand_lobe'
  | 'harvest';

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

export type FertilizerProfile = {
  id: string;
  orchardId: string;
  name: string;
  npk: string;
  stage: 'leaf' | 'flower' | 'fruit' | 'post-harvest';
  createdAt: number;
};

export type FertilizerFormula = {
  id: string;
  orchardId: string;
  name: string;
  npk: string;
  stage: GrowthStage;
  createdAt: number;
};

export type FertilizerRecord = {
  id: string;
  orchardId: string;
  date: string;
  stockId?: string;
  formulaId?: string;
  formulaName: string;
  npk: string;
  stage: GrowthStage;
  amount: number;
  unit: string;
  note?: string;
  /** ปี พ.ศ. ของรอบการเก็บเกี่ยว */
  year?: number;
  createdAt: number;
};

// ── 💉 SPRAY (พ่นยา) ──

export type SprayMedicineGroup = 'insecticide' | 'fungicide' | 'hormone' | 'fertilizer' | 'bioproduct';

export const SPRAY_GROUP_LABEL: Record<SprayMedicineGroup, string> = {
  insecticide: 'ยาฆ่าแมลง',
  fungicide:   'ยารา',
  hormone:     'ฮอร์โมน',
  fertilizer:  'ปุ๋ย',
  bioproduct:  'ชีวภัณฑ์',
};

export type SprayMedicine = {
  group?: SprayMedicineGroup;
  stockId?: string;
  name: string;
  amount: string;
  unit: string;
};

export type SprayRecord = {
  id: string;
  orchardId: string;
  date: string;
  purpose: string;
  pestDisease: string;
  medicines: SprayMedicine[];
  note: string;
  /** ปี พ.ศ. ของรอบการเก็บเกี่ยว */
  year?: number;
  createdAt: number;
};

// ── 🌾 DURIAN FRUIT (ทำลูกทุเรียน) ──

export type DurianFruitRecord = {
  id: string;
  orchardId: string;
  treeId: string;
  treeNumber: string;
  batch: string;
  pollinationDate: string;
  expectedHarvestDate: string;
  /** ปี พ.ศ. ของรอบการเก็บเกี่ยว */
  year?: number;
  note: string;
  createdAt: number;
};

// ══════════════════════════════════════════════════════════
// 💰 FINANCE (การเงิน)
// ══════════════════════════════════════════════════════════

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

// ── 📊 GENERAL EXPENSE (รายจ่ายทั่วไป) ──

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
  customWork: string;
  amount: number;
  note: string;
  /** ปี พ.ศ. ของรอบการเก็บเกี่ยว */
  year?: number;
  createdAt: number;
};

// ── 🔧 UPGRADE EXPENSE (ค่าปรับปรุง) ──

export type UpgradeExpense = {
  id: string;
  orchardId: string;
  date: string;
  item: string;
  amount: number;
  note: string;
  /** ปี พ.ศ. ของรอบการเก็บเกี่ยว */
  year?: number;
  createdAt: number;
};

// ── 🛒 SALES (การซื้อขาย) ──

export type DurianGrade = 'AB' | 'C' | 'D' | 'อินโด' | 'ตกไซร้' | 'จัมโบ้-เข้' | 'ห้องเย็น' | 'สทและเอาไว้เอา' | 'เอาไว้เอง';
export type MangosteenGrade = 'เบอร์หัว' | 'ดอกดำ' | 'เบอร์รวม';
export type FruitGrade = DurianGrade | MangosteenGrade;

export const DEFAULT_GRADES: Record<string, string[]> = {
  'ทุเรียนหลังบ้าน': ['AB', 'C', 'D', 'อินโด', 'ตกไซร้', 'จัมโบ้-เข้', 'ห้องเย็น', 'เอาไว้เอง'],
  'ทุเรียนหมื่นซ่อง': ['AB', 'C', 'D', 'อินโด', 'ตกไซร้', 'จัมโบ้-เข้', 'ห้องเย็น'],
  'สวนมังคุด': ['เบอร์หัว', 'ดอกดำ', 'เบอร์รวม'],
};

export type OrchardGradesConfig = {
  id: string;
  orchardId: string;
  grades: string[];
  updatedAt: number;
};

export type SaleRecord = {
  id: string;
  orchardId: string;
  date: string;
  grade: FruitGrade;
  weight: number;
  pricePerKg: number;
  totalAmount: number;
  cutRate: number;
  cutCost: number;
  netAmount: number;
  note: string;
  /** ปี พ.ศ. ของรอบการเก็บเกี่ยว */
  year?: number;
  createdAt: number;
};

// ══════════════════════════════════════════════════════════
// 🏥 HOSPITAL (ห้องพยาบาล)
// ══════════════════════════════════════════════════════════

export type Severity = 'mild' | 'moderate' | 'severe';
export type TreatmentResult = 'better' | 'same' | 'worse';
export type HospitalStatus = 'treating' | 'recovered';

export type MedicineItem = {
  name: string;
  amount: string;
};

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
  editHistory?: HospitalEditEntry[];
  createdAt: number;
  updatedAt: number;
};

// ══════════════════════════════════════════════════════════
// 📦 STOCK (คลังสารเคมี)
// ══════════════════════════════════════════════════════════

export type MedicineCategory = 'hot' | 'cold';
export type MedicineUnit = 'liter' | 'cc' | 'kg' | 'gram';
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
  type: MedicineType;
  category: MedicineCategory;
  name: string;
  amount: number;
  unit: MedicineUnit;
  group: number;
  groupText?: string;
  price?: number;
  purchaseDate?: string;
  photos?: string[];
  note?: string;
  createdAt: number;
  updatedAt: number;
};

// ── ธาตุอาหาร (Nutrient) ──

export type NutrientType = 'fertilizer' | 'hormone' | 'bioproduct';

export const NUTRIENT_TYPE_LABEL: Record<NutrientType, string> = {
  fertilizer: 'ปุ๋ย',
  hormone: 'ฮอร์โมน',
  bioproduct: 'ชีวภัณฑ์',
};

export type NutrientItemRecord = {
  id: string;
  orchardId: string;
  type: NutrientType;
  category: MedicineCategory;
  name: string;
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
