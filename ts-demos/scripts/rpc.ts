import { SuiClient } from "@mysten/sui/client";
import * as rpc from "../src/rpc";

async function testRpcEndpoints() {
  const endpoints = [
    "https://fullnode.mainnet.sui.io:443",
    "https://sui.publicnode.com",
    "https://sui-rpc.publicnode.com",
    "https://rpc-mainnet.suiscan.xyz:443",
    "https://sui-mainnet.nodeinfra.com/",
    "https://sui-mainnet-endpoint.blockvision.org/",
    "https://mainnet-rpc.sui.chainbase.online/",

    // "https://sui-mainnet.blockeden.xyz/",
    // "https://mainnet.sui.rpcpool.com/",
    // "https://sui-mainnet-endpoint.blockvision.org/metrics",
    // "https://rpc-mainnet.suiscan.xyz/metrics",
    // "https://sui-mainnet-rpc.allthatnode.com/",
    // "https://sui-mainnet-rpc.bartestnet.com/",
    // "https://sui1mainnet-rpc.chainode.tech/",
    // "https://sui-rpc-mainnet.brightlystake.com/",
  ];

  const goodEndpoints = [];
  const badEndpoints = [];
  for (const endpoint of endpoints) {
    try {
      const suiClient = rpc.getSuiClient(endpoint);
      console.time(`${endpoint}==> `);
      const systemState = await rpc.getLatestSuiSystemState(suiClient);
      console.timeEnd(`${endpoint}==> `);
      goodEndpoints.push(endpoint);
    } catch (error) {
      console.error(
        `Error connecting to ${endpoint}:`,
        (error as Error).message
      );
      badEndpoints.push(endpoint);
    }
  }

  console.log("Good endpoints:", goodEndpoints);
  console.log("Bad endpoints:", badEndpoints);
}

async function getLatestSuiSystemState() {
  const suiClient = rpc.getSuiClient();
  const systemState = await rpc.getLatestSuiSystemState(suiClient);
  console.log("Current Epoch:", systemState.epoch);
  console.log("Epoch Duration:", systemState.epochDurationMs);
  console.log("Epoch Start Timestamp:", systemState.epochStartTimestampMs);

  console.log("Reference gas price:", systemState.referenceGasPrice);

  console.log(systemState.activeValidators[0]);
}

async function main() {
  // await getLatestSuiSystemState();
  await testRpcEndpoints();
}

main();
