import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";

export function getKeyPairByPrivateKey(privateKey: string): Ed25519Keypair {
  const { secretKey } = decodeSuiPrivateKey(privateKey);

  return Ed25519Keypair.fromSecretKey(secretKey);
}

export function randomKeyPair(): Ed25519Keypair {
  return Ed25519Keypair.generate();
}

export function randomAddress(): string {
  return randomKeyPair().toSuiAddress();
}

export async function dryRunTransaction(
  client: SuiClient,
  tx: Transaction,
  signer: Ed25519Keypair
) {
  tx.setGasBudget(50000000);
  tx.setSender(signer.toSuiAddress());

  const builtTx = await tx.build({ client });

  const dryRunResult = await client.dryRunTransactionBlock({
    transactionBlock: builtTx,
  });

  const dryRunSuccess = dryRunResult.effects.status.status === "success";

  console.log(`dryRunSuccess: ${dryRunSuccess}`);
  if (!dryRunSuccess) {
    throw new Error(`Transaction failed: ${dryRunResult.effects.status.error}`);
  }
}

export async function executeTransaction(
  client: SuiClient,
  tx: Transaction,
  signer: Ed25519Keypair
) {
  tx.setGasBudget(50000000);
  tx.setSender(signer.toSuiAddress());

  const builtTx = await tx.build({ client });

  const dryRunResult = await client.dryRunTransactionBlock({
    transactionBlock: builtTx,
  });

  const dryRunSuccess = dryRunResult.effects.status.status === "success";

  console.log(`dryRunSuccess: ${dryRunSuccess}`);
  if (!dryRunSuccess) {
    throw new Error(`Transaction failed: ${dryRunResult.effects.status.error}`);
  }

  const result = await client.signAndExecuteTransaction({
    transaction: builtTx,
    signer,
    requestType: "WaitForLocalExecution",
    options: {
      showEffects: true,
      showObjectChanges: true,
      showEvents: true,
    },
  });

  if (result.effects?.status.status === "failure") {
    throw new Error(`Transaction failed: ${result.effects.status.error}`);
  }

  return result;
}
