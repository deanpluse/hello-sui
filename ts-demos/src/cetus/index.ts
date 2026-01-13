import { AggregatorClient } from "@cetusprotocol/aggregator-sdk";
import BN from "bn.js";
import {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { CetusClmmSDK } from "@cetusprotocol/sui-clmm-sdk";
import { SuiClient, getFullnodeUrl, SuiEvent } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import constants from "./constants";

export class Cetus {
  private globalConfig: string;
  private partner: string;
  private suiClient: SuiClient;
  private aggregatorClient: AggregatorClient;
  private clmmSdk: CetusClmmSDK;

  constructor(suiClient?: SuiClient) {
    this.globalConfig =
      "0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f";

    this.partner =
      "0x639b5e433da31739e800cd085f356e64cae222966d0f1b11bd9dc76b322ff58b";

    if (suiClient) {
      this.suiClient = suiClient;
    } else {
      this.suiClient = new SuiClient({
        url: getFullnodeUrl("mainnet"),
      });
    }

    this.aggregatorClient = new AggregatorClient({}); //todo

    this.clmmSdk = CetusClmmSDK.createSDK({ sui_client: this.suiClient });
  }
  /**
   * Get price between two coin types
   * @param fromCoinType The source coin type
   * @param fromCoinDecimal The decimal of source coin
   * @param toCoinType The target coin type
   * @param toCoinDecimal The decimal of target coin
   * @returns The price as string or null if not available
   */
  async getPrice(
    fromCoinType: string,
    fromCoinDecimal: number,
    toCoinType: string,
    toCoinDecimal: number
  ): Promise<string | null> {
    if (fromCoinDecimal < 0 || toCoinDecimal < 0) {
      throw new Error("decimal must be greater than or equal to 0");
    }

    try {
      const amount = new BN(10).pow(new BN(9));

      const routers = await this.aggregatorClient.findRouters({
        from: fromCoinType,
        target: toCoinType,
        amount,
        byAmountIn: true, // true means fix input amount, false means fix output amount
      });

      if (!routers?.routes || routers.routes.length === 0) {
        console.log("No routes found");
        return null;
      }

      // Calculate weighted average price
      let totalAmountIn = new BN(0);
      let totalAmountOut = new BN(0);

      for (const route of routers.routes) {
        const { amountIn, amountOut } = route;
        totalAmountIn = totalAmountIn.add(amountIn);
        totalAmountOut = totalAmountOut.add(amountOut);
      }

      // Calculate average price by dividing total output by total input
      const precisionMultiplier = new BN(10).pow(new BN(18)); // 10^18 for better precision
      const fromCoinDecimalBN = new BN(10).pow(new BN(fromCoinDecimal));
      const toCoinDecimalBN = new BN(10).pow(new BN(toCoinDecimal));

      const avgPriceBN = totalAmountOut
        .mul(precisionMultiplier)
        .mul(fromCoinDecimalBN)
        .div(toCoinDecimalBN)
        .div(totalAmountIn);

      const avgPriceStr = (
        Number(avgPriceBN) / Number(precisionMultiplier)
      ).toFixed(12);

      return avgPriceStr;
    } catch (error) {
      console.error("Error getting price:", error);
      return null;
    }
  }

  async getPool(fromCoinType: string, toCoinType: string) {
    let pools = await this.clmmSdk.Pool.getPoolByCoins([
      fromCoinType,
      toCoinType,
    ]);

    pools = pools.sort((a, b) => {
      return Number(BigInt(b.liquidity) - BigInt(a.liquidity));
    });

    // use the pool with the max liquidity
    return pools[0];
  }

  async getPools(fromCoinType: string, toCoinType: string) {
    let pools = await this.clmmSdk.Pool.getPoolByCoins([
      fromCoinType,
      toCoinType,
    ]);

    pools = pools.sort((a, b) => {
      return Number(BigInt(b.liquidity) - BigInt(a.liquidity));
    });

    return pools;
  }

  async getPoolId(fromCoinType: string, toCoinType: string) {
    const pool = await this.getPool(fromCoinType, toCoinType);
    return pool.id;
  }

  async swapByCoin(
    txb: Transaction,
    params: {
      fromCoinType: string;
      toCoinType: string;
      inputCoin: TransactionObjectArgument;
    },
    keypair: Ed25519Keypair
  ) {
    const { fromCoinType, toCoinType, inputCoin } = params;
    const sender = keypair.toSuiAddress();

    const pool = await this.getPool(fromCoinType, toCoinType);
    const poolId = pool.id;

    const coinTypeA = pool.coin_type_a;
    const coinTypeB = pool.coin_type_b;

    const swapDirectionFuncName =
      pool.coin_type_a === fromCoinType ? "swap_a2b" : "swap_b2a";

    const args = [
      txb.object(this.globalConfig),
      txb.object(poolId),
      txb.object(this.partner),
      inputCoin,
      txb.object(constants.CLOCK_ADDRESS),
    ];

    const publishedAt = this.aggregatorClient.publishedAtV2();

    const receieveCoin = txb.moveCall({
      target: `${publishedAt}::cetus::${swapDirectionFuncName}`,
      typeArguments: [coinTypeA, coinTypeB],
      arguments: args,
    }) as TransactionObjectArgument;

    txb.transferObjects([receieveCoin], sender);

    const simulationRes = await this.suiClient.devInspectTransactionBlock({
      transactionBlock: txb,
      sender,
    });

    if (simulationRes.effects.status.status !== "success") {
      throw new Error(
        `DryRun swap failed: ${simulationRes.effects.status.error}`
      );
    }

    const executeRes = await this.suiClient.signAndExecuteTransaction({
      transaction: txb,
      signer: keypair,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    if (executeRes.effects?.status.status !== "success") {
      throw new Error(
        `Execute swap failed: ${executeRes.effects?.status.error}`
      );
    }

    return executeRes.digest;
  }

  async parseSwapEvent(event: SuiEvent): Promise<any> {
    const { type: eventType, parsedJson } = event;

    if (eventType === constants.CETUS_SWAP_EVENT_TYPE) {
      return parsedJson;
    }
    return null;
  }
}
