---
name: thai-keyboard-misinput
category: 'Policy & Compliance'
description: 'อ่าน/แปลข้อความที่ user พิมพ์ภาษาไทยขณะแป้นพิมพ์อยู่ที่ภาษาอังกฤษ (Kedmanee → QWERTY mismatch) ให้ AI เข้าใจได้ทันที'
argument-hint: 'ข้อความที่สงสัยว่าเป็นไทยพิมพ์ผิด layout'
depends-on: []
---
# Thai Keyboard Misinput Decoder

## กฎหลัก

1. AI ต้อง decode + เข้าใจเจตนาของ user ทันที **ห้ามตอบกลับว่า "พิมพ์ใหม่" หรือ "ไม่เข้าใจ"**
2. **ห้ามตอบ empty response หรือเงียบ** — ต้องมีข้อความตอบกลับเสมอ
3. ไม่ต้อง decode เป๊ะ 100% — ให้เดาจาก context
4. Steering file มี mapping ให้ใช้ทุก message

## Kedmanee → QWERTY Mapping

**ตัวอักษร (No Shift):**
- `q→ๆ w→ไ e→ำ r→พ t→ะ y→ั u→ี i→ร o→น p→ย [→บ ]→ล`
- `a→ฟ s→ห d→ก f→ด g→เ h→้ j→่ k→า l→ส ;→ว '→ง`
- `z→ผ x→ป c→แ v→อ b→ิ n→ื m→ท ,→ม .→ใ /→ฝ`

**ตัวเลข (No Shift):**
- `` `→_ 1→ๅ 2→/ 3→- 4→ภ 5→ถ 6→ุ 7→ึ 8→ค 9→ต 0→จ -→ข =→ช``

**Shift Row:**
- `Q→๐ W→" E→ฎ R→ฑ T→ธ Y→ํ U→๊ I→ณ O→ฯ P→ญ {→ฐ }→,`
- `A→ฤ S→ฆ D→ฏ F→โ G→ฌ H→็ J→๋ K→ษ L→ศ :→ซ "→.`
- `Z→( X→) C→ฉ V→ฮ B→ฺ N→์ M→? <→ฒ >→ฬ ?→ฦ`
- `~→% !→+ @→๑ #→๒ $→๓ %→๔ ^→ู &→฿ *→๕ (→๖ )→๗ _→๘ +→๙`

## วิธี Decode (3 ขั้น)

1. **Mechanical map:** แปลง ASCII → ไทย ตามตาราง
2. **ตรวจอ่าน:** เดาคำใกล้เคียง, สลับสระ/วรรณยุกต์, ตัด space ใหม่
3. **ตอบกลับ:** บอกว่าเข้าใจอะไร แล้วทำงานต่อทันที

## ตัวอย่าง

```
User: ly;lfu;yo0yomiN=
→ decode: สวัสดีวันจันทร์
AI: เข้าใจว่า "สวัสดีวันจันทร์" มีอะไรให้ช่วยไหมครับ
```

```
User: gxbf student details
→ decode: "เปิด" student details
AI: รับทราบ จะเปิด student details ให้
```

## False Positive Guards

**อย่า decode:**
- File path: `c:\projects\src\`
- Variable name: `getUserList`
- Code block (triple backtick)
- คำอังกฤษทั่วไป: `hello world`

**Decode เมื่อ:**
- มี `;` `'` `[` `]` ปนในคำ
- ตัวเลขกลางคำ: `yo0yo`
- ASCII gibberish ที่ decode แล้วเป็นไทยที่อ่านรู้เรื่อง

## หลักคิด: "เข้าใจพอ" > "decode เป๊ะ"

- ✅ อ่านเจตนา → ทวน 1 บรรทัด → ทำงานต่อ
- ✅ ใช้ context ช่วยเดา
- ❌ ไม่ต้องแสดงตาราง mapping
- ❌ ไม่ต้องถาม confirm ทุกครั้ง
