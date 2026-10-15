import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { TransactionHistory } from '@/components/TransactionHistory';
export const dynamic = 'force-dynamic';

export default async function TransactionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!await currentUser()) redirect(`/${locale}/login?next=/${locale}/transactions`);
  return <TransactionHistory />;
}
