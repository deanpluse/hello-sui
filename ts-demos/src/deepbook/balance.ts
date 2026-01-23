import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { BalanceInfo, AccountInfo } from "./types";
import { getSuiClient } from "../helpers/rpc";
import DeepBookConstants from "./constants";

const logger = console;

/**
 * Create a new Balance Manager
 * @param txb Transaction block to add the creation to
 * @returns Transaction result containing the Balance Manager object
 */
export function createBalanceManager(txb: Transaction) {
  const balanceManager = txb.moveCall({
    target: `${DeepBookConstants.PACKAGE_ID}::balance_manager::new`,
    arguments: [],
  });

  return balanceManager;
}

/**
 * Deposit funds into a Balance Manager
 * @param txb Transaction block
 * @param balanceManagerId Balance Manager object ID
 * @param coin Coin object to deposit
 * @param coinType Full coin type string
 */
export function deposit(
  txb: Transaction,
  balanceManagerId: string,
  coin: any,
  coinType: string,
) {
  txb.moveCall({
    target: `${DeepBookConstants.PACKAGE_ID}::balance_manager::deposit`,
    typeArguments: [coinType],
    arguments: [txb.object(balanceManagerId), coin],
  });
}

/**
 * Withdraw funds from a Balance Manager
 * @param txb Transaction block
 * @param balanceManagerId Balance Manager object ID
 * @param amount Amount to withdraw
 * @param coinType Full coin type string
 * @returns Transaction result containing the withdrawn coin
 */
export function withdraw(
  txb: Transaction,
  balanceManagerId: string,
  amount: bigint,
  coinType: string,
) {
  return txb.moveCall({
    target: `${DeepBookConstants.PACKAGE_ID}::balance_manager::withdraw`,
    typeArguments: [coinType],
    arguments: [
      txb.object(balanceManagerId),
      txb.pure.u64(amount),
    ],
  });
}

/**
 * Withdraw all funds from a Balance Manager
 * @param txb Transaction block
 * @param balanceManagerId Balance Manager object ID
 * @param coinType Full coin type string
 * @returns Transaction result containing the withdrawn coin
 */
export function withdrawAll(
  txb: Transaction,
  balanceManagerId: string,
  coinType: string,
) {
  return txb.moveCall({
    target: `${DeepBookConstants.PACKAGE_ID}::balance_manager::withdraw_all`,
    typeArguments: [coinType],
    arguments: [txb.object(balanceManagerId)],
  });
}

/**
 * Get balance in a Balance Manager for a specific coin type
 * @param balanceManagerId Balance Manager object ID
 * @param coinType Full coin type string
 * @param client Optional SuiClient instance
 * @returns Balance amount
 */
export async function getBalance(
  balanceManagerId: string,
  coinType: string,
  client?: SuiClient,
): Promise<bigint> {
  try {
    const suiClient = client || getSuiClient();

    // Get the Balance Manager object
    const bmObject = await suiClient.getObject({
      id: balanceManagerId,
      options: { showContent: true },
    });

    if (
      !bmObject.data?.content ||
      bmObject.data.content.dataType !== "moveObject"
    ) {
      logger.warn(`Balance Manager not found: ${balanceManagerId}`);
      return 0n;
    }

    // Parse balances from the object fields
    const fields = bmObject.data.content.fields as any;
    const balances = fields.balances || {};

    // Look for the coin type in the balances
    // Note: This is a simplified implementation
    // The actual structure depends on DeepBook's Balance Manager implementation
    return BigInt(balances[coinType] || 0);
  } catch (error) {
    logger.error(
      `Error fetching balance for ${balanceManagerId}, ${coinType}:`,
      error,
    );
    return 0n;
  }
}

/**
 * Get all balances in a Balance Manager
 * @param balanceManagerId Balance Manager object ID
 * @param client Optional SuiClient instance
 * @returns Map of coin type to balance amount
 */
export async function getAllBalances(
  balanceManagerId: string,
  client?: SuiClient,
): Promise<Map<string, bigint>> {
  try {
    const suiClient = client || getSuiClient();

    // Get the Balance Manager object
    const bmObject = await suiClient.getObject({
      id: balanceManagerId,
      options: { showContent: true },
    });

    if (
      !bmObject.data?.content ||
      bmObject.data.content.dataType !== "moveObject"
    ) {
      logger.warn(`Balance Manager not found: ${balanceManagerId}`);
      return new Map();
    }

    // Parse balances from the object fields
    const fields = bmObject.data.content.fields as any;
    const balances = fields.balances || {};

    const balanceMap = new Map<string, bigint>();
    for (const [coinType, amount] of Object.entries(balances)) {
      balanceMap.set(coinType, BigInt(amount as any));
    }

    return balanceMap;
  } catch (error) {
    logger.error(
      `Error fetching all balances for ${balanceManagerId}:`,
      error,
    );
    return new Map();
  }
}

/**
 * Get account information in a pool
 * Note: This requires querying the pool's account data for the Balance Manager
 * @param poolId Pool object ID
 * @param balanceManagerId Balance Manager object ID
 * @param client Optional SuiClient instance
 * @returns Account information including balances and orders
 */
export async function getAccountInfo(
  poolId: string,
  balanceManagerId: string,
  client?: SuiClient,
): Promise<AccountInfo | null> {
  try {
    const suiClient = client || getSuiClient();

    // Get the pool object
    const poolObject = await suiClient.getObject({
      id: poolId,
      options: { showContent: true },
    });

    if (
      !poolObject.data?.content ||
      poolObject.data.content.dataType !== "moveObject"
    ) {
      logger.warn(`Pool not found: ${poolId}`);
      return null;
    }

    // Query dynamic fields to get account info
    // Note: This is a simplified implementation
    // The actual structure depends on DeepBook's pool implementation
    const fields = poolObject.data.content.fields as any;

    // TODO: Implement proper account info extraction
    // This would require querying the pool's dynamic fields for the specific account
    logger.warn(
      "getAccountInfo is not fully implemented. Returns null for now.",
    );
    return null;
  } catch (error) {
    logger.error(
      `Error fetching account info for pool ${poolId}, balance manager ${balanceManagerId}:`,
      error,
    );
    return null;
  }
}

export default {
  createBalanceManager,
  deposit,
  withdraw,
  withdrawAll,
  getBalance,
  getAllBalances,
  getAccountInfo,
};
