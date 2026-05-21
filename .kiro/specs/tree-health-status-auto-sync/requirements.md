# Requirements Document

## Introduction

ฟีเจอร์ "ซิงก์สถานะสุขภาพต้นอัตโนมัติจากประวัติการป่วย" จะใช้ **ประวัติการป่วยล่าสุด** (record ล่าสุดตาม timestamp) ของแต่ละต้นเป็นแหล่งความจริง (source of truth) สำหรับการกำหนดค่าฟิลด์ `status` ของ `TreeProfile` ในผังสวน เมื่อผู้ใช้เพิ่ม / แก้ไข / ลบประวัติการป่วยในห้องพยาบาล หรือเปิดหน้าผังสวน หรือเปิด modal "แก้ไขข้อมูลต้น" ระบบ SHALL ปรับสถานะสุขภาพของต้นให้ตรงกับประวัติการป่วยล่าสุดโดยอัตโนมัติ ผู้ใช้ไม่ต้องเลือกสถานะซ้ำเอง แต่ยังสามารถ override ด้วยตนเองได้

ฟีเจอร์นี้ต่อยอดจาก logic เดิมใน `FarmMapClient.tsx` (auto-heal ใน `loadData`, `openEdit`) และ `HospitalClient.tsx` (auto-update tree status หลัง submit) โดยทำให้กฎการ sync ครอบคลุมทุก trigger point และทุก lifecycle ของประวัติการป่วย รวมถึงการลบ และการแก้ไขสถานะ record เก่าให้กลายเป็น "หายแล้ว" หรือกลับมาเป็น "กำลังรักษา"

ปัญหาเดิมที่ฟีเจอร์นี้แก้: ผู้ใช้รายงานว่าเปลี่ยนสถานะใน HospitalClient เป็น "หายแล้ว" แล้ว แต่ผังสวนยังแสดง "เฝ้าระวัง" อยู่ และยังมี edge case ที่ลบ record สุดท้ายแล้วต้นยังค้างเป็น "เฝ้าระวัง"

## Glossary

- **Tree_Sync_Service**: ระบบ logic ที่รับผิดชอบการคำนวณค่า `status` ของ `TreeProfile` จากประวัติการป่วยล่าสุด และเขียนค่าไปยัง Firestore (collection `treeProfiles`) — ในที่นี้คือ utility function ใน `src/lib/firebase.ts` ที่ถูกเรียกจาก `FarmMapClient` และ `HospitalClient`
- **Farm_Map_Page**: หน้า `/orchard/farm-map?id=xxx` ที่แสดงผังสวน 9×11 ของสวน "ทุเรียนหลังบ้าน" (ไฟล์ `FarmMapClient.tsx`)
- **Tree_Edit_Modal**: modal "แก้ไขข้อมูลต้น" ใน Farm_Map_Page ที่เปิดเมื่อผู้ใช้แตะที่ cell ของต้นใดต้นหนึ่ง
- **Hospital_Page**: หน้า `/orchard/hospital?id=xxx` ที่ให้ผู้ใช้บันทึก / แก้ไข / ลบ ประวัติการป่วย (ไฟล์ `HospitalClient.tsx`)
- **Hospital_Record**: record ใน collection `hospitalRecords` มีฟิลด์สำคัญ `treeId`, `status` (`'treating'` | `'recovered'`), `createdAt`, `updatedAt`
- **Tree_Profile**: record ใน collection `treeProfiles` มีฟิลด์ `status` (`'normal'` | `'watch'` | `'seedling'`)
- **Latest_Record**: Hospital_Record ล่าสุดของต้นใดต้นหนึ่ง โดยตัดสินจาก `updatedAt` มากสุดก่อน หากเท่ากันให้ใช้ `createdAt` มากสุด
- **Computed_Status**: ค่า `status` ของ Tree_Profile ที่ Tree_Sync_Service คำนวณได้จาก Latest_Record
- **Manual_Override**: การที่ผู้ใช้แก้ไขฟิลด์ `status` ใน Tree_Edit_Modal ด้วยตนเอง (รวมถึงการเปลี่ยนเป็น `'seedling'`)
- **Sync_Trigger**: เหตุการณ์ที่ทำให้ Tree_Sync_Service ทำงาน ได้แก่ (a) โหลด Farm_Map_Page, (b) เปิด Tree_Edit_Modal, (c) บันทึกประวัติใหม่, (d) แก้ไขประวัติเดิม, (e) ลบประวัติ

## Requirements

### Requirement 1: คำนวณสถานะต้นจากประวัติการป่วยล่าสุด

**User Story:** ในฐานะเจ้าของสวน ฉันต้องการให้สถานะสุขภาพของต้นในผังสวนสะท้อนประวัติการป่วยล่าสุดโดยอัตโนมัติ เพื่อที่ฉันจะไม่ต้องอัปเดตสถานะซ้ำสองที่

#### Acceptance Criteria

1. WHEN Tree_Sync_Service ได้รับรายการ Hospital_Record ของต้นหนึ่ง, THE Tree_Sync_Service SHALL เลือก Latest_Record โดยเรียงจาก `updatedAt` มากสุดก่อน และใช้ `createdAt` เป็นตัว tie-break เมื่อ `updatedAt` เท่ากัน
2. WHEN Latest_Record มีค่า `status` เท่ากับ `'treating'`, THE Tree_Sync_Service SHALL คำนวณ Computed_Status เท่ากับ `'watch'`
3. WHEN Latest_Record มีค่า `status` เท่ากับ `'recovered'`, THE Tree_Sync_Service SHALL คำนวณ Computed_Status เท่ากับ `'normal'`
4. IF ต้นที่กำลังประเมินไม่มี Hospital_Record ใดเลย, THEN THE Tree_Sync_Service SHALL คำนวณ Computed_Status เท่ากับ `'normal'`
5. WHERE Tree_Profile มีค่า `status` เดิมเท่ากับ `'seedling'`, THE Tree_Sync_Service SHALL คงค่า `status` ไว้เป็น `'seedling'` และไม่เขียนทับด้วย Computed_Status
6. THE Tree_Sync_Service SHALL คืนค่า Computed_Status เป็นหนึ่งใน `'normal'`, `'watch'`, `'seedling'` เท่านั้น

### Requirement 2: ซิงก์สถานะตอนโหลดหน้าผังสวน

**User Story:** ในฐานะเจ้าของสวน ฉันต้องการให้ทุกครั้งที่เปิดหน้าผังสวน สถานะของต้นทุกต้นถูกอัปเดตให้ตรงกับประวัติการป่วยล่าสุด เพื่อที่ฉันจะเห็นสภาพที่เป็นจริงเสมอ

#### Acceptance Criteria

1. WHEN Farm_Map_Page โหลดข้อมูลต้นและประวัติการป่วยเสร็จ, THE Farm_Map_Page SHALL เรียก Tree_Sync_Service เพื่อคำนวณ Computed_Status ของทุกต้นในสวนปัจจุบัน
2. WHEN Computed_Status ของต้นใดต่างจากค่า `status` ปัจจุบันใน Tree_Profile และไม่ใช่ Manual_Override ที่ระบบควรเคารพตาม Requirement 1.5, THE Farm_Map_Page SHALL อัปเดต Tree_Profile ใน Firestore ให้เท่ากับ Computed_Status พร้อมตั้งค่า `updatedAt` เป็น timestamp ปัจจุบัน
3. WHEN การอัปเดต Tree_Profile ใน Firestore เสร็จแล้ว, THE Farm_Map_Page SHALL อัปเดต state ฝั่ง client ให้ตรงกับค่าใหม่ก่อน render เซลล์ต่าง ๆ
4. IF การอัปเดต Tree_Profile ใน Firestore ล้มเหลว, THEN THE Farm_Map_Page SHALL แสดงค่า Computed_Status บน UI ของ session ปัจจุบัน บันทึกข้อความ error ลง console และไม่ขัดขวางการแสดงผลส่วนอื่น
5. THE Farm_Map_Page SHALL ทำการ sync นี้ให้เสร็จก่อนปิด loading state ของหน้า

### Requirement 3: ซิงก์สถานะตอนเปิด modal แก้ไขต้น

**User Story:** ในฐานะเจ้าของสวน เมื่อฉันแตะที่ต้นในผังสวนเพื่อเปิด modal แก้ไขข้อมูลต้น ฉันต้องการให้ฟิลด์ "สถานะสุขภาพ" แสดงค่าที่ตรงกับประวัติการป่วยล่าสุดโดยอัตโนมัติ เพื่อที่ฉันจะไม่ต้องเลือกซ้ำ

#### Acceptance Criteria

1. WHEN ผู้ใช้เปิด Tree_Edit_Modal ของต้นที่มี Tree_Profile อยู่แล้ว, THE Tree_Edit_Modal SHALL เรียก Tree_Sync_Service เพื่อคำนวณ Computed_Status ของต้นนั้นจาก Latest_Record
2. WHEN Computed_Status ต่างจาก `status` ใน Tree_Profile และค่าเดิมไม่ใช่ `'seedling'`, THE Tree_Edit_Modal SHALL ตั้งค่า field "สถานะสุขภาพ" ในฟอร์มเป็น Computed_Status และอัปเดต Tree_Profile ใน Firestore ให้ตรงกัน
3. WHEN ผู้ใช้เปิด Tree_Edit_Modal ของ cell ที่ยังไม่มี Tree_Profile, THE Tree_Edit_Modal SHALL ตั้งค่า field "สถานะสุขภาพ" เริ่มต้นเป็น `'normal'`
4. WHILE Tree_Edit_Modal เปิดอยู่, THE Tree_Edit_Modal SHALL อนุญาตให้ผู้ใช้เปลี่ยนค่า "สถานะสุขภาพ" ไปเป็นค่าใดก็ได้ใน `'normal'`, `'watch'`, `'seedling'`
5. WHEN ผู้ใช้กดบันทึก Tree_Edit_Modal, THE Tree_Edit_Modal SHALL บันทึกค่าที่ผู้ใช้เลือกล่าสุดลง Tree_Profile โดยถือเป็น Manual_Override

### Requirement 4: ซิงก์สถานะหลังบันทึกประวัติใหม่

**User Story:** ในฐานะเจ้าของสวน เมื่อฉันบันทึกประวัติการป่วยใหม่ในห้องพยาบาล ฉันต้องการให้สถานะของต้นในผังสวนเปลี่ยนตามทันทีโดยไม่ต้องไปแก้ที่ผังสวนเอง

#### Acceptance Criteria

1. WHEN Hospital_Page บันทึก Hospital_Record ใหม่ที่มี `status` เท่ากับ `'treating'` สำเร็จ, THE Hospital_Page SHALL อัปเดต Tree_Profile ของต้นนั้นใน Firestore ให้มี `status` เท่ากับ `'watch'` พร้อมตั้งค่า `updatedAt` เป็น timestamp ปัจจุบัน เว้นแต่ Tree_Profile.status เดิมเป็น `'seedling'`
2. WHEN Hospital_Page บันทึก Hospital_Record ใหม่ที่มี `status` เท่ากับ `'recovered'` สำเร็จ, THE Hospital_Page SHALL เรียก Tree_Sync_Service เพื่อคำนวณ Computed_Status ใหม่ของต้นนั้น และอัปเดต Tree_Profile ใน Firestore ให้ตรงกับ Computed_Status เว้นแต่ Tree_Profile.status เดิมเป็น `'seedling'`
3. WHEN Tree_Sync_Service คำนวณ Computed_Status หลังบันทึก Hospital_Record, THE Tree_Sync_Service SHALL ดึงข้อมูลล่าสุดจาก Firestore server (ไม่ใช้ cache) เพื่อให้รวม record ที่เพิ่งบันทึกแล้ว
4. IF การอัปเดต Tree_Profile ล้มเหลวหลังบันทึก Hospital_Record, THEN THE Hospital_Page SHALL แจ้งผู้ใช้ว่าบันทึกประวัติสำเร็จแต่ซิงก์สถานะต้นไม่สำเร็จ และบันทึกข้อความ error ลง console

### Requirement 5: ซิงก์สถานะหลังแก้ไขประวัติเดิม

**User Story:** ในฐานะเจ้าของสวน เมื่อฉันแก้ไขสถานะของประวัติเดิมจาก "กำลังรักษา" เป็น "หายแล้ว" หรือกลับกัน ฉันต้องการให้สถานะของต้นในผังสวนเปลี่ยนตามทันที

#### Acceptance Criteria

1. WHEN Hospital_Page อัปเดต Hospital_Record ที่มีอยู่สำเร็จ, THE Hospital_Page SHALL ตั้งค่า `updatedAt` ของ record นั้นเป็น timestamp ปัจจุบัน
2. WHEN Hospital_Page อัปเดต Hospital_Record ที่มีอยู่สำเร็จ, THE Hospital_Page SHALL เรียก Tree_Sync_Service เพื่อคำนวณ Computed_Status ใหม่ของต้นที่ผูกกับ record นั้น และอัปเดต Tree_Profile ใน Firestore ให้ตรงกัน เว้นแต่ Tree_Profile.status เดิมเป็น `'seedling'`
3. WHEN Tree_Sync_Service คำนวณ Computed_Status หลังแก้ไข Hospital_Record, THE Tree_Sync_Service SHALL ดึงข้อมูลล่าสุดจาก Firestore server (ไม่ใช้ cache)
4. IF Hospital_Record ที่ถูกแก้ไขมี `treeId` ต่างจากเดิม, THEN THE Hospital_Page SHALL เรียก Tree_Sync_Service สำหรับทั้งต้นเดิมและต้นใหม่ และอัปเดต Tree_Profile ของทั้งสองต้นให้ตรงกับ Computed_Status ของแต่ละต้น

### Requirement 6: ซิงก์สถานะหลังลบประวัติ

**User Story:** ในฐานะเจ้าของสวน เมื่อฉันลบประวัติการป่วยรายการสุดท้ายของต้นนั้นออก ฉันต้องการให้สถานะของต้นกลับมาเป็นปกติโดยอัตโนมัติ

#### Acceptance Criteria

1. WHEN Hospital_Page ลบ Hospital_Record สำเร็จ, THE Hospital_Page SHALL เรียก Tree_Sync_Service เพื่อคำนวณ Computed_Status ใหม่ของต้นที่ผูกกับ record ที่ถูกลบ และอัปเดต Tree_Profile ใน Firestore ให้ตรงกัน เว้นแต่ Tree_Profile.status เดิมเป็น `'seedling'`
2. WHEN ต้นนั้นไม่มี Hospital_Record เหลืออยู่หลังลบ, THE Tree_Sync_Service SHALL คำนวณ Computed_Status เท่ากับ `'normal'` ตาม Requirement 1.4
3. WHEN ต้นนั้นยังเหลือ Hospital_Record อย่างน้อยหนึ่งรายการ, THE Tree_Sync_Service SHALL คำนวณ Computed_Status จาก Latest_Record ของ record ที่เหลือ
4. THE Hospital_Page SHALL ดึงข้อมูลล่าสุดจาก Firestore server หลังลบเพื่อให้ Tree_Sync_Service ใช้ข้อมูลที่ไม่รวม record ที่ถูกลบแล้ว

### Requirement 7: เคารพ Manual Override ของผู้ใช้

**User Story:** ในฐานะเจ้าของสวน เมื่อฉันตั้งสถานะต้นเป็น "ต้นกล้า" ด้วยตนเอง ฉันต้องการให้ระบบไม่เขียนทับสถานะนั้นด้วย logic auto-sync

#### Acceptance Criteria

1. WHERE Tree_Profile.status เท่ากับ `'seedling'`, THE Tree_Sync_Service SHALL ไม่เขียนทับ Tree_Profile.status ด้วย Computed_Status
2. WHEN ผู้ใช้บันทึก Tree_Edit_Modal โดยตั้งค่า "สถานะสุขภาพ" เป็น `'seedling'`, THE Tree_Edit_Modal SHALL บันทึก `'seedling'` ลง Tree_Profile โดยไม่เปลี่ยนแปลง Hospital_Record ใด ๆ
3. WHERE Tree_Profile.status ไม่ใช่ `'seedling'`, THE Tree_Sync_Service SHALL ใช้ Computed_Status เป็นค่าตามกฎ Requirement 1
4. WHEN Tree_Profile.status เท่ากับ Computed_Status อยู่แล้ว, THE Tree_Sync_Service SHALL ไม่เขียน Firestore เพื่อหลีกเลี่ยง write ที่ไม่จำเป็น

### Requirement 8: แสดงผลที่สอดคล้องบน UI ผังสวน

**User Story:** ในฐานะเจ้าของสวน ฉันต้องการให้ทั้งสีของ cell ใน grid, ตัวเลขสรุปด้านบน, และค่าใน Tree_Edit_Modal แสดงสถานะเดียวกันสำหรับต้นเดียวกัน

#### Acceptance Criteria

1. THE Farm_Map_Page SHALL render สีของ cell แต่ละต้นจากค่า `status` ของ Tree_Profile ที่ผ่าน Tree_Sync_Service แล้ว
2. THE Farm_Map_Page SHALL คำนวณค่า "ปกติ", "เฝ้าระวัง", "ต้นกล้า" ในแถบสรุปจากค่าเดียวกันที่ใช้ render cell
3. WHEN ผู้ใช้เปิด Tree_Edit_Modal หลังจาก Farm_Map_Page sync เสร็จ, THE Tree_Edit_Modal SHALL แสดงค่า "สถานะสุขภาพ" ที่ตรงกับสีของ cell ที่ผู้ใช้แตะ
4. WHILE มี Hospital_Record ที่มี `status` เท่ากับ `'treating'` ผูกกับต้นนั้น, THE Farm_Map_Page SHALL แสดงไอคอน 🏥 บน cell ของต้นนั้น

### Requirement 9: คุณสมบัติทาง Correctness ที่ทดสอบได้ (Property-based)

**User Story:** ในฐานะนักพัฒนา ฉันต้องการให้ Tree_Sync_Service มีคุณสมบัติทาง correctness ที่ทดสอบเป็น property test ได้ เพื่อให้มั่นใจว่ากฎการ sync ทำงานถูกต้องในทุก input

#### Acceptance Criteria

1. THE Tree_Sync_Service SHALL เป็น **pure function** เมื่อรับชุด Hospital_Record และ Tree_Profile.status ปัจจุบัน คืนค่า Computed_Status เดียวกันเสมอสำหรับ input ชุดเดียวกัน (deterministic)
2. THE Tree_Sync_Service SHALL **idempotent**: เมื่อใช้ Computed_Status ที่ได้มาเป็น Tree_Profile.status ใหม่แล้วเรียก Tree_Sync_Service ซ้ำด้วย Hospital_Record ชุดเดิม Computed_Status SHALL คงเดิม
3. THE Tree_Sync_Service SHALL มี **invariant**: Computed_Status ขึ้นกับเฉพาะ Latest_Record และ Tree_Profile.status เดิม ไม่ขึ้นกับลำดับการส่ง Hospital_Record ใน array input
4. WHEN Hospital_Record ใด ๆ ถูกเพิ่ม / แก้ไข / ลบโดยที่ Latest_Record ไม่เปลี่ยน, THE Tree_Sync_Service SHALL คืนค่า Computed_Status เดิมไม่เปลี่ยนแปลง
5. FOR ทุก Tree_Profile.status เดิมที่ไม่ใช่ `'seedling'` และทุกชุด Hospital_Record ที่มี Latest_Record.status เท่ากับ `'recovered'` หรือชุดว่าง, Computed_Status SHALL เท่ากับ `'normal'`
6. FOR ทุก Tree_Profile.status เดิมที่ไม่ใช่ `'seedling'` และทุกชุด Hospital_Record ที่มี Latest_Record.status เท่ากับ `'treating'`, Computed_Status SHALL เท่ากับ `'watch'`

### Requirement 10: ประสิทธิภาพและการลด write ที่ไม่จำเป็น

**User Story:** ในฐานะเจ้าของสวน ฉันต้องการให้ฟีเจอร์นี้ไม่ทำให้หน้าผังสวนช้าหรือทำให้เกิดค่าใช้จ่าย Firestore เกินจำเป็น

#### Acceptance Criteria

1. WHEN Farm_Map_Page sync สถานะของต้นทั้งสวน, THE Farm_Map_Page SHALL เขียน Tree_Profile ใน Firestore เฉพาะต้นที่ Computed_Status ต่างจากค่าปัจจุบันเท่านั้น
2. WHEN Farm_Map_Page โหลดสวนที่มี Tree_Profile ทุกต้นตรงกับ Computed_Status อยู่แล้ว, THE Farm_Map_Page SHALL ไม่เขียน Firestore เลย
3. THE Farm_Map_Page SHALL ทำการ sync เป็น batch แบบขนาน (Promise.all) สำหรับต้นที่ต้องอัปเดตหลายต้น
4. WHILE Farm_Map_Page กำลัง sync, THE Farm_Map_Page SHALL ไม่ block การ render ของ cell ที่ไม่ต้องอัปเดต
