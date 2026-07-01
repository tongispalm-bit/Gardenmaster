'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/lib/useTheme';
import { ArrowLeft, Home, Moon, Sun } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { isMangosteenFarm } from '@/lib/firebase';
import SubMenuTabs from './SubMenuTabs';
import FixedHeaderShell from './FixedHeaderShell';
import DurianHeader from './DurianHeader';

type Props = {
  orchardName: string;
  orchardColor: string;
  orchardId: string;
  /** ไอคอน (emoji) ของสวน — จำเป็นสำหรับ header แบบทุเรียน (มี tabs) */
  orchardIcon?: string;
  isDurianBackyard: boolean;
  title: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  /** ปุ่ม/ไอคอนเสริม ฝั่งซ้ายของปุ่มสลับธีมใน header */
  headerRight?: ReactNode;
  /** แถบที่แสดงต่อจาก header (เช่น แถบเลือกปี) */
  belowHeader?: ReactNode;
  /** ซ่อนแถบเมนูย่อย (tabs) — ใช้กับหน้าที่ต้องการแสดงข้อมูลแบบเต็ม เช่น หน้าการดูแลทุเรียน */
  hideSubMenu?: boolean;
};

/** map pathname → activeTab id (บริบทสวนมังคุด) */
function pathToTabId(pathname: string | null): string {
  if (!pathname) return '';
  if (pathname.startsWith('/orchard/care/water')) return 'water';
  if (pathname.startsWith('/orchard/care/fertilize')) return 'fertilize';
  if (pathname.startsWith('/orchard/care/spray')) return 'spray';
  if (pathname.startsWith('/orchard/care/durian-fruit')) return 'durian-fruit';
  if (pathname.startsWith('/orchard/care')) return 'mango-home';
  if (pathname.startsWith('/orchard/expense-summary')) return 'expense-summary';
  if (pathname.startsWith('/orchard/expense')) return 'expense';
  if (pathname.startsWith('/orchard/upgrade')) return 'upgrade';
  if (pathname.startsWith('/orchard/sales')) return 'sales';
  if (pathname.startsWith('/orchard/hospital')) return 'hospital';
  if (pathname.startsWith('/orchard/chemical-stock')) return 'chemical-stock';
  if (pathname.startsWith('/orchard/farm-map')) return 'farm-map';
  return '';
}

/** map pathname → activeTab id (บริบทสวนทุเรียน — มี tab "การดูแล" = care) */
function pathToDurianTabId(pathname: string | null): string {
  if (!pathname) return '';
  if (pathname.startsWith('/orchard/care')) return 'care';
  if (pathname.startsWith('/orchard/expense-summary')) return 'expense-summary';
  if (pathname.startsWith('/orchard/expense')) return 'expense';
  if (pathname.startsWith('/orchard/upgrade')) return 'upgrade';
  if (pathname.startsWith('/orchard/sales')) return 'sales';
  if (pathname.startsWith('/orchard/hospital-history')) return 'hospital-history';
  if (pathname.startsWith('/orchard/hospital')) return 'hospital';
  if (pathname.startsWith('/orchard/chemical-stock')) return 'chemical-stock';
  if (pathname.startsWith('/orchard/farm-map')) return 'farm-map';
  return '';
}

export default function SubPageHeader({
  orchardName,
  orchardColor,
  orchardId,
  orchardIcon,
  isDurianBackyard,
  title,
  Icon,
  headerRight,
  belowHeader,
  hideSubMenu,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();
  const isMango = isMangosteenFarm(orchardName);

  // หน้าภาพรวมของสวนมังคุด = pathname `/orchard/care` (ไม่มี subpath)
  // ตัด trailing slash + เทียบทั้ง 2 รูปแบบเพื่อทนกับ trailingSlash config
  const cleanPath = (pathname || '').replace(/\/+$/, '');
  const isMangoOverview = isMango && cleanPath === '/orchard/care';

  // ── สวนทุเรียน (มีผังสวน + ไม่ใช่มังคุด): ใช้ DurianHeader แบบเดียวกับหน้าผังสวน ──
  // ทุกเมนูย่อยจึงได้ header เหมือนกัน: fixed + tabs + ชื่อเมนูตรงกลาง + pill รอบปี
  // ถ้า hideSubMenu → ซ่อน tabs + แสดงปุ่มลูกศรย้อนกลับ (แต่คงข้อมูล header แบบผังสวนไว้)
  if (isDurianBackyard && !isMango) {
    // หน้าการดูแล (/orchard/care) → ใช้ปุ่มบ้านกลับผังสวน, ไม่ใช้ลูกศร
    const isCareHome = cleanPath === '/orchard/care';
    return (
      <DurianHeader
        orchardId={orchardId}
        orchardName={orchardName}
        orchardColor={orchardColor}
        orchardIcon={orchardIcon ?? '🌳'}
        activeTab={pathToDurianTabId(cleanPath)}
        centerLabel={title}
        hideTabs={hideSubMenu}
        showBack={hideSubMenu && !isCareHome}
      />
    );
  }

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    if (isMango) {
      router.push(`/orchard/care?id=${orchardId}`);
    } else if (isDurianBackyard) {
      router.push(`/orchard/farm-map?id=${orchardId}`);
    } else {
      router.push(`/orchard?id=${orchardId}`);
    }
  };

  return (
    <>
      <FixedHeaderShell backgroundColor={orchardColor}>
      <header
        className="text-white px-2.5"
        style={{ backgroundColor: orchardColor }}
      >
        <div className="flex items-center justify-between h-16">
          {isMangoOverview ? (
            <button
              onClick={() => router.push('/')}
              className="w-11 h-11 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
              title="หน้าแรก"
            >
              <Home size={22} />
            </button>
          ) : isMango ? (
            <button
              onClick={() => router.push(`/orchard/care?id=${orchardId}`)}
              className="w-11 h-11 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
              title="หน้าสวนมังคุด"
            >
              <Home size={22} />
            </button>
          ) : (
            <button
              onClick={handleBack}
              className="w-11 h-11 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
              title="ย้อนกลับ"
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Icon size={20} />
            <span className="font-bold text-lg">{title}</span>
          </div>
          <div className="flex items-center">
            {headerRight}
            <button
              onClick={toggleTheme}
              className="w-11 h-11 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
              title={isDark ? 'โหมดสว่าง' : 'โหมดมืด'}
            >
              {isDark ? <Sun size={22} /> : <Moon size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* แถบเสริมต่อจาก header (เช่น แถบเลือกปี) */}
      {belowHeader}

      {/* สวนมังคุด: render SubMenuTabs ต่อท้ายเสมอ เพื่อให้ทุกหน้าย่อยมี tabs เดียวกัน */}
      {isMango && (
        <SubMenuTabs
          activeTab={pathToTabId(cleanPath)}
          orchardId={orchardId}
          orchardName={orchardName}
        />
      )}
      </FixedHeaderShell>
    </>
  );
}
