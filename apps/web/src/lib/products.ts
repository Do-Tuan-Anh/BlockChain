export interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  brand: string | null;
  model: string | null;
  price: string;
  currency: string;
  imageUrl: string | null;
  nftTokenId: string | null;
  status?: string;
  chainScope?: string | null;
  metadataUri?: string | null;
  mintWallet?: string | null;
  mintTxHash?: string | null;
  listingId?: string | null;
  seller: { id: string; username: string; name?: string | null; walletAddress: string | null };
}
