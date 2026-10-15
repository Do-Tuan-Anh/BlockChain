import sharp from 'sharp';

export async function normalizeProfileImage(data: string, kind: 'avatar' | 'cover') {
  const match = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match) throw new Error('INVALID_IMAGE');
  const bytes = Buffer.from(match[1], 'base64');
  if (bytes.length > (kind === 'avatar' ? 2 : 5) * 1024 * 1024) throw new Error('INVALID_IMAGE');
  const image = sharp(bytes, { limitInputPixels: 16_000_000, failOn: 'error' });
  const metadata = await image.metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1) throw new Error('INVALID_IMAGE');
  const normalized = await image.rotate().resize(kind === 'avatar' ? 256 : 1200, kind === 'avatar' ? 256 : 400, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
  return `data:image/webp;base64,${normalized.toString('base64')}`;
}
