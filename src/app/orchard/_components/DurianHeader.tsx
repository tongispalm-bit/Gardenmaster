'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Moon, Sun, Calendar, Check, ChevronDown, ArrowLeft } from 'lucide-react';
import { useTheme } from '@/lib/useTheme';
import { useAuth } from '@/lib/useAuth';
import { useHarvestYear, HARVEST_YEAR_OPTIONS } from '@/lib/useHarvestYear';
import ProfileModal from '@/app/_components/ProfileModal';
import SubMenuTabs, { TAB_LABELS } from './SubMenuTabs';
import FixedHeaderShell from './FixedHeaderShell';

type Props = {
  orchardId: string;
  orchardName: string;
  orchardColor: string;
  orchardIcon?: string;
  /** id ของแท็บที่ active ใน SubMenuTabs */
  activeTab: string;
  /** แสดง pill รอบปีเก็บเกี่ยว (default: true) */
  showYear?: boolean;
  /** ให้เลือกปีได้ด้วย dropdown (default: false) — ใช้เฉพาะหน้าผังสวน */
  allowYearChange?: boolean;
  /** override ชื่อเมนูย่อยที่แสดงตรงกลาง (ถ้าไม่ส่ง จะดึงจาก activeTab) */
  centerLabel?: string;
  /** ซ่อนแถบเมนูย่อย (SubMenuTabs) — ใช้กับหน้าที่ต้องการแสดงข้อมูลแบบเต็ม */
  hideTabs?: boolean;
  /** แสดงปุ่มลูกศรย้อนกลับไปหน้าก่อนหน้า แทนปุ่มบ้าน */
  showBack?: boolean;
};

/**
 * Header มาตรฐานสวนทุเรียนหลังบ้าน (ดีไซน์ 7A)
 * เลย์เอาต์ฝั่งซ้าย → ขวา:
 *   🏠 ปุ่มบ้าน (กลับหน้าผังสวน) · ชื่อสวน + สถานะ sync · 👤 โปรไฟล์ · 📅 รอบปี · 🌙 ธีม
 * - ปุ่มแตะ 44×44, header สูง 64px, ฟอนต์ชื่อ 18px
 * - ห่อ header + SubMenuTabs ใน sticky เดียวกัน
 */
export default function DurianHeader({
  orchardId,
  orchardName,
  orchardColor,
  orchardIcon,
  activeTab,
  showYear = true,
  allowYearChange = false,
  centerLabel,
  hideTabs = false,
  showBack = false,
}: Props) {
  const router = useRouter();
  const { isDark, toggleTheme, mounted } = useTheme();
  const { user, refresh } = useAuth();
  const { year, setYear } = useHarvestYear(orchardId);

  const [profileOpen, setProfileOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const yearRef = useRef<HTMLDivElement>(null);

  // ชื่อเมนูย่อยที่กำลังเปิดอยู่ (เช่น "ผังสวน") สำหรับแสดงตรงกลาง header
  const activeLabel =
    centerLabel ?? TAB_LABELS[activeTab] ?? (activeTab === 'tree-info' ? 'ข้อมูลต้น' : undefined);

  // สถานะออนไลน์/ออฟไลน์
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // ปิด dropdown ปีเมื่อคลิกนอกพื้นที่
  useEffect(() => {
    if (!yearOpen) return;
    const onClick = (e: MouseEvent) => {
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) {
        setYearOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [yearOpen]);

  return (
    <>
      <FixedHeaderShell backgroundColor={orchardColor}>
        <header className="text-white px-2.5 pb-2" style={{ backgroundColor: orchardColor }}>
          {/* แถวบน: บ้าน · ชื่อสวน+sync · โปรไฟล์ · ธีม */}
          <div className="flex items-center gap-1 h-[60px]">
            {/* ซ้าย: ปุ่มย้อนกลับ (showBack) หรือ ปุ่มบ้าน → หน้าแรก */}
            {showBack ? (
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push(`/orchard/farm-map?id=${orchardId}`);
                  }
                }}
                className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/20 active:bg-white/30 transition-colors flex-shrink-0"
                title="ย้อนกลับ"
              >
                <ArrowLeft size={24} />
              </button>
            ) : (
              <button
                onClick={() => router.push(hideTabs ? `/orchard/farm-map?id=${orchardId}` : '/')}
                className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/20 active:bg-white/30 transition-colors flex-shrink-0"
                title={hideTabs ? 'หน้าผังสวน' : 'หน้าแรก'}
              >
                <Home size={24} />
              </button>
            )}

            {/* กลาง: ชื่อสวน + เมนูย่อยที่เปิดอยู่ + สถานะ sync */}
            <div className="flex-1 min-w-0 px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xl leading-none flex-shrink-0">{orchardIcon}</span>
                <span className="font-bold text-lg leading-tight truncate">{orchardName}</span>
                {activeLabel && (
                  <>
                    <span className="text-white/50 flex-shrink-0">›</span>
                    <span className="font-bold text-lg leading-tight text-white/95 truncate">
                      {activeLabel}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 ml-0.5 mt-0.5">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    online ? 'bg-green-300 animate-pulse' : 'bg-slate-300'
                  }`}
                />
                <span className="text-[11px] text-white/80 leading-tight">
                  {online ? 'บันทึกแล้ว · ออนไลน์' : 'ออฟไลน์'}
                </span>
              </div>
            </div>

            {/* ขวา: โปรไฟล์ */}
            <button
              onClick={() => setProfileOpen(true)}
              className="w-12 h-12 flex items-center justify-center flex-shrink-0"
              title="โปรไฟล์"
            >
              {user?.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.profileImage}
                  alt={user.displayName || user.username}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white/50"
                />
              ) : (
                <span className="w-10 h-10 flex items-center justify-center rounded-full bg-white/25 ring-2 ring-white/40 text-base font-extrabold">
                  {(user?.displayName || user?.username || '?').slice(0, 1).toUpperCase()}
                </span>
              )}
            </button>

            {/* ธีม (ขวาสุด) */}
            <button
              onClick={toggleTheme}
              className="w-11 h-12 flex items-center justify-center rounded-full hover:bg-white/20 active:bg-white/30 transition-colors flex-shrink-0"
              title={isDark ? 'โหมดสว่าง' : 'โหมดมืด'}
            >
              {mounted && isDark ? <Sun size={22} /> : <Moon size={22} />}
            </button>
          </div>

          {/* แถวล่าง: pill รอบปีเก็บเกี่ยว (แบบ dropdown หรือ read-only) */}
          {showYear && (
            <div className="relative" ref={yearRef}>
              {allowYearChange ? (
                /* หน้าผังสวน: แสดง dropdown ให้เลือกปีได้ */
                <>
                  <button
                    onClick={() => setYearOpen((v) => !v)}
                    className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 active:bg-white/30 rounded-xl px-3 h-9 w-full transition-colors"
                    title="เปลี่ยนรอบปีเก็บเกี่ยว"
                  >
                    <Calendar size={15} className="flex-shrink-0" />
                    <span className="text-xs font-bold">รอบเก็บเกี่ยว ปี พ.ศ. {year}</span>
                    <ChevronDown size={14} className="ml-auto flex-shrink-0" />
                  </button>
                  {yearOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                      <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold border-b border-emerald-100 dark:border-emerald-800">
                        เลือกรอบปีเก็บเกี่ยว
                      </div>
                      <div className="py-1">
                        {HARVEST_YEAR_OPTIONS.map((y) => {
                          const active = y === year;
                          return (
                            <button
                              key={y}
                              onClick={() => { setYear(y); setYearOpen(false); }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                                active
                                  ? 'font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                              }`}
                            >
                              ปี พ.ศ. {y}
                              {active && <Check size={14} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* หน้าอื่นๆ: แสดงปีแบบ read-only ไม่มี dropdown */
                <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 h-9 w-full">
                  <Calendar size={15} className="flex-shrink-0" />
                  <span className="text-xs font-bold">รอบเก็บเกี่ยว ปี พ.ศ. {year}</span>
                </div>
              )}
            </div>
          )}
        </header>

        {!hideTabs && (
          <SubMenuTabs activeTab={activeTab} orchardId={orchardId} orchardName={orchardName} />
        )}
      </FixedHeaderShell>

      {user && (
        <ProfileModal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          user={user}
          onUpdated={() => { refresh(); setProfileOpen(false); }}
        />
      )}
    </>
  );
}
