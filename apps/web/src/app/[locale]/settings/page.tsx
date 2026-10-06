import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { AccountSettings } from '@/components/AccountResources';
export const dynamic = 'force-dynamic';

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!await currentUser()) redirect(`/${locale}/login?next=/${locale}/settings`);
  return <AccountSettings />;
}
