import { CoinStruct, CoinMetadata, SuiClient } from "@mysten/sui/client";
import constants from "../constants";
import * as rpcHelper from "./rpc";

const coinMetas = Object.values(constants.COINS);
export async function getDecimalsByType(
  coinType: string,
  suiClient?: SuiClient,
): Promise<number> {
  if (!suiClient) suiClient = rpcHelper.getSuiClient();

  // from local config
  const coinMeta = coinMetas.find(
    (coinMeta) => coinMeta.COIN_TYPE === coinType,
  );
  if (coinMeta) return coinMeta.COIN_DECIMALS;

  // from chain
  const coinMetadata = await getCoinMetadata(coinType, suiClient);
  return coinMetadata?.decimals;
}

export async function getSymbolByType(
  coinType: string,
  suiClient?: SuiClient,
): Promise<string> {
  if (!suiClient) suiClient = rpcHelper.getSuiClient();

  // from local config
  const coinMeta = coinMetas.find(
    (coinMeta) => coinMeta.COIN_TYPE === coinType,
  );
  if (coinMeta) return coinMeta.COIN_SYMBOL;

  // from chain
  const coinMetadata = await getCoinMetadata(coinType, suiClient);

  return coinMetadata?.symbol ?? null;
}

export function getSymbolByTypeByLocal(coinType: string): string | null {
  const coinMeta = coinMetas.find(
    (coinMeta) => coinMeta.COIN_TYPE === coinType,
  );
  if (coinMeta) return coinMeta.COIN_SYMBOL;
  return null;
}

export async function getCoinMetadata(
  coinType: string,
  suiClient?: SuiClient,
): Promise<CoinMetadata> {
  if (!coinType) {
    throw new Error(`coin type is null ${coinType}`);
  }

  if (!suiClient) suiClient = rpcHelper.getSuiClient();

  const maxRetries = 3;
  let retries = 0;

  let metadata = null;
  while (retries < maxRetries) {
    try {
      metadata = await _getCoinMetadata(coinType, suiClient);
      if (metadata !== null) break;
    } catch (error) {}

    await new Promise((resolve) => setTimeout(resolve, 500));
    retries++;
  }

  if (metadata === null) {
    throw new Error(
      `Failed to get metadata after ${maxRetries} retries for coin type: ${coinType}`,
    );
  }

  return metadata;
}

export async function _getCoinMetadata(
  coinType: string,
  suiClient?: SuiClient,
): Promise<CoinMetadata | null> {
  if (!suiClient) suiClient = rpcHelper.getSuiClient();

  const metadata = await suiClient.getCoinMetadata({
    coinType: coinType,
  });

  return metadata;
}

export async function getAllCoins(
  address: string,
  suiClient?: SuiClient,
): Promise<CoinStruct[]> {
  if (!suiClient) suiClient = rpcHelper.getSuiClient();

  let allCoins: CoinStruct[] = [];
  let cursor = null;

  while (true) {
    const response = await suiClient.getAllCoins({
      owner: address,
      limit: 50,
      cursor: cursor,
    });

    allCoins = [...allCoins, ...response.data];

    if (response.hasNextPage) {
      cursor = response.nextCursor;
    } else {
      break;
    }
  }

  return allCoins;
}

export async function getCoins(
  owner: string,
  coinType: string,
  suiClient?: SuiClient,
): Promise<CoinStruct[]> {
  if (!suiClient) suiClient = rpcHelper.getSuiClient();

  const limit = 50; //default and max is 50
  let coins: CoinStruct[] = [];
  let cursor = null;

  while (true) {
    let resp = await suiClient.getCoins({
      owner,
      coinType,
      limit,
      cursor: cursor,
    });
    coins = [...coins, ...resp.data];
    if (resp.hasNextPage) {
      cursor = resp.nextCursor;
    } else {
      break;
    }
  }
  return coins;
}

export async function getSuiCoins(
  owner: string,
  suiClient?: SuiClient,
): Promise<CoinStruct[]> {
  if (!suiClient) suiClient = rpcHelper.getSuiClient();

  return await getCoins(owner, constants.COINS.SUI.COIN_TYPE, suiClient);
}

export async function getBalance(
  owner: string,
  coinType: string,
  suiClient?: SuiClient,
): Promise<string> {
  if (!suiClient) suiClient = rpcHelper.getSuiClient();

  const coinBalance = await suiClient.getBalance({
    owner,
    coinType,
  });

  return coinBalance.totalBalance;
}

export function isSui(coinType: string): boolean {
  return (
    coinType === "0x2::sui::SUI" ||
    coinType ===
      "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"
  );
}

export function isSameCoinType(coinTypeA: string, coinTypeB: string): boolean {
  coinTypeA = formatCoinType(coinTypeA);
  coinTypeB = formatCoinType(coinTypeB);

  return coinTypeA.toLowerCase() === coinTypeB.toLowerCase();
}

export function formatCoinType(coinType: string): string {
  if (!coinType.startsWith("0x")) {
    coinType = `0x${coinType}`;
  }

  if (isSui(coinType)) {
    return constants.COINS.SUI.COIN_TYPE;
  }

  if (
    coinType ===
    "0x6864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS"
  ) {
    return constants.COINS["CETUS"].COIN_TYPE;
  }

  return coinType;
}

/**
 * Get coin info from local constants (synchronous)
 * Returns null if coin is not found in local config
 */
export function getCoinInfo(
  coinType: string,
): { symbol: string; decimals: number; name: string } | null {
  const coinMeta = coinMetas.find((meta) => meta.COIN_TYPE === coinType);
  if (coinMeta) {
    return {
      symbol: coinMeta.COIN_SYMBOL,
      decimals: coinMeta.COIN_DECIMALS,
      name: coinMeta.COIN_NAME,
    };
  }
  return null;
}
