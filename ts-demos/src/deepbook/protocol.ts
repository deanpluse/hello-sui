import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { DeepBookClient } from "@mysten/deepbook-v3";
import { getSuiClient } from "../helpers/rpc";
import DeepBookConstants from "./constants";

// Default address for read-only operations
const DEFAULT_ADDRESS =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

let deepBookClient: DeepBookClient | null = null;
let currentAddress: string | null = null;

/**
 * Get or create DeepBook client instance
 * @param address Optional user address for the DeepBook client. Uses default address for read-only operations if not provided.
 * @param client Optional SuiClient instance, creates new one if not provided
 * @returns DeepBookClient instance
 */
export function getDeepBookClient(
  address?: string,
  client?: SuiClient,
): DeepBookClient {
  const targetAddress = address || DEFAULT_ADDRESS;

  // Reset client if address changes
  if (currentAddress !== targetAddress) {
    deepBookClient = null;
    currentAddress = targetAddress;
  }

  if (!deepBookClient) {
    const suiClient = client || getSuiClient();
    deepBookClient = new DeepBookClient({
      client: suiClient as any,
      address: targetAddress,
      env: DeepBookConstants.ENVIRONMENT,
    });
  }
  return deepBookClient;
}

/**
 * Reset the DeepBook client instance (useful for testing)
 */
export function resetDeepBookClient(): void {
  deepBookClient = null;
}

export default {
  getDeepBookClient,
  resetDeepBookClient,
};
