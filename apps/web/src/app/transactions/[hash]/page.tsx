import { redirect } from 'next/navigation';
export default async function TransactionPage({ params, searchParams }: { params: Promise<{ hash: string }>; searchParams: Promise<{ scope?: string | string[] }> }) {
  const { hash } = await params, { scope } = await searchParams;
  redirect(`/vi/transactions/${encodeURIComponent(hash)}${typeof scope === 'string' ? `?scope=${encodeURIComponent(scope)}` : ''}`);
}
