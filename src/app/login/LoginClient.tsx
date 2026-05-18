'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/useTheme';
import { useAuth } from '@/lib/useAuth';
import { loginWithCredentials, ensureAdminSeeded } from '@/lib/firebase';
import { LeafIcon, Lock, User, Moon, Sun, Eye, EyeOff } from 'lucide-react';

export default function LoginClient() {
  const router = useRouter();
  const { isDark, toggleTheme, mounted } = useTheme();
  const { user, login, loading } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(true);

  // Seed admin คนแรกถ้ายังไม่มี user ในระบบ
  useEffect(() => {
    ensureAdminSeeded()
      .catch((err) => console.error('seed admin error:', err))
      .finally(() => setSeeding(false));
  }, []);

  // ถ้า login อยู่แล้ว → redirect ไปหน้าแรก
  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('กรุณากรอก username และ password');
      return;
    }

    setSubmitting(true);
    try {
      const u = await loginWithCredentials(username.trim(), password);
      if (!u) {
        setError('username หรือ password ไม่ถูกต้อง');
        return;
      }
      login(u);
      router.replace('/');
    } catch (err) {
      console.error('login error:', err);
      setError('เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || loading || seeding) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white dark:from-slate-900 dark:to-slate-800 flex flex-col items-center justify-center px-6 transition-colors duration-300">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2.5 rounded-full bg-white/80 dark:bg-slate-700/80 hover:bg-white dark:hover:bg-slate-600 shadow-md transition-colors"
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500 text-white shadow-lg mb-4">
          <LeafIcon size={40} className="fill-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">
          Garden Master
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">เข้าสู่ระบบเพื่อจัดการสวน</p>
      </div>

      {/* Login Form */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4"
      >
        <div>
          <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">
            Username
          </label>
          <div className="relative">
            <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ring-emerald-500 text-slate-800 dark:text-white"
              placeholder="admin"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2 ring-emerald-500 text-slate-800 dark:text-white"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-xl">
            ⚠ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-xl font-bold transition-all"
        >
          {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>

        <div className="text-xs text-slate-500 dark:text-slate-400 text-center pt-2 border-t border-slate-100 dark:border-slate-700">
          ครั้งแรก: admin / admin123 (กรุณาเปลี่ยน password ทันที)
        </div>
      </form>
    </div>
  );
}
