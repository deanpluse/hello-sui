import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { getDeepBookClient } from "./protocol";
import {
  PoolInfo,
  TokenPair,
  PoolRegistry,
  PoolDetailFromIndexer,
  PoolType,
} from "./types";
import { getSuiClient } from "../helpers/rpc";

const logger = console;

/**
 * Get pool information by pool ID
 * @param poolId The pool object ID
 * @param client Optional SuiClient instance
 * @returns Pool information including trading parameters
 */
export async function getPoolInfo(
  poolId: string,
  client?: SuiClient,
): Promise<PoolInfo | null> {
  try {
    const suiClient = client || getSuiClient();
    const poolObject = await suiClient.getObject({
      id: poolId,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (!poolObject.data || !poolObject.data.content) {
      logger.warn(`Pool not found: ${poolId}`);
      return null;
    }

    const content = poolObject.data.content;
    if (content.dataType !== "moveObject") {
      logger.warn(`Invalid pool object type: ${content.dataType}`);
      return null;
    }

    // Extract type arguments for base and quote assets
    const poolType = poolObject.data.type;
    if (!poolType) {
      logger.warn(`Pool type not found: ${poolId}`);
      return null;
    }

    const typeMatch = poolType.match(/<(.+),\s*(.+)>/);
    if (!typeMatch) {
      logger.warn(`Failed to parse pool type: ${poolType}`);
      return null;
    }

    const [, baseAsset, quoteAsset] = typeMatch;

    // DeepBook V3 uses Versioned wrapper, need to access dynamic field
    const fields = content.fields as any;

    // Get the inner versioned object ID
    const versionedId = fields.inner?.fields?.id?.id || fields.id?.id;
    if (!versionedId) {
      logger.warn(`Could not find versioned ID in pool: ${poolId}`);
      return null;
    }

    // Read the dynamic field that contains actual pool data
    // The key is the version number (usually "1")
    const version = fields.inner?.fields?.version || "1";

    const dynamicField = await suiClient.getDynamicFieldObject({
      parentId: versionedId,
      name: {
        type: "u64",
        value: version,
      },
    });

    if (!dynamicField.data || !dynamicField.data.content) {
      logger.warn(`Could not read dynamic field for pool: ${poolId}`);
      return null;
    }

    const dynamicContent = dynamicField.data.content;
    if (dynamicContent.dataType !== "moveObject") {
      logger.warn(`Invalid dynamic field type: ${dynamicContent.dataType}`);
      return null;
    }

    const poolData = (dynamicContent.fields as any).value?.fields;
    if (!poolData) {
      logger.warn(`Could not find pool data in dynamic field: ${poolId}`);
      return null;
    }

    // Now we can access the actual pool parameters
    const state = poolData.state?.fields;
    const book = poolData.book?.fields;

    if (!state || !book) {
      logger.warn(`Missing state or book data for pool: ${poolId}`);
      return null;
    }

    // Extract governance parameters from state
    const governance = state.governance?.fields;
    const stable = governance?.stable || false;
    const whitelisted = governance?.whitelisted || false;
    const takerFee = governance?.trade_params?.fields?.taker_fee || "0";
    const makerFee = governance?.trade_params?.fields?.maker_fee || "0";
    const stakeRequired =
      governance?.trade_params?.fields?.stake_required || "0";

    // Extract book parameters
    const lotSize = book.lot_size || "0";
    const tickSize = book.tick_size || "0";
    const minSize = book.min_size || "0";

    return {
      poolId,
      baseAsset: baseAsset.trim(),
      quoteAsset: quoteAsset.trim(),
      lotSize: BigInt(lotSize),
      tickSize: BigInt(tickSize),
      minSize: BigInt(minSize),
      takerFee: BigInt(takerFee),
      makerFee: BigInt(makerFee),
      stakeRequired: BigInt(stakeRequired),
      stable,
      whitelisted,
    };
  } catch (error) {
    logger.error(`Error fetching pool info for ${poolId}:`, error);
    return null;
  }
}

/**
 * Find pools by token pair
 * @param baseAsset Base asset type
 * @param quoteAsset Quote asset type
 * @param client Optional SuiClient instance
 * @returns Array of pool IDs matching the token pair
 */
export async function getPoolsByTokens(
  coinTypes: string[],
  client?: SuiClient,
): Promise<PoolRegistry[]> {
  try {
    const pools = await getAllPools(client);

    const matchingPools = pools.filter(
      (pool) =>
        (pool.baseAsset === coinTypes[0] && pool.quoteAsset === coinTypes[1]) ||
        (pool.baseAsset === coinTypes[1] && pool.quoteAsset === coinTypes[0]),
    );

    return matchingPools;
  } catch (error) {
    logger.error(`Error finding pools for ${coinTypes}:`, error);
    return [];
  }
}

/**
 * Get pool trade parameters (fees, stake required)
 * @param poolId The pool object ID
 * @param client Optional SuiClient instance
 * @returns Object with taker fee, maker fee, and stake required
 */
export async function getPoolTradeParams(
  poolId: string,
  client?: SuiClient,
): Promise<{
  takerFee: bigint;
  makerFee: bigint;
  stakeRequired: bigint;
} | null> {
  const poolInfo = await getPoolInfo(poolId, client);
  if (!poolInfo) return null;

  return {
    takerFee: poolInfo.takerFee,
    makerFee: poolInfo.makerFee,
    stakeRequired: poolInfo.stakeRequired,
  };
}

/**
 * Get all available pools from DeepBook Indexer API
 * Uses the public indexer endpoint: https://deepbook-indexer.mainnet.mystenlabs.com/get_pools
 *
 * @param client Optional SuiClient instance (not used for indexer queries)
 * @returns Array of all pool registries
 */
export async function getAllPools(client?: SuiClient): Promise<PoolRegistry[]> {
  try {
    const DeepBookConstants = await import("./constants").then(
      (m) => m.default,
    );

    // Fetch pools from DeepBook Indexer API
    const response = await fetch(`${DeepBookConstants.INDEXER_URL}/get_pools`);

    if (!response.ok) {
      logger.error(
        `Indexer API error: ${response.status} ${response.statusText}`,
      );
      return [];
    }

    const pools = (await response.json()) as Array<{
      pool_id: string;
      pool_name: string;
      base_asset_id: string;
      base_asset_decimals: number;
      base_asset_symbol: string;
      base_asset_name: string;
      quote_asset_id: string;
      quote_asset_decimals: number;
      quote_asset_symbol: string;
      quote_asset_name: string;
      min_size: number;
      lot_size: number;
      tick_size: number;
    }>;

    return pools.map((pool) => ({
      poolId: pool.pool_id,
      baseAsset: pool.base_asset_id,
      quoteAsset: pool.quote_asset_id,
    }));
  } catch (error) {
    logger.error("Error fetching all pools from indexer:", error);
    return [];
  }
}

/**
 * Get all pools with detailed information from DeepBook Indexer API
 * Includes asset names, symbols, decimals, trading parameters, and pool type
 *
 * @returns Array of detailed pool information with pool type
 */
export async function getAllPoolsDetailed(): Promise<PoolDetailFromIndexer[]> {
  try {
    const DeepBookConstants = await import("./constants").then(
      (m) => m.default,
    );

    // Fetch pools from DeepBook Indexer API
    const response = await fetch(`${DeepBookConstants.INDEXER_URL}/get_pools`);

    if (!response.ok) {
      logger.error(
        `Indexer API error: ${response.status} ${response.statusText}`,
      );
      return [];
    }

    const poolsData = await response.json();
    const pools = poolsData as Array<{
      pool_id: string;
      pool_name: string;
      base_asset_id: string;
      base_asset_decimals: number;
      base_asset_symbol: string;
      base_asset_name: string;
      quote_asset_id: string;
      quote_asset_decimals: number;
      quote_asset_symbol: string;
      quote_asset_name: string;
      min_size: number;
      lot_size: number;
      tick_size: number;
    }>;

    // Fetch pool type and trade params for each pool
    logger.log(`Fetching pool details for ${pools.length} pools...`);
    const poolsWithDetails = await Promise.all(
      pools.map(async (pool) => {
        const poolInfo = await getPoolInfo(pool.pool_id);
        const poolType = poolInfo
          ? (poolInfo.whitelisted
              ? PoolType.WHITELISTED
              : poolInfo.stable
                ? PoolType.STABLE
                : PoolType.VOLATILE)
          : PoolType.UNKNOWN;

        return {
          poolId: pool.pool_id,
          poolName: pool.pool_name,
          poolType: poolType,
          takerFee: poolInfo?.takerFee.toString() || "0",
          makerFee: poolInfo?.makerFee.toString() || "0",
          stakeRequired: poolInfo?.stakeRequired.toString() || "0",
          baseAssetId: pool.base_asset_id,
          baseAssetDecimals: pool.base_asset_decimals,
          baseAssetSymbol: pool.base_asset_symbol,
          baseAssetName: pool.base_asset_name,
          quoteAssetId: pool.quote_asset_id,
          quoteAssetDecimals: pool.quote_asset_decimals,
          quoteAssetSymbol: pool.quote_asset_symbol,
          quoteAssetName: pool.quote_asset_name,
          minSize: pool.min_size,
          lotSize: pool.lot_size,
          tickSize: pool.tick_size,
        };
      }),
    );

    logger.log(`Successfully fetched details for all pools`);
    return poolsWithDetails;
  } catch (error) {
    logger.error("Error fetching detailed pools from indexer:", error);
    return [];
  }
}

export async function getSupportedTokens() {
  try {
    const pools = await getAllPoolsDetailed();
    return pools.map((pool) => pool.baseAssetId);
  } catch (error) {
    logger.error("Error fetching supported tokens from indexer:", error);
    return [];
  }
}

/**
 * Check if a pool is a stable pool based on its fee parameters
 * @param poolId The pool object ID
 * @param client Optional SuiClient instance
 * @returns Boolean indicating if the pool is a stable pool
 */
export async function isStablePool(
  poolId: string,
  client?: SuiClient,
): Promise<boolean> {
  const poolType = await getPoolType(poolId, client);
  return poolType === PoolType.STABLE;
}

/**
 * Get the pool type (stable, volatile, or whitelisted) directly from pool governance
 *
 * @param poolId The pool object ID
 * @param client Optional SuiClient instance
 * @returns PoolType enum value
 */
export async function getPoolType(
  poolId: string,
  client?: SuiClient,
): Promise<PoolType> {
  try {
    const poolInfo = await getPoolInfo(poolId, client);
    if (!poolInfo) {
      return PoolType.UNKNOWN;
    }

    // Check pool type flags from governance
    if (poolInfo.whitelisted) {
      return PoolType.WHITELISTED;
    }

    if (poolInfo.stable) {
      return PoolType.STABLE;
    }

    // If neither whitelisted nor stable, it's a volatile pool
    return PoolType.VOLATILE;
  } catch (error) {
    logger.error(`Error getting pool type for ${poolId}:`, error);
    return PoolType.UNKNOWN;
  }
}

export default {
  getPoolInfo,
  getPoolsByTokens,
  getPoolTradeParams,
  getAllPools,
  getAllPoolsDetailed,
  getSupportedTokens,
  isStablePool,
  getPoolType,
};
