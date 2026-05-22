'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getOrchards,
  getWaterRecords, getFertilizerRecords, getSprayRecords,
  getOrchardStats, saveOrchardStats,
  DURIAN_GROWTH_STAGE_LABEL, GROWTH_STAGE_LABEL, MEDICINE_UNIT_LABEL, SPRAY_GROUP_LABEL,
  isDurianFarm, isMangosteenFarm,
  type Orchard, type WaterRecord, type FertilizerRecord, type SprayRecord,
} from '@/lib/firebase';
import {
  LeafIcon, Leaf, Bug, Droplets, Sprout,
  ChevronLeft, ChevronRight, X, Edit3, Check,
  Cloud, CloudRain, Sun as SunIcon, CloudSun, CloudDrizzle, AlertTriangle, MapPin,
} from 'lucide-react';
import SubPageHeader from '../_components/SubPageHeader';

const THAI_MONTHS_FULL = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
];

// พิกัดเริ่มต้น (จันทบุรี) — ใช้กรณีไม่ได้รับ geolocation
const DEFAULT_LAT = 12.6113;
const DEFAULT_LON = 102.1036;

type CareMenuItem = {
  id: string;
  path: string;
  label: string;
  Icon: typeof Droplets;
  iconBg: string;
  iconColor: string;
  borderColor: string;
};

const CARE_MENU: CareMenuItem[] = [
  {
    id: 'water', path: '/orchard/care/water', label: 'รดน้ำ',
    Icon: Droplets,
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-500',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  {
    id: 'fertilize', path: '/orchard/care/fertilize', label: 'ใส่ปุ๋ย',
    Icon: Leaf,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-500',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  {
    id: 'spray', path: '/orchard/care/spray', label: 'พ่นยา',
    Icon: Bug,
    iconBg: 'bg-orange-100 dark:bg-orange-900/40',
    iconColor: 'text-orange-500',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
  {
    id: 'durian-fruit', path: '/orchard/care/durian-fruit', label: 'ทำลูกทุเรียน',
    Icon: Sprout,
    iconBg: 'bg-lime-100 dark:bg-lime-900/40',
    iconColor: 'text-lime-600',
    borderColor: 'border-lime-200 dark:border-lime-800',
  },
];

/** ปรับ label "ทำลูกทุเรียน" → "ทำดอกมังคุด" สำหรับสวนมังคุด */
function getCareMenu(orchardName: string | undefined | null): CareMenuItem[] {
  if (orchardName === 'สวนมังคุด') {
    return CARE_MENU.map(m =>
      m.id === 'durian-fruit' ? { ...m, label: 'ทำดอกมังคุด' } : m
    );
  }
  return CARE_MENU;
}

// ── Weather types ──
type WeatherDay = {
  date: string;        // YYYY-MM-DD
  tMax: number;
  tMin: number;
  rainSum: number;     // mm
  rainProb: number;    // %
  code: number;        // WMO weather code
};

type WeatherData = {
  current: { temp: number; code: number; rainProb: number } | null;
  daily: WeatherDay[];
  source: 'gps' | 'default';
  fetchedAt: number;
};

// แปลง WMO code → ไอคอน + label
function weatherIcon(code: number): { Icon: typeof Cloud; color: string; label: string } {
  if (code === 0) return { Icon: SunIcon, color: 'text-amber-500', label: 'แดดจัด' };
  if (code <= 2) return { Icon: CloudSun, color: 'text-amber-400', label: 'แดดออก' };
  if (code === 3) return { Icon: Cloud, color: 'text-slate-400', label: 'มีเมฆมาก' };
  if (code >= 45 && code <= 48) return { Icon: Cloud, color: 'text-slate-400', label: 'หมอก' };
  if (code >= 51 && code <= 57) return { Icon: CloudDrizzle, color: 'text-sky-500', label: 'ฝนปรอย' };
  if (code >= 61 && code <= 67) return { Icon: CloudRain, color: 'text-blue-500', label: 'ฝนตก' };
  if (code >= 71 && code <= 77) return { Icon: Cloud, color: 'text-cyan-300', label: 'หิมะ' };
  if (code >= 80 && code <= 82) return { Icon: CloudRain, color: 'text-blue-600', label: 'ฝนซู่' };
  if (code >= 95) return { Icon: CloudRain, color: 'text-purple-500', label: 'พายุฝน' };
  return { Icon: Cloud, color: 'text-slate-400', label: '—' };
}

export default function CareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orchardId = searchParams.get('id') || '';

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [loading, setLoading] = useState(true);

  const [waterRecs, setWaterRecs] = useState<WaterRecord[]>([]);
  const [fertRecs, setFertRecs] = useState<FertilizerRecord[]>([]);
  const [sprayRecs, setSprayRecs] = useState<SprayRecord[]>([]);

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // จำนวนต้นมังคุด (กรอกเอง — เฉพาะสวนมังคุด)
  const [treeCount, setTreeCount] = useState<number>(0);
  const [editingTreeCount, setEditingTreeCount] = useState(false);
  const [treeCountInput, setTreeCountInput] = useState('');
  const [savingTreeCount, setSavingTreeCount] = useState(false);

  useEffect(() => {
    if (!orchardId) {
      router.push('/');
      return;
    }
    loadData();
    loadWeather();
  }, [orchardId]);

  const loadData = async () => {
    try {
      const [orchards, w, f, s, stats] = await Promise.all([
        getOrchards(),
        getWaterRecords(orchardId),
        getFertilizerRecords(orchardId),
        getSprayRecords(orchardId),
        getOrchardStats(orchardId),
      ]);
      setOrchard(orchards.find((o) => o.id === orchardId) || null);
      setWaterRecs(w);
      setFertRecs(f);
      setSprayRecs(s);
      const tc = stats?.treeCount ?? 0;
      setTreeCount(tc);
      setTreeCountInput(String(tc));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTreeCount = async () => {
    const n = Number(treeCountInput);
    if (Number.isNaN(n) || n < 0) {
      alert('กรุณากรอกตัวเลขที่ถูกต้อง');
      return;
    }
    setSavingTreeCount(true);
    try {
      await saveOrchardStats(orchardId, n);
      setTreeCount(n);
      setEditingTreeCount(false);
    } catch {
      alert('บันทึกไม่สำเร็จ');
    } finally {
      setSavingTreeCount(false);
    }
  };

  // ── โหลดสภาพอากาศจาก Open-Meteo ──
  const loadWeather = async () => {
    setWeatherLoading(true);
    const fetchFor = async (lat: number, lon: number, source: 'gps' | 'default') => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia/Bangkok&forecast_days=5`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('weather fetch failed');
      const data = await res.json();
      const daily: WeatherDay[] = (data.daily?.time ?? []).map((t: string, i: number) => ({
        date: t,
        tMax: data.daily.temperature_2m_max[i],
        tMin: data.daily.temperature_2m_min[i],
        rainSum: data.daily.precipitation_sum[i] ?? 0,
        rainProb: data.daily.precipitation_probability_max[i] ?? 0,
        code: data.daily.weather_code[i] ?? 0,
      }));
      setWeather({
        current: data.current ? {
          temp: data.current.temperature_2m,
          code: data.current.weather_code,
          rainProb: data.current.precipitation_probability ?? 0,
        } : null,
        daily,
        source,
        fetchedAt: Date.now(),
      });
    };

    try {
      // ลอง geolocation
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            fetchFor(pos.coords.latitude, pos.coords.longitude, 'gps')
              .catch(() => fetchFor(DEFAULT_LAT, DEFAULT_LON, 'default'))
              .finally(() => setWeatherLoading(false));
          },
          () => {
            fetchFor(DEFAULT_LAT, DEFAULT_LON, 'default')
              .catch(() => {})
              .finally(() => setWeatherLoading(false));
          },
          { timeout: 5000 }
        );
      } else {
        await fetchFor(DEFAULT_LAT, DEFAULT_LON, 'default');
        setWeatherLoading(false);
      }
    } catch {
      setWeatherLoading(false);
    }
  };

  // ── records by date ──
  const waterByDate = useMemo(() => {
    const m = new Map<string, WaterRecord[]>();
    for (const r of waterRecs) {
      if (!r.date) continue;
      if (!m.has(r.date)) m.set(r.date, []);
      m.get(r.date)!.push(r);
    }
    return m;
  }, [waterRecs]);

  const fertByDate = useMemo(() => {
    const m = new Map<string, FertilizerRecord[]>();
    for (const r of fertRecs) {
      if (!r.date) continue;
      if (!m.has(r.date)) m.set(r.date, []);
      m.get(r.date)!.push(r);
    }
    return m;
  }, [fertRecs]);

  const sprayByDate = useMemo(() => {
    const m = new Map<string, SprayRecord[]>();
    for (const r of sprayRecs) {
      if (!r.date) continue;
      if (!m.has(r.date)) m.set(r.date, []);
      m.get(r.date)!.push(r);
    }
    return m;
  }, [sprayRecs]);

  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calendarMonth]);

  const goPrevMonth = () => { setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelectedDate(null); };
  const goNextMonth = () => { setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelectedDate(null); };

  // ── คำแนะนำจากสภาพอากาศ ──
  const weatherAlert = useMemo(() => {
    if (!weather?.daily?.length) return null;
    const today = weather.daily[0];
    const tomorrow = weather.daily[1];

    // ฝนวันนี้ — งดพ่น/รดน้ำน้อย
    if (today.rainProb >= 60 || today.rainSum >= 5) {
      return {
        level: 'warning' as const,
        title: 'มีฝนวันนี้',
        message: `โอกาสฝน ${today.rainProb}% (${today.rainSum.toFixed(1)} มม.) — งดพ่นยา/พ่นปุ๋ย และอาจไม่ต้องรดน้ำ`,
      };
    }
    // ฝนพรุ่งนี้ — ระวังพ่นยา
    if (tomorrow && (tomorrow.rainProb >= 70 || tomorrow.rainSum >= 10)) {
      return {
        level: 'info' as const,
        title: 'พรุ่งนี้ฝนตก',
        message: `โอกาสฝนพรุ่งนี้ ${tomorrow.rainProb}% — เลี่ยงพ่นยาวันนี้ เพราะอาจถูกชะล้าง`,
      };
    }
    // อากาศร้อนจัด
    if (today.tMax >= 38) {
      return {
        level: 'warning' as const,
        title: 'อากาศร้อนจัด',
        message: `อุณหภูมิสูงสุด ${today.tMax.toFixed(0)}°C — เพิ่มการรดน้ำ และพ่นยาช่วงเช้า/เย็น`,
      };
    }
    // อากาศชื้น/เสี่ยงโรครา
    if (today.rainProb >= 30 && today.tMax >= 30 && today.tMax <= 36) {
      return {
        level: 'info' as const,
        title: 'อากาศชื้น',
        message: 'อุณหภูมิ + ความชื้นเหมาะแก่เชื้อรา — พิจารณาพ่นยาราป้องกัน',
      };
    }
    return null;
  }, [weather]);

  if (!orchard || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const isDurianBackyard = isDurianFarm(orchard.name);
  const isMango = isMangosteenFarm(orchard.name);
  const todayWeather = weather?.daily?.[0];
  const todayWmo = todayWeather ? weatherIcon(todayWeather.code) : null;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300 pb-8">
      {/* สวนมังคุด: ใช้ SubPageHeader ที่จะ render SubMenuTabs ต่อท้ายเองสำหรับสวนมังคุด */}
      <SubPageHeader
        orchardName={orchard.name}
        orchardColor={orchard.color}
        orchardId={orchardId}
        isDurianBackyard={isDurianBackyard}
        title={isMango ? 'สวนมังคุด' : 'การดูแล'}
        Icon={LeafIcon}
      />

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">

        {/* ── การ์ดจำนวนต้นมังคุด (เฉพาะสวนมังคุด) ── */}
        {isMango && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">จำนวนต้นมังคุดทั้งหมด</p>
                {editingTreeCount ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={treeCountInput}
                      onChange={e => setTreeCountInput(e.target.value)}
                      autoFocus
                      className="flex-1 min-w-0 p-2 bg-slate-50 dark:bg-slate-700 rounded-lg outline-none focus:ring-2 ring-purple-500 text-2xl font-extrabold text-purple-600 dark:text-purple-400"
                      placeholder="0"
                    />
                    <span className="text-sm font-bold text-slate-500">ต้น</span>
                  </div>
                ) : (
                  <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                    {treeCount.toLocaleString()} <span className="text-sm font-bold text-slate-500">ต้น</span>
                  </p>
                )}
              </div>
              {editingTreeCount ? (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={handleSaveTreeCount}
                    disabled={savingTreeCount}
                    className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingTreeCount(false);
                      setTreeCountInput(String(treeCount));
                    }}
                    disabled={savingTreeCount}
                    className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-400 rounded-lg disabled:opacity-50"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingTreeCount(true)}
                  className="p-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 text-purple-600 dark:text-purple-400 rounded-lg"
                  title="แก้ไขจำนวน"
                >
                  <Edit3 size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── การ์ดสภาพอากาศ ── */}
        <div className="bg-gradient-to-br from-sky-400 to-blue-500 dark:from-sky-600 dark:to-blue-700 rounded-xl p-3 text-white shadow-md">
          {weatherLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white/60" />
              <span className="text-xs">กำลังโหลดสภาพอากาศ...</span>
            </div>
          ) : !weather ? (
            <div className="flex items-center gap-2">
              <Cloud size={16} />
              <span className="text-xs">ไม่สามารถโหลดสภาพอากาศได้</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {todayWmo && (
                    <todayWmo.Icon size={32} className="text-white drop-shadow" />
                  )}
                  <div>
                    <p className="text-2xl font-extrabold leading-none">
                      {weather.current?.temp.toFixed(0) ?? todayWeather?.tMax.toFixed(0) ?? '—'}°
                      <span className="text-[11px] font-bold opacity-80 ml-0.5">C</span>
                    </p>
                    <p className="text-[10px] opacity-90 mt-0.5">{todayWmo?.label}</p>
                  </div>
                </div>
                <div className="text-right text-[10px] leading-tight space-y-0.5">
                  {todayWeather && (
                    <>
                      <p>สูง {todayWeather.tMax.toFixed(0)}° · ต่ำ {todayWeather.tMin.toFixed(0)}°</p>
                      <p className="flex items-center justify-end gap-1">
                        <CloudRain size={10} />
                        ฝน {todayWeather.rainProb}%
                      </p>
                      {todayWeather.rainSum > 0 && (
                        <p className="opacity-80">{todayWeather.rainSum.toFixed(1)} มม.</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* พยากรณ์ 4 วันถัดไป */}
              {weather.daily.length > 1 && (
                <div className="grid grid-cols-4 gap-1 mt-2 pt-2 border-t border-white/20">
                  {weather.daily.slice(1, 5).map((d) => {
                    const wmo = weatherIcon(d.code);
                    const dayName = (() => {
                      const dt = new Date(d.date);
                      const wd = ['อา','จ','อ','พ','พฤ','ศ','ส'][dt.getDay()];
                      return wd;
                    })();
                    return (
                      <div key={d.date} className="text-center bg-white/10 rounded-md py-1 px-0.5">
                        <p className="text-[9px] opacity-90 leading-tight">{dayName}</p>
                        <wmo.Icon size={16} className="mx-auto my-0.5 text-white" />
                        <p className="text-[9px] font-bold leading-tight">{d.tMax.toFixed(0)}°</p>
                        <p className="text-[8px] opacity-80 leading-tight">ฝน {d.rainProb}%</p>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-[9px] opacity-70 mt-1.5 flex items-center gap-1">
                <MapPin size={9} />
                {weather.source === 'gps' ? 'ตำแหน่งของคุณ' : 'จันทบุรี (พิกัดเริ่มต้น)'}
              </p>
            </>
          )}
        </div>

        {/* ── แจ้งเตือน ── */}
        {weatherAlert && (
          <div className={`rounded-2xl p-3 border flex gap-3 ${
            weatherAlert.level === 'warning'
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
          }`}>
            <AlertTriangle
              size={20}
              className={`flex-shrink-0 mt-0.5 ${
                weatherAlert.level === 'warning' ? 'text-amber-600' : 'text-blue-600'
              }`}
            />
            <div className="flex-1">
              <p className={`text-sm font-bold ${
                weatherAlert.level === 'warning'
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-blue-700 dark:text-blue-300'
              }`}>
                {weatherAlert.title}
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                {weatherAlert.message}
              </p>
            </div>
          </div>
        )}

        {/* ── เมนูประเภทการดูแล — ซ่อนในสวนมังคุด เพราะมีอยู่ใน tabs แล้ว ── */}
        {!isMango && (
          <div>
            <h2 className="font-bold text-slate-800 dark:text-white mb-3 text-sm">เลือกประเภทการดูแล</h2>
            <div className="grid grid-cols-2 gap-3">
              {getCareMenu(orchard.name).map((item) => {
                const Icon = item.Icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(`${item.path}?id=${orchardId}`)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 ${item.borderColor} bg-white dark:bg-slate-800 hover:scale-[1.03] active:scale-[0.97] transition-all shadow-sm hover:shadow-md`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.iconBg}`}>
                      <Icon size={26} className={item.iconColor} strokeWidth={2} />
                    </div>
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ปฏิทินรวม ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            <button onClick={goPrevMonth} className="p-1.5 rounded-lg hover:bg-white text-slate-600 dark:text-slate-300">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <h2 className="font-bold text-sm text-slate-800 dark:text-white">
                {THAI_MONTHS_FULL[calendarMonth.getMonth()]} {calendarMonth.getFullYear() + 543}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">บันทึกการดูแลรวม</p>
            </div>
            <button onClick={goNextMonth} className="p-1.5 rounded-lg hover:bg-white text-slate-600 dark:text-slate-300">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* legend */}
          <div className="px-3 pt-3 pb-1 flex items-center justify-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Droplets size={12} className="text-blue-500" fill="currentColor" /> รดน้ำ
            </span>
            <span className="flex items-center gap-1">
              <Bug size={12} className="text-orange-500" /> พ่นยา
            </span>
            <span className="flex items-center gap-1">
              <Leaf size={12} className="text-emerald-600" /> ใส่ปุ๋ย
            </span>
          </div>

          <div className="p-3 space-y-3">
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

                const hasWater = waterByDate.has(key);
                const hasSpray = sprayByDate.has(key);
                const hasFert = fertByDate.has(key);
                const hasAny = hasWater || hasSpray || hasFert;

                const today = new Date();
                const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                const isSelected = selectedDate === key;
                const dow = (i % 7);

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedDate(isSelected ? null : key)}
                    className={`relative aspect-square rounded-lg border flex flex-col items-center justify-center text-[10px] p-0.5 transition-all cursor-pointer hover:scale-105 ${
                      isSelected
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-500 ring-2 ring-emerald-400 scale-105'
                        : hasAny
                          ? 'bg-slate-50 dark:bg-slate-700/40 border-slate-300 dark:border-slate-600'
                          : isToday
                            ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {/* ไอคอนมุมซ้ายบน เรียงลงมาตามลำดับ น้ำ → แมลง → ปุ๋ย */}
                    <div className="absolute top-0.5 left-0.5 flex flex-col gap-0">
                      {hasWater && (
                        <Droplets size={9} className="text-blue-500" fill="currentColor" />
                      )}
                      {hasSpray && (
                        <Bug size={9} className="text-orange-500" />
                      )}
                      {hasFert && (
                        <Leaf size={9} className="text-emerald-600" />
                      )}
                    </div>

                    {/* ตัวเลขวันที่ */}
                    <span className={`text-[12px] font-bold leading-none ${
                      isSelected
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : dow === 0
                          ? 'text-rose-500'
                          : dow === 6
                            ? 'text-blue-500'
                            : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {day}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Popup รายละเอียดของวันที่เลือก ── */}
      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-white">
                  {(() => {
                    const [y, m, d] = selectedDate.split('-').map(Number);
                    return `${d} ${THAI_MONTHS_FULL[m - 1]} ${y + 543}`;
                  })()}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {(waterByDate.get(selectedDate)?.length ?? 0) +
                   (sprayByDate.get(selectedDate)?.length ?? 0) +
                   (fertByDate.get(selectedDate)?.length ?? 0)} รายการ
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* รดน้ำ */}
              {(waterByDate.get(selectedDate) ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mb-1.5">
                    <Droplets size={14} fill="currentColor" /> รดน้ำ
                  </p>
                  <div className="space-y-1.5">
                    {(waterByDate.get(selectedDate) ?? []).map(r => (
                      <div key={r.id} className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2.5 text-xs">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-slate-800 dark:text-white">
                            {r.liters.toLocaleString()} ลิตร
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {r.minutes < 1 ? `${Math.round(r.minutes * 60)} นาที` : `${r.minutes} ชม.`}
                          </span>
                        </div>
                        {r.growthStage && (
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                            {DURIAN_GROWTH_STAGE_LABEL[r.growthStage] ?? r.growthStage}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* พ่นยา */}
              {(sprayByDate.get(selectedDate) ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5 mb-1.5">
                    <Bug size={14} /> พ่นยา
                  </p>
                  <div className="space-y-1.5">
                    {(sprayByDate.get(selectedDate) ?? []).map(r => (
                      <div key={r.id} className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-2.5 text-xs space-y-1">
                        <p className="font-bold text-slate-800 dark:text-white">{r.purpose}</p>
                        {r.pestDisease && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            🐛 {r.pestDisease}
                          </p>
                        )}
                        {r.medicines.length > 0 && (
                          <div className="space-y-0.5">
                            {r.medicines.map((m, i) => (
                              <div key={i} className="flex justify-between text-[11px] bg-white dark:bg-slate-800 px-2 py-1 rounded-lg">
                                <span className="text-slate-700 dark:text-slate-200">
                                  {m.group ? `[${SPRAY_GROUP_LABEL[m.group]}] ` : ''}{m.name}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400">
                                  {m.amount} {MEDICINE_UNIT_LABEL[m.unit as keyof typeof MEDICINE_UNIT_LABEL] ?? m.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ใส่ปุ๋ย */}
              {(fertByDate.get(selectedDate) ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-1.5">
                    <Leaf size={14} /> ใส่ปุ๋ย
                  </p>
                  <div className="space-y-1.5">
                    {(fertByDate.get(selectedDate) ?? []).map(r => (
                      <div key={r.id} className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-2.5 text-xs space-y-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white">{r.formulaName}</p>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                              {GROWTH_STAGE_LABEL[r.stage] ?? r.stage} · N-P-K {r.npk}
                            </p>
                          </div>
                          <span className="text-slate-700 dark:text-slate-200 font-bold">
                            {r.amount} {MEDICINE_UNIT_LABEL[r.unit as keyof typeof MEDICINE_UNIT_LABEL] ?? r.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* empty */}
              {(waterByDate.get(selectedDate) ?? []).length === 0 &&
               (sprayByDate.get(selectedDate) ?? []).length === 0 &&
               (fertByDate.get(selectedDate) ?? []).length === 0 && (
                <div className="text-center py-8">
                  <LeafIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    ไม่มีบันทึกการดูแลในวันนี้
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSelectedDate(null)}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
