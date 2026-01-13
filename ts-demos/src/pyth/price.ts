import {
  SuiPythClient,
  SuiPriceServiceConnection,
  Price,
} from "@pythnetwork/pyth-sui-js";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { bcs } from "@mysten/sui/bcs";
import { constants } from "./constants";

export class Pyth {
  network: "MAINNET" | "TESTNET";
  connection: SuiPriceServiceConnection;

  constructor(network: "MAINNET" | "TESTNET") {
    this.network = network;
    this.connection = new SuiPriceServiceConnection(
      constants[network].SERVICE_URL
      // {
      //   priceFeedRequestConfig: { binary: true },
      // }
    );
  }

  async getPrice(feedId: string): Promise<Price | null> {
    const priceFeeds = await this.connection.getLatestPriceFeeds([feedId]);
    if (!priceFeeds) {
      throw new Error("priceFeeds is undefined");
    }

    if (!priceFeeds[0]) {
      throw new Error("priceFeeds is empty");
    }

    // Get the price if it is not older than 60 seconds from the current time.
    const price = priceFeeds[0].getPriceNoOlderThan(60);
    return price || null;

    console.log(price); // Price { conf: '1234', expo: -8, price: '12345678' }
    // Get the exponentially-weighted moving average price if it is not older than 60 seconds from the current time.
    // console.log(priceFeeds[1].getEmaPriceNoOlderThan(60));
  }

  async updatePrice(
    network: "MAINNET" | "TESTNET",
    feedId: string
  ): Promise<{
    rawValue: string;
    price: number;
    valueType: string;
  } | null> {
    const serviceUrl = constants[network].SERVICE_URL;
    const pythStateId = constants[network].PYTH_STATE_ID;
    const wormholeStateId = constants[network].WORMHOLE_STATE_ID;
    const pythPackageId = constants[network].PYTH_PACKAGE_ID;

    /// Step 1: Get the off-chain data.
    const connection = new SuiPriceServiceConnection(serviceUrl, {
      // Provide this option to retrieve signed price updates for on-chain contracts!
      priceFeedRequestConfig: {
        binary: true,
      },
    });

    // - https://pyth.network/developers/price-feed-ids for Mainnet
    // - https://www.pyth.network/developers/price-feed-ids#beta for Testnet
    const priceIDs = [feedId];
    const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIDs);

    /// Step 2: Submit the new price on-chain and verify it using the contract.
    const suiClient = new SuiClient({
      url: getFullnodeUrl(
        network.toLowerCase() as "mainnet" | "testnet" | "devnet" | "localnet"
      ),
    });

    // Fixed the StateIds using the CLI example extracting them from
    // here: https://docs.pyth.network/price-feeds/contract-addresses/sui

    const pythClient = new SuiPythClient(
      suiClient as any,
      pythStateId,
      wormholeStateId
    );

    const transaction = new Transaction();

    /// By calling the updatePriceFeeds function, the SuiPythClient adds the necessary
    /// transactions to the transaction block to update the price feeds.
    const priceInfoObjectIds = await pythClient.updatePriceFeeds(
      transaction as any,
      priceUpdateData,
      priceIDs
    );

    let suiPriceObjectId = priceInfoObjectIds[0];
    if (!suiPriceObjectId) {
      throw new Error("suiPriceObjectId is undefined");
    }

    /// This is the package id that we receive after publishing `oracle` contract from the previous step.
    transaction.moveCall({
      target: `${pythPackageId}::oracle::get_sui_price`,
      arguments: [
        transaction.object(constants.ADDRESS_MAP.CLOCK),
        transaction.object(suiPriceObjectId),
      ],
    });
    transaction.setGasBudget(100000000);

    const keypair = Ed25519Keypair.fromSecretKey(
      process.env.SUI_PRIVATE_KEY!.toLowerCase()
    );

    // const result = await suiClient.signAndExecuteTransaction({
    //   transaction,
    //   signer: keypair,
    //   options: {
    //     showEffects: true,
    //     showEvents: true,
    //   },
    // });

    const inspectResult = await suiClient.devInspectTransactionBlock({
      transactionBlock: transaction,
      sender: keypair.toSuiAddress(),
    });

    const lastResult =
      inspectResult!.results![inspectResult!.results!.length - 1];
    if (lastResult.returnValues && lastResult.returnValues.length > 0) {
      const returnValue = lastResult.returnValues[0];
      const [valueBytes, valueType] = returnValue;
      console.log({
        valueBytes,
        valueType,
      }); // todo: parse data
    }

    return null;
  }
}
