import { currentUser } from '@/lib/auth';
import { Scale, LockKeyhole } from 'lucide-react';
export const dynamic = 'force-dynamic';
export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const vi = locale === 'vi';
  const user = await currentUser();
  if (!user || user.role !== 'ADMIN') return <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
    <Scale className="text-accent-soft" size={36} />
    <h1 className="text-3xl font-bold">{vi ? 'Phân xử tranh chấp' : 'Dispute arbitration'}</h1>
    <p className="text-sm leading-7 text-secondary">{vi ? 'Khu vực dành cho quản trị viên xem xét tranh chấp giữa người mua và người bán.' : 'This area is for administrators to review disputes between buyers and sellers.'}</p>
    <div className="rounded-2xl border border-line bg-surface p-6"><h2 className="flex items-center gap-2 font-semibold"><LockKeyhole size={18} />{vi ? 'Yêu cầu quyền quản trị viên' : 'Administrator access required'}</h2><p className="mt-3 text-sm leading-6 text-muted">{user ? (vi ? 'Tài khoản hiện tại chưa có quyền phân xử tranh chấp. Chỉ quản trị viên được cấp quyền mới có thể truy cập bảng xử lý.' : 'Your account does not have arbitration privileges. Only authorized administrators can access the console.') : (vi ? 'Đăng nhập bằng tài khoản quản trị viên để truy cập bảng xử lý.' : 'Sign in with an administrator account to access the console.')}</p></div>
    {!user && <a href={`/${locale}/login?next=/${locale}/admin`} className="inline-block rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white">{vi ? 'Đăng nhập' : 'Sign in'}</a>}
  </div>;
  return <>{children}</>;
}
