# Requirements Document

## Introduction

ฟีเจอร์นี้คือกลไกซิงก์สถานะสุขภาพของต้นไม้ในผังสวน (`TreeProfile.status`) ให้สอดคล้องกับ **ประวัติการป่วยล่าสุด** (`HospitalRecord` ล่าสุดของต้นนั้น) โดยอัตโนมัติ

ปัจจุบันระบบ Garden Master มี logic sync กระจายอยู่หลายจุด ทั้งฝั่งบันทึกประวัติ (`HospitalClient`) และฝั่งโหลดผังสวน (`FarmMapClient`) ทำให้เกิดปัญหา:
- บันทึกประวัติเป็น "หายแล้ว" แล้วผังสวนยังแสดง "เฝ้าระวัง" (race condition กับ Firestore eventual consistency)
- ผู้ใช้ต้องเปิด/ปิด modal "แก้ไขข้อมูลต้น" ซ้ำเพื่อให้ค่าตรง

ฟีเจอร์นี้รวม logic การคำนวณสถานะให้เป็น **single source of truth** ที่อ้างอิงจากประวัติการป่วยล่าสุดเท่านั้น โดย:
- ถ้าประวัติล่าสุด = `กำลังรักษา` → สถานะสุขภาพ = `เฝ้าระวัง`
- ถ้าประวัติล่าสุด = `หายแล้ว` → สถานะสุขภาพ = `ปกติ`
- ถ้าไม่มีประวัติ → สถานะสุขภาพคงค่าเดิมที่ผู้ใช้ตั้งไว้ (default `ปกติ` สำหรับต้นใหม่)

ผู้ใช้ยังคงแก้ไขสถานะด้วยตนเองได้ใน modal "แก้ไขข้อมูลต้น" และการแก้ไขด้วยตนเองนั้นต้องไม่ถูก override ทันที จนกว่าจะมีประวัติการป่วยใหม่เข้ามา

## Glossary

- **Tree_Profile**: เอกสาร Firestore ใน collection `treeProfiles` แทนข้อมูลต้นไม้ 1 ต้นในผังสวน มีฟิลด์ `status: 'normal' | 'watch' | 'seedling'` ที่แสดงในหน้าผังสวน
- **Hospital_Record**: เอกสาร Firestore ใน collection `hospitalRecords` แทนการบันทึกประวัติการป่วย 1 ครั้ง มีฟิลด์ `status: 'treating' | 'recovered'`, `treeId`, `createdAt`, `updatedAt`
- **Latest_Hospital_Record**: Hospital_Record ของต้นเป้าหมายที่มีค่า `createdAt` มากที่สุด ในกรณีที่ `createdAt` เท่ากัน ให้ใช้ `updatedAt` มากที่สุดเป็นตัวตัดสิน
- **Health_Status**: ค่าฟิลด์ `Tree_Profile.status` ที่แสดงในผังสวนและในฟอร์ม "แก้ไขข้อมูลต้น" มีค่า `normal` (ปกติ), `watch` (เฝ้าระวัง), `seedling` (ต้นกล้า)
- **Health_Sync_Service**: โมดูลใหม่ที่รวม logic การคำนวณ Health_Status จากประวัติการป่วยล่าสุด และการเขียนค่าผลลัพธ์กลับลงใน Tree_Profile
- **Farm_Map_Page**: หน้า `/orchard/farm-map?id={orchardId}` ที่แสดงผังสวน 9×11
- **Tree_Edit_Modal**: modal "แก้ไขข้อมูลต้น" ที่เปิดจาก Farm_Map_Page เมื่อผู้ใช้กดเซลล์ในผัง
- **Hospital_Page**: หน้า `/orchard/hospital?id={orchardId}` สำหรับบันทึก/แก้ไข/ลบประวัติการป่วย
- **Save_Hospital_Action**: การกระทำที่ผู้ใช้กดปุ่มบันทึกหรือแก้ไขใน Hospital_Page (ทั้ง add และ update)
- **Delete_Hospital_Action**: การกระทำที่ผู้ใช้กดปุ่มลบประวัติการป่วยใน Hospital_Page
- **Manual_Health_Override**: การที่ผู้ใช้ตั้งค่า Health_Status ด้วยตนเองผ่าน Tree_Edit_Modal และกดบันทึก
- **Seedling_Status**: ค่า Health_Status = `seedling` ซึ่งระบุว่าต้นนี้เป็นต้นกล้า ไม่ได้สื่อถึงสุขภาพ จึงไม่ถูกเปลี่ยนแปลงโดยกลไกซิงก์อัตโนมัติ

## Requirements

### Requirement 1: คำนวณสถานะสุขภาพจากประวัติการป่วยล่าสุด

**User Story:** ในฐานะเกษตรกรผู้ใช้แอป ฉันต้องการให้สถานะสุขภาพของต้นไม้ในผังสวนสะท้อนประวัติการป่วยล่าสุดโดยอัตโนมัติ เพื่อที่ฉันจะได้ไม่ต้องอัปเดตสถานะซ้ำในสองที่

#### Acceptance Criteria

1. WHEN Health_Sync_Service คำนวณสถานะของต้นเป้าหมายและ Latest_Hospital_Record ของต้นนั้นมี `status` = `treating`, THE Health_Sync_Service SHALL คืนค่า Health_Status = `watch`
2. WHEN Health_Sync_Service คำนวณสถานะของต้นเป้าหมายและ Latest_Hospital_Record ของต้นนั้นมี `status` = `recovered`, THE Health_Sync_Service SHALL คืนค่า Health_Status = `normal`
3. WHEN Health_Sync_Service คำนวณสถานะของต้นเป้าหมายและไม่มี Hospital_Record ใดที่มี `treeId` ตรงกับต้นเป้าหมาย, THE Health_Sync_Service SHALL คืนค่า `null` เพื่อบ่งชี้ว่าต้นนี้ไม่ถูกซิงก์โดยอัตโนมัติ
4. WHEN Health_Sync_Service ได้รับ Hospital_Record หลายรายการของต้นเดียวกันที่มี `createdAt` เท่ากัน, THE Health_Sync_Service SHALL เลือก record ที่มี `updatedAt` มากที่สุดเป็น Latest_Hospital_Record
5. WHEN Health_Sync_Service คำนวณสถานะของต้นเป้าหมายและ Tree_Profile ปัจจุบันมี Health_Status = `seedling`, THE Health_Sync_Service SHALL คืนค่า `seedling` โดยไม่อ้างอิงประวัติการป่วย

### Requirement 2: ซิงก์สถานะอัตโนมัติเมื่อบันทึกประวัติการป่วย

**User Story:** ในฐานะเกษตรกรผู้ใช้แอป ฉันต้องการให้สถานะสุขภาพในผังสวนเปลี่ยนทันทีเมื่อฉันบันทึกประวัติการป่วยใหม่หรือแก้ไขประวัติเดิม เพื่อที่ฉันจะได้เห็นผังสวนตรงกับความเป็นจริงโดยไม่ต้องรีเฟรช

#### Acceptance Criteria

1. WHEN ผู้ใช้ทำ Save_Hospital_Action สำเร็จและ Hospital_Record ที่บันทึกมี `status` = `treating`, THE Health_Sync_Service SHALL อัปเดต `Tree_Profile.status` ของต้นที่อ้างอิงโดย `treeId` ให้เป็น `watch` ภายในการกดปุ่มเดียวกันนั้น
2. WHEN ผู้ใช้ทำ Save_Hospital_Action สำเร็จและ Hospital_Record ที่บันทึกมี `status` = `recovered`, THE Health_Sync_Service SHALL คำนวณ Latest_Hospital_Record ของต้นนั้นใหม่และอัปเดต `Tree_Profile.status` ให้ตรงกับผลการคำนวณ
3. WHEN Health_Sync_Service คำนวณ Latest_Hospital_Record หลังการบันทึกประวัติ, THE Health_Sync_Service SHALL ใช้ Hospital_Record ที่เพิ่งบันทึกเป็นข้อมูลอ้างอิงโดยไม่รอ Firestore server ส่งคืนค่าใหม่
4. IF Save_Hospital_Action สำเร็จแต่การอัปเดต `Tree_Profile.status` ล้มเหลว, THEN THE Hospital_Page SHALL แสดงข้อความแจ้งผู้ใช้ว่าบันทึกประวัติสำเร็จแต่การซิงก์สถานะล้มเหลว และคงข้อมูล Hospital_Record ที่บันทึกไว้
5. WHEN ผู้ใช้ทำ Save_Hospital_Action ของต้นที่มี Tree_Profile โดยที่ Tree_Profile ปัจจุบันมี Health_Status = `seedling`, THE Health_Sync_Service SHALL ไม่เปลี่ยนค่า `Tree_Profile.status`

### Requirement 3: ซิงก์สถานะอัตโนมัติเมื่อลบประวัติการป่วย

**User Story:** ในฐานะเกษตรกรผู้ใช้แอป ฉันต้องการให้สถานะสุขภาพในผังสวนปรับปรุงให้ตรงเมื่อฉันลบประวัติการป่วย เพื่อที่ผังสวนจะไม่ค้างอยู่ในสถานะ "เฝ้าระวัง" หลังจากที่ประวัติที่เป็นเหตุถูกลบไปแล้ว

#### Acceptance Criteria

1. WHEN ผู้ใช้ทำ Delete_Hospital_Action สำเร็จและยังเหลือ Hospital_Record อย่างน้อย 1 รายการที่มี `treeId` ตรงกับต้นที่ถูกลบประวัติ, THE Health_Sync_Service SHALL คำนวณ Latest_Hospital_Record ใหม่จากรายการที่เหลือและอัปเดต `Tree_Profile.status` ให้ตรงกับผลการคำนวณ
2. WHEN ผู้ใช้ทำ Delete_Hospital_Action สำเร็จและไม่มี Hospital_Record ใดเหลืออยู่ที่มี `treeId` ตรงกับต้นที่ถูกลบประวัติ, THE Health_Sync_Service SHALL อัปเดต `Tree_Profile.status` ของต้นนั้นเป็น `normal`
3. WHEN Health_Sync_Service ทำงานหลังการลบประวัติของต้นที่ Tree_Profile มี Health_Status = `seedling`, THE Health_Sync_Service SHALL ไม่เปลี่ยนค่า `Tree_Profile.status`

### Requirement 4: ซิงก์สถานะเมื่อโหลดผังสวน

**User Story:** ในฐานะเกษตรกรผู้ใช้แอป ฉันต้องการให้ผังสวนแสดงสถานะที่ถูกต้องเสมอเมื่อเปิดหน้า เพื่อที่ฉันจะมั่นใจได้ว่าสีและไอคอนในผังตรงกับประวัติการป่วยล่าสุดจริง แม้ว่าก่อนหน้านี้ระบบจะเขียนค่าผิดไว้

#### Acceptance Criteria

1. WHEN ผู้ใช้เปิด Farm_Map_Page, THE Health_Sync_Service SHALL คำนวณ Health_Status ที่ควรเป็นของทุกต้นในสวนนั้นจาก Hospital_Record ที่ดึงจาก Firestore server
2. WHEN Farm_Map_Page โหลดข้อมูลและพบว่า Tree_Profile ใดมี `status` ไม่ตรงกับผลการคำนวณของ Health_Sync_Service, THE Health_Sync_Service SHALL อัปเดต `Tree_Profile.status` ใน Firestore ให้ตรงกับผลการคำนวณ
3. WHEN Farm_Map_Page เรียก Health_Sync_Service ระหว่างโหลด, THE Farm_Map_Page SHALL แสดงค่า Health_Status ที่คำนวณได้ใน UI ทันทีโดยไม่รอผลการเขียน Firestore เสร็จสิ้น
4. WHERE Tree_Profile มี Health_Status = `seedling`, THE Health_Sync_Service SHALL ไม่เปลี่ยนค่าในขั้นตอนการโหลด Farm_Map_Page

### Requirement 5: ซิงก์สถานะเมื่อเปิด Modal แก้ไขข้อมูลต้น

**User Story:** ในฐานะเกษตรกรผู้ใช้แอป ฉันต้องการให้ค่าสถานะสุขภาพในฟอร์ม "แก้ไขข้อมูลต้น" ตรงกับประวัติการป่วยล่าสุดเสมอเมื่อเปิด เพื่อที่ฉันจะได้ไม่เห็นค่าเก่าที่ค้างจากการเขียนผิด

#### Acceptance Criteria

1. WHEN ผู้ใช้เปิด Tree_Edit_Modal ของต้นที่มี Tree_Profile อยู่แล้ว, THE Tree_Edit_Modal SHALL แสดงค่า Health_Status ที่ Health_Sync_Service คำนวณจาก Latest_Hospital_Record ของต้นนั้น
2. WHEN Tree_Edit_Modal เปิดและพบว่า `Tree_Profile.status` ใน Firestore ไม่ตรงกับผลการคำนวณของ Health_Sync_Service, THE Health_Sync_Service SHALL อัปเดต `Tree_Profile.status` ให้ตรงก่อนแสดงในฟอร์ม
3. WHEN ผู้ใช้เปิด Tree_Edit_Modal ของเซลล์ที่ยังไม่มี Tree_Profile, THE Tree_Edit_Modal SHALL แสดงค่า Health_Status เริ่มต้นเป็น `normal`

### Requirement 6: รักษาการแก้ไขสถานะด้วยตนเอง

**User Story:** ในฐานะเกษตรกรผู้ใช้แอป ฉันต้องการแก้ไขสถานะสุขภาพได้เองเมื่อจำเป็น โดยที่การแก้ไขของฉันจะไม่ถูกเขียนทับทันทีจากกลไกซิงก์ เพื่อที่ฉันจะคุมข้อมูลที่ตัวเองตั้งใจตั้งค่าได้

#### Acceptance Criteria

1. WHEN ผู้ใช้ทำ Manual_Health_Override โดยกดบันทึกใน Tree_Edit_Modal, THE Tree_Edit_Modal SHALL บันทึกค่า Health_Status ที่ผู้ใช้เลือกลงใน Tree_Profile โดยไม่ถูกแทนที่ด้วยผลการคำนวณของ Health_Sync_Service ในขั้นตอนการบันทึกนั้น
2. WHEN ผู้ใช้ทำ Save_Hospital_Action ของต้นเป้าหมาย, THE Health_Sync_Service SHALL อัปเดต `Tree_Profile.status` ตามผลการคำนวณจาก Hospital_Record โดยไม่คำนึงว่าค่าเดิมถูกตั้งจาก Manual_Health_Override หรือไม่
3. WHEN ผู้ใช้ทำ Manual_Health_Override โดยตั้งค่า Health_Status = `seedling` ในขณะที่ต้นมี Hospital_Record อยู่, THE Health_Sync_Service SHALL คงค่า `seedling` ไว้และไม่อัปเดตจากประวัติการป่วยจนกว่าผู้ใช้จะเปลี่ยนค่ากลับด้วยตนเอง

### Requirement 7: รักษาความสอดคล้องของข้อมูลภายใต้ Firestore Eventual Consistency

**User Story:** ในฐานะเกษตรกรผู้ใช้แอป ฉันต้องการให้สถานะที่เห็นในผังสวนตรงกับประวัติที่บันทึกล่าสุดจริง แม้ว่า Firestore จะมีหน่วงเวลาในการ propagate ข้อมูล เพื่อที่ฉันจะได้ไม่เห็นค่าผิดหลังกดบันทึก

#### Acceptance Criteria

1. WHEN Health_Sync_Service คำนวณ Latest_Hospital_Record ภายในรอบเดียวกับ Save_Hospital_Action, THE Health_Sync_Service SHALL ใช้ payload ที่ส่งให้ Firestore เป็นแหล่งข้อมูลของ record นั้นแทนข้อมูลที่ดึงจาก Firestore server
2. IF Health_Sync_Service ดึง Hospital_Record จาก Firestore server แล้วได้ผลที่ขัดแย้งกับ payload ที่เพิ่งบันทึก, THEN THE Health_Sync_Service SHALL ใช้ payload ที่เพิ่งบันทึกเป็นค่าจริงในการคำนวณ
3. WHEN Health_Sync_Service ดึงข้อมูล Hospital_Record เพื่อคำนวณสถานะ, THE Health_Sync_Service SHALL ดึงจาก Firestore server โดยตรง (ไม่ใช้ cache) เพื่อให้ได้ข้อมูลล่าสุดที่ server ยืนยันแล้ว

### Requirement 8: ค่า Default และการเริ่มต้นของต้นใหม่

**User Story:** ในฐานะเกษตรกรผู้ใช้แอป ฉันต้องการให้ต้นที่ยังไม่เคยมีประวัติการป่วยเริ่มต้นด้วยสถานะ "ปกติ" เพื่อที่ผังสวนจะแสดงต้นใหม่อย่างสม่ำเสมอ

#### Acceptance Criteria

1. WHEN ผู้ใช้สร้าง Tree_Profile ใหม่จาก Tree_Edit_Modal โดยไม่ตั้งค่า Health_Status เอง, THE Tree_Edit_Modal SHALL บันทึก Tree_Profile ใหม่ที่มี `status` = `normal`
2. WHEN ผู้ใช้สร้าง Tree_Profile ใหม่ผ่านการกดปุ่ม "ส่งห้องพยาบาล" จาก Tree_Edit_Modal, THE Tree_Edit_Modal SHALL บันทึก Tree_Profile ใหม่ที่มี `status` = `normal` แล้วให้ Save_Hospital_Action ที่ตามมาเป็นตัวกำหนดสถานะตาม Requirement 2

