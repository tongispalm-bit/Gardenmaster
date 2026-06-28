# Thai Keyboard Misinput Auto-Decoder (Always Active)

> **CRITICAL:** ไฟล์นี้ถูก include ทุก session เพื่อให้ AI สามารถ decode ข้อความที่ user พิมพ์ไทยผิด layout ได้ทันที โดยไม่ต้องโหลด skill ก่อน

## เมื่อเห็น ASCII Gibberish → ลอง Decode ทันที

ถ้า user พิมพ์ข้อความที่:
- มี `;` `'` `[` `]` `/` `0-9` **ปนกลางคำ** แบบไม่มี space
- ไม่ใช่ file path, variable name, code block
- ดูเป็น gibberish แต่ไม่ใช่คำอังกฤษ

→ **ลอง decode ด้วย Kedmanee mapping ทันที** ก่อนตอบว่า "ไม่เข้าใจ"

## Kedmanee → QWERTY Quick Map

```
แถว QWERTY: q→ๆ w→ไ e→ำ r→พ t→ะ y→ั u→ี i→ร o→น p→ย [→บ ]→ล
แถว ASDF:   a→ฟ s→ห d→ก f→ด g→เ h→้ j→่ k→า l→ส ;→ว '→ง
แถว ZXCV:   z→ผ x→ป c→แ v→อ b→ิ n→ื m→ท ,→ม .→ใ /→ฝ
ตัวเลข:     1→ๅ 2→/ 3→- 4→ภ 5→ถ 6→ุ 7→ึ 8→ค 9→ต 0→จ -→ข =→ช
```

## กฎการใช้งาน

1. **Decode แล้วทำงานต่อทันที** — ไม่ต้องถาม confirm
2. **ทวนความเข้าใจ 1 บรรทัด** แล้วทำงานต่อ
3. **ห้ามตอบว่า "ไม่เข้าใจ"** ถ้ายังไม่ได้ลอง decode
4. **ห้ามตอบเงียบหรือ empty response**

## ตัวอย่างเร็ว

```
User: ly;lfu → "สวัสดี"
User: gxbf → "เปิด"
User: ;yo → "วัน"
User: 0yomiN= → "จันทร์ช" (เศษตัด)
```

## False Positive (อย่า decode)

- ❌ `getUserList` — variable name
- ❌ `c:\src\app.tsx` — file path
- ❌ `**/*.tsx` — glob pattern
- ❌ ` ```code``` ` — code block
- ✅ `ly;lfu` — gibberish ที่มี `;` กลางคำ → decode!
- ✅ `0yomiN=` — gibberish ที่มีตัวเลขปน → decode!

---

**กฎสุดท้าย:** ถ้าเห็น ASCII แปลกๆ → ลอง decode ก่อน แล้วค่อยตัดสินใจว่าเป็นไทยหรือไม่  
ถ้า decode แล้วเป็นภาษาไทยที่อ่านรู้เรื่อง → **ทำงานต่อทันที ไม่ต้องถาม**
