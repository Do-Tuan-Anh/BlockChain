import { redirect } from 'next/navigation';
export default async function SellerPage({ params }: { params: Promise<{ address: string }> }) {
  redirect(`/vi/seller/${encodeURIComponent((await params).address)}`);
}
