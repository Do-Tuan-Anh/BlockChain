import { redirect } from 'next/navigation';
export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/vi/product/${encodeURIComponent((await params).id)}`);
}
