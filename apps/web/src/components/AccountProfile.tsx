'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Camera, LockKeyhole, UserRound } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { Avatar } from './Avatar';

interface Profile {
  name: string | null; username: string; bio: string | null; city: string | null;
  address: string | null; website: string | null; avatarUrl: string | null; image: string | null;
}
const inputClass = 'mt-2 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-accent/30 focus:ring-4 focus:ring-accent/15';

export default function AccountProfile() {
  const { locale, t } = useTranslation();
  const vi = locale === 'vi';
  const { update } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fields, setFields] = useState({ name: '', bio: '', city: '', address: '', website: '' });
  const [avatarData, setAvatarData] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/me', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      const { user } = await response.json();
      setProfile(user);
      setFields({ name: user.name || user.username, bio: user.bio || '', city: user.city || '', address: user.address || '', website: user.website || '' });
    }).catch(() => { if (!controller.signal.aborted) setError('load'); });
    return () => controller.abort();
  }, []);
  async function selectAvatar(file?: File) {
    if (!file) return;
    setSaved(false); setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setError('avatar'); if (fileInput.current) fileInput.current.value = ''; return;
    }
    setReading(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
      });
      const preview = new Image(); preview.src = data;
      await preview.decode();
      setAvatarData(data);
    } catch { setError('avatar'); }
    finally { setReading(false); if (fileInput.current) fileInput.current.value = ''; }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setSaved(false); setError('');
    try {
      const response = await fetch('/api/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fields, avatarData }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error === 'INVALID_AVATAR' ? 'avatar' : 'save'); return; }
      setProfile(result.user); setAvatarData(undefined); await update(); setSaved(true);
    } catch { setError('save'); }
    finally { setSaving(false); }
  }
  if (!profile) return <p role={error ? 'alert' : 'status'} className="p-12 text-center text-muted">{t(error ? 'common.error' : 'common.loading')}</p>;
  const avatar = avatarData === undefined ? profile.avatarUrl || profile.image : avatarData;
  return <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
    <a href={`/${locale}/profile`} className="text-sm font-medium text-accent-soft hover:underline">← {vi ? 'Về trang cá nhân' : 'Back to profile'}</a>
    <h1 className="mt-5 text-3xl sm:text-4xl font-bold">{vi ? 'Chỉnh sửa trang cá nhân' : 'Edit profile'}</h1>
    <p className="mt-2 text-sm text-muted">{vi ? 'Cập nhật ảnh đại diện và thông tin của bạn tại đây.' : 'Update your profile photo and details here.'}</p>
    <form onSubmit={save} className="mt-8 space-y-6">
      <fieldset disabled={saving || reading} className="space-y-6 disabled:opacity-70">
        <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <h2 className="font-semibold">{vi ? 'Ảnh đại diện' : 'Profile photo'}</h2>
          <div className="mt-5 flex flex-wrap items-center gap-6">
            <Avatar src={avatar} name={fields.name || profile.username} className="h-24 w-24 text-3xl ring-4 ring-accent/15" />
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent-soft focus-within:ring-2 focus-within:ring-accent"><Camera size={17} />{vi ? 'Chọn ảnh' : 'Choose photo'}<input ref={fileInput} aria-label={vi ? 'Chọn ảnh đại diện' : 'Choose profile photo'} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => void selectAvatar(event.target.files?.[0])} /></label>
                {avatar && <button type="button" onClick={() => { setAvatarData(null); setSaved(false); }} className="rounded-xl px-3 py-2 text-sm text-danger hover:bg-danger/10">{vi ? 'Xóa ảnh' : 'Remove photo'}</button>}
              </div>
              <p className="text-xs text-muted">{vi ? 'JPG, PNG hoặc WebP, tối đa 2 MB. Ảnh được cắt vuông khi lưu.' : 'JPG, PNG or WebP, up to 2 MB. Photos are cropped square on save.'}</p>
            </div>
          </div>
        </section>
        <section className="space-y-5 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <div><h2 className="flex items-center gap-2 font-semibold"><UserRound size={18} />{vi ? 'Thông tin công khai' : 'Public details'}</h2><p className="mt-2 text-xs text-muted">{vi ? 'Mọi người có thể xem những thông tin này trên trang cá nhân.' : 'These details are visible to visitors on your profile.'}</p></div>
          <div><label htmlFor="profile-name" className="text-sm font-medium">{vi ? 'Tên hiển thị' : 'Display name'}</label><input id="profile-name" value={fields.name} onChange={e => { setFields({ ...fields, name: e.target.value }); setSaved(false); }} required minLength={2} maxLength={80} autoComplete="name" className={inputClass} /></div>
          <div><label htmlFor="profile-bio" className="text-sm font-medium">{t('profile.bio')}</label><textarea id="profile-bio" rows={4} value={fields.bio} onChange={e => { setFields({ ...fields, bio: e.target.value }); setSaved(false); }} maxLength={1000} className={inputClass} /></div>
          <div><label htmlFor="profile-city" className="text-sm font-medium">{vi ? 'Tỉnh / Thành phố' : 'City / Province'}</label><input id="profile-city" value={fields.city} onChange={e => { setFields({ ...fields, city: e.target.value }); setSaved(false); }} maxLength={100} autoComplete="address-level1" className={inputClass} /></div>
          <div><label htmlFor="profile-website" className="text-sm font-medium">{vi ? 'Website / Liên kết giới thiệu' : 'Website / Profile link'}</label><input id="profile-website" type="url" placeholder="https://example.com" value={fields.website} onChange={e => { setFields({ ...fields, website: e.target.value }); setSaved(false); }} maxLength={300} pattern="https?://.*" className={inputClass} /></div>
        </section>
        <section className="space-y-4 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <h2 className="flex items-center gap-2 font-semibold"><LockKeyhole size={18} />{vi ? 'Thông tin riêng tư' : 'Private details'}</h2>
          <div><label htmlFor="profile-address" className="text-sm font-medium">{vi ? 'Địa chỉ chi tiết' : 'Street address'}</label><textarea id="profile-address" rows={2} value={fields.address} onChange={e => { setFields({ ...fields, address: e.target.value }); setSaved(false); }} maxLength={300} autoComplete="street-address" aria-describedby="address-privacy" className={inputClass} /><p id="address-privacy" className="mt-2 text-xs leading-5 text-muted">{vi ? 'Chỉ bạn xem được địa chỉ này trong phần chỉnh sửa; không hiển thị trên trang cá nhân công khai.' : 'Only you can see this address in the editor; it is not shown on your public profile.'}</p></div>
        </section>
      </fieldset>
      {error && <p role="alert" className="rounded-xl bg-danger/10 p-4 text-sm text-danger">{error === 'avatar' ? (vi ? 'Ảnh không hợp lệ. Chọn ảnh JPG, PNG hoặc WebP dưới 2 MB, tối đa 16 triệu điểm ảnh.' : 'Invalid photo. Choose JPG, PNG or WebP under 2 MB, up to 16 megapixels.') : t('common.error')}</p>}
      {saved && <p role="status" className="rounded-xl bg-positive/10 p-4 text-sm text-positive">{t('profile.saved')}</p>}
      <div className="flex items-center justify-end gap-4"><a href={`/${locale}/profile`} className="rounded-xl px-5 py-3 text-sm text-secondary hover:bg-elevated">{vi ? 'Hủy' : 'Cancel'}</a><button type="submit" disabled={saving || reading} className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">{t(saving ? 'profile.saving' : 'profile.saveChanges')}</button></div>
    </form>
  </div>;
}
