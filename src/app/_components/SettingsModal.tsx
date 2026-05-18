'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  type AppUser,
  type UserRole,
} from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';
import {
  X,
  UserPlus,
  Trash2,
  Edit3,
  Key,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  Settings as SettingsIcon,
} from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
};

type Tab = 'me' | 'users';

export default function SettingsModal({ open, onClose }: Props) {
  const { user: currentUser, refresh, logout } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [tab, setTab] = useState<Tab>('me');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('load users error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (open && isAdmin && tab === 'users') {
      loadUsers();
    }
  }, [open, isAdmin, tab, loadUsers]);

  if (!open || !currentUser) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <SettingsIcon size={22} className="text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">ตั้งค่าระบบ</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-3 pt-3 border-b border-slate-200 dark:border-slate-700">
          <TabButton active={tab === 'me'} onClick={() => setTab('me')} icon={<UserIcon size={16} />}>
            บัญชีของฉัน
          </TabButton>
          {isAdmin && (
            <TabButton active={tab === 'users'} onClick={() => setTab('users')} icon={<ShieldCheck size={16} />}>
              จัดการสมาชิก
            </TabButton>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'me' && (
            <MyAccountTab user={currentUser} onUpdated={refresh} onLogout={logout} onClose={onClose} />
          )}
          {tab === 'users' && isAdmin && (
            <UsersTab
              users={users}
              currentUserId={currentUser.id}
              loading={loading}
              onReload={loadUsers}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab Button ──────────────────────────────────────────────
function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
        active
          ? 'text-emerald-500 border-emerald-500'
          : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

// ── My Account Tab ──────────────────────────────────────────
function MyAccountTab({
  user,
  onUpdated,
  onLogout,
  onClose,
}: {
  user: AppUser;
  onUpdated: () => Promise<void>;
  onLogout: () => void;
  onClose: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const saveProfile = async () => {
    setMsg(null);
    if (!username.trim()) {
      setMsg({ type: 'err', text: 'username ห้ามว่าง' });
      return;
    }
    setBusy(true);
    try {
      await updateUser(user.id, { username: username.trim(), displayName: displayName.trim() });
      await onUpdated();
      setMsg({ type: 'ok', text: 'บันทึกข้อมูลสำเร็จ' });
    } catch (err) {
      const m = err instanceof Error && err.message === 'USERNAME_TAKEN' ? 'username นี้ถูกใช้แล้ว' : 'บันทึกไม่สำเร็จ';
      setMsg({ type: 'err', text: m });
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    setMsg(null);
    if (pwd.length < 4) {
      setMsg({ type: 'err', text: 'password ต้องมีอย่างน้อย 4 ตัวอักษร' });
      return;
    }
    if (pwd !== pwd2) {
      setMsg({ type: 'err', text: 'password ไม่ตรงกัน' });
      return;
    }
    setBusy(true);
    try {
      await resetUserPassword(user.id, pwd);
      setPwd('');
      setPwd2('');
      setMsg({ type: 'ok', text: 'เปลี่ยน password สำเร็จ' });
    } catch (err) {
      setMsg({ type: 'err', text: 'เปลี่ยน password ไม่สำเร็จ' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile */}
      <section>
        <h3 className="font-bold text-slate-800 dark:text-white mb-3">ข้อมูลส่วนตัว</h3>
        <div className="space-y-3">
          <Field label="Username">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-slate-800 dark:text-white"
            />
          </Field>
          <Field label="ชื่อแสดง">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-slate-800 dark:text-white"
            />
          </Field>
          <Field label="บทบาท">
            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
              <RoleBadge role={user.role} />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                (เปลี่ยนได้โดย admin เท่านั้น)
              </span>
            </div>
          </Field>
          <button
            onClick={saveProfile}
            disabled={busy}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-xl font-bold transition-all"
          >
            บันทึกข้อมูล
          </button>
        </div>
      </section>

      {/* Password */}
      <section>
        <h3 className="font-bold text-slate-800 dark:text-white mb-3">เปลี่ยน Password</h3>
        <div className="space-y-3">
          <Field label="Password ใหม่">
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-slate-800 dark:text-white"
              placeholder="อย่างน้อย 4 ตัวอักษร"
            />
          </Field>
          <Field label="ยืนยัน Password">
            <input
              type="password"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-slate-800 dark:text-white"
            />
          </Field>
          <button
            onClick={changePassword}
            disabled={busy}
            className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <Key size={16} /> เปลี่ยน Password
          </button>
        </div>
      </section>

      {msg && (
        <div
          className={`p-3 rounded-xl text-sm ${
            msg.type === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Logout */}
      <section className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={() => {
            onLogout();
            onClose();
          }}
          className="w-full py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={16} /> ออกจากระบบ
        </button>
      </section>
    </div>
  );
}

// ── Users Tab (admin only) ──────────────────────────────────
function UsersTab({
  users,
  currentUserId,
  loading,
  onReload,
}: {
  users: AppUser[];
  currentUserId: string;
  loading: boolean;
  onReload: () => Promise<void>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [resetting, setResetting] = useState<AppUser | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowAdd(true)}
        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
      >
        <UserPlus size={18} /> เพิ่มสมาชิกใหม่
      </button>

      <div className="space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-800 dark:text-white truncate">
                    {u.displayName}
                  </p>
                  <RoleBadge role={u.role} />
                  {u.id === currentUserId && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      คุณ
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">@{u.username}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditing(u)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-600 dark:text-slate-300"
                  title="แก้ไข"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => setResetting(u)}
                  className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400"
                  title="Reset Password"
                >
                  <Key size={16} />
                </button>
                {u.id !== currentUserId && (
                  <button
                    onClick={async () => {
                      if (!confirm(`ลบสมาชิก "${u.displayName}" จริงไหม?`)) return;
                      try {
                        await deleteUser(u.id);
                        await onReload();
                      } catch (err) {
                        alert('ลบไม่สำเร็จ');
                      }
                    }}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400"
                    title="ลบ"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <AddUserDialog
          onClose={() => setShowAdd(false)}
          onSaved={async () => {
            setShowAdd(false);
            await onReload();
          }}
        />
      )}
      {editing && (
        <EditUserDialog
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await onReload();
          }}
        />
      )}
      {resetting && (
        <ResetPasswordDialog
          user={resetting}
          onClose={() => setResetting(null)}
        />
      )}
    </div>
  );
}

// ── Sub-dialogs ─────────────────────────────────────────────
function AddUserDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    username: '',
    password: '',
    displayName: '',
    role: 'user' as UserRole,
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    if (!form.username.trim() || !form.password) {
      setErr('กรอก username และ password');
      return;
    }
    if (form.password.length < 4) {
      setErr('password ต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }
    setBusy(true);
    try {
      await createUser(form);
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error && e.message === 'USERNAME_TAKEN' ? 'username นี้ถูกใช้แล้ว' : 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogShell title="เพิ่มสมาชิกใหม่" onClose={onClose}>
      <Field label="Username">
        <input
          type="text"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-slate-800 dark:text-white"
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-slate-800 dark:text-white"
        />
      </Field>
      <Field label="ชื่อแสดง">
        <input
          type="text"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-slate-800 dark:text-white"
        />
      </Field>
      <Field label="บทบาท">
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
          className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-slate-800 dark:text-white"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </Field>
      {err && <p className="text-sm text-red-600 dark:text-red-400">⚠ {err}</p>}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          disabled={busy}
          className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold"
        >
          ยกเลิก
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-60"
        >
          {busy ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </DialogShell>
  );
}

function EditUserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: AppUser;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [role, setRole] = useState<UserRole>(user.role);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    if (!username.trim()) {
      setErr('username ห้ามว่าง');
      return;
    }
    setBusy(true);
    try {
      await updateUser(user.id, { username, displayName, role });
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error && e.message === 'USERNAME_TAKEN' ? 'username นี้ถูกใช้แล้ว' : 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogShell title="แก้ไขสมาชิก" onClose={onClose}>
      <Field label="Username">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-slate-800 dark:text-white"
        />
      </Field>
      <Field label="ชื่อแสดง">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-slate-800 dark:text-white"
        />
      </Field>
      <Field label="บทบาท">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-slate-800 dark:text-white"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </Field>
      {err && <p className="text-sm text-red-600 dark:text-red-400">⚠ {err}</p>}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          disabled={busy}
          className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold"
        >
          ยกเลิก
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-60"
        >
          {busy ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </DialogShell>
  );
}

function ResetPasswordDialog({
  user,
  onClose,
}: {
  user: AppUser;
  onClose: () => void;
}) {
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setMsg(null);
    if (pwd.length < 4) {
      setMsg({ type: 'err', text: 'password ต้องมีอย่างน้อย 4 ตัวอักษร' });
      return;
    }
    if (pwd !== pwd2) {
      setMsg({ type: 'err', text: 'password ไม่ตรงกัน' });
      return;
    }
    setBusy(true);
    try {
      await resetUserPassword(user.id, pwd);
      setMsg({ type: 'ok', text: 'รีเซ็ต password สำเร็จ' });
      setPwd('');
      setPwd2('');
    } catch {
      setMsg({ type: 'err', text: 'รีเซ็ตไม่สำเร็จ' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogShell title={`Reset Password — ${user.displayName}`} onClose={onClose}>
      <Field label="Password ใหม่">
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-slate-800 dark:text-white"
          placeholder="อย่างน้อย 4 ตัวอักษร"
        />
      </Field>
      <Field label="ยืนยัน Password">
        <input
          type="password"
          value={pwd2}
          onChange={(e) => setPwd2(e.target.value)}
          className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-slate-800 dark:text-white"
        />
      </Field>
      {msg && (
        <p
          className={`text-sm ${
            msg.type === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {msg.text}
        </p>
      )}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          disabled={busy}
          className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold"
        >
          ปิด
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Key size={16} /> {busy ? 'กำลังรีเซ็ต...' : 'รีเซ็ต'}
        </button>
      </div>
    </DialogShell>
  );
}

// ── Helpers ─────────────────────────────────────────────────
function DialogShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        <ShieldCheck size={10} /> Admin
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300">
      User
    </span>
  );
}
