'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/useTheme';
import { ArrowLeft, Moon, Sun, type LucideIcon } from 'lucide-react';

type Props = {
  orchardName: string;
  orchardColor: string;
  orchardId: string;
  isDurianBackyard: boolean;
  title: string;
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

  const handleBack = () => {
    if (isDurianBackyard) {
      router.push(`/orchard/farm-map?id=${orchardId}`);
    } else {
      router.push(`/orchard?id=${orchardId}`);
    }
  };

  return (
    <header
      className="text-white px-4 pt-3 pb-3"
      style={{ backgroundColor: orchardColor }}
    >
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 p-1.5 hover:bg-white/20 rounded-full transition-colors text-sm font-bold"
          title="ย้อนกลับ"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Icon size={18} />
          <span className="font-bold text-sm">{title}</span>
        </div>
        <button
          onClick={toggleTheme}
          className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          title={isDark ? 'โหมดสว่าง' : 'โหมดมืด'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
