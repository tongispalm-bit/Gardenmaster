'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Home, FlaskConical, Wallet, User } from 'lucide-react';

type NavItem = {
  id: string;
  label: string;
  Icon: typeof Home;
  path: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'home',      label: 'หน้าแรก',     Icon: Home,          path: '/' },
  { id: 'chemicals', label: 'คลังสารเคมี', Icon: FlaskConical,  path: '/all-chemicals' },
  { id: 'summary',   label: 'สรุป',        Icon: Wallet,        path: '/all-summary' },
  { id: 'profile',   label: 'โปรไฟล์',     Icon: User,          path: '#profile' },
];

type Props = {
  activeId?: string;
  onProfileClick?: () => void;
};

export default function BottomNav({ activeId, onProfileClick }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const cleanPath = (pathname || '').replace(/\/+$/, '');
  const computedActive =
    activeId ??
    (cleanPath === '' || cleanPath === '/' ? 'home' :
     cleanPath.startsWith('/all-chemicals') ? 'chemicals' :
     cleanPath.startsWith('/all-summary') ? 'summary' : 'home');

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="max-w-2xl mx-auto flex justify-around py-2 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = computedActive === item.id;
          const Icon = item.Icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'profile') {
                  onProfileClick?.();
                  return;
                }
                router.push(item.path);
              }}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all ${
                isActive ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <span
                className={`flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 px-4 py-1 rounded-full'
                    : 'px-0'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </span>
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
