import { MAINNET_CONFIG, SteammSDK } from "@suilend/steamm-sdk";

export class Steam {
  private sdk: SteammSDK;

  constructor() {
    this.sdk = new SteammSDK(MAINNET_CONFIG);
  }

  async getAllPools() {
    const pools = await this.sdk.fetchPoolData();

    // 每个池子包含价格信息
    pools.forEach((pool) => {
      console.log(`Pool ID: ${pool.poolId}`);
      console.log(`Token A Type: ${pool.coinTypeA}`);
      console.log(`Token B Type: ${pool.coinTypeB}`);
      // 注意：这里的价格是从基础 API 获取的原始价格
    });
  }

  async getPoolsByCoinTypes(coinTypes: string[]) {
    const [coinTypeA, coinTypeB] = coinTypes;

    // 获取特定代币对的池子
    const pools = await this.sdk.fetchPoolData([coinTypeA, coinTypeB]);
    return pools;
  }
}
