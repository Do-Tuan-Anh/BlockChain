import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!await currentUser()) redirect(`/${locale}/login?next=/${locale}/profile`);
  return <>{children}</>;
}
