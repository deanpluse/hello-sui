import { getTransactionBlock } from "../src/rpc";
import { SuiClient } from "@mysten/sui/client";
import fs from "fs";

//
async function getTransaction() {
  const txDigest = "7gyGAp71YXQRoxmFBaHxofQXAipvgHyBKPyxmdSJxyvz";

  const suiClient = new SuiClient({ url: "https://fullnode.mainnet.sui.io" });
  const transaction = await getTransactionBlock(txDigest, suiClient);

  const tempDir = "./temp/transaction";
  fs.mkdirSync(tempDir, { recursive: true });
  fs.writeFileSync(
    `${tempDir}/${txDigest}.json`,
    JSON.stringify(transaction, null, 2)
  );

  console.log("transaction saved to", `${tempDir}/${txDigest}.json`);
}

async function main() {
  await getTransaction();
}

main();
