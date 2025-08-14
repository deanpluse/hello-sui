import { SuiClient } from "@mysten/sui/client";
import { AlphalendClient } from "@alphafi/alphalend-sdk";

export class Alphalend {
  private alphalendClient: AlphalendClient;

  constructor(suiClient?: SuiClient) {
    if (!suiClient) {
      suiClient = new SuiClient({
        url: "https://rpc.mainnet.sui.io",
      });
    }
    this.alphalendClient = new AlphalendClient("mainnet", suiClient);
  }

  async getUserPortfolio(address: string) {
    const userPortfolio = await this.alphalendClient.getUserPortfolio(address);
    console.log(userPortfolio);
  }
}
