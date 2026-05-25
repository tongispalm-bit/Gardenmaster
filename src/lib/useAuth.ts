'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUserById, type AppUser } from './firebase';

const SESSION_KEY = 'gm-session-v1';
const SESSION_LOAD_TIMEOUT_MS = 10000;

type SessionData = {
  userId: string;
  loginAt: number;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Session load timeout')), timeoutMs);
    }),
  ]);
}

/**
 * Hook สำหรับ auth state
 * - โหลด session จาก localStorage ตอน mount
 * - ดึงข้อมูล user ล่าสุดจาก Firestore (กันกรณี role/username ถูกแก้)
 */
export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) {
        setUser(null);
        return;
      }
      const session = JSON.parse(raw) as SessionData;
      const fresh = await withTimeout(getUserById(session.userId), SESSION_LOAD_TIMEOUT_MS);
      if (!fresh) {
        // user ถูกลบไปแล้ว → clear session
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
        return;
      }
      setUser(fresh);
    } catch (err) {
      console.error('loadSession error:', err);
      localStorage.removeItem(SESSION_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback((u: AppUser) => {
    const session: SessionData = { userId: u.id, loginAt: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const fresh = await getUserById(user.id);
    if (fresh) setUser(fresh);
  }, [user]);

  return { user, loading, login, logout, refresh };
}
