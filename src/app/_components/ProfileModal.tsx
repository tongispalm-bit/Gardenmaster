'use client';

import { useState, useRef } from 'react';
import { X, Camera, Save, User } from 'lucide-react';
import { updateUserProfile, type AppUser } from '@/lib/firebase';

type Props = {
  open: boolean;
  onClose: () => void;
  user: AppUser;
  onUpdated: () => void;
};

export default function ProfileModal({ open, onClose, user, onUpdated }: Props) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [profileImage, setProfileImage] = useState(user.profileImage || '');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // จำกัดขนาด 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert('ไฟล์ใหญ่เกินไป (สูงสุด 2MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Resize to 200x200 via canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        // crop center square
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setProfileImage(dataUrl);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      alert('กรุณากรอกชื่อที่แสดง');
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile(user.id, {
        displayName: displayName.trim(),
        profileImage: profileImage || undefined,
      });
      onUpdated();
      onClose();
    } catch (e) {
      console.error(e);
      alert('บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const initials = (displayName || user.username).slice(0, 1).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-900/20 rounded-t-2xl">
          <h3 className="font-bold text-base text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <User size={18} /> โปรไฟล์
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* รูปโปรไฟล์ */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileImage}
                  alt="profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-emerald-200 dark:border-emerald-800"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border-4 border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                  <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {initials}
                  </span>
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg"
                title="เปลี่ยนรูป"
              >
                <Camera size={14} />
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              กดไอคอนกล้องเพื่ออัปโหลดรูปจากโทรศัพท์
            </p>
          </div>

          {/* ข้อมูล */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                ชื่อผู้ใช้ (username)
              </label>
              <input
                type="text"
                value={user.username}
                readOnly
                className="w-full p-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                ชื่อที่แสดง
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="ชื่อที่ต้องการแสดง"
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 ring-emerald-500 text-sm text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                สิทธิ์
              </label>
              <input
                type="text"
                value={user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้ทั่วไป'}
                readOnly
                className="w-full p-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5"
          >
            <Save size={16} />
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}
