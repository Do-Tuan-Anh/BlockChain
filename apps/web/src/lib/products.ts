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
  seller: { id: string; username: string; name?: string | null; walletAddress: string | null };
}
