import { Transaction } from "@mysten/sui/transactions";
import * as pool from "./pool";
import * as balance from "./balance";
import * as swap from "./swap";
import config from "../config";
import { getSuiClient } from "../helpers/rpc";

const logger = console;

/**
 * Example 1: Get all supported tokens
 */
export async function exampleGetSupportedTokens() {
  logger.info("=== Example: Get Supported Tokens ===");

  const tokens = await pool.getSupportedTokens();
  logger.info(`Found ${tokens.length} supported tokens:`);
  tokens.forEach((token) => logger.info(`  - ${token}`));

  return tokens;
}

/**
 * Example 2: Get all pools
 */
export async function exampleGetAllPools() {
  logger.info("=== Example: Get All Pools ===");

  const pools = await pool.getAllPools();
  logger.info(`Found ${pools.length} pools:`);
  pools.forEach((p) => {
    logger.info(`  Pool: ${p.poolId}`);
    logger.info(`    Base: ${p.baseAsset}`);
    logger.info(`    Quote: ${p.quoteAsset}`);
  });

  return pools;
}

/**
 * Example 3: Get pool information
 */
export async function exampleGetPoolInfo(poolId: string) {
  logger.info("=== Example: Get Pool Info ===");

  const poolInfo = await pool.getPoolInfo(poolId);
  if (!poolInfo) {
    logger.error(`Pool not found: ${poolId}`);
    return null;
  }

  logger.info(`Pool ID: ${poolInfo.poolId}`);
  logger.info(`Base Asset: ${poolInfo.baseAsset}`);
  logger.info(`Quote Asset: ${poolInfo.quoteAsset}`);
  logger.info(`Lot Size: ${poolInfo.lotSize}`);
  logger.info(`Tick Size: ${poolInfo.tickSize}`);
  logger.info(`Min Size: ${poolInfo.minSize}`);
  logger.info(`Taker Fee: ${poolInfo.takerFee}`);
  logger.info(`Maker Fee: ${poolInfo.makerFee}`);
  logger.info(`Stake Required: ${poolInfo.stakeRequired}`);

  return poolInfo;
}

/**
 * Example 4: Find pools by token pair
 */
export async function exampleFindPoolsByTokens() {
  logger.info("=== Example: Find Pools by Token Pair ===");

  const suiType = config.MAINNET.SUI_COIN_TYPE;
  const usdcType = config.MAINNET.USDC_COIN_TYPE;

  const pools = await pool.getPoolsByTokens(suiType, usdcType);
  logger.info(`Found ${pools.length} pools for SUI/USDC:`);
  pools.forEach((p) => {
    logger.info(`  Pool: ${p.poolId}`);
  });

  return pools;
}

/**
 * Example 5: Create Balance Manager and deposit funds
 * NOTE: This requires a signer with funds
 */
export async function exampleCreateBalanceManager(signerAddress: string) {
  logger.info("=== Example: Create Balance Manager ===");

  const txb = new Transaction();
  txb.setSender(signerAddress);

  // Create Balance Manager
  const balanceManager = balance.createBalanceManager(txb);

  // Transfer the Balance Manager to the sender
  txb.transferObjects([balanceManager], signerAddress);

  logger.info("Balance Manager creation transaction built");
  logger.info("Note: You need to sign and execute this transaction");

  return txb;
}

/**
 * Example 6: Build a market swap
 * NOTE: This requires an existing Balance Manager with funds
 */
export async function exampleBuildMarketSwap(
  poolId: string,
  balanceManagerId: string,
  amount: bigint,
  minAmountOut: bigint,
  signerAddress: string,
) {
  logger.info("=== Example: Build Market Swap ===");

  const poolInfo = await pool.getPoolInfo(poolId);
  if (!poolInfo) {
    logger.error(`Pool not found: ${poolId}`);
    return null;
  }

  const txb = new Transaction();
  txb.setSender(signerAddress);

  // Build market swap
  const outputCoin = await swap.buildMarketSwap(txb, {
    poolId,
    balanceManagerId,
    inputCoinType: poolInfo.baseAsset,
    outputCoinType: poolInfo.quoteAsset,
    amount,
    minAmountOut,
    payWithDeep: false,
  });

  // Transfer output coin to sender
  txb.transferObjects([outputCoin], signerAddress);

  logger.info("Market swap transaction built");
  logger.info("Note: You need to sign and execute this transaction");

  return txb;
}

/**
 * Example 7: Build a limit order
 * NOTE: This requires an existing Balance Manager with funds
 */
export async function exampleBuildLimitOrder(
  poolId: string,
  balanceManagerId: string,
  price: bigint,
  quantity: bigint,
  isBid: boolean,
  signerAddress: string,
) {
  logger.info("=== Example: Build Limit Order ===");

  const poolInfo = await pool.getPoolInfo(poolId);
  if (!poolInfo) {
    logger.error(`Pool not found: ${poolId}`);
    return null;
  }

  const txb = new Transaction();
  txb.setSender(signerAddress);

  // Build limit order
  await swap.buildLimitOrder(txb, {
    poolId,
    balanceManagerId,
    price,
    quantity,
    isBid,
    payWithDeep: false,
  });

  logger.info("Limit order transaction built");
  logger.info("Note: You need to sign and execute this transaction");

  return txb;
}

/**
 * Example 8: Get balance in Balance Manager
 */
export async function exampleGetBalance(
  balanceManagerId: string,
  coinType: string,
) {
  logger.info("=== Example: Get Balance ===");

  const bal = await balance.getBalance(balanceManagerId, coinType);
  logger.info(`Balance: ${bal}`);

  return bal;
}

/**
 * Example 9: Get all balances in Balance Manager
 */
export async function exampleGetAllBalances(balanceManagerId: string) {
  logger.info("=== Example: Get All Balances ===");

  const balances = await balance.getAllBalances(balanceManagerId);
  logger.info(`Found ${balances.size} coin types with balances:`);
  balances.forEach((amount, coinType) => {
    logger.info(`  ${coinType}: ${amount}`);
  });

  return balances;
}

/**
 * Example 10: Get account info in a pool
 */
export async function exampleGetAccountInfo(
  poolId: string,
  balanceManagerId: string,
) {
  logger.info("=== Example: Get Account Info ===");

  const accountInfo = await balance.getAccountInfo(poolId, balanceManagerId);
  if (!accountInfo) {
    logger.error("Account not found");
    return null;
  }

  logger.info(`Open Orders: ${accountInfo.openOrders.length}`);
  logger.info("Settled Balances:");
  logger.info(`  Base: ${accountInfo.settledBalances.base}`);
  logger.info(`  Quote: ${accountInfo.settledBalances.quote}`);
  logger.info(`  DEEP: ${accountInfo.settledBalances.deep}`);
  logger.info("Owed Balances:");
  logger.info(`  Base: ${accountInfo.owedBalances.base}`);
  logger.info(`  Quote: ${accountInfo.owedBalances.quote}`);
  logger.info(`  DEEP: ${accountInfo.owedBalances.deep}`);
  logger.info(`Active Stake: ${accountInfo.activeStake}`);
  logger.info(`Maker Volume: ${accountInfo.makerVolume}`);
  logger.info(`Taker Volume: ${accountInfo.takerVolume}`);

  return accountInfo;
}

/**
 * Example 11: Get swap quote
 */
export async function exampleGetSwapQuote(
  poolId: string,
  amount: bigint,
  isBid: boolean,
) {
  logger.info("=== Example: Get Swap Quote ===");

  const quote = await swap.getSwapQuote(poolId, amount, isBid);
  logger.info(`Estimated output: ${quote}`);

  return quote;
}

// Run all read-only examples
export async function runReadOnlyExamples() {
  logger.info("\n");
  logger.info("=============================================");
  logger.info("Running DeepBook V3 Read-Only Examples");
  logger.info("=============================================\n");

  try {
    // Example 1: Get supported tokens
    await exampleGetSupportedTokens();
    logger.info("\n");

    // Example 2: Get all pools
    const pools = await exampleGetAllPools();
    logger.info("\n");

    if (pools.length > 0) {
      // Example 3: Get pool info for the first pool
      await exampleGetPoolInfo(pools[0].poolId);
      logger.info("\n");
    }

    // Example 4: Find SUI/USDC pools
    await exampleFindPoolsByTokens();
    logger.info("\n");

    logger.info("✅ All read-only examples completed successfully!");
  } catch (error) {
    logger.error("❌ Error running examples:", error);
  }
}

// Export all examples
export default {
  exampleGetSupportedTokens,
  exampleGetAllPools,
  exampleGetPoolInfo,
  exampleFindPoolsByTokens,
  exampleCreateBalanceManager,
  exampleBuildMarketSwap,
  exampleBuildLimitOrder,
  exampleGetBalance,
  exampleGetAllBalances,
  exampleGetAccountInfo,
  exampleGetSwapQuote,
  runReadOnlyExamples,
};
