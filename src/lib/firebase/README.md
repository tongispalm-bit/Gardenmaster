# 🔥 Firebase Module Structure

โครงสร้าง Firebase ที่ถูกแบ่งออกเป็นโมดูลย่อยๆ เพื่อความชัดเจนและง่ายต่อการบำรุงรักษา

## 📁 โครงสร้างไฟล์

```
firebase/
├── config.ts          # Firebase config และ Firestore instance
├── types.ts           # Types และ Constants ทั้งหมด
├── index.ts           # Entry point (re-export ทั้งหมด)
│
├── orchards.ts        # 🏞️ Orchard, Farm Map Config, Orchard Stats
├── auth.ts            # 👤 User authentication และ management
├── trees.ts           # 🌳 Tree profiles
├── care.ts            # 🌿 Care records (Water, Fertilizer, Spray, Durian Fruit)
├── finance.ts         # 💰 Finance (Transaction, Expense, Sales)
├── hospital.ts        # 🏥 Hospital records
├── stock.ts           # 📦 Stock (Medicine, Nutrient) + Deduction
└── subscriptions.ts   # 📡 Realtime subscription helpers
```

## 🔧 การใช้งาน

### Import แบบเดิม (ยังใช้ได้)

```typescript
import { getOrchards, addOrchard } from '@/lib/firebase';
```

### Import จากโมดูลเฉพาะ (แนะนำสำหรับโค้ดใหม่)

```typescript
// Import เฉพาะที่ต้องการ
import { getOrchards, addOrchard } from '@/lib/firebase/orchards';
import { loginWithCredentials } from '@/lib/firebase/auth';
import { getTreeProfiles } from '@/lib/firebase/trees';
```

## 📦 หมวดหมู่ของ Functions

### 🏞️ Orchards (`orchards.ts`)
- `addOrchard()` / `getOrchards()`
- `subscribeOrchards()` / `subscribeOrchard()`
- `getFarmMapConfig()` / `saveFarmMapConfig()`
- `getOrchardStats()` / `saveOrchardStats()`

### 👤 Auth (`auth.ts`)
- `loginWithCredentials()` / `ensureAdminSeeded()`
- `getUserById()` / `getUserByUsername()` / `getAllUsers()`
- `createUser()` / `updateUser()` / `deleteUser()`
- `updateUserProfile()` / `resetUserPassword()`
- `hashPassword()`

### 🌳 Trees (`trees.ts`)
- `addTreeProfile()` / `getTreeProfiles()`
- `updateTreeProfile()` / `deleteTreeProfile()`

### 🌿 Care (`care.ts`)
- **Legacy:** `addCareRecord()` / `getCareRecords()` / `deleteCareRecord()`
- **Water:** `getWaterSetting()` / `addWaterRecord()` / `getWaterRecords()`
- **Stress:** `addStressPeriod()` / `getStressPeriods()` / `deleteStressPeriod()`
- **Fertilizer:** `getFertilizerFormulas()` / `addFertilizerRecord()` / `getFertilizerRecords()`
- **Spray:** `addSprayRecord()` / `getSprayRecords()` / `deleteSprayRecord()`
- **Durian Fruit:** `addDurianFruitRecord()` / `getDurianFruitRecords()`

### 💰 Finance (`finance.ts`)
- **Legacy:** `addTransaction()` / `getTransactions()` / `deleteTransaction()`
- **General Expense:** `addGeneralExpense()` / `getGeneralExpense()` / `deleteGeneralExpense()`
- **Upgrade Expense:** `addUpgradeExpense()` / `getUpgradeExpenses()` / `deleteUpgradeExpense()`
- **Sales:** `addSaleRecord()` / `getSaleRecords()` / `getOrchardGrades()` / `saveOrchardGrades()`

### 🏥 Hospital (`hospital.ts`)
- `addHospitalRecord()` / `getHospitalRecords()`
- `updateHospitalRecord()` / `deleteHospitalRecord()`

### 📦 Stock (`stock.ts`)
- **Medicine:** `addMedicineItem()` / `getMedicineItems()` / `updateMedicineItem()` / `deleteMedicineItem()`
- **Nutrient:** `addNutrientItem()` / `getNutrientItems()` / `updateNutrientItem()` / `deleteNutrientItem()`
- **Deduction:** `deductFromStock()`

### 📡 Subscriptions (`subscriptions.ts`)
- `subscribeCollection<T>(collectionName, orchardId, callback)`
- `subscribeDocByOrchard<T>(collectionName, orchardId, callback)`

## 🎯 ข้อดีของโครงสร้างใหม่

### ก่อน Refactor
- ไฟล์ `firebase.ts` มี **1,085+ บรรทัด**
- ยากต่อการหา function ที่ต้องการ
- Loading time ช้า (import ทั้งไฟล์)
- แก้ไขยาก เพราะทุกอย่างอยู่ที่เดียวกัน

### หลัง Refactor
- แบ่งเป็น **9 ไฟล์** ตามหมวดหมู่
- หา function ง่ายขึ้น (ดูจากชื่อไฟล์)
- Import เฉพาะที่ต้องการ (code splitting ดีขึ้น)
- แก้ไขง่าย (แก้แค่ไฟล์ที่เกี่ยวข้อง)

## 📝 Types & Constants

Types และ Constants ทั้งหมดอยู่ใน `types.ts` แบ่งตามหมวดหมู่:

- **Orchard:** `Orchard`, `FARM_MAP_ORCHARDS`, `hasFarmMap()`, `getVarietiesFor()`
- **Tree:** `TreeProfile`, `FarmMapConfig`, `OrchardStats`
- **Auth:** `AppUser`, `UserRole`
- **Care:** `CareRecord`, `WaterRecord`, `WaterSetting`, `FertilizerRecord`, `SprayRecord`, `DurianFruitRecord`
- **Finance:** `Transaction`, `GeneralExpense`, `UpgradeExpense`, `SaleRecord`
- **Hospital:** `HospitalRecord`, `Severity`, `TreatmentResult`
- **Stock:** `MedicineItemRecord`, `NutrientItemRecord`

## 🚀 Migration Guide

ไม่ต้องแก้โค้ดเดิม! การเปลี่ยนแปลงนี้เป็น **backward compatible** ทุกอย่าง:

```typescript
// โค้ดเดิม — ยังใช้งานได้เหมือนเดิม
import { getOrchards, addOrchard, type Orchard } from '@/lib/firebase';
```

สำหรับโค้ดใหม่ สามารถเลือก import จากโมดูลย่อยได้เลย:

```typescript
// โค้ดใหม่ — แนะนำ
import { getOrchards, addOrchard } from '@/lib/firebase/orchards';
import type { Orchard } from '@/lib/firebase/types';
```

## ⚡ Performance

- **Tree-shaking:** Next.js จะ bundle เฉพาะ functions ที่ใช้จริง
- **Lazy imports:** ใช้ dynamic import สำหรับ functions ที่ไม่ค่อยใช้
- **Smaller bundles:** แยก code ตามหน้าที่แล้ว

## 🛠️ การเพิ่ม Feature ใหม่

### 1. เพิ่ม Type ใหม่

เพิ่มใน `types.ts`:

```typescript
export type MyNewType = {
  id: string;
  orchardId: string;
  // ...
};
```

### 2. เพิ่ม Functions ใหม่

เพิ่มใน module ที่เกี่ยวข้อง (เช่น `care.ts`):

```typescript
export async function addMyNewRecord(record: Omit<MyNewType, 'id'>) {
  const docRef = await addDoc(collection(db, 'myNewRecords'), record);
  return docRef.id;
}
```

### 3. Export ใน index.ts

เพิ่มใน `index.ts`:

```typescript
export type { MyNewType } from './types';
export { addMyNewRecord } from './care';
```

## 📚 เอกสารเพิ่มเติม

- [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)
- [Next.js App Router](https://nextjs.org/docs/app)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
