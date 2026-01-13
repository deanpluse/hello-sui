import dotenv from "dotenv";
dotenv.config();

import { Transaction } from "@mysten/sui/transactions";
import * as rpc from "../src/rpc";
import { getKeypairFromPrivateKey } from "../src/utils/keypair";
import { getObject } from "../src/object";

async function coinTest() {
  const suiClient = rpc.getSuiClient();

  const keypair = getKeypairFromPrivateKey(process.env.SUI_PRIVATE_KEY!);
  const sender = keypair.toSuiAddress();
  const txb = new Transaction();
  txb.setSender(sender);
  txb.setGasBudget(100000000);

  const coinObjectId =
    "0xb813bce762d5c00b57aceff855099d984bccf62209df134e3342a158462ca34f";
  const coin = txb.object(
    "0xb813bce762d5c00b57aceff855099d984bccf62209df134e3342a158462ca34f"
  );
  const amount = 99800;

  const object = await getObject(suiClient, coinObjectId);

  console.log("coin balance", (object.data?.content as any).fields?.balance);

  // 只分割出一个 coin，原始 coin 会保留剩余余额
  const [splitCoin] = txb.splitCoins(coin, [amount]);
  txb.transferObjects([splitCoin, coin], sender);

  const resp = await suiClient.signAndExecuteTransaction({
    transaction: txb,
    signer: keypair,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  console.log(resp);
}

coinTest();
