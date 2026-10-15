export type HistoryKind = 'PURCHASE' | 'SALE_CREATED' | 'SALE_PAID' | 'PURCHASE_COMPLETED' | 'REFUND' | 'SALE_REFUNDED';
export interface HistoryEntry {
  id: string;
  kind: HistoryKind;
  direction: 'in' | 'out' | 'neutral';
  amountWei: string;
  orderValueWei: string;
  feeWei: string | null;
  orderId: string;
  orderState: string;
  tokenId: string | null;
  product: { id: string; title: string } | null;
  counterparty: string;
  timestamp: string;
  blockNumber: number;
  transactionHash: string;
}
export interface TransactionHistoryData {
  wallet: string | null;
  chain: { chainId: number; chainName: string; scope: string; explorer: string };
  checkpoint: { blockNumber: number; updatedAt: string } | null;
  totals: { incomingWei: string; outgoingWei: string; escrowWei: string };
  entries: HistoryEntry[];
}
