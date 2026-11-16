import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { loginDestination } from '@/lib/login-destination';
import AccountProfile from '@/components/AccountProfile';
export const dynamic = 'force-dynamic';
export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string | string[] }> }) {
  const { locale } = await params;
  const next = loginDestination((await searchParams).next, locale);
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login?next=${encodeURIComponent(next)}`);
  if (!user.needsProfileSetup) redirect(next);
  return <AccountProfile onboarding nextPath={next} />;
}
