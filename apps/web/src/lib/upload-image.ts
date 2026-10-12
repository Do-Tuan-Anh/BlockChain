import type { Product } from './products';
export async function uploadProductImage(productId: string, file: File): Promise<Product> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Chọn PNG/JPG/WebP tối đa 5 MB / Choose PNG/JPG/WebP up to 5 MB.');
  const image = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
  });
  const res = await fetch(`/api/products/${productId}/image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'IPFS_UPLOAD_FAILED');
  return data.product;
}
