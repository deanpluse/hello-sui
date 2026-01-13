import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Scallop } from "@scallop-io/sui-scallop-sdk";
import BigNumber from "bignumber.js";
import { Transaction } from "@mysten/sui/transactions";
import { executeTransaction, dryRunTransaction } from "../utils";
import { ScallopConfig } from "./config";
import { ScallopConstants } from "@scallop-io/sui-scallop-sdk";

const scallopSDK = new Scallop({
  networkType: "mainnet",
});

export async function getMarket() {
  await scallopSDK.init();
  const scallopQuery = await scallopSDK.createScallopQuery();
  const marketData = await scallopQuery.getMarketPools();
  return marketData;
}

export async function getObligationsByOwner(ownerAddress: string) {
  await scallopSDK.init();
  const scallopQuery = await scallopSDK.createScallopQuery();

  const obligationsData = await scallopQuery.getObligations(ownerAddress);
  return obligationsData;
}

export async function getObligation(obligationId: string) {
  await scallopSDK.init();
  const scallopQuery = await scallopSDK.createScallopQuery();
  const obligationData = await scallopQuery.queryObligation(obligationId);
  return obligationData;
}

export async function getUserPortfolio(userAddress: string) {
  await scallopSDK.init();
  const scallopQuery = await scallopSDK.createScallopQuery();
  const userPortfolio = await scallopQuery.getUserPortfolio({
    walletAddress: userAddress,
  });
  return userPortfolio;
}

export async function getObligationAccount(
  obligationId: string,
  ownerAddress: string
) {
  await scallopSDK.init();
  const scallopQuery = await scallopSDK.createScallopQuery();
  const obligationAccount = await scallopQuery.getObligationAccount(
    obligationId,
    ownerAddress
  );
  return obligationAccount;
}

export async function getLiquidityRiskLevel(
  obligationId: string,
  ownerAddress: string
) {
  const obligationAccount = await getObligationAccount(
    obligationId,
    ownerAddress
  );
  return obligationAccount!.totalRiskLevel;
}

export const getObligationRiskLevel = async (
  obligation: string,
  indexer: boolean = false
) => {
  await scallopSDK.init();
  const scallopQuery = await scallopSDK.createScallopQuery();

  const market = await scallopQuery.getMarketPools(undefined, { indexer });
  const coinPrices = await scallopQuery.getAllCoinPrices({
    marketPools: market.pools,
  });

  const obligationQuery = await scallopQuery.queryObligation(obligation);

  let totalRequiredCollateralValue = BigNumber(0);
  let totalBorrowedValueWithWeight = BigNumber(0);

  // Calculate total required collateral value from collaterals
  for (const assetCoinName of Array.from(
    scallopQuery.constants.whitelist.collateral
  )) {
    const collateral = obligationQuery?.collaterals.find((collateral) => {
      const collateralCoinName = scallopQuery.utils.parseCoinNameFromType(
        collateral.type.name
      );
      return assetCoinName === collateralCoinName;
    });

    const marketCollateral = market.collaterals[assetCoinName];
    const coinDecimal = scallopQuery.utils.getCoinDecimal(assetCoinName);
    const coinPrice = coinPrices?.[assetCoinName];

    if (marketCollateral && coinPrice) {
      const depositedAmount = BigNumber(collateral?.amount ?? 0);
      const depositedCoin = depositedAmount.shiftedBy(-1 * coinDecimal);
      const depositedValue = depositedCoin.multipliedBy(coinPrice);
      const requiredCollateralValue = depositedValue.multipliedBy(
        marketCollateral.liquidationFactor
      );

      totalRequiredCollateralValue = totalRequiredCollateralValue.plus(
        requiredCollateralValue
      );
    }
  }

  // Calculate total borrowed value with weight from debts
  const borrowAssetCoinNames: string[] = [
    ...new Set([
      ...Object.values(market.pools)
        .filter((t) => !!t)
        .map((pool) => pool.coinName),
    ]),
  ];

  for (const assetCoinName of borrowAssetCoinNames) {
    const debt = obligationQuery?.debts.find((debt) => {
      const poolCoinName = scallopQuery.utils.parseCoinNameFromType(
        debt.type.name
      );
      return assetCoinName === poolCoinName;
    });

    const marketPool = market.pools[assetCoinName];
    const coinDecimal = scallopQuery.utils.getCoinDecimal(assetCoinName);
    const coinPrice = coinPrices?.[assetCoinName];

    if (marketPool && coinPrice) {
      const increasedRate = debt?.borrowIndex
        ? marketPool.borrowIndex / Number(debt.borrowIndex) - 1
        : 0;
      const borrowedAmount = BigNumber(debt?.amount ?? 0).multipliedBy(
        increasedRate + 1
      );
      const borrowedCoin = borrowedAmount.shiftedBy(-1 * coinDecimal);
      const borrowedValue = borrowedCoin.multipliedBy(coinPrice);
      const borrowedValueWithWeight = borrowedValue.multipliedBy(
        marketPool.borrowWeight
      );

      totalBorrowedValueWithWeight = totalBorrowedValueWithWeight.plus(
        borrowedValueWithWeight
      );
    }
  }

  // Calculate risk level
  let riskLevel = totalRequiredCollateralValue.isZero()
    ? // Note: when there is no collateral and debt is not zero, then it's a bad-debt situation.
      totalBorrowedValueWithWeight.isGreaterThan(0)
      ? BigNumber(1)
      : BigNumber(0)
    : totalBorrowedValueWithWeight.dividedBy(totalRequiredCollateralValue);
  // Note: 100% represents the safety upper limit. Even if it exceeds 100% before it is liquidated, it will only display 100%.
  riskLevel = riskLevel.isLessThan(1) ? riskLevel : BigNumber(1);

  return riskLevel.toNumber();
};

export interface LiquidateParams {
  obligation: string;
  debtCoinType: string;
  collateralCoinType: string;
  repayAmount: number;
}


export async function liquidate(
  suiClient: SuiClient,
  signer: Ed25519Keypair,
  { obligation, debtCoinType, collateralCoinType, repayAmount }: LiquidateParams
) {
  await scallopSDK.init();

  const txb = new Transaction();

  const balance = await suiClient.getBalance({
    owner: signer.toSuiAddress(),
    coinType: debtCoinType,
  });

  // Check if user has enough balance
  if (BigNumber(balance.totalBalance).isLessThan(repayAmount)) {
    throw new Error(
      `Insufficient balance. Required: ${repayAmount}, Available: ${balance.totalBalance}`
    );
  }

  // Get coins for repayment
  const coins = await suiClient.getCoins({
    owner: signer.toSuiAddress(),
    coinType: debtCoinType,
  });

  if (coins.data.length === 0) {
    throw new Error(`No coins found for type: ${debtCoinType}`);
  }

  // Use the first coin as the primary coin for splitting
  const primaryCoin = coins.data[0]; //todo: if there are multiple coins, we need to merge them first

  // If we have multiple coins, merge them first
  if (coins.data.length > 1) {
    const otherCoins = coins.data.slice(1).map((coin) => coin.coinObjectId);
    txb.mergeCoins(primaryCoin.coinObjectId, otherCoins);
  }

  // Split coins for repayment
  const [repayCoin] = txb.splitCoins(primaryCoin.coinObjectId, [repayAmount]);

  txb.moveCall({
    target: `${ScallopConfig.protocol}::liquidate::liquidate`,
    typeArguments: [debtCoinType, collateralCoinType],
    arguments: [
      txb.object(ScallopConfig.version), // version
      txb.object(obligation), // obligation
      txb.object(ScallopConfig.market), // market
      repayCoin, // repay coin
      txb.object(ScallopConfig.coin_decimals_registry), // coin decimals registry
      txb.object(ScallopConfig.x_oracle), // x_oracle
      txb.object(ScallopConfig.clock), // clock
    ],
  });

  const result = await executeTransaction(suiClient, txb, signer);

  return result;
}

export async function getAllAddresses() {
  const scallopConstants = new ScallopConstants();

  await scallopConstants.init();

  const addresses = scallopConstants.getAllAddresses();
  // console.log(addresses.mainnet.core.packages);
  return addresses;
}
