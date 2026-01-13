import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

export enum Network {
  MAINNET = "mainnet",
  TESTNET = "testnet",
  DEVNET = "devnet",
}

// export function getSuiClient(network: Network = Network.MAINNET) {
//   const suiClient = new SuiClient({
//     url: getFullnodeUrl(network as Network),
//   });
//   return suiClient;
// }

export function getSuiClient(url?: string) {
  if (!url) {
    url = getFullnodeUrl(Network.MAINNET);
  }
  const suiClient = new SuiClient({ url });
  return suiClient;
}

export async function getTransactionBlock(
  txDigest: string,
  suiClient: SuiClient
) {
  const resp = await suiClient.getTransactionBlock({
    digest: txDigest,
    options: {
      showBalanceChanges: true,
      showEffects: true,
      showEvents: true,
      showInput: true,
      showObjectChanges: true,
      showRawEffects: true,
      showRawInput: true,
    },
  });

  return resp;
}

export async function getLatestSuiSystemState(suiClient: SuiClient) {
  const systemState = await suiClient.getLatestSuiSystemState();
  return systemState;
}
