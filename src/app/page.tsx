'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/lib/useTheme';
import { useAuth } from '@/lib/useAuth';
import { getOrchards, type Orchard } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Moon, Sun, LeafIcon, Settings } from 'lucide-react';
import SettingsModal from './_components/SettingsModal';

const ORCHARDS_PRESET = [
  { name: 'สวนมังคุด', color: '#9b59b6', icon: '🍇', colorClass: 'bg-purple-600' },
  { name: 'ทุเรียนหลังบ้าน', color: '#27ae60', icon: '🌳', colorClass: 'bg-green-600' },
  { name: 'ทุเรียนหมื่นซ่อง', color: '#f39c12', icon: '🍊', colorClass: 'bg-yellow-600' },
];

export default function Home() {
  const { isDark, toggleTheme, mounted } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orchards, setOrchards] = useState<Orchard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Auth guard — ไม่มี session → redirect ไป /login
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) loadOrchards();
  }, [user]);

  const loadOrchards = async () => {
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout — กรุณาตรวจสอบว่าเปิด Firestore Database ใน Firebase Console แล้ว')), 10000)
      );
      const data = await Promise.race([getOrchards(), timeout]) as Orchard[];
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
        const newData = await getOrchards();
        setOrchards(newData);
      } else {
        setOrchards(data);
      }
    } catch (error) {
      console.error('Error loading orchards:', error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
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
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-900 dark:to-emerald-800 text-white px-6 pt-8 pb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LeafIcon size={32} className="fill-white" />
            <h1 className="text-3xl font-extrabold">Garden Master</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title={isDark ? 'โหมดสว่าง' : 'โหมดมืด'}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title="ตั้งค่าระบบ"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <p className="text-emerald-50 text-lg">สวัสดี {user.displayName}</p>
          <p className="text-emerald-100 text-sm">เลือกสวนที่ต้องการจัดการ</p>
        </div>
      </header>

      {/* Orchards Grid */}
      <div className="px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {orchards.map((orchard) => (
            <button
              key={orchard.id}
              onClick={() => router.push(`/orchard?id=${orchard.id}`)}
              className="group relative overflow-hidden rounded-2xl p-8 text-white transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
              style={{
                backgroundColor: orchard.color,
              }}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
              <div className="relative z-10 text-center">
                <div className="text-6xl mb-4">{orchard.icon}</div>
                <h2 className="text-2xl font-bold mb-2">{orchard.name}</h2>
                <p className="text-white/80 text-sm">คลิกเพื่อจัดการ</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
        <p>💡 เคล็ดลับ: บันทึกข้อมูลแต่ละสวนแยกกันเพื่อการจัดการที่ดีขึ้น</p>
      </div>

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
