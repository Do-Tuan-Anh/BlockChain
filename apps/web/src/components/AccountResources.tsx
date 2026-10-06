'use client';

import { BookOpen, Globe, LockKeyhole } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

export function AccountSettings() {
  const { locale } = useTranslation();
  const vi = locale === 'vi';
  return <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
    <h1 className="text-3xl font-bold">{vi ? 'Cài đặt' : 'Settings'}</h1>
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="flex items-center gap-2 font-semibold"><Globe size={20} />{vi ? 'Ngôn ngữ hiển thị' : 'Display language'}</h2>
      <p className="text-sm text-slate-500">{vi ? 'Chọn ngôn ngữ bạn muốn sử dụng trên ứng dụng.' : 'Choose your preferred language for the app.'}</p>
      <LanguageSwitcher />
    </section>
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="flex items-center gap-2 font-semibold"><LockKeyhole size={20} />{vi ? 'Bảo mật tài khoản' : 'Account security'}</h2>
      <p className="text-sm leading-6 text-slate-500">{vi ? 'Để đặt lại mật khẩu, yêu cầu liên kết gửi đến email đăng ký. Nếu đăng nhập bằng Google hoặc Facebook, bạn quản lý mật khẩu tại nhà cung cấp đó.' : 'Request a link at your registered email to reset your password. For Google or Facebook sign-in, manage your password with that provider.'}</p>
      <a href={`/${locale}/forgot-password`} className="inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">{vi ? 'Đặt lại mật khẩu' : 'Reset password'}</a>
    </section>
  </div>;
}

export function AccountHelp() {
  const { locale } = useTranslation();
  const vi = locale === 'vi';
  const guides = [
    { title: vi ? 'Quản lý trang cá nhân' : 'Manage your profile', text: vi ? 'Bấm avatar hoặc tên trên thanh điều hướng, chọn Trang cá nhân để xem mặt hàng của bạn. Chọn Chỉnh sửa trang cá nhân để cập nhật tên hiển thị và giới thiệu.' : 'Open the avatar menu and choose My profile to see your listings. Choose Edit profile to update your display name and bio.', href: 'profile', action: vi ? 'Mở trang cá nhân' : 'Open my profile' },
    { title: vi ? 'Tạo bài viết / Đăng mặt hàng' : 'Create a post / List a product', text: vi ? 'Trong trang cá nhân, bấm Tạo bài viết / Đăng mặt hàng. Điền thông tin và đăng bán; mặt hàng sẽ xuất hiện trong danh sách của bạn và shop công khai.' : 'In your profile, select Create post / List product. Enter the product details and publish it to your listings and public shop.', href: 'create-listing', action: vi ? 'Đăng mặt hàng' : 'List a product' },
    { title: vi ? 'Xem shop của người khác' : 'Visit another shop', text: vi ? 'Ở danh sách hoặc trang chi tiết mặt hàng, bấm tên người bán để xem giới thiệu và các mặt hàng đang bán của họ. Bạn có thể sao chép địa chỉ trang shop để chia sẻ.' : 'Select a seller’s name on a product card or detail page to see their bio and active listings. Copy the shop address to share it.', href: 'explore', action: vi ? 'Khám phá mặt hàng' : 'Explore products' },
    { title: vi ? 'Email xác thực và quên mật khẩu' : 'Verification and password recovery', text: vi ? 'Sau khi đăng ký, mở email và bấm liên kết xác thực. Nếu quên mật khẩu, dùng email đăng ký để yêu cầu liên kết đặt lại mật khẩu.' : 'After registering, open your email and follow the verification link. If you forget your password, request a reset link using your registered email.', href: 'forgot-password', action: vi ? 'Khôi phục mật khẩu' : 'Recover password' },
  ];
  return <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
    <div><BookOpen className="mb-3 text-blue-600" size={28} /><h1 className="text-3xl font-bold">{vi ? 'Hướng dẫn' : 'Help'}</h1><p className="mt-2 text-sm text-slate-500">{vi ? 'Bắt đầu với tài khoản và shop của bạn.' : 'Get started with your account and shop.'}</p></div>
    {guides.map((guide, index) => <section key={guide.href + index} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-semibold">{index + 1}. {guide.title}</h2><p className="text-sm leading-7 text-slate-600">{guide.text}</p><a href={`/${locale}/${guide.href}`} className="inline-block text-sm font-semibold text-blue-600 hover:underline">{guide.action} →</a></section>)}
  </div>;
}
