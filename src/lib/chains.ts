export interface ChainInfo {
  id: number;
  name: string;
  symbol: string;
}

export const SUPPORTED_CHAINS: ChainInfo[] = [
  { id: 1, name: 'Ethereum', symbol: 'ETH' },
  { id: 56, name: 'BSC (BNB Chain)', symbol: 'BNB' },
  { id: 137, name: 'Polygon', symbol: 'MATIC' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH' },
  { id: 10, name: 'Optimism', symbol: 'ETH' },
  { id: 8453, name: 'Base', symbol: 'ETH' },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX' },
  { id: 250, name: 'Fantom', symbol: 'FTM' },
  { id: 25, name: 'Cronos', symbol: 'CRO' },
  { id: 42220, name: 'Celo', symbol: 'CELO' },
  { id: 324, name: 'zkSync Era', symbol: 'ETH' },
  { id: 999999, name: 'Solana', symbol: 'SOL' }, // Using special ID for Solana
];

export const getChainName = (chainId: number): string => {
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
  return chain ? chain.name : `Chain ${chainId}`;
};

export const getChainById = (chainId: number): ChainInfo | undefined => {
  return SUPPORTED_CHAINS.find(c => c.id === chainId);
};
