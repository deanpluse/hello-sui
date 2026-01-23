// Type definitions for DeepBook V3

export interface PoolInfo {
  poolId: string;
  baseAsset: string;
  quoteAsset: string;
  lotSize: bigint;
  tickSize: bigint;
  minSize: bigint;
  takerFee: bigint;
  makerFee: bigint;
  stakeRequired: bigint;
  stable: boolean;
  whitelisted: boolean;
}

export interface BalanceInfo {
  base: bigint;
  quote: bigint;
  deep: bigint;
}

export interface AccountInfo {
  openOrders: string[];
  settledBalances: BalanceInfo;
  owedBalances: BalanceInfo;
  activeStake: bigint;
  inactiveStake: bigint;
  makerVolume: bigint;
  takerVolume: bigint;
}

export interface OrderInfo {
  orderId: string;
  clientOrderId: bigint;
  price: bigint;
  quantity: bigint;
  filled: bigint;
  isBid: boolean;
  expire_timestamp: bigint;
  selfMatchingOption: number;
}

export interface SwapParams {
  poolId: string;
  balanceManagerId: string;
  inputCoinType: string;
  outputCoinType: string;
  amount: bigint;
  minAmountOut: bigint;
  payWithDeep?: boolean;
  deepAmount?: bigint;
}

export interface LimitOrderParams {
  poolId: string;
  balanceManagerId: string;
  price: bigint;
  quantity: bigint;
  isBid: boolean;
  expireTimestamp?: bigint;
  payWithDeep?: boolean;
  clientOrderId?: bigint;
  selfMatchingOption?: number;
}

export interface TokenPair {
  baseAsset: string;
  quoteAsset: string;
}

export interface PoolRegistry {
  poolId: string;
  baseAsset: string;
  quoteAsset: string;
}

export interface PoolDetailFromIndexer {
  poolId: string;
  poolName: string;
  poolType: string;
  takerFee: string;
  makerFee: string;
  stakeRequired: string;
  baseAssetId: string;
  baseAssetDecimals: number;
  baseAssetSymbol: string;
  baseAssetName: string;
  quoteAssetId: string;
  quoteAssetDecimals: number;
  quoteAssetSymbol: string;
  quoteAssetName: string;
  minSize: number;
  lotSize: number;
  tickSize: number;
}

export interface SwapAmmParams {
  poolId: string;
  inputCoinType: string;
  inputCoin: import("@mysten/sui/transactions").TransactionObjectArgument;
  outputCoinType: string;
  deepCoin: import("@mysten/sui/transactions").TransactionObjectArgument;
  minAmountOut?: bigint;
}

export interface SwapAmmResult {
  baseCoin: import("@mysten/sui/transactions").TransactionObjectArgument;
  quoteCoin: import("@mysten/sui/transactions").TransactionObjectArgument;
  deepCoin: import("@mysten/sui/transactions").TransactionObjectArgument;
}

export enum PoolType {
  STABLE = "stable",
  VOLATILE = "volatile",
  WHITELISTED = "whitelisted",
  UNKNOWN = "unknown",
}
