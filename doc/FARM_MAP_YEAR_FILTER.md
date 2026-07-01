# การกรองข้อมูลผังสวนตามรอบปีเก็บเกี่ยว

## 📋 ภาพรวม

ฟีเจอร์นี้ช่วยให้ผู้ใช้สามารถเลือกดูข้อมูลผังสวนแยกตามรอบปีเก็บเกี่ยว (ปี พ.ศ.) ได้ โดยใช้ Dropdown ที่อยู่ใน **DurianHeader** และระบบจะ filter ข้อมูลที่ตรงกับปีที่เลือกมาแสดงทันที

---

## 🎯 ฟีเจอร์หลัก

### 1. Dropdown "รอบเก็บเกี่ยว" ใน DurianHeader
- แสดงรายการปีที่กำหนดไว้ใน `HARVEST_YEAR_OPTIONS` (2569, 2570, 2571, 2572)
- เก็บค่าใน localStorage แยกตามสวน (แชร์ข้ามหน้า/แท็บ)
- แสดง pill สีขาวโปร่งใส พร้อมไอคอน 📅 และข้อความ "รอบเก็บเกี่ยว ปี พ.ศ. xxxx"

### 2. การกรองข้อมูลอัตโนมัติ
- เมื่อเลือกปี → filter ข้อมูลต้นไม้ที่มี `year` ตรงกับปีที่เลือก
- ข้อมูลเก่าที่ไม่มี field `year` จะแสดงในปี 2569 (ปีแรก - backward compatible)
- UI update ทันทีโดยไม่ต้องรีเฟรชหน้า

### 3. การบันทึกข้อมูล
- เมื่อเพิ่มหรือแก้ไขต้นไม้ → บันทึก field `year` เป็นปีที่เลือกใน header
- รองรับการสร้างต้นใหม่ในโหมด View, Edit Grid, และ Edit Zone

---

## 🏗️ โครงสร้างโค้ด

### 1. Type Definition (`src/lib/firebase/types.ts`)

```typescript
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
  year?: number; // ⭐ ปี พ.ศ. (เช่น 2569, 2570)
  createdAt: number;
  updatedAt: number;
};
```

### 2. Harvest Year Hook (`src/lib/useHarvestYear.ts`)

```typescript
// ปีที่เลือกได้
export const HARVEST_YEAR_OPTIONS = [2569, 2570, 2571, 2572];

/**
 * Hook เก็บปี พ.ศ. ของรอบการเก็บเกี่ยว แยกตามสวน (localStorage)
 * แชร์ข้ามหน้า เช่น หน้าผังสวน และหน้าทำลูกทุเรียน
 */
export function useHarvestYear(orchardId: string) {
  const [year, setYear] = useState<number>(DEFAULT_YEAR);
  // ... implementation
  return { year, setYear };
}
```

**Features:**
- เก็บค่าใน localStorage key: `gm-harvest-year-${orchardId}`
- Sync ข้ามแท็บด้วย `storage` event
- Default ปี: 2569

### 3. DurianHeader Integration

```tsx
export default function DurianHeader({ orchardId, ... }) {
  const { year, setYear } = useHarvestYear(orchardId);
  
  return (
    <header>
      {/* ... header content ... */}
      
      {/* Dropdown รอบปีเก็บเกี่ยว */}
      {showYear && (
        <button onClick={() => setYearOpen(v => !v)}>
          <Calendar size={15} />
          <span>รอบเก็บเกี่ยว ปี พ.ศ. {year}</span>
        </button>
      )}
    </header>
  );
}
```

### 4. FarmMapClient Usage

```tsx
export default function FarmMapClient() {
  const orchardId = searchParams.get('id') || '';
  const { year: selectedYear } = useHarvestYear(orchardId); // ⭐ ใช้ปีจาก hook
  
  const [allTrees, setAllTrees] = useState<TreeProfile[]>([]);
  const [trees, setTrees] = useState<TreeProfile[]>([]);

  // Filter ข้อมูลตามปีที่เลือก
  useEffect(() => {
    if (!selectedYear) {
      setTrees([]);
      return;
    }

    const filteredTrees = allTrees.filter(t => {
      if (t.year) {
        return t.year === selectedYear;
      }
      // ข้อมูลเก่าไม่มี year → แสดงในปี 2569
      return selectedYear === 2569;
    });
    setTrees(filteredTrees);
  }, [selectedYear, allTrees]);
  
  // บันทึกข้อมูลพร้อม year
  const handleSave = async (formData) => {
    await addTreeProfile({
      ...formData,
      year: selectedYear, // ⭐ ใช้ปีจาก header
    });
  };
}
```

---

## 🔄 Flow การทำงาน

### การโหลดข้อมูล
```
1. FarmMapClient mount
   ↓
2. useHarvestYear(orchardId) → อ่านปีจาก localStorage (default: 2569)
   ↓
3. loadData() → ดึงข้อมูลทั้งหมดจาก Firestore
   ↓
4. setAllTrees(treeData) → เก็บข้อมูลดิบ
   ↓
5. useEffect [selectedYear, allTrees] trigger
   ↓
6. filter allTrees → setTrees(filteredData)
   ↓
7. UI render ผังสวนด้วยข้อมูลที่ filter แล้ว
```

### การเปลี่ยนปี
```
1. ผู้ใช้เปิด dropdown ใน DurianHeader
   ↓
2. คลิกเลือกปีใหม่
   ↓
3. setYear(newYear) → บันทึก localStorage
   ↓
4. selectedYear ใน FarmMapClient เปลี่ยนทันที (reactive)
   ↓
5. useEffect [selectedYear, allTrees] trigger
   ↓
6. filter allTrees → setTrees(filteredData)
   ↓
7. UI re-render ทันที (ไม่ต้อง reload API)
```

### การบันทึกข้อมูลใหม่
```
1. ผู้ใช้เพิ่มหรือแก้ไขต้นในผัง
   ↓
2. handleSave() / applyZone() / modal onSave
   ↓
3. addTreeProfile() / updateTreeProfile() พร้อม field year = selectedYear
   ↓
4. loadData() → ดึงข้อมูลใหม่
   ↓
5. filter และ render อีกครั้ง
```

---

## 💡 จุดเด่นของการใช้ useHarvestYear

### ✅ แชร์ state ข้ามหน้า
- หน้าผังสวน (`farm-map`) เลือกปี 2570
- หน้าทำลูกทุเรียน (`durian-fruit`) จะใช้ปี 2570 เดียวกันอัตโนมัติ
- ไม่ต้องส่ง props หรือใช้ Context API

### ✅ Persist ข้ามการรีเฟรช
- เก็บใน localStorage → ปิดแท็บแล้วเปิดใหม่ยังเป็นปีเดิม
- แยก state ตามสวน → สวนมังคุด และ ทุเรียนหลังบ้าน จำปีแยกกัน

### ✅ Sync ข้ามแท็บ
- เปิด 2 แท็บ → เปลี่ยนปีในแท็บหนึ่ง → อีกแท็บเปลี่ยนตาม
- ใช้ `storage` event listener

---

## ⚠️ กรณีพิเศษ

### 1. ข้อมูลเก่าไม่มี field `year`
- แสดงในปี 2569 (ปีแรกของ `HARVEST_YEAR_OPTIONS`)
- เมื่อแก้ไขต้นเก่า → บันทึก year ใหม่ = selectedYear

### 2. เปลี่ยนปีแล้วไม่มีข้อมูล
- ผังสวนจะว่างเปล่า
- สามารถคลิกเพิ่มต้นใหม่ได้ทันที (จะบันทึกพร้อม year ที่เลือก)

### 3. Multi-year Data
- สามารถมีข้อมูลหลายปีใน row, col เดียวกัน
- แต่ละปีจะ filter แยกกันอย่างอิสระ
- เช่น R5C3 ปี 2569 มีต้นหมายเลข "D-301", ปี 2570 มีต้นหมายเลข "D-401"

---

## 🧪 การทดสอบ

### Test Case 1: เปิดหน้าครั้งแรก
1. เปิดหน้า farm-map
2. ✅ DurianHeader แสดง pill "รอบเก็บเกี่ยว ปี พ.ศ. 2569" (default)
3. ✅ ผังสวนแสดงข้อมูลปี 2569 (รวมข้อมูลเก่าที่ไม่มี year)

### Test Case 2: เปลี่ยนปีใน header
1. คลิก pill รอบเก็บเกี่ยว
2. เลือก "ปี พ.ศ. 2570"
3. ✅ Dropdown ปิด → pill แสดง "ปี พ.ศ. 2570"
4. ✅ ผังสวน update ทันที แสดงเฉพาะข้อมูลปี 2570
5. ✅ ถ้าไม่มีข้อมูล → ผังว่างเปล่า

### Test Case 3: เพิ่มข้อมูลในปี 2570
1. เปลี่ยนปีเป็น 2570
2. คลิกเพิ่มต้นในผัง
3. บันทึกข้อมูล
4. ✅ ต้นใหม่ควรมี field `year` = 2570
5. ✅ เปลี่ยนกลับไปปี 2569 → ไม่เห็นต้นใหม่
6. ✅ เปลี่ยนไปปี 2570 → เห็นต้นใหม่

### Test Case 4: Persist ข้ามการรีเฟรช
1. เลือกปี 2571
2. รีเฟรชหน้า (F5)
3. ✅ ยังคงแสดงปี 2571

### Test Case 5: Sync ข้ามแท็บ
1. เปิดหน้า farm-map 2 แท็บ
2. แท็บ 1: เปลี่ยนปีเป็น 2572
3. ✅ แท็บ 2: ปีเปลี่ยนเป็น 2572 อัตโนมัติ

---

## 📝 ข้อควรระวัง

1. **Year Range:** ปีที่เลือกได้ถูกกำหนดแน่นอนใน `HARVEST_YEAR_OPTIONS` → ถ้าต้องการเพิ่มปีใหม่ต้องแก้ไข array นี้
2. **Backward Compatible:** ข้อมูลเก่าไม่มี `year` จะถูก handle เป็นปี 2569 เสมอ
3. **Performance:** การ filter ทำ client-side → ถ้ามีข้อมูลหลายพันต้นอาจช้า
4. **localStorage Limit:** ข้อมูล sync ข้ามแท็บผ่าน `storage` event → ต้องเป็น same origin

---

## 🚀 การพัฒนาต่อ

### Feature Ideas
- [ ] เพิ่มปีใหม่อัตโนมัติ (ปุ่ม "สร้างรอบใหม่")
- [ ] แสดงจำนวนต้นในแต่ละปีใน dropdown (เช่น "2569 (91 ต้น)")
- [ ] เปรียบเทียบข้อมูล 2 ปี (split view)
- [ ] Copy ผังสวนจากปีหนึ่งไปอีกปี
- [ ] Export/Import ข้อมูลแต่ละปี
- [ ] Timeline view แสดงการเปลี่ยนแปลงตามปี

### Performance Optimization
- [ ] useMemo สำหรับ filtered trees
- [ ] Virtualization สำหรับผังสวนขนาดใหญ่
- [ ] Lazy load ข้อมูลเก่าๆ (เฉพาะปีที่เลือกดู)
- [ ] IndexedDB แทน localStorage (รองรับข้อมูลมากขึ้น)

---

## 📖 สรุป

ฟีเจอร์นี้ใช้ `useHarvestYear` hook ที่มีอยู่แล้วใน DurianHeader เพื่อให้ผู้ใช้เลือกรอบปีเก็บเกี่ยว และ filter ข้อมูลผังสวนตามปีที่เลือกอัตโนมัติ โดย state ถูกแชร์ข้ามหน้าและ persist ใน localStorage

**Clean Code Principles:**
- ✅ Reuse Existing Hook: ใช้ `useHarvestYear` ที่มีอยู่แล้ว ไม่สร้าง state ซ้ำ
- ✅ Single Source of Truth: ปีมาจาก DurianHeader เพียงที่เดียว
- ✅ Separation of Concerns: Hook จัดการ state, Component จัดการ UI
- ✅ Reactive: เปลี่ยนปี → UI update ทันที
- ✅ Backward Compatible: รองรับข้อมูลเก่า

---

## 🎯 ฟีเจอร์หลัก

### 1. Dropdown เลือกปี
- แสดงรายการปีที่มีข้อมูลในระบบ (เรียงจากมากไปน้อย)
- ตั้งค่าปีเริ่มต้น = ปีล่าสุดที่มีข้อมูล หรือปีปัจจุบัน
- แสดงข้อความเตือนเมื่อยังไม่มีข้อมูล

### 2. การกรองข้อมูลอัตโนมัติ
- เมื่อเลือกปี → filter ข้อมูลต้นไม้ที่มี `year` ตรงกับปีที่เลือก
- ข้อมูลเก่าที่ไม่มี field `year` จะแสดงในปีปัจจุบัน (backward compatible)
- UI update ทันทีโดยไม่ต้องรีเฟรชหน้า

### 3. การบันทึกข้อมูล
- เมื่อเพิ่มหรือแก้ไขต้นไม้ → บันทึก field `year` เป็นปีที่เลือกอยู่
- รองรับการสร้างต้นใหม่ในโหมด View, Edit Grid, และ Edit Zone

---

## 🏗️ โครงสร้างโค้ด

### 1. Type Definition (`src/lib/firebase/types.ts`)

```typescript
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
  year?: number; // ⭐ ปี พ.ศ. (เช่น 2569, 2570)
  createdAt: number;
  updatedAt: number;
};
```

### 2. API Function (`src/lib/firebase/trees.ts`)

```typescript
export async function getTreeProfiles(orchardId?: string, year?: number) {
  if (!orchardId) {
    const snapshot = await getDocs(collection(db, 'treeProfiles'));
    const trees = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TreeProfile[];
    // Filter ตามปีถ้ามีการระบุ
    return year ? trees.filter(t => t.year === year) : trees;
  }
  
  // Filter orchardId ฝั่ง server
  const q = query(
    collection(db, 'treeProfiles'),
    where('orchardId', '==', orchardId)
  );
  const snapshot = await getDocs(q);
  const trees = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TreeProfile[];
  
  // Filter ตามปี (client-side)
  return year ? trees.filter(t => t.year === year) : trees;
}
```

**หมายเหตุ:** ใช้ client-side filter เนื่องจาก Firestore ไม่รองรับ compound query กับ optional field ได้ดี

### 3. React State (`FarmMapClient.tsx`)

```typescript
// State สำหรับเก็บข้อมูล
const [allTrees, setAllTrees] = useState<TreeProfile[]>([]); // ข้อมูลทั้งหมด
const [trees, setTrees] = useState<TreeProfile[]>([]);       // ข้อมูลที่ filter แล้ว

// State สำหรับปี
const [selectedYear, setSelectedYear] = useState<number | null>(null);
const [availableYears, setAvailableYears] = useState<number[]>([]);
```

### 4. Load Data Logic

```typescript
const loadData = async () => {
  try {
    const [orchard, treeData, hospData, cfg] = await Promise.all([
      getOrchard(orchardId),
      getTreeProfiles(orchardId), // ดึงทั้งหมด
      getHospitalRecords(orchardId),
      getFarmMapConfig(orchardId),
    ]);

    setAllTrees(treeData); // เก็บข้อมูลดิบ

    // สร้างรายการปีที่มีข้อมูล
    const yearsSet = new Set<number>();
    treeData.forEach(t => {
      if (t.year) yearsSet.add(t.year);
    });
    const years = Array.from(yearsSet).sort((a, b) => b - a);
    setAvailableYears(years);

    // ตั้งค่าปีเริ่มต้น
    if (!selectedYear) {
      const currentBuddhistYear = new Date().getFullYear() + 543;
      const defaultYear = years.length > 0 ? years[0] : currentBuddhistYear;
      setSelectedYear(defaultYear);
    }
    
    // ... ส่วนอื่นๆ
  } catch (error) {
    console.error('Error loading farm map:', error);
  }
};
```

### 5. Filter Effect

```typescript
// Filter ข้อมูลตามปีที่เลือก
useEffect(() => {
  if (!selectedYear) {
    setTrees([]);
    return;
  }

  // Filter ต้นที่มีปีตรงกับที่เลือก หรือไม่มีปี (ข้อมูลเก่า)
  const filteredTrees = allTrees.filter(t => 
    t.year === selectedYear || (!t.year && selectedYear === new Date().getFullYear() + 543)
  );
  setTrees(filteredTrees);
}, [selectedYear, allTrees]);
```

### 6. UI Component

```tsx
{/* Dropdown เลือกปี */}
<div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 mb-3">
  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
    เลือกปี พ.ศ.
  </label>
  <select
    value={selectedYear || ''}
    onChange={(e) => setSelectedYear(Number(e.target.value))}
    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
  >
    {availableYears.length === 0 ? (
      <option value={new Date().getFullYear() + 543}>
        {new Date().getFullYear() + 543} (ไม่มีข้อมูล)
      </option>
    ) : (
      availableYears.map(year => (
        <option key={year} value={year}>
          {year}
        </option>
      ))
    )}
  </select>
  {availableYears.length === 0 && (
    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
      ⚠️ ยังไม่มีข้อมูลในระบบ กรุณาเพิ่มข้อมูลต้นไม้พร้อมระบุปี
    </p>
  )}
</div>
```

### 7. Save Logic

```typescript
// เมื่อบันทึกข้อมูล (สร้างหรือแก้ไข) ให้เพิ่ม year
const handleSave = async (formData: any) => {
  // ...
  await updateTreeProfile(existing.id, {
    treeNumber: formData.treeNumber,
    status: formData.status,
    variety: formData.variety,
    age: Number(formData.age) || 0,
    zone: formData.zone ?? null,
    note: formData.note,
    year: selectedYear || new Date().getFullYear() + 543, // ⭐ ใช้ปีที่เลือก
    updatedAt: Date.now(),
  });
  // ...
};
```

---

## 🔄 Flow การทำงาน

### การโหลดข้อมูล
```
1. loadData() → ดึงข้อมูลทั้งหมดจาก Firestore
   ↓
2. setAllTrees(treeData) → เก็บข้อมูลดิบไว้
   ↓
3. สร้างรายการปี (availableYears) จาก treeData
   ↓
4. ตั้งค่า selectedYear เป็นปีล่าสุด หรือปีปัจจุบัน
   ↓
5. useEffect [selectedYear, allTrees] trigger
   ↓
6. filter allTrees → setTrees(filteredData)
   ↓
7. UI re-render ด้วยข้อมูลที่ filter แล้ว
```

### การเปลี่ยนปี
```
1. ผู้ใช้เลือกปีใหม่จาก dropdown
   ↓
2. onChange → setSelectedYear(newYear)
   ↓
3. useEffect [selectedYear, allTrees] trigger
   ↓
4. filter allTrees → setTrees(filteredData)
   ↓
5. UI re-render ทันที (ไม่ต้อง reload API)
```

### การบันทึกข้อมูลใหม่
```
1. ผู้ใช้เพิ่มหรือแก้ไขต้นในผัง
   ↓
2. handleSave() หรือ applyZone()
   ↓
3. addTreeProfile() / updateTreeProfile() พร้อม field year = selectedYear
   ↓
4. loadData() → ดึงข้อมูลใหม่
   ↓
5. filter และ render อีกครั้ง
```

---

## ⚠️ กรณีพิเศษ

### 1. ไม่มีข้อมูลในปีที่เลือก
- แสดง dropdown ด้วยปีปัจจุบัน + "(ไม่มีข้อมูล)"
- แสดงข้อความเตือน: "⚠️ ยังไม่มีข้อมูลในระบบ กรุณาเพิ่มข้อมูลต้นไม้พร้อมระบุปี"
- ผังสวนจะว่างเปล่า แต่ยังคลิกเพิ่มต้นใหม่ได้

### 2. ข้อมูลเก่าไม่มี field `year`
- แสดงในปีปัจจุบัน (backward compatible)
- เมื่อแก้ไขต้นเก่า → บันทึก year ใหม่ = selectedYear

### 3. Multi-year Data
- สามารถมีข้อมูลหลายปีในสวนเดียวกัน (row, col เดียวกัน แต่คนละปี)
- แต่ละปีจะ filter แยกกันอย่างอิสระ

---

## 🧪 การทดสอบ

### Test Case 1: ระบบเปล่า (ไม่มีข้อมูล)
1. เปิดหน้า farm-map
2. ✅ ควรแสดง dropdown ด้วยปีปัจจุบัน + "(ไม่มีข้อมูล)"
3. ✅ ควรแสดงข้อความเตือน
4. ✅ ผังสวนว่างเปล่า แต่สามารถคลิกเพิ่มต้นได้

### Test Case 2: เพิ่มข้อมูลปีแรก
1. คลิกเพิ่มต้นในผัง
2. บันทึกข้อมูล
3. ✅ ต้นใหม่ควรมี field `year` = ปีที่เลือก
4. ✅ dropdown อัปเดตแสดงปีนี้
5. ✅ ผังสวนแสดงต้นที่เพิ่ม

### Test Case 3: เพิ่มข้อมูลปีที่ 2
1. เปลี่ยนปีใน dropdown เป็นปีใหม่ (เช่น 2570)
2. ✅ ผังสวนควรว่างเปล่า (ไม่แสดงต้นปี 2569)
3. เพิ่มต้นใหม่
4. ✅ ต้นใหม่ควรมี field `year` = 2570
5. ✅ เปลี่ยนกลับไปปี 2569 → เห็นต้นปี 2569
6. ✅ เปลี่ยนไปปี 2570 → เห็นต้นปี 2570

### Test Case 4: แก้ไขข้อมูลเก่า
1. เลือกปีที่มีข้อมูล
2. คลิกแก้ไขต้นใดต้นหนึ่ง
3. บันทึก
4. ✅ ต้นควร update field `year` เป็นปีที่เลือกอยู่

### Test Case 5: โหมด Edit Zone
1. เข้าโหมด "กำหนดโซน"
2. คลิกเซลล์ว่าง → สร้างต้นพร้อมโซน
3. ✅ ต้นใหม่ควรมี field `year` = ปีที่เลือก

---

## 📝 ข้อควรระวัง

1. **Performance:** การ filter ทำ client-side ดังนั้นถ้ามีข้อมูลหลายพันต้นอาจช้า → แนะนำทำ pagination หรือ virtualization
2. **Data Migration:** ข้อมูลเก่าไม่มี field `year` จะถูก handle แบบ backward compatible (แสดงในปีปัจจุบัน)
3. **Year Format:** ใช้ปี พ.ศ. (Buddhist Year) เท่านั้น (เช่น 2569, 2570)
4. **Firestore Query:** ไม่ได้ใช้ compound query (`orchardId` + `year`) เนื่องจากต้อง index → filter client-side แทน

---

## 🚀 การพัฒนาต่อ

### Feature Ideas
- [ ] เพิ่มปุ่ม "เพิ่มปีใหม่" สำหรับสร้างปีถัดไปอัตโนมัติ
- [ ] แสดงจำนวนต้นในแต่ละปีใน dropdown (เช่น "2569 (91 ต้น)")
- [ ] เปรียบเทียบข้อมูล 2 ปี (split view)
- [ ] Export/Import ข้อมูลแต่ละปี
- [ ] Copy ผังสวนจากปีหนึ่งไปอีกปี
- [ ] Timeline view แสดงการเปลี่ยนแปลงของผังสวนตามปี

### Performance Optimization
- [ ] Implement virtualization สำหรับผังสวนขนาดใหญ่
- [ ] Cache filtered data ด้วย useMemo
- [ ] Lazy load ข้อมูลเก่าๆ (เฉพาะปีที่เลือกดู)
- [ ] Server-side filter ด้วย composite index (ถ้า scale ใหญ่)

---

## 📖 สรุป

ฟีเจอร์การกรองข้อมูลตามปีนี้ช่วยให้ผู้ใช้สามารถจัดการข้อมูลผังสวนได้หลายปี โดยแยกข้อมูลแต่ละปีอย่างชัดเจน พร้อม UI ที่ใช้งานง่ายและ responsive ทันที

**Clean Code Principles ที่ใช้:**
- ✅ Separation of Concerns: แยก state, logic, และ UI ชัดเจน
- ✅ Single Responsibility: แต่ละ function ทำหน้าที่เดียว
- ✅ DRY (Don't Repeat Yourself): ใช้ helper functions และ constants
- ✅ Backward Compatible: รองรับข้อมูลเก่าที่ไม่มี field `year`
- ✅ User-Friendly: แสดงข้อความเตือนและ handle edge cases
