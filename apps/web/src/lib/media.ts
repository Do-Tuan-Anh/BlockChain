export function mediaUrl(value: string | null | undefined) {
  if (!value) return '';
  if (value.startsWith('ipfs://')) {
    const cid = value.slice(7);
    return /^b[a-z2-7]{20,120}$/.test(cid) ? `/api/ipfs/${cid}` : '';
  }
  return value;
}
