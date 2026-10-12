export type ContractName = 'MarketplaceNFT' | 'Marketplace' | 'Escrow' | 'DisputeResolution' | 'Reputation' | 'FeeManager';
export interface ChainConfig {
  scope: string; chainId: number; chainName: string; deploymentBlock: number; deploymentBlockHash: string;
  contracts: Record<ContractName, string>; transactions: Record<ContractName, string>;
  explorer: string; walletRpcUrl: string; confirmations: number; gateway: string; arbitrator: string;
}
export interface ChainRecord { kind: string; key: string; data: Record<string, string | boolean | number> }
export interface ChainSnapshot { config: ChainConfig; records: ChainRecord[]; checkpoint: { blockNumber: number; updatedAt: string } | null; error?: string }
