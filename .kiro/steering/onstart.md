---
inclusion: always
---

# 🌿 Garden Master — Startup Instructions

## ทำทันทีเมื่อเปิดโปรเจค

1. **ตอบเป็นภาษาไทยเสมอ** ทุก response
2. **อ่าน context** จาก steering files ทั้งหมดก่อนทำงาน

> Dev server ให้ผู้ใช้รันเองใน terminal แยก: `npm run dev`
> (ปิด auto-start hook แล้ว เพราะทำให้ command timeout)

---

## โปรเจคนี้คืออะไร

**Garden Master (แกนมาสเตอร์)** — เว็บแอปจัดการสวนทุเรียน/มังคุดภาษาไทย  
- Live: https://gardanmaster-2d5db.web.app  
- GitHub: https://github.com/tongispalm-bit/Gardenmaster  
- Firebase project: `gardanmaster-2d5db`

---

## สวนที่มีในระบบ (Preset)

| สวน | สี | ไอคอน | พิเศษ |
|---|---|---|---|
| สวนมังคุด | ม่วง `#9b59b6` | 🍇 | เมนูมาตรฐาน |
| ทุเรียนหลังบ้าน | เขียว `#27ae60` | 🌳 | ผังสวน 9×11 (91 ต้น) |
| ทุเรียนหมื่นซ่อง | ส้ม `#f39c12` | 🍊 | เมนูมาตรฐาน |

---

## สถานะฟีเจอร์ปัจจุบัน

| ฟีเจอร์ | สถานะ |
|---|---|
| Login + User Management | ✅ ใช้งานได้ |
| รายการสวน + นำทาง | ✅ ใช้งานได้ |
| การดูแล (รดน้ำ/ปุ๋ย/ยา) | ✅ ใช้งานได้ |
| รายจ่ายทั่วไป | ✅ ใช้งานได้ |
| ผังสวน 9×11 (ทุเรียนหลังบ้าน) | ✅ ใช้งานได้ |
| ค่าปรับปรุง | 🚧 Coming Soon |
| การซื้อขาย | 🚧 Coming Soon |
| ห้องพยาบาล | 🚧 Coming Soon |

---

## กฎสำคัญในการพัฒนา

### ❌ ห้ามทำ
- ใช้ `src/lib/storage.ts` (legacy localStorage) — ใช้ `firebase.ts` แทน
- สร้าง API routes (Static Export ไม่รองรับ)
- ใช้ dynamic route `[orchardId]` — ใช้ query string `?id=xxx` แทน
- เพิ่ม test โดยที่ user ไม่ได้ขอ

### ✅ ต้องทำเสมอ
- ใช้ `@/*` alias แทน relative import ใน `src/`
- ข้อความ UI ทั้งหมดเป็น **ภาษาไทย**
- Dark mode ต้องรองรับทุก component ด้วย `dark:` variant
- Type ใหม่และ CRUD ใหม่ → เพิ่มใน `src/lib/firebase.ts`
- Component ใหม่ → ตาม pattern `page.tsx` + `XxxClient.tsx`

---

## คำสั่งที่ใช้บ่อย

```bash
# Dev server (รันใน terminal แยก)
npm run dev

# Build
npm run build

# Deploy hosting
npx firebase deploy --only hosting --project gardanmaster-2d5db

# Deploy Firestore rules
npx firebase deploy --only firestore:rules --project gardanmaster-2d5db

# Git
cmd /c git add .
cmd /c git commit -m "message"
cmd /c git push origin main
```

---

## ข้อมูล Auth เริ่มต้น

- Default admin: `admin / admin123`
- Session เก็บใน `localStorage` key: `gm-session-v1`
- Password hash: SHA-256 + salt (Web Crypto API)

---

## ⚠️ ข้อควรระวัง

- Firestore Rules ปัจจุบัน **เปิด read/write สาธารณะ** — ไม่ปลอดภัยสำหรับ production
- Firebase config hardcoded ใน `src/lib/firebase.ts` — เป็น public web config ตามมาตรฐาน Firebase
- Build บน Windows ต้องใช้ `cross-env NODE_OPTIONS=--max-old-space-size=4096` (ตั้งค่าแล้วใน `package.json`)
