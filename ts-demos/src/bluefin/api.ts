import {
  QueryChain,
  OnChainCalls,
} from "@firefly-exchange/library-sui/dist/src/spot";
import { SuiClient } from "@firefly-exchange/library-sui";
import {
  TickMath,
  ClmmPoolUtil,
} from "@firefly-exchange/library-sui/dist/src/spot/clmm";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { BN } from "bn.js";
import dotenv from "dotenv";
dotenv.config();

import { mainnet as mainnetConfig } from "./config";
const client = new SuiClient({ url: "https://fullnode.mainnet.sui.io:443" });
const qc = new QueryChain(client);

const SUI_PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;
const keypair = Ed25519Keypair.fromSecretKey(SUI_PRIVATE_KEY!);
console.log("====address====", keypair.getPublicKey().toSuiAddress());

/// Parameters:
/// - poolID          : The id of the the pool ex: 0x3b585786b13af1d8ea067ab37101b6513a05d2f90cfe60e8b1d9e1b46a63c4fa
async function getPool(poolID: string) {
  try {
    let pool = await qc.getPool(poolID);
    // console.log("Pool info:", pool);
    return pool;
  } catch (error) {
    console.error("Error fetching pool:", error);
    throw error;
  }
}

async function getUserPositions(userAddress: string, pool_id?: string) {
  try {
    let resp = await qc.getUserPositions(
      mainnetConfig.BasePackage,
      userAddress,
      pool_id
    );
    console.log(resp);
    return resp;
  } catch (err) {
    console.error("Error fetching user position:", err);
    throw err;
  }
}

async function getPositionStatus(positionId: string) {
  try {
    let position = await qc.getPositionDetails(positionId);

    const { pool_id, lower_tick, upper_tick, liquidity } = position;

    // pool info
    const pool = await getPool(pool_id);
    const { current_tick, current_sqrt_price, coin_a, coin_b } = pool;
    const coinASymbol = coin_a.address.split("::")[2];
    const coinBSymbol = coin_b.address.split("::")[2];

    let oc = new OnChainCalls(client, mainnetConfig, {
      signer: keypair,
    });

    let feeAndRewards = await oc.getAccruedFeeAndRewards(pool, positionId);

    const is_in_range =
      current_tick >= lower_tick && current_tick <= upper_tick;

    const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lower_tick);
    const lowerPrice = TickMath.sqrtPriceX64ToPrice(
      lowerSqrtPrice,
      coin_a.decimals,
      coin_b.decimals
    );
    const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upper_tick);
    const upperPrice = TickMath.sqrtPriceX64ToPrice(
      upperSqrtPrice,
      coin_a.decimals,
      coin_b.decimals
    );
    const current_price = TickMath.sqrtPriceX64ToPrice(
      new BN(current_sqrt_price),
      coin_a.decimals,
      coin_b.decimals
    );

    const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
      new BN(liquidity),
      new BN(current_sqrt_price),
      lowerSqrtPrice,
      upperSqrtPrice,
      false
    );

    const statusInfo = {
      is_in_range,
      current_tick,
      lower_tick: lower_tick,
      upper_tick: upper_tick,
      liquidity: liquidity,
      // fee_growth_coin_a: fee_growth_coin_a,
      // fee_growth_coin_b: fee_growth_coin_b,
      // token_a_fee: token_a_fee,
      // token_b_fee: token_b_fee,
      current_price: current_price.toString(),
      lower_price: lowerPrice.toString(),
      upper_price: upperPrice.toString(),
      coinAAmount: coinAmounts.coinA.toString(),
      coinBAmount: coinAmounts.coinB.toString(),
      fee_rewards: {
        // rewards: JSON.stringify(feeAndRewards.rewards),
        fee: {
          coinA: feeAndRewards.fee.coinA.toString(),
          coinB: feeAndRewards.fee.coinB.toString(),
        },
      },
      pool: {
        coinASymbol,
        coinBSymbol,
      },
    };

    return statusInfo;
  } catch (err) {
    console.error("Error fetching position status:", err);
    throw err;
  }
}

async function closePosition(positionId: string) {
  let oc = new OnChainCalls(client, mainnetConfig, { signer: keypair });
  let qc = new QueryChain(client);

  try {
    let pos = await qc.getPositionDetails(positionId);
    let pool = await qc.getPool(pos.pool_id);
    let resp: any = await oc.closePosition(pool, positionId);
    console.log("closePosition digest:", resp.digest);
    return resp.digest;
  } catch (err) {
    console.error("Error closing position:", err);
    throw err;
  }
}

async function openPosition() {}

async function main() {
  // await getPool(
  //   "0xa701a909673dbc597e63b4586ace6643c02ac0e118382a78b9a21262a4a2e35d"
  // );
  // await getUserPositions(
  //   "0x370dd5f4de32492c1e9c446e38eee62c67e0d1f85dc7d1b4d24669b2022173ae"
  // );

  // const positionStatus = await getPositionStatus(
  //   "0xe87fa48d2d4c2d49bfbc5c45c6f7259b032a0cf665b526ea12523316903c8bb2"
  // );
  // console.log(positionStatus);

  await closePosition(
    "0x4d83e729e352f28ffe6bab8a3270a9204b09d6f37c982967570ad80b25dc4325"
  );
}

main();
