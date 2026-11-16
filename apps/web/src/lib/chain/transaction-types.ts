export interface TransactionArgument { name: string; type: string; value: unknown }
export interface TransactionCall { name: string; signature: string; args: TransactionArgument[] }
export interface TransactionDetail {
  hash: string;
  chain: { chainId: number; chainName: string; scope: string; explorer: string };
  requiredConfirmations: number; confirmations: number; confirmationSatisfied: boolean;
  status: 'success' | 'failed' | 'pending' | 'not_found' | 'reorg';
  membership: 'current' | 'external' | 'before_deployment' | 'unknown';
  transaction: null | { from: string; to: string | null; valueWei: string; nonce: number; gasLimit: string; data: string; contractName: string | null; call: TransactionCall | null };
  receipt: null | { status: number; blockNumber: number; blockHash: string; timestamp: number; contractAddress: string | null; gasUsed: string; effectiveGasPriceWei: string; gasFeeWei: string };
  events: { index: number; address: string; contractName: string | null; decoded: TransactionCall | null; topics: string[]; data: string }[];
}
