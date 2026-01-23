import {
  SuiClient,
  SuiTransactionBlockResponse,
  CoinStruct,
} from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  Transaction,
  TransactionObjectArgument,
  TransactionArgument,
} from "@mysten/sui/transactions";
import * as rpcHelper from "./rpc";

export enum TransactionRunModel {
  SIMULATE_ONLY = 1,
  EXECUTE_ONLY = 2,
  SIMULATE_AND_EXECUTE = 3,
}

export async function signAndExecuteTransaction(
  tx: Transaction,
  signer: Ed25519Keypair,
  dryRun: boolean = false,
  suiClient?: SuiClient,
): Promise<any> {
  if (!suiClient) suiClient = rpcHelper.getSuiClient();
  const builtTx = await tx.build({ client: suiClient });

  let result = {
    success: true,
    error: "",
    simulation: null as any,
    execution: null as any,
  };

  if (dryRun) {
    const dryRunResult = await suiClient.dryRunTransactionBlock({
      transactionBlock: builtTx,
    });

    result.simulation = dryRunResult.effects.status;
    if (dryRunResult.effects.status.status !== "success") {
      result.success = false;
      result.error = dryRunResult.effects.status.error || "Unknown error";
      result.simulation = dryRunResult.effects.status;
      return result;
    }
  }

  const executeResult = await suiClient.signAndExecuteTransaction({
    transaction: builtTx,
    signer,
    requestType: "WaitForEffectsCert",
    options: {
      showEffects: true,
      showObjectChanges: true,
      showEvents: true,
    },
  });

  result.execution = executeResult?.effects?.status;

  if (executeResult?.effects?.status?.status !== "success") {
    result.success = false;
    result.error = executeResult?.effects?.status?.error || "Unknown error";
  }

  return result;
}

export function mergeCoin(
  tx: Transaction,
  coins: CoinStruct[],
): TransactionObjectArgument {
  if (coins.length === 0) {
    throw new Error("No coins provided for merging");
  }

  const primary = tx.object(coins[0].coinObjectId);
  if (coins.length > 1) {
    tx.mergeCoins(
      primary,
      coins.slice(1).map((coin) => tx.object(coin.coinObjectId)),
    );
  }

  return primary;
}

export function createCoinFromBalance(
  tx: Transaction,
  coinType: string,
  balance: TransactionArgument,
): any {
  return tx.moveCall({
    target: "0x2::coin::from_balance",
    typeArguments: [coinType],
    arguments: [balance],
  })[0];
}

export function convertCoinIntoBalance(
  tx: Transaction,
  coinType: string,
  coinObject: TransactionArgument,
): any {
  return tx.moveCall({
    target: "0x2::coin::into_balance",
    typeArguments: [coinType],
    arguments: [coinObject],
  })[0];
}

interface SignAndSubmitTxbResult {
  success: boolean;
  error: string;
  simulation: any;
  execution: any;
}

export async function signAndSubmitTXB(
  txb: Transaction,
  keypair: Ed25519Keypair,
  runModel: TransactionRunModel = TransactionRunModel.SIMULATE_AND_EXECUTE,
  suiClient?: SuiClient,
): Promise<SignAndSubmitTxbResult> {
  if (!suiClient) suiClient = rpcHelper.getSuiClient();

  const result: SignAndSubmitTxbResult = {
    success: true,
    error: "",
    simulation: undefined,
    execution: undefined,
  };

  if (
    runModel === TransactionRunModel.SIMULATE_ONLY ||
    runModel === TransactionRunModel.SIMULATE_AND_EXECUTE
  ) {
    const dryRunResult = await suiClient.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: keypair.toSuiAddress(),
    });

    if (dryRunResult.effects.status.status !== "success") {
      result.success = false;
      result.error = dryRunResult.effects.status.error || "";
      return result;
    }
    result.simulation = dryRunResult;
  }

  if (runModel === TransactionRunModel.SIMULATE_ONLY) return result;

  const executeResult = await suiClient.signAndExecuteTransaction({
    transaction: txb,
    signer: keypair,
    requestType: "WaitForLocalExecution",
    options: {
      showEffects: true,
      showObjectChanges: true,
      showEvents: true,
    },
  });

  if (executeResult.effects?.status.status === "failure") {
    result.success = false;
    result.error = executeResult.effects.status.error || "";
    return result;
  }

  result.execution = executeResult;

  return result;
}
