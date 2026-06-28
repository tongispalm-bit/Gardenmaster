// ────────────────────────────────────────────────────────────
// 👤 USER & AUTHENTICATION Functions
// ────────────────────────────────────────────────────────────

import { collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from './config';
import type { AppUser, UserRole } from './types';

// ══════════════════════════════════════════════════════════
// Password Hashing
// ══════════════════════════════════════════════════════════

export async function hashPassword(password: string): Promise<string> {
  const salt = 'garden-master-salt-v1';
  const data = new TextEncoder().encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ══════════════════════════════════════════════════════════
// User CRUD
// ══════════════════════════════════════════════════════════

export async function getUserByUsername(username: string): Promise<AppUser | null> {
  const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() } as AppUser;
}

export async function getUserById(id: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AppUser;
}

export async function getAllUsers(): Promise<AppUser[]> {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AppUser[];
}

export async function createUser(input: {
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
}): Promise<string> {
  const username = input.username.toLowerCase().trim();
  const existing = await getUserByUsername(username);
  if (existing) throw new Error('USERNAME_TAKEN');

  const passwordHash = await hashPassword(input.password);
  const now = Date.now();
  const docRef = await addDoc(collection(db, 'users'), {
    username,
    passwordHash,
    role: input.role,
    displayName: input.displayName.trim() || username,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateUser(
  id: string,
  patch: Partial<{ username: string; role: UserRole; displayName: string }>
) {
  const data: Record<string, unknown> = { updatedAt: Date.now() };
  
  if (patch.username !== undefined) {
    const newUsername = patch.username.toLowerCase().trim();
    const existing = await getUserByUsername(newUsername);
    if (existing && existing.id !== id) throw new Error('USERNAME_TAKEN');
    data.username = newUsername;
  }
  
  if (patch.role !== undefined) data.role = patch.role;
  if (patch.displayName !== undefined) data.displayName = patch.displayName.trim();
  
  await updateDoc(doc(db, 'users', id), data);
}

export async function updateUserProfile(userId: string, data: { displayName?: string; profileImage?: string }) {
  await updateDoc(doc(db, 'users', userId), { ...data, updatedAt: Date.now() });
}

export async function resetUserPassword(id: string, newPassword: string) {
  if (!newPassword || newPassword.length < 4) throw new Error('PASSWORD_TOO_SHORT');
  const passwordHash = await hashPassword(newPassword);
  await updateDoc(doc(db, 'users', id), {
    passwordHash,
    updatedAt: Date.now(),
  });
}

export async function deleteUser(id: string) {
  await deleteDoc(doc(db, 'users', id));
}

// ══════════════════════════════════════════════════════════
// Login & Seed
// ══════════════════════════════════════════════════════════

export async function loginWithCredentials(
  username: string,
  password: string
): Promise<AppUser | null> {
  const user = await getUserByUsername(username);
  if (!user) return null;
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) return null;
  return user;
}

export async function ensureAdminSeeded(): Promise<void> {
  const all = await getAllUsers();
  if (all.length > 0) return;
  await createUser({
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    displayName: 'ผู้ดูแลระบบ',
  });
}
