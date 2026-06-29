'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/lib/useTheme';
import { ArrowLeft, Home, Moon, Sun } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { isMangosteenFarm } from '@/lib/firebase';
import SubMenuTabs from './SubMenuTabs';

type Props = {
  orchardName: string;
  orchardColor: string;
  orchardId: string;
  isDurianBackyard: boolean;
  title: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  /** ปุ่ม/ไอคอนเสริม ฝั่งซ้ายของปุ่มสลับธีมใน header */
  headerRight?: ReactNode;
  /** แถบที่แสดงต่อจาก header (เช่น แถบเลือกปี) */
  belowHeader?: ReactNode;
};

/** map pathname → activeTab id */
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

export default function SubPageHeader({
  orchardName,
  orchardColor,
  orchardId,
  isDurianBackyard,
  title,
  Icon,
  headerRight,
  belowHeader,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();
  const isMango = isMangosteenFarm(orchardName);

  // หน้าภาพรวมของสวนมังคุด = pathname `/orchard/care` (ไม่มี subpath)
  // ตัด trailing slash + เทียบทั้ง 2 รูปแบบเพื่อทนกับ trailingSlash config
  const cleanPath = (pathname || '').replace(/\/+$/, '');
  const isMangoOverview = isMango && cleanPath === '/orchard/care';

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
      <div className="sticky top-0 z-40">
      <header
        className="text-white px-4 pt-3 pb-3"
        style={{ backgroundColor: orchardColor }}
      >
        <div className="flex items-center justify-between">
          {isMangoOverview ? (
            <button
              onClick={() => router.push('/')}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              title="หน้าแรก"
            >
              <Home size={18} />
            </button>
          ) : isMango ? (
            <button
              onClick={() => router.push(`/orchard/care?id=${orchardId}`)}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              title="หน้าสวนมังคุด"
            >
              <Home size={18} />
            </button>
          ) : (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 p-1.5 hover:bg-white/20 rounded-full transition-colors text-sm font-bold"
              title="ย้อนกลับ"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Icon size={18} />
            <span className="font-bold text-sm">{title}</span>
          </div>
          <div className="flex items-center gap-1">
            {headerRight}
            <button
              onClick={toggleTheme}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              title={isDark ? 'โหมดสว่าง' : 'โหมดมืด'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
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
      </div>
    </>
  );
}
