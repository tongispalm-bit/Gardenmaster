'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/lib/useTheme';
import { useAuth } from '@/lib/useAuth';
import { getOrchards, subscribeOrchards, type Orchard } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import {
  Moon,
  Sun,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import SettingsModal from './_components/SettingsModal';
import ProfileModal from './_components/ProfileModal';
import BottomNav from './_components/BottomNav';

const ORCHARDS_PRESET = [
  { name: 'สวนมังคุด', color: '#9b59b6', icon: '🍇' },
  { name: 'ทุเรียนหลังบ้าน', color: '#27ae60', icon: '🌳' },
  { name: 'ทุเรียนหมื่นซ่อง', color: '#f39c12', icon: '🍊' },
];

// สีกรอบพาสเทลรอบรูปสวน
function getIconBg(orchard: Orchard): string {
  if (orchard.name.includes('มังคุด'))      return 'bg-purple-200/70 dark:bg-purple-900/40';   // ม่วงพาสเทล
  if (orchard.name.includes('หลังบ้าน'))    return 'bg-emerald-200/70 dark:bg-emerald-900/40'; // เขียวพาสเทล
  if (orchard.name.includes('หมื่นซ่อง'))   return 'bg-orange-200/70 dark:bg-orange-900/40';   // ส้มพาสเทล
  return 'bg-slate-200 dark:bg-slate-700';
}

// path รูปสำหรับแต่ละสวน — ถ้ารูปไม่มี จะ fallback เป็น emoji
function getOrchardImage(orchard: Orchard): string | null {
  if (orchard.name.includes('มังคุด'))    return '/images/mangosteen.png';
  if (orchard.name.includes('หลังบ้าน'))  return '/images/durian.png';
  if (orchard.name.includes('หมื่นซ่อง')) return '/images/durian-cut.png';
  return null;
}

function getOrchardTag(orchard: Orchard): string {
  if (orchard.name.includes('หลังบ้าน')) return 'ทุเรียน · 91 ต้น';
  if (orchard.name.includes('หมื่นซ่อง')) return 'ทุเรียน';
  return 'มังคุด';
}

export default function Home() {
  const { isDark, toggleTheme, mounted } = useTheme();
  const { user, loading: authLoading, logout, refresh } = useAuth();
  const router = useRouter();
  const [orchards, setOrchards] = useState<Orchard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    // โหลดครั้งแรก + auto-seed ถ้ายังไม่มีสวน
    (async () => {
      try {
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout — กรุณาตรวจสอบว่าเปิด Firestore Database ใน Firebase Console แล้ว')), 10000)
        );
        const data = await Promise.race([getOrchards(), timeout]) as Orchard[];
        if (cancelled) return;

        if (data.length === 0) {
          const { addOrchard } = await import('@/lib/firebase');
          for (const preset of ORCHARDS_PRESET) {
            await addOrchard({
              name: preset.name,
              color: preset.color,
              icon: preset.icon,
              createdAt: Date.now(),
            });
          }
        }

        // Subscribe realtime
        unsubscribe = subscribeOrchards((list) => {
          if (cancelled) return;
          setOrchards(list);
          setLoading(false);
        });
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading orchards:', err);
        setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const loadOrchards = async () => {
    // เก็บไว้ใช้กรณีต้อง refresh manual (เช่น error retry)
    try {
      const data = await getOrchards();
      setOrchards(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        <p className="text-slate-500 text-sm">กำลังโหลด...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-red-500 text-5xl">⚠️</div>
        <h2 className="text-xl font-bold text-red-600">เชื่อมต่อ Firebase ไม่ได้</h2>
        <p className="text-slate-600 dark:text-slate-400 text-center text-sm">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); loadOrchards(); }}
          className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 pb-24">
      {/* Header — กะทัดรัด */}
      <header className="sticky top-0 z-50 bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-700 dark:to-emerald-900 text-white px-5 pt-5 pb-5 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between">
          {/* ซ้าย: รูปโปรไฟล์ + ชื่อ */}
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            title="แก้ไขโปรไฟล์"
          >
            {user.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.profileImage}
                alt={user.displayName || user.username}
                className="w-9 h-9 rounded-full object-cover border-2 border-white/80"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/25 border-2 border-white/80 flex items-center justify-center font-extrabold text-sm">
                {(user.displayName || user.username).slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-bold">
              {user.displayName || user.username}
            </span>
          </button>

          {/* ขวา: ปุ่ม actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              title={isDark ? 'โหมดสว่าง' : 'โหมดมืด'}
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              title="ตั้งค่าระบบ"
            >
              <Settings size={14} />
            </button>
            <button
              onClick={() => {
                if (confirm('ออกจากระบบใช่ไหม?')) {
                  logout();
                  router.replace('/login');
                }
              }}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-red-500/40 flex items-center justify-center transition-colors"
              title="ออกจากระบบ"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        <div className="text-center mt-3">
          <h1 className="text-xl font-extrabold">
            Garden Master 🌿
          </h1>
          <p className="text-xs opacity-85 mt-1">
            {orchards.length} สวน · พร้อมรับการดูแล
          </p>
        </div>
      </header>

      {/* Section title */}
      <div className="flex items-center justify-between px-5 py-3">
        <h2 className="font-bold text-slate-800 dark:text-white">สวนของคุณ</h2>
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
          {orchards.length} รายการ
        </span>
      </div>

      {/* List */}
      <div className="px-5 space-y-2.5">
        {orchards.map((orchard) => {
          const imgSrc = getOrchardImage(orchard);
          return (
            <button
              key={orchard.id}
              onClick={() => router.push(`/orchard?id=${orchard.id}`)}
              className="w-full bg-white dark:bg-slate-800 rounded-2xl p-3.5 flex items-center gap-3.5 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all border border-slate-100 dark:border-slate-700"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 ${getIconBg(orchard)}`}>
                {imgSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgSrc}
                    alt={orchard.name}
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement | null;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span
                  className="text-3xl w-full h-full items-center justify-center"
                  style={{ display: imgSrc ? 'none' : 'flex' }}
                >
                  {orchard.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-bold text-slate-800 dark:text-white truncate">
                  {orchard.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block flex-shrink-0"></span>
                  {getOrchardTag(orchard)}
                </p>
              </div>
              <ChevronRight size={20} className="text-slate-400 flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Bottom Nav */}
      <BottomNav activeId="home" onProfileClick={() => setProfileOpen(true)} />

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Profile Modal */}
      {user && (
        <ProfileModal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          user={user}
          onUpdated={() => refresh()}
        />
      )}
    </div>
  );
}
