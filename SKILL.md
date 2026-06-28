---
name: thai-keyboard-misinput
category: 'Policy & Compliance'
description: 'อ่าน/แปลข้อความที่ user พิมพ์ภาษาไทยขณะแป้นพิมพ์อยู่ที่ภาษาอังกฤษ (Kedmanee → QWERTY mismatch) ให้ AI เข้าใจได้ทันทีโดยไม่ต้องให้ user พิมพ์ใหม่. ใช้เมื่อ: user พิมพ์ข้อความที่ดูเป็น gibberish ASCII เช่น "ly;lfu" "0yomiN=" "g]vd&fNkv" หรือ มีคำสั่งงานที่อ่านแล้วไม่เป็น natural English คำที่ตรงกับ key positions ของ Kedmanee'
argument-hint: 'ข้อความที่สงสัยว่าเป็นไทยพิมพ์ผิด layout (วางได้ทั้งบรรทัด)'
depends-on: []
---
# Thai Keyboard Misinput Decoder (อ่านไทยพิมพ์ผิดเลย์เอาต์)

## ปัญหาที่ skill นี้แก้

User พิมพ์ภาษาไทยขณะที่ Windows/macOS อยู่ใน input mode ภาษาอังกฤษ ทำให้ออกมาเป็น ASCII gibberish เช่น:

| สิ่งที่ user เห็น (พิมพ์ผิด) | สิ่งที่ user ตั้งใจจะพิมพ์ |
|------------------------------|----------------------------|
| `ly;lfu;yo0yomiN=` | สวัสดีวันจันทร์ |
| `gxHomyd ' ko` | เป็นนักงาน (ตัวอย่าง) |
| `,uxyAso` | มีปัญหา |
| `'kovk;ihv' .yo,Y[` | งานอวกอวยจัน… |

**กฎหลัก:**
1. AI ต้อง decode + เข้าใจเจตนาของ user ทันที **ห้ามตอบกลับว่า "พิมพ์ใหม่หน่อย" หรือ "ไม่เข้าใจ"** ถ้าไม่จำเป็น
2. **ห้ามตอบ empty response, "." หรือเงียบเด็ดขาด** — ต้องมีข้อความตอบกลับเสมอ
3. ไม่ต้อง decode เป๊ะ 100% — user พิมพ์ผิดได้ (ตกตัว, สลับ, เกิน) เหมือนพิมพ์ไทยปกติ ให้เดาจาก context
4. Steering file `.kiro/steering/thai-keyboard-decode.md` (always-on) มี mapping ย่อให้ใช้ทุก message โดยไม่ต้องโหลด skill นี้ก่อน

---

## เมื่อไรควรเปิดใช้ skill นี้

Trigger เมื่อ message ของ user มี **อย่างน้อย 1 ข้อ** ต่อไปนี้:

1. มี ASCII gibberish ที่อ่านไม่เป็นคำอังกฤษและมี **อักขระพิเศษ Kedmanee อยู่กลางคำ** เช่น `;` `'` `[` `]` `/` `0-9` ปนกับตัวอักษรล่างเล็กแบบไม่มี space
2. message ปนข้อความไทยกับ ASCII ที่ยาวต่อเนื่องกัน เช่น "ช่วยทำเรื่อง `ly;lfu` ให้หน่อย"
3. user บอกตรงๆ ว่า "ลืมเปลี่ยนภาษา" / "ลืมกด Alt+Shift" / "พิมพ์ผิด layout"
4. ผลลัพธ์ของ Kedmanee mapping (ดูตารางด้านล่าง) **เป็นภาษาไทยที่อ่านรู้เรื่อง** มากกว่าการอ่านเป็น English

ถ้าตรง 1+ → decode ในหัว แล้วทำงานต่อทันที **ไม่ต้องเป๊ะทุกตัว แค่เดาเจตนาออก**

ถ้าไม่ชัด (เช่นเป็นชื่อตัวแปร, รหัส, regex, path) → **อย่า decode** ให้ปฏิบัติตามตัวอักษรเดิม

> 💡 **กฎเร็ว:** ถ้าเห็น ASCII ดูเป็น gibberish ในหัวจัด priority แบบนี้ — (1) ลอง decode (2) ถ้าได้ความหมาย → ทำงานต่อ (3) ถ้าไม่ได้ → ค่อยถาม user

---

## Kedmanee → QWERTY Mapping (ตารางหลัก)

ใช้สำหรับ decode: **ดูคีย์ QWERTY (LHS) → แปลงเป็นตัวอักษรไทย Kedmanee (RHS)**

### Row 1 — ตัวเลข (No Shift)

| QWERTY | → ไทย | QWERTY | → ไทย |
|---|---|---|---|
| `` ` `` | `_` | `7` | `ึ` |
| `1` | `ๅ` | `8` | `ค` |
| `2` | `/` | `9` | `ต` |
| `3` | `-` | `0` | `จ` |
| `4` | `ภ` | `-` | `ข` |
| `5` | `ถ` | `=` | `ช` |
| `6` | `ุ` | | |

### Row 2 — QWERTY (No Shift)

| QWERTY | → ไทย | QWERTY | → ไทย |
|---|---|---|---|
| `q` | `ๆ` | `u` | `ี` |
| `w` | `ไ` | `i` | `ร` |
| `e` | `ำ` | `o` | `น` |
| `r` | `พ` | `p` | `ย` |
| `t` | `ะ` | `[` | `บ` |
| `y` | `ั` | `]` | `ล` |

### Row 3 — ASDF (No Shift)

| QWERTY | → ไทย | QWERTY | → ไทย |
|---|---|---|---|
| `a` | `ฟ` | `h` | `้` |
| `s` | `ห` | `j` | `่` |
| `d` | `ก` | `k` | `า` |
| `f` | `ด` | `l` | `ส` |
| `g` | `เ` | `;` | `ว` |
| | | `'` | `ง` |

### Row 4 — ZXCV (No Shift)

| QWERTY | → ไทย | QWERTY | → ไทย |
|---|---|---|---|
| `z` | `ผ` | `n` | `ื` |
| `x` | `ป` | `m` | `ท` |
| `c` | `แ` | `,` | `ม` |
| `v` | `อ` | `.` | `ใ` |
| `b` | `ิ` | `/` | `ฝ` |

### Shift Row — ตัวเลข (With Shift)

| QWERTY | → ไทย | QWERTY | → ไทย |
|---|---|---|---|
| `~` | `%` | `^` | `ู` |
| `!` | `+` | `&` | `฿` |
| `@` | `๑` | `*` | `๕` |
| `#` | `๒` | `(` | `๖` |
| `$` | `๓` | `)` | `๗` |
| `%` | `๔` | `_` | `๘` |
| | | `+` | `๙` |

### Shift Row — QWERTY (With Shift)

| QWERTY | → ไทย | QWERTY | → ไทย |
|---|---|---|---|
| `Q` | `๐` | `U` | `๊` |
| `W` | `"` | `I` | `ณ` |
| `E` | `ฎ` | `O` | `ฯ` |
| `R` | `ฑ` | `P` | `ญ` |
| `T` | `ธ` | `{` | `ฐ` |
| `Y` | `ํ` | `}` | `,` |

### Shift Row — ASDF (With Shift)

| QWERTY | → ไทย | QWERTY | → ไทย |
|---|---|---|---|
| `A` | `ฤ` | `H` | `็` |
| `S` | `ฆ` | `J` | `๋` |
| `D` | `ฏ` | `K` | `ษ` |
| `F` | `โ` | `L` | `ศ` |
| `G` | `ฌ` | `:` | `ซ` |
| | | `"` | `.` |

### Shift Row — ZXCV (With Shift)

| QWERTY | → ไทย | QWERTY | → ไทย |
|---|---|---|---|
| `Z` | `(` | `N` | `์` |
| `X` | `)` | `M` | `?` |
| `C` | `ฉ` | `<` | `ฒ` |
| `V` | `ฮ` | `>` | `ฬ` |
| `B` | `ฺ` | `?` | `ฦ` |

> Space → Space ไม่เปลี่ยน · ตัวอักษรไทยที่อยู่ในข้อความเดิมแล้ว → คงไว้เหมือนเดิม

---

## หลักคิดหลัก: "เข้าใจพอ" > "decode เป๊ะ"

Skill นี้ **ไม่ต้องการ 100% accuracy** — เป้าหมายคือ "อ่านเจตนาออก" เหมือนตอน user พิมพ์ไทยปกติแล้วมีตกหล่น/สลับสระ/พิมพ์ผิด AI ก็ยังเข้าใจได้

**ระดับที่ยอมรับได้:**

| ระดับ | ความหมาย | AI ทำอะไร |
|-------|----------|-----------|
| ✅ **Understandable** | decode แล้วเดาเจตนาได้ ≥80% | ทำงานต่อทันที ไม่ต้องถาม |
| 🟡 **Partial** | อ่านได้บางส่วน บางคำเพี้ยน | ทวนสิ่งที่เข้าใจ 1 บรรทัด แล้วทำงานต่อ |
| 🔴 **Gibberish** | decode แล้วยังไม่เป็นไทย | ถาม user ตรงๆ ว่าหมายถึงอะไร |

**สิ่งที่ AI ไม่ต้องทำ:**
- ❌ ไม่ต้อง decode ตัวต่อตัวให้สมบูรณ์ก่อนตอบ
- ❌ ไม่ต้องแสดงตาราง mapping ให้ user ดู
- ❌ ไม่ต้องอธิบายว่า "คุณพิมพ์ผิด layout นะ" ทุกครั้ง — แค่ทำงานต่อเงียบๆ
- ❌ ไม่ต้องถาม confirm ทุกครั้งว่า "ใช่ X ใช่ไหม"

**สิ่งที่ AI ทำพอ:**
- ✅ อ่านเจตนา → ทวน 1 บรรทัดสั้นๆ ว่าเข้าใจอะไร → ทำงานต่อ
- ✅ ถ้าเดาผิด user จะแก้เอง — ไม่ใช่หน้าที่เราต้องแม่นเป๊ะ
- ✅ ใช้ context ของบทสนทนาก่อนหน้าช่วยเดา (สำคัญกว่า mapping เป๊ะ)

ตัวอย่างเปรียบเทียบ:

```
User: ly;lfu;yo0yomiN= (พิมพ์ผิด layout)
ดีพอ : "เข้าใจว่าทักทาย สวัสดีวันจันทร์ครับ มีอะไรให้ช่วยไหม"
ดีไป : [แสดงตาราง decode 8 ตัว แล้วอธิบาย Kedmanee mapping ทั้งหมด]

User: gxbf หน้า student
ดีพอ : "รับทราบ จะเปิดหน้า student ให้" (เดา gxbf = "เปิด")
ดีไป : "decode 'gxbf' = 'เปิด' (g→เ, x→ป, b→ิ, f→ด) ใช่ไหมครับ?"
```

---

## วิธี Decode ของ AI (3 ขั้น)

### ขั้น 1: Mechanical map

แปลง ASCII → ไทย ตามตารางตัวต่อตัว เก็บผลไว้เป็น `decoded`

ตัวอย่าง:
```
input    : ly;lfu;yo0yomiN=
mapping  : ส ั ว ส ด ี ว ั น จ ั น ท ร ์ ช
decoded  : สัวสดีวันจันทร์ช
```

### ขั้น 2: ตรวจอ่านเป็นภาษาไทย + เดาคำใกล้เคียง

User อาจ:
- **สลับลำดับตัวกำกับสระ/วรรณยุกต์** (พิมพ์ ส-ั-ว แทน ส-ว-ั) → ลองสลับเพื่อหาคำใน vocabulary ภาษาไทย
- **มีตัวเกิน/ขาด** ปลายข้อความ (เช่น `=` → `ช` ที่ไม่มีความหมาย) → ตัดทิ้งถ้า decoded สมบูรณ์แล้ว
- **เคาะ space ผิด** → จัด word boundary ใหม่ตามคำที่อ่านแล้ว natural

ตัวอย่าง:
```
decoded raw: สัวสดีวันจันทร์ช
fix order  : สวัสดีวันจันทร์ + เศษ "ช"
final      : สวัสดีวันจันทร์
```

### ขั้น 3: ตอบกลับ

AI ต้องตอบโดย:
1. ระบุสั้นๆ ว่าเข้าใจแล้วว่า user หมายถึงอะไร เช่น `เข้าใจว่าหมายถึง "สวัสดีวันจันทร์" นะ ครับ/ค่ะ`
2. ถ้าใจความชัดเจน → ทำงานต่อตามคำสั่งทันที **ไม่ต้องถาม confirm**
3. ถ้าใจความ ambiguous (มีหลายคำที่ map ได้) → แสดง 2-3 ทางเลือก ให้ user เลือก
4. ถ้า decode แล้วไม่เป็นภาษาไทยที่อ่านรู้เรื่องเลย → ถาม user ตรงๆ ว่า "ขอข้อความเดิมอีกทีนะ ลอง decode แล้วยังไม่ออก"

---

## ตัวอย่างการใช้งาน

### ตัวอย่าง 1 — คำทักทาย (จากที่ user ให้)

```
User: ly;lfu;yo0yomiN=
AI  : เข้าใจว่าหมายถึง "สวัสดีวันจันทร์" นะ มีอะไรให้ช่วยไหม
```

### ตัวอย่าง 2 — คำสั่งงานที่ปนคำผิด layout

```
User: ช่วย g]vd&fNkv ตาราง students ให้หน่อย
decoded "g]vd&fNkv" → "เลือก฿ดN์าอ" (ดูแปลก) — แสดงว่าไม่ใช่ Kedmanee misinput
ในกรณี decode แล้วยังแปลก → AI ต้องไม่ดันแปล แต่ถาม user ตรงๆ
AI  : ส่วน "g]vd&fNkv" decode แล้วยังไม่เป็นคำไทยชัดเจน หมายถึงอะไรครับ
```

### ตัวอย่าง 3 — คำสั่งงานปนหลายภาษา

```
User: gxd v;f;k vyo,Y[ login ไม่ผ่าน
decoded "gxd v;f;k vyo,Y[" → "เปด อวดวา อันมูบ" (ไม่ชัด → อย่าเดา)
AI  : รับเรื่อง login ไม่ผ่าน เดี๋ยวเช็คให้ ส่วนข้อความหน้านั้นสะกดถูกไหม decode แล้วยังไม่เป็นไทยที่ชัด
```

### ตัวอย่าง 4 — คำสั่งงานล้วน

```
User: gxbfsoik student details ห้องม.1/1
decoded "gxbfsoik" → "เปิดหน้า"
AI  : รับทราบ จะเปิดหน้า student details ห้อง ม.1/1 ให้
[ทำงานต่อทันที]
```

---

## กฎสำคัญ (อ่านก่อนใช้งาน)

1. **ห้ามตอบ "ไม่เข้าใจ"** ถ้ายังไม่ได้ลอง decode ผ่าน mapping นี้
2. **ห้ามแก้ข้อความใน code/file ของ user** เพราะดู gibberish — โค้ด/identifier/path คงไว้ตามเดิม decode เฉพาะ message ที่ user คุยใน chat เท่านั้น
3. **เมื่อ decode สำเร็จ → ทำงานต่อทันที** ไม่ต้องเสียเวลาถาม "ใช่ไหม" ทุกครั้ง — ระบุแค่บรรทัดเดียวว่าเข้าใจว่าอะไร
4. **ถ้า partial decode** (บางส่วนเป็นไทยปนกับ technical term ภาษาอังกฤษ เช่น component, deploy, API) → decode เฉพาะส่วนไทย คงคำเทคนิคไว้
5. **ถ้า decoded ขัดแย้งกับ context ก่อนหน้า** → ใช้ context decide เช่น user เพิ่งคุยเรื่อง deploy อยู่ → decode ที่ออกมาเป็น "เดือย" → น่าจะหมายถึง "deploy" ตัวเดิม
6. **ห้ามแอบเรียก script/tool decode** — ใช้ mapping นี้ในหัวพอ ทำงานเร็วกว่า

---

## False Positive Guards (อย่า decode พวกนี้)

ห้าม decode ถ้าเป็น:
- File path: `c:\projects\kksm\src\App.tsx`
- Variable / function name: `getUserMenuList`, `useMenuAdmin`
- Regex / glob: `**/*.tsx`, `[a-z]+`
- Hash / token / id: `13badb9d223a99d24426...`, `appwrite_key_xxx`
- Code block ที่ user แปะมา (อยู่ใน triple backtick)
- คำอังกฤษทั่วไปที่อ่านได้: `hello world`, `please help`

ลักษณะที่บ่งบอกว่าเป็น Kedmanee misinput:
- มี `;` หรือ `'` ปนใน "คำ" (อังกฤษไม่มี)
- ตัวเลขอยู่กลางคำ (`yo0yo` แทน `จัน`)
- มี `[` `]` `/` ปนกับ alphabet โดยไม่ใช่ regex/path
- ความถี่ vowel/consonant ของ ASCII ไม่ match กับภาษาอังกฤษ

---

## Edge Cases

### Caps Lock เปิดอยู่
ถ้า decode ตรงตัวได้ผลเป็น `ฤฆฏโฌ` (Shift row) ทั้งคำ → user น่าจะเปิด Caps Lock ลอง decode แบบ lower case แทน

### macOS / Pattachote layout
Skill นี้รองรับเฉพาะ **Kedmanee** (มาตรฐาน 90%+ ของผู้ใช้ไทย) ถ้า decode แล้วไม่ออก ลองสันนิษฐานว่าอาจเป็น Pattachote — ถามใจ user ว่าใช้ layout ไหน

### Mixed message (ไทย + ASCII กึ่งหนึ่ง)
ตัวอย่าง: `เปิดเมนู ly;lfu` → "เปิดเมนู สวัสดี"
ส่วนที่เป็นไทยอยู่แล้วคงไว้ ตัด ASCII gibberish ไป decode แยก

### ตัวอย่างที่อาจเข้าใจผิด
- `ขอ status` ← ASCII "status" คือคำอังกฤษจริง อย่า decode
- `;k,]vd` ← decode = "วาม,ลือก" ไม่ออก → อาจไม่ใช่ misinput

---

## Verification Checklist

ก่อนตอบ user ที่พิมพ์ผิด layout ให้ check:
- [ ] decode ออกมาเป็นภาษาไทยที่อ่านรู้เรื่องไหม
- [ ] ใจความเข้ากับ context ของบทสนทนาก่อนหน้าไหม
- [ ] ถ้า ambiguous ได้แสดงทางเลือกให้ user แล้วไหม
- [ ] ไม่ได้ decode สิ่งที่เป็น code/path/identifier
- [ ] ตอบกลับเป็นภาษาไทยตาม project policy

---

## Related
- `.github/copilot-instructions.md` (project communication policy)
- `.kiro/steering/project-instructions.md` (Communication Language section)
- `.kiro/steering/thai-keyboard-decode.md` (**always-on** steering ที่มี mapping ย่อ — ทำให้ AI decode ได้ทุก message โดยไม่ต้องโหลด skill นี้ก่อน)

## Lessons Learned (จาก session จริง)

1. **Skill อย่างเดียวไม่พอ** — ถ้า AI ไม่ได้โหลด skill ก่อน จะไม่รู้ว่าต้อง decode → ต้องมี steering (always-on) คู่กัน
2. **AI อาจตอบ empty/dot** ถ้าไม่มี instruction ชัดเจนว่า "ห้ามเงียบ" → steering ต้องระบุชัดว่าห้ามตอบ "." หรือ empty
3. **User พิมพ์ผิดซ้อนผิด** (ผิด layout + typo) เป็นเรื่องปกติ → AI ต้องเดาจาก context ไม่ใช่ mechanical map อย่างเดียว
4. **ถ้า AI ตัวอื่นจะใช้** ต้อง copy mapping ไปวางใน system prompt ของ AI นั้น — skill/steering ไม่ข้าม platform

## Reference (ของจริงในเน็ต)
- [pawitp/thai2eng](https://pawitp.github.io/) — JS converter
- [thencon (PyPI)](https://www.pypi.org/project/thencon) — Python converter
- [dspinellis/kbd-layout-fix](https://github.com/dspinellis/kbd-layout-fix) — auto-correct
- ใช้เป็น reference ตรวจ mapping เท่านั้น **ไม่ต้องติดตั้งจริง** เพราะ AI decode ได้จาก table ในไฟล์นี้
