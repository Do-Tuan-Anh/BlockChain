'use client';

import { BookOpen, Globe, LockKeyhole } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MetaMaskGuide } from './MetaMaskGuide';

export function AccountSettings() {
  const { locale } = useTranslation();
  const vi = locale === 'vi';
  return <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
    <div className="page-heading"><p className="eyebrow">YOUR PREFERENCES</p><h1 className="text-3xl font-bold">{vi ? 'Cài đặt' : 'Settings'}</h1></div>
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-6">
      <h2 className="flex items-center gap-2 font-semibold"><Globe size={20} />{vi ? 'Ngôn ngữ hiển thị' : 'Display language'}</h2>
      <p className="text-sm text-muted">{vi ? 'Chọn ngôn ngữ bạn muốn sử dụng trên ứng dụng.' : 'Choose your preferred language for the app.'}</p>
      <LanguageSwitcher />
    </section>
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-6">
      <h2 className="flex items-center gap-2 font-semibold"><LockKeyhole size={20} />{vi ? 'Bảo mật tài khoản' : 'Account security'}</h2>
      <p className="text-sm leading-6 text-muted">{vi ? 'Tài khoản được bảo vệ bằng chữ ký ví MetaMask. Mỗi địa chỉ ví là một tài khoản. Đổi account trong MetaMask sẽ yêu cầu ký đăng nhập lại. TrustChain không lưu khóa ví hoặc cụm từ khôi phục.' : 'Your account is secured by your MetaMask signature. Each address is one account. Changing MetaMask accounts requires a fresh sign-in signature. TrustChain never stores private keys or recovery phrases.'}</p>
      <a href={`/${locale}/help#metamask`} className="btn-primary">{vi ? 'Hướng dẫn bảo vệ ví' : 'Wallet security guide'}</a>
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
    { title: vi ? 'Đăng nhập và chuyển account MetaMask' : 'Sign in and switch MetaMask accounts', text: vi ? 'Chọn account và ký thông điệp đăng nhập miễn phí gas. Ví mới tự tạo hồ sơ. Khi đổi account, phiên cũ kết thúc và bạn ký lại để mở hồ sơ mới. Tên account MetaMask và tên hồ sơ web được chỉnh riêng.' : 'Choose an account and sign the gas-free login message. New addresses create a profile. Switching accounts ends the old session and asks you to sign in again. MetaMask labels and website profile names are separate.', href: 'login', action: vi ? 'Đăng nhập bằng MetaMask' : 'Sign in with MetaMask' },
  ];
  return <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
    <div><BookOpen className="mb-3 text-accent-soft" size={28} /><h1 className="text-3xl font-bold">{vi ? 'Hướng dẫn' : 'Help'}</h1><p className="mt-2 text-sm text-muted">{vi ? 'Bắt đầu với tài khoản và shop của bạn.' : 'Get started with your account and shop.'}</p></div>
    <MetaMaskGuide />
    {guides.map((guide, index) => <section key={guide.href + index} className="space-y-3 rounded-2xl border border-line bg-surface p-6"><h2 className="font-semibold">{index + 1}. {guide.title}</h2><p className="text-sm leading-7 text-secondary">{guide.text}</p><a href={`/${locale}/${guide.href}`} className="inline-block text-sm font-semibold text-accent-soft hover:underline">{guide.action} →</a></section>)}
  </div>;
}
