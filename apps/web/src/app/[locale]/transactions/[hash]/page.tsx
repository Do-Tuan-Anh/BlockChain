import { TransactionDetails } from '@/components/TransactionDetails';
export default async function TransactionPage({ params, searchParams }: { params: Promise<{ hash: string }>; searchParams: Promise<{ scope?: string | string[] }> }) {
  const { hash } = await params, { scope } = await searchParams;
  return <TransactionDetails hash={hash} scope={typeof scope === 'string' ? scope : undefined} />;
}
