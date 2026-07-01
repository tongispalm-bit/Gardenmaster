'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards,
  MEDICINE_UNIT_LABEL,
  isDurianFarm,
  type Orchard,
  type MedicineCategory,
  type MedicineUnit,
} from '@/lib/firebase';
import { Plus, Trash2, Pencil, X, Camera, Flame, Snowflake, ChevronLeft, ChevronRight, Calendar, type LucideIcon } from 'lucide-react';
import SubPageHeader from '../../_components/SubPageHeader';
import StockImageModal from './StockImageModal';

// ── Generic shape ที่ Medicine และ Nutrient ใช้ร่วมกัน ──
export type StockItem = {
  id: string;
  orchardId: string;
  category: MedicineCategory;
  name: string;
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

export type StockApi<T extends StockItem = StockItem> = {
  list: (orchardId: string) => Promise<T[]>;
  add: (record: Omit<T, 'id'>) => Promise<string>;
  update: (id: string, data: Partial<Omit<T, 'id'>>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const EMPTY_FORM = {
  category: 'hot' as MedicineCategory,
  name: '',
  formula: '',
  amount: '',
  unit: 'liter' as MedicineUnit,
  group: 1,
  groupText: '', // สำหรับโหมดกรอกข้อมูลเอง
  price: '',
  purchaseDate: new Date().toISOString().split('T')[0],
  photos: [] as string[],
  note: '',
};

// สีของแต่ละกลุ่มยา 1-9
type GroupColor = {
  bg: string;        // พื้นหลัง section header (light)
  bgDark: string;    // พื้นหลัง section header (dark)
  border: string;    // border
  borderDark: string;
  text: string;      // ตัวอักษร "กลุ่ม X"
  textDark: string;
  iconBg: string;    // พื้นหลัง icon ในการ์ด (เมื่อไม่มีรูป)
  iconBgDark: string;
  iconText: string;
  iconTextDark: string;
};

const GROUP_COLORS: Record<number, GroupColor> = {
  0: { bg: 'bg-slate-50',   bgDark: 'dark:bg-slate-900/40',   border: 'border-slate-200',   borderDark: 'dark:border-slate-700',   text: 'text-slate-600',   textDark: 'dark:text-slate-400',   iconBg: 'bg-slate-100',   iconBgDark: 'dark:bg-slate-800',     iconText: 'text-slate-500',   iconTextDark: 'dark:text-slate-400' },
  1: { bg: 'bg-rose-50',    bgDark: 'dark:bg-rose-900/20',    border: 'border-rose-200',    borderDark: 'dark:border-rose-800',    text: 'text-rose-700',    textDark: 'dark:text-rose-400',    iconBg: 'bg-rose-100',    iconBgDark: 'dark:bg-rose-900/30',    iconText: 'text-rose-600',    iconTextDark: 'dark:text-rose-400' },
  2: { bg: 'bg-orange-50',  bgDark: 'dark:bg-orange-900/20',  border: 'border-orange-200',  borderDark: 'dark:border-orange-800',  text: 'text-orange-700',  textDark: 'dark:text-orange-400',  iconBg: 'bg-orange-100',  iconBgDark: 'dark:bg-orange-900/30',  iconText: 'text-orange-600',  iconTextDark: 'dark:text-orange-400' },
  3: { bg: 'bg-amber-50',   bgDark: 'dark:bg-amber-900/20',   border: 'border-amber-200',   borderDark: 'dark:border-amber-800',   text: 'text-amber-700',   textDark: 'dark:text-amber-400',   iconBg: 'bg-amber-100',   iconBgDark: 'dark:bg-amber-900/30',   iconText: 'text-amber-600',   iconTextDark: 'dark:text-amber-400' },
  4: { bg: 'bg-lime-50',    bgDark: 'dark:bg-lime-900/20',    border: 'border-lime-200',    borderDark: 'dark:border-lime-800',    text: 'text-lime-700',    textDark: 'dark:text-lime-400',    iconBg: 'bg-lime-100',    iconBgDark: 'dark:bg-lime-900/30',    iconText: 'text-lime-600',    iconTextDark: 'dark:text-lime-400' },
  5: { bg: 'bg-emerald-50', bgDark: 'dark:bg-emerald-900/20', border: 'border-emerald-200', borderDark: 'dark:border-emerald-800', text: 'text-emerald-700', textDark: 'dark:text-emerald-400', iconBg: 'bg-emerald-100', iconBgDark: 'dark:bg-emerald-900/30', iconText: 'text-emerald-600', iconTextDark: 'dark:text-emerald-400' },
  6: { bg: 'bg-teal-50',    bgDark: 'dark:bg-teal-900/20',    border: 'border-teal-200',    borderDark: 'dark:border-teal-800',    text: 'text-teal-700',    textDark: 'dark:text-teal-400',    iconBg: 'bg-teal-100',    iconBgDark: 'dark:bg-teal-900/30',    iconText: 'text-teal-600',    iconTextDark: 'dark:text-teal-400' },
  7: { bg: 'bg-sky-50',     bgDark: 'dark:bg-sky-900/20',     border: 'border-sky-200',     borderDark: 'dark:border-sky-800',     text: 'text-sky-700',     textDark: 'dark:text-sky-400',     iconBg: 'bg-sky-100',     iconBgDark: 'dark:bg-sky-900/30',     iconText: 'text-sky-600',     iconTextDark: 'dark:text-sky-400' },
  8: { bg: 'bg-indigo-50',  bgDark: 'dark:bg-indigo-900/20',  border: 'border-indigo-200',  borderDark: 'dark:border-indigo-800',  text: 'text-indigo-700',  textDark: 'dark:text-indigo-400',  iconBg: 'bg-indigo-100',  iconBgDark: 'dark:bg-indigo-900/30',  iconText: 'text-indigo-600',  iconTextDark: 'dark:text-indigo-400' },
  9: { bg: 'bg-purple-50',  bgDark: 'dark:bg-purple-900/20',  border: 'border-purple-200',  borderDark: 'dark:border-purple-800',  text: 'text-purple-700',  textDark: 'dark:text-purple-400',  iconBg: 'bg-purple-100',  iconBgDark: 'dark:bg-purple-900/30',  iconText: 'text-purple-600',  iconTextDark: 'dark:text-purple-400' },
};

type CategoryOption = {
  value: string;
  label: string;
  icon?: string;
  /** สี active: ใช้ tailwind class ของกลุ่ม (rose, sky, emerald ฯลฯ) */
  color: string;
  /** กำหนดหน่วยปริมาณ override (เช่น ปุ๋ยเคมี → kg) */
  unit?: MedicineUnit;
};

type Props = {
  api: StockApi;
  title: string;
  Icon: LucideIcon;
  accent: 'rose' | 'emerald';
  /** ตัวเลือกประเภทใน popup (ค่า default: ยาร้อน/ยาเย็น) */
  categories?: CategoryOption[];
  /** label ของช่อง category (default: "ประเภท") */
  categoryLabel?: string;
  /** label ของฟิลด์ชื่อ (default: "ชื่อยา") */
  nameLabel?: string;
  /** placeholder ของฟิลด์ชื่อ */
  namePlaceholder?: string;
  /** จำนวน column ของปุ่ม category */
  categoryCols?: 2 | 3;
  /** แสดงฟิลด์ "สูตร" (เช่น 15-15-15) */
  showFormula?: boolean;
  /** สูตรมาตรฐานให้เลือก (datalist) */
  formulaOptions?: string[];
  /** แสดงฟิลด์ "กลุ่ม 1-9" */
  showGroup?: boolean;
  /** label ของช่องกลุ่ม (default: "กลุ่มยา") */
  groupLabel?: string;
  /** ถ้าระบุ → แสดงเป็น dropdown แทน 9 ปุ่ม + ใช้รายการนี้แทนเลข 1-9 */
  groupOptions?: { value: number; label: string }[];
  /** โหมดการกรอกกลุ่ม: 'buttons' (ปุ่ม 9 กลุ่ม) หรือ 'text' (กรอกข้อมูลเอง) */
  groupInputMode?: 'buttons' | 'text';
  /** จำกัดหน่วยปริมาณใน dropdown (default: ทั้งหมด ลิตร/ซีซี/กิโล/กรัม) */
  unitOptions?: MedicineUnit[];
};

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { value: 'hot',  label: 'ยาร้อน', icon: '🔥', color: 'rose' },
  { value: 'cold', label: 'ยาเย็น', icon: '❄️', color: 'sky' },
];

const ACCENT_CLASSES = {
  rose: {
    spinner: 'border-rose-500',
    primaryBg: 'bg-rose-500 hover:bg-rose-600',
    headerBg: 'bg-rose-50 dark:bg-rose-900/20',
    headerText: 'text-rose-700 dark:text-rose-400',
    ring: 'ring-rose-500',
  },
  emerald: {
    spinner: 'border-emerald-500',
    primaryBg: 'bg-emerald-500 hover:bg-emerald-600',
    headerBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    headerText: 'text-emerald-700 dark:text-emerald-400',
    ring: 'ring-emerald-500',
  },
};

export default function StockListClient({
  api,
  title,
  Icon,
  accent,
  categories = DEFAULT_CATEGORIES,
  categoryLabel = 'ประเภท',
  nameLabel = 'ชื่อยา',
  namePlaceholder = 'เช่น แอบาเม็กติน, อะมิสตาร์...',
  categoryCols = 2,
  showFormula = false,
  formulaOptions = [],
  showGroup = true,
  groupLabel = 'กลุ่มยา',
  groupOptions,
  groupInputMode = 'buttons',
  unitOptions = ['liter', 'cc', 'kg', 'gram'],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';
  const a = ACCENT_CLASSES[accent];

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  const openLightbox = (images: string[], startIndex: number) => {
    setLightboxImages(images);
    setLightboxIndex(startIndex);
    setShowLightbox(true);
  };

  const [form, setForm] = useState(EMPTY_FORM);

  // อัปเดต default category เมื่อ categories เปลี่ยน (ตอน mount)
  useEffect(() => {
    setForm(prev => {
      // ถ้า prev.category ไม่ตรงกับ option ใดเลย → reset เป็นตัวแรก
      const valid = categories.some(c => c.value === prev.category);
      if (!valid && categories.length > 0) {
        return { ...prev, category: categories[0].value as MedicineCategory };
      }
      return prev;
    });
  }, [categories]);

  useEffect(() => {
    if (!orchardId) { router.push('/'); return; }
    loadData();
  }, [orchardId, api]);

  const loadData = async () => {
    try {
      const [orchards, data] = await Promise.all([
        getOrchards(),
        api.list(orchardId),
      ]);
      setOrchard(orchards.find(o => o.id === orchardId) || null);
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items;

  // จัดกลุ่มตาม group (1-9) หรือ groupText (ถ้าใช้โหมด text) แล้วเรียงจากกลุ่มน้อย → มาก
  const groupedItems = useMemo(() => {
    if (groupInputMode === 'text') {
      // จัดกลุ่มตาม groupText
      const map = new Map<string, StockItem[]>();
      for (const it of filteredItems) {
        const key = (it as StockItem & { groupText?: string }).groupText || 'ไม่ระบุกลุ่ม';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(it);
      }
      return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'th'));
    } else {
      // จัดกลุ่มตาม group number
      const map = new Map<number, StockItem[]>();
      for (const it of filteredItems) {
        if (!map.has(it.group)) map.set(it.group, []);
        map.get(it.group)!.push(it);
      }
      return Array.from(map.entries()).sort((a, b) => (a[0] as number) - (b[0] as number));
    }
  }, [filteredItems, groupInputMode]);

  // ชื่อยาที่เคยกรอกแล้ว (unique) — ใช้ใน datalist สำหรับเลือกเมื่อกรอกซ้ำ
  const existingNames = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) if (it.name) set.add(it.name);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [items]);

  // สูตรที่เคยกรอกแล้ว (unique) + สูตรมาตรฐาน — ใช้ใน datalist
  const allFormulaOptions = useMemo(() => {
    const set = new Set<string>(formulaOptions);
    for (const it of items) {
      const f = (it as StockItem & { formula?: string }).formula;
      if (f) set.add(f);
    }
    return Array.from(set);
  }, [items, formulaOptions]);

  // ── ยอดรวมรายจ่าย ──
  // เดือนนี้ / ปีนี้ / ทั้งหมด — คิดจาก price × จำนวนรายการ (ราคาต่อ 1 รายการ)
  // ใช้ purchaseDate (ถ้ามี) หรือ createdAt เป็นเกณฑ์เดือน/ปี
  const getRecordDate = (it: StockItem): Date => {
    if (it.purchaseDate) {
      const [y, m, d] = it.purchaseDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(it.createdAt);
  };

  const expenseSummary = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    let monthSum = 0;
    let yearSum = 0;
    let totalSum = 0;
    for (const it of items) {
      if (!it.price || it.price <= 0) continue;
      totalSum += it.price;
      const d = getRecordDate(it);
      if (d.getFullYear() === curYear) {
        yearSum += it.price;
        if (d.getMonth() === curMonth) monthSum += it.price;
      }
    }
    return { monthSum, yearSum, totalSum };
  }, [items]);

  const THAI_MONTHS = [
    'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
    'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.',
  ];
  const THAI_MONTHS_FULL = [
    'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
  ];
  const now = new Date();
  const curMonthLabel = `${THAI_MONTHS[now.getMonth()]} ${now.getFullYear() + 543}`;
  const curYearLabel = `ปี ${now.getFullYear() + 543}`;

  // ── ข้อมูลปฏิทิน ──
  // map: 'YYYY-MM-DD' → { sum: บาท, items: ยา[] }
  const calendarData = useMemo(() => {
    const m = new Map<string, { sum: number; items: StockItem[] }>();
    for (const it of items) {
      if (!it.price || it.price <= 0) continue;
      const d = getRecordDate(it);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const cur = m.get(key) ?? { sum: 0, items: [] };
      cur.sum += it.price;
      cur.items.push(it);
      m.set(key, cur);
    }
    return m;
  }, [items]);

  // ── สร้าง grid ปฏิทินสำหรับ calendarMonth ──
  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay(); // 0=อาทิตย์
    const daysInMonth = lastDay.getDate();
    // padding ก่อนวันที่ 1
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calendarMonth]);

  // sum ของเดือนปฏิทินที่กำลังดู
  const calendarMonthSum = useMemo(() => {
    let s = 0;
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    for (const it of items) {
      if (!it.price || it.price <= 0) continue;
      const d = getRecordDate(it);
      if (d.getFullYear() === year && d.getMonth() === month) s += it.price;
    }
    return s;
  }, [items, calendarMonth]);

  const goPrevMonth = () => { setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelectedDate(null); };
  const goNextMonth = () => { setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelectedDate(null); };
  const openCalendar = () => {
    setCalendarMonth(new Date()); // เปิดที่เดือนปัจจุบันเสมอ
    setSelectedDate(null);
    setShowCalendar(true);
  };

  const openNew = () => {
    // หา default unit จาก first category (ถ้ามี)
    const firstCat = categories[0];
    setForm({
      ...EMPTY_FORM,
      purchaseDate: new Date().toISOString().split('T')[0],
      category: (firstCat?.value as MedicineCategory) ?? 'hot',
      unit: firstCat?.unit ?? 'liter',
    });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (it: StockItem) => {
    setForm({
      category: it.category,
      name: it.name,
      formula: (it as StockItem & { formula?: string }).formula ?? '',
      amount: String(it.amount),
      unit: it.unit,
      group: it.group,
      groupText: (it as StockItem & { groupText?: string }).groupText ?? '',
      price: it.price !== undefined ? String(it.price) : '',
      purchaseDate: it.purchaseDate || new Date(it.createdAt).toISOString().split('T')[0],
      photos: it.photos ?? [],
      note: it.note ?? '',
    });
    setEditingId(it.id);
    setShowModal(true);
  };

  // แปลงไฟล์รูป 1 ไฟล์ → ย่อขนาด + เข้ารหัสเป็น WebP (fallback JPEG)
  const fileToWebp = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          try {
            let w = img.width;
            let h = img.height;
            const max = 600;
            if (w > max || h > max) {
              if (w > h) { h = (h * max) / w; w = max; }
              else { w = (w * max) / h; h = max; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(w);
            canvas.height = Math.round(h);
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) { reject(new Error('Canvas not supported')); return; }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            let dataUrl = canvas.toDataURL('image/webp', 0.8);
            if (!dataUrl.startsWith('data:image/webp')) {
              dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            }
            resolve(dataUrl);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('โหลดรูปไม่ได้'));
        img.src = ev.target?.result as string;
      };
      reader.onerror = () => reject(new Error('อ่านไฟล์ไม่ได้'));
      reader.readAsDataURL(file);
    });

  // Photo handler — ย่อขนาดและแปลงเป็น WebP ก่อนเก็บ
  const handlePhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    const remaining = 6 - form.photos.length;
    const toProcess = files.slice(0, remaining);
    if (toProcess.length === 0) { e.target.value = ''; return; }
    setProcessing(true);
    try {
      for (const file of toProcess) {
        try {
          const dataUrl = await fileToWebp(file);
          setForm(prev => ({ ...prev, photos: [...prev.photos, dataUrl] }));
        } catch (err) {
          console.error('แปลงรูปไม่สำเร็จ:', err);
          alert('❌ ไม่สามารถประมวลผลรูปได้\nลองรูปอื่นหรือเปลี่ยนเบราว์เซอร์');
        }
      }
    } finally {
      setProcessing(false);
      e.target.value = '';
    }
  };

  const removePhoto = (idx: number) => {
    setForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      alert(`กรุณากรอก${nameLabel}`);
      return;
    }
    const amountNum = Number(form.amount);
    if (!form.amount || isNaN(amountNum) || amountNum <= 0) {
      alert('กรุณากรอกปริมาณให้ถูกต้อง');
      return;
    }
    setSaving(true);
    try {
      const now = Date.now();
      const priceNum = form.price ? Number(form.price) : undefined;
      if (form.price && (isNaN(priceNum!) || priceNum! < 0)) {
        alert('กรุณากรอกราคาให้ถูกต้อง');
        setSaving(false);
        return;
      }
      const payload = {
        orchardId,
        category: form.category,
        name: form.name.trim(),
        ...(showFormula && form.formula.trim() ? { formula: form.formula.trim() } : {}),
        amount: amountNum,
        unit: form.unit,
        group: Number(form.group),
        ...(groupInputMode === 'text' && form.groupText.trim() ? { groupText: form.groupText.trim() } : {}),
        price: priceNum,
        purchaseDate: form.purchaseDate,
        photos: form.photos,
        note: form.note.trim(),
        updatedAt: now,
      };
      if (editingId) {
        await api.update(editingId, payload);
      } else {
        await api.add({ ...payload, createdAt: now });
      }
      await loadData();
      closeModal();
    } catch (e) {
      console.error(e);
      alert('บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ลบรายการนี้?')) return;
    await api.remove(id);
    await loadData();
  };

  if (!orchard || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${a.spinner}`}></div>
      </div>
    );
  }

  // helper render การ์ดรายการ — ใช้ทั้งโหมด group และ flat
  const renderItemCard = (it: StockItem, gc: typeof GROUP_COLORS[1]) => {
    const formula = (it as StockItem & { formula?: string }).formula;
    return (
      <div
        key={it.id}
        className={`bg-white dark:bg-slate-800 rounded-2xl p-3 ${
          showGroup ? `border-l-4 ${gc.border.replace('border-', 'border-l-')} border-y border-r border-slate-200 dark:border-slate-700` : 'border border-slate-200 dark:border-slate-700'
        } flex items-center gap-3`}
      >
        {it.photos && it.photos.length > 0 ? (
          <button
            type="button"
            onClick={() => openLightbox(it.photos || [], 0)}
            className="w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 hover:ring-2 hover:ring-amber-400 transition-all cursor-pointer"
          >
            <img
              src={it.photos[0]}
              alt={it.name}
              className="w-full h-full object-cover"
            />
          </button>
        ) : (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            showGroup
              ? `${gc.iconBg} ${gc.iconBgDark} ${gc.iconText} ${gc.iconTextDark}`
              : (() => {
                  const cat = categories.find(c => c.value === it.category);
                  return cat
                    ? `bg-${cat.color}-100 dark:bg-${cat.color}-900/30 text-${cat.color}-600 dark:text-${cat.color}-400`
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600';
                })()
          }`}>
            <Icon size={20} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-slate-800 dark:text-white text-sm">{it.name}</p>
            {formula && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                {formula}
              </span>
            )}
            {(() => {
              const cat = categories.find(c => c.value === it.category);
              if (!cat) return null;
              return (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 bg-${cat.color}-100 dark:bg-${cat.color}-900/30 text-${cat.color}-600 dark:text-${cat.color}-400`}>
                  {cat.icon && <span className="text-[10px]">{cat.icon}</span>}
                  {cat.label}
                </span>
              );
            })()}
            {it.photos && it.photos.length > 1 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                +{it.photos.length - 1} รูป
              </span>
            )}
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
            {it.amount} {MEDICINE_UNIT_LABEL[it.unit]}
            {it.price !== undefined && it.price > 0 && (
              <>
                <span className="text-slate-400 mx-1">·</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  ฿{it.price.toLocaleString('th-TH')}
                </span>
              </>
            )}
          </p>
          {it.note && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 italic mt-0.5 truncate">{it.note}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => openEdit(it)}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            title="แก้ไข"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => handleDelete(it.id)}
            className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100"
            title="ลบ"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-8 overflow-x-clip">
      <SubPageHeader
        orchardName={orchard.name}
        orchardColor={orchard.color}
        orchardIcon={orchard.icon}
        orchardId={orchardId}
        isDurianBackyard={isDurianFarm(orchard.name)}
        title={title}
        Icon={Icon}
      />

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-3">
        {/* ── ยอดรวมรายจ่าย ── */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={openCalendar}
            className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 text-left active:scale-95 transition-transform hover:border-amber-400"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{curMonthLabel}</p>
              <Calendar size={12} className="text-amber-500" />
            </div>
            <p className="text-base font-extrabold text-amber-600 dark:text-amber-400">
              ฿{expenseSummary.monthSum.toLocaleString('th-TH')}
            </p>
          </button>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">{curYearLabel}</p>
            <p className="text-base font-extrabold text-orange-600 dark:text-orange-400">
              ฿{expenseSummary.yearSum.toLocaleString('th-TH')}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">รวมทั้งหมด</p>
            <p className="text-base font-extrabold text-rose-600 dark:text-rose-400">
              ฿{expenseSummary.totalSum.toLocaleString('th-TH')}
            </p>
          </div>
        </div>

        {/* ปุ่มเพิ่ม → เปิด popup */}
        <button
          onClick={openNew}
          className={`w-full py-3 ${a.primaryBg} text-white rounded-2xl font-bold flex items-center justify-center gap-2`}
        >
          <Plus size={18} /> เพิ่ม{title}ใหม่
        </button>

        {/* รายการยา */}
        <h2 className="font-bold text-slate-800 dark:text-white text-sm pt-2">
          รายการ ({filteredItems.length})
        </h2>

        {filteredItems.length === 0 ? (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400 text-sm">
            ยังไม่มีรายการ
          </div>
        ) : showGroup ? (
          // ── โหมดแบ่งกลุ่ม 1-9 ──
          <div className="space-y-4">
            {groupedItems.map(([groupNum, list]) => {
              const gc = GROUP_COLORS[groupNum] ?? GROUP_COLORS[1];
              const groupName = groupOptions?.find(g => g.value === groupNum)?.label ?? `กลุ่ม ${groupNum}`;
              return (
                <div key={groupNum} className="space-y-2">
                  {/* Header กลุ่ม — สีตามกลุ่ม */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${gc.bg} ${gc.bgDark} border ${gc.border} ${gc.borderDark}`}>
                    <span className={`text-xs font-extrabold ${gc.text} ${gc.textDark}`}>
                      {groupName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">·</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{list.length} รายการ</span>
                  </div>

                  {/* รายการในกลุ่ม */}
                  <div className="space-y-2">
                    {list.map(it => renderItemCard(it, gc))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // ── โหมด flat list (ไม่แบ่งกลุ่ม) ──
          <div className="space-y-2">
            {filteredItems.map(it => renderItemCard(it, GROUP_COLORS[1]))}
          </div>
        )}
      </div>

      {/* ── Popup Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 ${a.headerBg}`}>
              <h2 className={`font-bold ${a.headerText}`}>
                {editingId ? `แก้ไข${title}` : `เพิ่ม${title}ใหม่`}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* 1. วันที่ซื้อ */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  วันที่ซื้อ
                </label>
                <input
                  type="date"
                  value={form.purchaseDate}
                  onChange={e => setForm({ ...form, purchaseDate: e.target.value })}
                  className={`w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ${a.ring} text-slate-800 dark:text-white text-sm`}
                />
              </div>

              {/* 2. ประเภท / วัตถุประสงค์ — render จาก categories prop */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{categoryLabel}</label>
                {categories.length === 1 && categories[0].value === 'purpose' ? (
                  // โหมดกรอกวัตถุประสงค์เอง (text field)
                  <input
                    type="text"
                    value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    placeholder="เช่น ป้องกันโรค, เพิ่มจุลินทรีย์ในดิน..."
                    className={`w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ${a.ring} text-slate-800 dark:text-white text-sm`}
                  />
                ) : (
                  // โหมดปุ่ม toggle
                  <div className={`grid gap-2 ${
                    categoryCols === 3 ? 'grid-cols-3' : categoryCols === 1 ? 'grid-cols-1' : 'grid-cols-2'
                  }`}>
                    {categories.map(opt => {
                      const isActive = form.category === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            // ถ้า category นี้กำหนด unit override → set unit ให้ด้วย
                            setForm(prev => ({
                              ...prev,
                              category: opt.value as MedicineCategory,
                              ...(opt.unit ? { unit: opt.unit } : {}),
                            }));
                          }}
                          className={`py-2.5 px-2 rounded-xl font-bold text-xs border-2 flex items-center justify-center gap-1 transition-all ${
                            isActive
                              ? `bg-${opt.color}-50 dark:bg-${opt.color}-900/30 text-${opt.color}-600 dark:text-${opt.color}-400 border-${opt.color}-400`
                              : 'bg-slate-50 dark:bg-slate-700 text-slate-500 border-transparent'
                          }`}
                        >
                          {opt.icon && <span>{opt.icon}</span>}
                          <span className="leading-tight">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. ชื่อ — เลือกจากที่เคยกรอกหรือพิมพ์ใหม่ */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {nameLabel} <span className="text-red-500">*</span>
                  {existingNames.length > 0 && (
                    <span className="ml-1 font-normal text-slate-400">
                      (เลือกจากรายการ {existingNames.length} ชื่อ หรือพิมพ์ใหม่)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  list={`stock-names-${title}`}
                  value={form.name}
                  onChange={e => {
                    const newName = e.target.value;
                    // ถ้าเลือกชื่อที่เคยมี → autofill ฟิลด์อื่นจาก record ล่าสุด
                    const matched = items.find(it => it.name === newName);
                    if (matched) {
                      setForm(prev => ({
                        ...prev,
                        name: newName,
                        category: matched.category,
                        unit: matched.unit,
                        group: matched.group,
                        price: matched.price !== undefined ? String(matched.price) : prev.price,
                        formula: (matched as StockItem & { formula?: string }).formula ?? prev.formula,
                      }));
                    } else {
                      setForm(prev => ({ ...prev, name: newName }));
                    }
                  }}
                  placeholder={namePlaceholder}
                  className={`w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ${a.ring} text-slate-800 dark:text-white text-sm`}
                />
                <datalist id={`stock-names-${title}`}>
                  {existingNames.map(n => <option key={n} value={n} />)}
                </datalist>
              </div>

              {/* สูตร — แสดงเฉพาะหน้าปุ๋ย (เลือกจากสูตรมาตรฐาน หรือพิมพ์ใหม่) */}
              {showFormula && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    สูตร
                    {allFormulaOptions.length > 0 && (
                      <span className="ml-1 font-normal text-slate-400">
                        (เลือกจากรายการ {allFormulaOptions.length} สูตร หรือพิมพ์ใหม่)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    list={`stock-formulas-${title}`}
                    value={form.formula}
                    onChange={e => setForm({ ...form, formula: e.target.value })}
                    placeholder="เช่น 15-15-15, 25-7-7"
                    className={`w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ${a.ring} text-slate-800 dark:text-white text-sm`}
                  />
                  <datalist id={`stock-formulas-${title}`}>
                    {allFormulaOptions.map(f => <option key={f} value={f} />)}
                  </datalist>
                </div>
              )}

              {/* ปริมาณ + หน่วย */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    ปริมาณ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0"
                    className={`w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ${a.ring} text-slate-800 dark:text-white text-sm`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">หน่วย</label>
                  <select
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value as MedicineUnit })}
                    className={`w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ${a.ring} text-slate-800 dark:text-white text-sm`}
                  >
                    {unitOptions.map(u => (
                      <option key={u} value={u}>{MEDICINE_UNIT_LABEL[u]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* กลุ่มยา — รองรับ 3 โหมด: dropdown, ปุ่ม 9 กลุ่ม, หรือ text input (ซ่อนถ้า showGroup=false) */}
              {showGroup && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{groupLabel}</label>
                  {groupOptions ? (
                    <select
                      value={form.group}
                      onChange={e => setForm({ ...form, group: Number(e.target.value) })}
                      className={`w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ${a.ring} text-slate-800 dark:text-white text-sm`}
                    >
                      {groupOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : groupInputMode === 'text' ? (
                    <input
                      type="text"
                      value={form.groupText}
                      onChange={e => setForm({ ...form, groupText: e.target.value })}
                      placeholder="กรอกชื่อกลุ่มยา เช่น กลุ่ม A, ยาฉีดพ่น..."
                      className={`w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ${a.ring} text-slate-800 dark:text-white text-sm`}
                    />
                  ) : (
                    <div className="grid grid-cols-9 gap-1 mb-2">
                      {Array.from({ length: 9 }, (_, i) => i + 1).map(n => {
                        const gc = GROUP_COLORS[n];
                        const isActive = form.group === n;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setForm({ ...form, group: n })}
                            className={`aspect-square rounded-lg text-xs font-extrabold border-2 transition-all ${gc.bg} ${gc.bgDark} ${gc.text} ${gc.textDark} ${
                              isActive
                                ? `${gc.border} ${gc.borderDark} scale-110 shadow`
                                : 'border-transparent opacity-50 hover:opacity-100'
                            }`}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ราคา */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  ราคา (บาท)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    placeholder="0.00"
                    className={`w-full p-3 pr-12 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ${a.ring} text-slate-800 dark:text-white text-sm`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 dark:text-slate-400">
                    บาท
                  </span>
                </div>
              </div>

              {/* รูปภาพ */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  รูปภาพ ({form.photos.length}/6)
                  {processing && <span className="ml-1 font-normal text-amber-500">กำลังแปลงรูป...</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {form.photos.map((p, i) => (
                    <div key={i} className="relative w-16 h-16">
                      <img src={p} alt="" className="w-full h-full object-cover rounded-xl border border-slate-200 dark:border-slate-600" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {form.photos.length < 6 && (
                    <>
                      {/* ถ่ายรูป (เปิดกล้องบนมือถือ) */}
                      <label className={`w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400 hover:border-${accent}-400 hover:text-${accent}-400 transition-colors ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <Camera size={18} />
                        <span className="text-[9px] mt-0.5">ถ่ายรูป</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          disabled={processing}
                          className="hidden"
                          onChange={handlePhotos}
                        />
                      </label>
                      {/* อัพโหลดจากแกลเลอรี่ */}
                      <label className={`w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400 hover:border-${accent}-400 hover:text-${accent}-400 transition-colors ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <Plus size={18} />
                        <span className="text-[9px] mt-0.5">อัพโหลด</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={processing}
                          className="hidden"
                          onChange={handlePhotos}
                        />
                      </label>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                  💡 รูปถูกย่อเหลือ 600px และแปลงเป็น WebP อัตโนมัติ (สูงสุด 6 รูป)
                </p>
              </div>

              {/* หมายเหตุ — ซ่อนถ้าใช้โหมดวัตถุประสงค์ (เพราะใช้ note เป็นวัตถุประสงค์แล้ว) */}
              {!(categories.length === 1 && categories[0].value === 'purpose') && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">หมายเหตุ</label>
                  <input
                    type="text"
                    value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    placeholder="เพิ่มเติม..."
                    className={`w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ${a.ring} text-slate-800 dark:text-white text-sm`}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving || processing}
                  className={`flex-1 py-3 ${a.primaryBg} disabled:opacity-50 text-white rounded-xl font-bold text-sm`}
                >
                  {saving ? 'กำลังบันทึก...' : processing ? 'กำลังแปลงรูป...' : editingId ? 'บันทึกการแก้ไข' : 'บันทึก'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Calendar Popup ── */}
      {showCalendar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCalendar(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 ${a.headerBg}`}>
              <button onClick={goPrevMonth} className={`p-1.5 rounded-lg hover:bg-white/40 ${a.headerText}`}>
                <ChevronLeft size={20} />
              </button>
              <h2 className={`font-bold text-sm ${a.headerText}`}>
                {THAI_MONTHS_FULL[calendarMonth.getMonth()]} {calendarMonth.getFullYear() + 543}
              </h2>
              <button onClick={goNextMonth} className={`p-1.5 rounded-lg hover:bg-white/40 ${a.headerText}`}>
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* รวมเดือน */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">รวมเดือนนี้</p>
                <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                  ฿{calendarMonthSum.toLocaleString('th-TH')}
                </p>
              </div>

              {/* Weekday header */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d, i) => (
                  <div key={i} className={`text-[11px] font-bold py-1 ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400'}`}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarGrid.map((day, i) => {
                  if (day === null) return <div key={i} className="aspect-square" />;
                  const year = calendarMonth.getFullYear();
                  const month = calendarMonth.getMonth();
                  const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const cellData = calendarData.get(key);
                  const today = new Date();
                  const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                  const isSelected = selectedDate === key;
                  const dow = (i % 7);
                  const hasData = !!cellData;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => hasData && setSelectedDate(isSelected ? null : key)}
                      disabled={!hasData}
                      className={`aspect-square rounded-lg border flex flex-col items-center justify-center text-[10px] p-0.5 transition-all ${
                        isSelected
                          ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-500 ring-2 ring-amber-400 scale-105'
                          : hasData
                            ? `${a.headerBg} border-current ${a.headerText} font-bold cursor-pointer hover:scale-105`
                            : isToday
                              ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span className={`text-[11px] font-bold ${
                        isSelected
                          ? 'text-amber-700 dark:text-amber-300'
                          : hasData
                            ? a.headerText
                            : dow === 0
                              ? 'text-rose-500'
                              : dow === 6
                                ? 'text-blue-500'
                                : 'text-slate-700 dark:text-slate-200'
                      }`}>
                        {day}
                      </span>
                      {cellData && (
                        <span className={`text-[8px] font-bold leading-none mt-0.5 truncate w-full text-center ${
                          isSelected ? 'text-amber-700 dark:text-amber-300' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          ฿{cellData.sum >= 1000 ? `${(cellData.sum / 1000).toFixed(1)}K` : cellData.sum}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* รายละเอียดของวันที่เลือกเท่านั้น */}
              {selectedDate ? (
                <div className="space-y-2 pt-2">
                  {(() => {
                    const data = calendarData.get(selectedDate);
                    if (!data) return null;
                    const [, , d] = selectedDate.split('-');
                    return (
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                            วันที่ {Number(d)} {THAI_MONTHS[calendarMonth.getMonth()]}
                          </span>
                          <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                            ฿{data.sum.toLocaleString('th-TH')}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {data.items.map(it => (
                            <div key={it.id} className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 rounded-lg px-2.5 py-1.5">
                              <span className="truncate flex-1 text-slate-700 dark:text-slate-200">• {it.name}</span>
                              <span className="text-slate-500 dark:text-slate-400 ml-2 font-bold">
                                ฿{(it.price ?? 0).toLocaleString('th-TH')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-3 text-[11px] text-slate-400 dark:text-slate-500">
                  👆 แตะวันที่มีรายจ่าย เพื่อดูรายละเอียด
                </div>
              )}

              <button
                onClick={() => setShowCalendar(false)}
                className="w-full py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 text-sm"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {showLightbox && (
        <StockImageModal
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </div>
  );
}
