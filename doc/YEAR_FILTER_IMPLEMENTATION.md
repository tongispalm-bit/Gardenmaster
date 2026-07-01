# การนำ Year Filter ไปใช้กับทุกหน้า

## 📋 ภาพรวม

ทุกหน้าในส่วนทุเรียนหลังบ้านต้องใช้ **ปีรอบเก็บเกี่ยว** จาก `useHarvestYear` เพื่อ:
1. บันทึกข้อมูลพร้อม field `year`
2. แสดงเฉพาะข้อมูลที่ตรงกับปีที่เลือก
3. **ยกเว้น**: หน้า **ห้องพยาบาล** แสดงทุกปี แต่แยกกลุ่มตามปี

---

## 🎯 หน้าที่ต้องแก้ไข

### 1. ✅ ผังสวน (farm-map) — เสร็จแล้ว
- filter TreeProfile ตาม year
- บันทึกต้นใหม่พร้อม year

### 2. 📝 การดูแล (care)
**ไฟล์:** `src/app/orchard/care/*/Client.tsx`
- `WaterClient.tsx` - บันทึกการรดน้ำ
- `FertilizeClient.tsx` - บันทึกการใส่ปุ๋ย
- `SprayClient.tsx` - บันทึกการพ่นยา
- `DurianFruitClient.tsx` - บันทึกทำลูกทุเรียน

**Type:** `CareRecord` ต้องเพิ่ม field `year?: number`

### 3. 📝 รายจ่าย (expense)
**ไฟล์:** `src/app/orchard/expense/ExpenseClient.tsx`

**Type:** `Transaction` ต้องเพิ่ม field `year?: number`

### 4. 📝 ทำลูกทุเรียน (durian-fruit)
**ไฟล์:** `src/app/orchard/care/durian-fruit/DurianFruitClient.tsx`

**Type:** `CareRecord` (ใช้ร่วมกับ care)

### 5. 🏥 ห้องพยาบาล (hospital) — กรณีพิเศษ
**ไฟล์:** `src/app/orchard/hospital/HospitalClient.tsx`

**ความต้องการ:**
- แสดง **ทุกปี** (ไม่ filter)
- **แยกกลุ่มตามปี** ด้วย UI
- บันทึกใหม่ใช้ year ปัจจุบัน

**Type:** `HospitalRecord` ต้องเพิ่ม field `year?: number`

---

## 🛠️ ขั้นตอนการแก้ไข

### Step 1: เพิ่ม field `year` ใน Types

#### `src/lib/firebase/types.ts`

```typescript
// ── CareRecord (water, fertilize, spray, durian-fruit) ──
export type CareRecord = {
  id: string;
  orchardId: string;
  type: 'water' | 'fertilize' | 'spray' | 'durian-fruit';
  date: string; // YYYY-MM-DD
  detail: string;
  createdAt: number;
  updatedAt: number;
  year?: number; // ⭐ เพิ่มปี พ.ศ.
};

// ── Transaction (expense) ──
export type Transaction = {
  id: string;
  orchardId: string;
  type: 'expense' | 'income';
  category: string;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
  year?: number; // ⭐ เพิ่มปี พ.ศ.
};

// ── HospitalRecord ──
export type HospitalRecord = {
  id: string;
  orchardId: string;
  treeId: string;
  dateFound: string; // YYYY-MM-DD
  symptoms: string;
  photos: string[];
  severity: Severity;
  medicines: MedicineItem[];
  treatmentResult: TreatmentResult | null;
  recoveryDate: string;
  status: HospitalStatus;
  note: string;
  createdAt: number;
  updatedAt: number;
  year?: number; // ⭐ เพิ่มปี พ.ศ.
};
```

---

### Step 2: Pattern สำหรับแต่ละหน้า

## 📝 Pattern A: หน้าทั่วไป (care, expense)

### 1. Import hook
```typescript
import { useHarvestYear } from '@/lib/useHarvestYear';
```

### 2. ใช้ hook
```typescript
export default function XxxClient() {
  const orchardId = searchParams.get('id') || '';
  const { year: selectedYear } = useHarvestYear(orchardId);
  
  const [allRecords, setAllRecords] = useState<CareRecord[]>([]);
  const [records, setRecords] = useState<CareRecord[]>([]);
```

### 3. Load data (เก็บทั้งหมด)
```typescript
const loadData = async () => {
  const recordData = await getCareRecords(orchardId, 'water');
  setAllRecords(recordData); // เก็บดิบ
};
```

### 4. Filter ตามปี
```typescript
useEffect(() => {
  if (!selectedYear) {
    setRecords([]);
    return;
  }
  
  const filtered = allRecords.filter(r => {
    if (r.year) {
      return r.year === selectedYear;
    }
    // ข้อมูลเก่าไม่มี year → แสดงในปี 2569
    return selectedYear === 2569;
  });
  setRecords(filtered);
}, [selectedYear, allRecords]);
```

### 5. บันทึกพร้อม year
```typescript
const handleSave = async () => {
  await addCareRecord({
    ...formData,
    year: selectedYear, // ⭐ เพิ่ม year
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  await loadData();
};
```

---

## 🏥 Pattern B: หน้า Hospital (แสดงทุกปี แต่แยกกลุ่ม)

### 1. Import hook
```typescript
import { useHarvestYear } from '@/lib/useHarvestYear';
import { getRecordYear } from '@/lib/useHarvestYear'; // helper function
```

### 2. ใช้ hook (เฉพาะบันทึกใหม่)
```typescript
export default function HospitalClient() {
  const orchardId = searchParams.get('id') || '';
  const { year: selectedYear } = useHarvestYear(orchardId);
  
  const [records, setRecords] = useState<HospitalRecord[]>([]);
  // ไม่ต้องมี allRecords เพราะไม่ filter
```

### 3. Load data (แสดงทุกปี)
```typescript
const loadData = async () => {
  const recordData = await getHospitalRecords(orchardId);
  setRecords(recordData); // ไม่ filter
};
```

### 4. จัดกลุ่มตามปี (UI)
```typescript
// จัดกลุ่ม records ตามปี
const recordsByYear = useMemo(() => {
  const groups = new Map<number, HospitalRecord[]>();
  
  records.forEach(r => {
    const year = getRecordYear(r); // helper: ดึงปีจาก r.year หรือ r.dateFound
    if (!groups.has(year)) {
      groups.set(year, []);
    }
    groups.get(year)!.push(r);
  });
  
  // เรียงปีจากมากไปน้อย
  return Array.from(groups.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, records]) => ({
      year,
      records: records.sort((a, b) => b.createdAt - a.createdAt),
    }));
}, [records]);
```

### 5. Render UI แยกตามปี
```tsx
<div className="space-y-6">
  {recordsByYear.map(({ year, records }) => (
    <div key={year}>
      {/* Header ปี */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-xl mb-3 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">📅 ปี พ.ศ. {year}</h2>
          <span className="text-sm bg-white/20 rounded-full px-3 py-1">
            {records.length} รายการ
          </span>
        </div>
      </div>
      
      {/* Records ของปีนั้น */}
      <div className="space-y-3">
        {records.map(record => (
          <RecordCard key={record.id} record={record} />
        ))}
      </div>
    </div>
  ))}
  
  {recordsByYear.length === 0 && (
    <div className="text-center py-12 text-slate-400">
      ยังไม่มีประวัติการรักษา
    </div>
  )}
</div>
```

### 6. บันทึกใหม่พร้อม year
```typescript
const handleSave = async () => {
  await addHospitalRecord({
    ...formData,
    year: selectedYear, // ⭐ ใช้ปีที่เลือกใน header
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  await loadData();
};
```

---

## 📋 Checklist การแก้ไขแต่ละหน้า

### ✅ ผังสวน (farm-map)
- [x] เพิ่ม field `year` ใน TreeProfile type
- [x] Import useHarvestYear hook
- [x] Filter trees ตาม selectedYear
- [x] บันทึกต้นใหม่พร้อม year

### 📝 การรดน้ำ (water)
- [ ] เพิ่ม field `year` ใน CareRecord type (ถ้ายังไม่มี)
- [ ] Import useHarvestYear hook
- [ ] เพิ่ม state: allRecords, records
- [ ] Filter records ตาม selectedYear
- [ ] บันทึกพร้อม year

### 📝 การใส่ปุ๋ย (fertilize)
- [ ] Import useHarvestYear hook
- [ ] เพิ่ม state: allRecords, records
- [ ] Filter records ตาม selectedYear
- [ ] บันทึกพร้อม year

### 📝 การพ่นยา (spray)
- [ ] Import useHarvestYear hook
- [ ] เพิ่ม state: allRecords, records
- [ ] Filter records ตาม selectedYear
- [ ] บันทึกพร้อม year

### 📝 ทำลูกทุเรียน (durian-fruit)
- [ ] Import useHarvestYear hook
- [ ] เพิ่ม state: allRecords, records
- [ ] Filter records ตาม selectedYear
- [ ] บันทึกพร้อม year

### 📝 รายจ่าย (expense)
- [ ] เพิ่ม field `year` ใน Transaction type
- [ ] Import useHarvestYear hook
- [ ] เพิ่ม state: allTransactions, transactions
- [ ] Filter transactions ตาม selectedYear
- [ ] บันทึกพร้อม year

### 🏥 ห้องพยาบาล (hospital) — กรณีพิเศษ
- [ ] เพิ่ม field `year` ใน HospitalRecord type
- [ ] Import useHarvestYear hook + getRecordYear helper
- [ ] จัดกลุ่ม records ตามปี (useMemo)
- [ ] Render UI แยกกลุ่มตามปี
- [ ] บันทึกใหม่พร้อม year

---

## 🧪 การทดสอบ

### Test Case 1: บันทึกข้อมูลใหม่
1. เลือกปี 2570 ใน header
2. เพิ่มข้อมูลใหม่ (เช่น รดน้ำ)
3. ✅ บันทึกควรมี field `year` = 2570
4. ✅ แสดงในรายการทันที

### Test Case 2: เปลี่ยนปี
1. มีข้อมูลปี 2569 และ 2570
2. เลือกปี 2569
3. ✅ แสดงเฉพาะข้อมูลปี 2569
4. เปลี่ยนเป็นปี 2570
5. ✅ แสดงเฉพาะข้อมูลปี 2570

### Test Case 3: ข้อมูลเก่าไม่มี year
1. มีข้อมูลเก่าไม่มี field `year`
2. เลือกปี 2569
3. ✅ แสดงข้อมูลเก่า (backward compatible)
4. เลือกปี 2570
5. ✅ ไม่แสดงข้อมูลเก่า

### Test Case 4: ห้องพยาบาล (แสดงทุกปี)
1. มีข้อมูลหลายปี (2569, 2570, 2571)
2. เปิดหน้าห้องพยาบาล
3. ✅ แสดงข้อมูลทุกปี
4. ✅ แยกกลุ่มเป็น 3 section (header แต่ละปี)
5. ✅ เรียงปีจากมากไปน้อย (2571 → 2570 → 2569)

---

## 📝 Helper Function (เพิ่มใน useHarvestYear.ts)

```typescript
/**
 * หาปี พ.ศ. ของบันทึก รองรับข้อมูลเก่าที่ไม่มี field `year`
 * - ถ้ามี field year → ใช้ค่านั้น
 * - ถ้าไม่มี → คำนวณจาก date (ค.ศ. + 543); ถ้าไม่มี date ด้วย → ปีเริ่มต้น
 */
export function getRecordYear(
  record: { year?: number; date?: string; createdAt?: number },
): number {
  if (record.year) return record.year;
  if (record.date) {
    const ce = new Date(record.date).getFullYear();
    if (!isNaN(ce)) return ce + 543;
  }
  if (record.createdAt) {
    return new Date(record.createdAt).getFullYear() + 543;
  }
  return DEFAULT_YEAR; // 2569
}
```

**การใช้งาน:**
```typescript
const year = getRecordYear(record); // auto-detect year
```

---

## 🎨 UI Guidelines

### การแสดงข้อมูลที่ filter แล้ว
```tsx
{records.length === 0 && (
  <div className="text-center py-12">
    <p className="text-slate-400 dark:text-slate-500">
      ยังไม่มีข้อมูลในปี {selectedYear}
    </p>
    <button 
      onClick={() => setShowForm(true)}
      className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-xl"
    >
      เพิ่มข้อมูล
    </button>
  </div>
)}
```

### การแสดงข้อมูลแยกกลุ่มตามปี (Hospital)
```tsx
{/* Header แบบ sticky */}
<div className="sticky top-16 z-10 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-xl shadow-lg">
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-bold">📅 ปี พ.ศ. {year}</h2>
    <span className="text-sm bg-white/20 rounded-full px-3 py-1">
      {records.length} รายการ
    </span>
  </div>
</div>
```

---

## ⚠️ ข้อควรระวัง

1. **Backward Compatible:** ข้อมูลเก่าไม่มี `year` → แสดงในปี 2569 (Pattern A) หรือใช้ `getRecordYear()` helper (Pattern B)
2. **Hospital Exception:** เป็นหน้าเดียวที่แสดงทุกปี → ใช้ Pattern B
3. **Performance:** Filter ทำ client-side → ถ้ามีข้อมูลเยอะมากควรพิจารณา server-side filter
4. **Consistency:** ทุกหน้าต้องใช้ `useHarvestYear` hook เดียวกัน → state sync กัน

---

## 🚀 ลำดับความสำคัญในการแก้

### Priority 1: Core Features
1. ✅ ผังสวน (farm-map) — เสร็จแล้ว
2. การรดน้ำ (water)
3. การใส่ปุ๋ย (fertilize)
4. รายจ่าย (expense)

### Priority 2: Advanced Features
5. การพ่นยา (spray)
6. ทำลูกทุเรียน (durian-fruit)

### Priority 3: Special Cases
7. ห้องพยาบาล (hospital) — Pattern พิเศษ

---

## 📖 สรุป

การนำ Year Filter ไปใช้กับทุกหน้าจะทำให้:
- ✅ ข้อมูลแต่ละปีแยกกันชัดเจน
- ✅ ป้องกันความสับสนระหว่างรอบเก็บเกี่ยว
- ✅ รองรับข้อมูลย้อนหลังหลายปี
- ✅ Hospital มีประวัติครบถ้วนทุกปี (ไม่โดน filter)

**Pattern หลัก 2 แบบ:**
- **Pattern A**: Filter ตามปี (ใช้กับหน้าทั่วไป)
- **Pattern B**: แสดงทุกปี แต่แยกกลุ่ม (ใช้กับ Hospital)
