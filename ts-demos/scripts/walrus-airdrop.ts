import dotenv from "dotenv";
dotenv.config();
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getKeypairFromPrivateKey } from "../src/utils/keypair";

const PACKAGE_ID =
  "0x98af8b8fde88f3c4bdf0fcedcf9afee7d10f66d480b74fb5a3a2e23dc7f5a564";
const AIRDROP_CONFIG_ID =
  "0x194ddb7dcc480aabc981d976c6327a7bb610de0d7aa6e2c29783cf9d59da7bb3";

class WalrusAirdropClient {
  constructor(
    private suiClient: SuiClient,
    private keypair: Ed25519Keypair
  ) {}

  // 查询地址的空投信息
  async queryAirdrops(address: string) {
    const airdropObjects = await this.suiClient.getOwnedObjects({
      owner: address,
      filter: {
        StructType: `${PACKAGE_ID}::airdrop::WALAirdrop`,
      },
      options: {
        showContent: true,
        showType: true,
      },
    });

    const airdrops = [];

    for (const obj of airdropObjects.data) {
      if (obj.data?.content?.dataType === "moveObject") {
        const fields = obj.data.content.fields as any;

        // 查询关联的 Locked 对象
        const lockedObject = await this.suiClient.getObject({
          id: fields.locked_id,
          options: { showContent: true },
        });

        let availableBalance = 0;
        if (lockedObject.data?.content?.dataType === "moveObject") {
          const lockedFields = lockedObject.data.content.fields as any;
          availableBalance = parseInt(lockedFields.balance);
        }

        airdrops.push({
          airdropId: obj.data.objectId,
          lockedId: fields.locked_id,
          initialAllocation: parseInt(fields.initial_allocation),
          allocationWithdrawn: fields.allocation_withdrawn,
          availableBalance: availableBalance,
        });
      }
    }

    return airdrops;
  }

  // 检查是否可以提取
  async canWithdraw(): Promise<boolean> {
    const configObject = await this.suiClient.getObject({
      id: AIRDROP_CONFIG_ID,
      options: { showContent: true },
    });

    if (configObject.data?.content?.dataType === "moveObject") {
      const fields = configObject.data.content.fields as any;
      const unlockTime = fields.unlock_timestamp_ms;

      if (!unlockTime) {
        console.log("空投尚未启用");
        return false;
      }

      const currentTime = Date.now();
      if (currentTime < parseInt(unlockTime)) {
        console.log(`空投将在 ${new Date(parseInt(unlockTime))} 解锁`);
        return false;
      }

      return true;
    }

    return false;
  }

  // 领取空投
  async claimAirdrop(airdropId: string, lockedId: string) {
    if (!(await this.canWithdraw())) {
      throw new Error("当前无法提取空投");
    }

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::airdrop::withdraw`,
      arguments: [
        tx.object(airdropId),
        tx.object(lockedId),
        tx.object(AIRDROP_CONFIG_ID),
        tx.object("0x6"), // Clock 对象
      ],
    });

    const result = await this.suiClient.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    return result;
  }

  // 批量领取所有可用空投
  async claimAllAirdrops(address: string) {
    const airdrops = await this.queryAirdrops(address);
    const results = [];

    for (const airdrop of airdrops) {
      if (!airdrop.allocationWithdrawn && airdrop.availableBalance > 0) {
        try {
          const result = await this.claimAirdrop(
            airdrop.airdropId,
            airdrop.lockedId
          );
          results.push({
            airdropId: airdrop.airdropId,
            success: true,
            result: result,
          });
          console.log(
            `成功领取空投: ${airdrop.airdropId}, 数量: ${airdrop.availableBalance}`
          );
        } catch (error) {
          results.push({
            airdropId: airdrop.airdropId,
            success: false,
            error: error,
          });
          console.error(`领取空投失败: ${airdrop.airdropId}`, error);
        }
      }
    }

    return results;
  }
}

// 使用示例
async function main() {
  const privateKey = process.env.SUI_PRIVATE_KEY!;
  const keypair = getKeypairFromPrivateKey(privateKey);
  const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });
  //   const address = keypair.toSuiAddress();
  const address =
    "0xb680da1f7409378dfac75efeb3badcfe1c830137a8cb00ae4f215733c4ce09f7";

  const airdropClient = new WalrusAirdropClient(suiClient, keypair);

  // 查询空投
  console.log("查询空投信息...");
  const airdrops = await airdropClient.queryAirdrops(address);
  console.log("找到的空投:", airdrops);

  if (airdrops.length === 0) {
    console.log("没有找到空投");
    return;
  }

  // 检查是否可以提取
  const canWithdraw = await airdropClient.canWithdraw();
  console.log("可以提取:", canWithdraw);

  //   if (canWithdraw) {
  //     // 批量领取
  //     console.log("开始领取空投...");
  //     const results = await airdropClient.claimAllAirdrops(address);
  //     console.log("领取结果:", results);
  //   }
}

main();
