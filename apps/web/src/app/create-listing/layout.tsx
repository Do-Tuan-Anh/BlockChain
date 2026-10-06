import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!await currentUser()) redirect('/login?next=/create-listing');
  return <>{children}</>;
}
