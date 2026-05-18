'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/useTheme';
import { Home, Map as MapIcon, Moon, Sun, type LucideIcon } from 'lucide-react';

type Props = {
  orchardName: string;
  orchardColor: string;
  orchardId: string;
  /** เป็นสวนทุเรียนหลังบ้านไหม (โชว์ปุ่มกลับผังสวน) */
  isDurianBackyard: boolean;
  /** ชื่อหน้านี้ */
  title: string;
  /** ไอคอนหน้านี้ */
  Icon: LucideIcon;
};

export default function SubPageHeader({
  orchardName,
  orchardColor,
  orchardId,
  isDurianBackyard,
  title,
  Icon,
}: Props) {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header
      className="text-white px-6 pt-6 pb-8"
      style={{ backgroundColor: orchardColor }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {/* ปุ่ม Home — กลับหน้าเลือกสวน */}
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="หน้าแรก"
          >
            <Home size={22} />
          </button>
          {/* ปุ่มกลับผังสวน — เฉพาะสวนทุเรียนหลังบ้าน */}
          {isDurianBackyard && (
            <button
              onClick={() => router.push(`/orchard/farm-map?id=${orchardId}`)}
              className="flex items-center gap-1.5 px-3 py-2 hover:bg-white/20 rounded-full transition-colors text-sm font-bold"
              title="กลับผังสวน"
            >
              <MapIcon size={18} />
              <span className="hidden sm:inline">ผังสวน</span>
            </button>
          )}
          {/* สวนอื่น — ปุ่มกลับหน้าเมนูสวน */}
          {!isDurianBackyard && (
            <button
              onClick={() => router.push(`/orchard?id=${orchardId}`)}
              className="px-3 py-2 hover:bg-white/20 rounded-full transition-colors text-sm font-bold"
            >
              ← เมนู
            </button>
          )}
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
          title={isDark ? 'โหมดสว่าง' : 'โหมดมืด'}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <Icon size={32} />
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-white/80 text-sm">{orchardName}</p>
        </div>
      </div>
    </header>
  );
}
