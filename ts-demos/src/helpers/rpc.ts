import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

export function getSuiClient(url?: string) {
  return new SuiClient({
    url: url || getFullnodeUrl('mainnet'),
  });
}
