import fs from "fs";
import {
  SuiClient,
  getFullnodeUrl,
  DynamicFieldName,
} from "@mysten/sui/client";
import * as objectApi from "../src/object";

const suiClient = new SuiClient({
  // url: getFullnodeUrl("mainnet"), // 或 'testnet', 'devnet'
  url: "https://sui-mainnet.blockvision.org/v1/32BCLxsjI7L95jIO35sClbI4qth",
});

async function getDynamicFields() {
  const parentId =
    "0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061939d9";

  const dynamics = await objectApi.getDynamicFields(suiClient, parentId);

  console.log(dynamics[0]);
}

async function getDynamicFieldObjectByName() {
  const parentId =
    "0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061939d9";
  const filedName: DynamicFieldName = {
    type: "0xe7dbb371a9595631f7964b7ece42255ad0e738cc85fe6da26c7221b220f01af6::market_dynamic_keys::BorrowLimitKey",
    value: {
      type: {
        name: "7016aae72cfc67f2fadf55769c0a7dd54291a583b63051a5ed71081cce836ac6::sca::SCA",
      },
    },
  };
  const filedValeObj = await objectApi.getDynamicFieldObjectByName(
    suiClient,
    parentId,
    filedName
  );

  console.log("动态字段对象:", filedValeObj);
}

async function getObject() {
  const objectId =
    "0xc8a5487ce3e5b78644f725f83555e1c65c38f0424a72781ed5de4f0369725c79";
  const object = await objectApi.getObject(suiClient, objectId);
  console.log("==object==", object);
}

async function getPasckageContracts() {
  const objectId =
    "0xc8a5487ce3e5b78644f725f83555e1c65c38f0424a72781ed5de4f0369725c79";
  const object = await objectApi.getObject(suiClient, objectId);

  const disassembled = (object?.data?.content as any).disassembled;

  fs.mkdirSync("./temp/contracts", { recursive: true });
  for (let key in disassembled) {
    const value = disassembled[key];
    fs.writeFileSync(`./temp/contracts/${key}.move`, value);
    console.log(`saved to ./temp/contracts/${key}.move`);
  }
}

async function getObjects() {
  const objectIds = [
    // "0xa824c5d5e53bce721efd2b40764d13e71112ebb541b644df4ac790bba4536da6",
    // "0xf91541a57d5dd90ff512610a767e002fcdb536784178b68c665bb1dbdf8f9323",
    "0x98f20eff149c0adea908eb84b88463fe69f011b545934a54d7fb3840370e917e",
    "0x175bc96b4672019b3e0191d53c8d3656dd97ad52d6e8feac5d59bff7b3181607",
    "0x99488f2b84e1fc3c6dc34b46fd830aee6245afc2f87045c1b5ebbf428992d065",
    "0x5ffb42e0a19fe5a5f540f9a2d3c5963e921ef94864f5b825855444f0b0b6b4e8",
    "0x748e0052b76ad2bc4939950ee9f9c3574e1b957f8d6e056c76bdcd682eaeee2d",
    "0x04d86db51ede45374965e4f290f46709e7fa9d8622f58457e4c3539b48139c16",
    "0xaa4d36a74ad69c9eb5100926aca5b19acab404e5c20f330e8738f61646561251",
    "0x195035a25b6eb11b9aa5c922141c30ad4f291140c3e1109ed0b35b239ca7d662",
    "0x1dd25047649142f586e1ecf592492cc7f39bf474e4671d0ef4b17a1462052afd",
    "0x320dc891a1e859e71433e1bb3c73042b8630552354121bf7579a7bed52bc5fa2",
    "0xb044132a7581e9b1a3a8a900469207819dc4fda4da3b6e937b09db31eb93f2d8",
    "0x68f9346748624b86d3c96bdf2aa003b5de90586dfcc029ea9b24f0fbdcfe1525",
    "0xd26eaf86f0635e90f1e1bea59a5a112bf0f6913b985597ebbe3f4dc918e96e40",
    "0x9de0d7ca7f0df94c479b2cd18b82f12fae4ef6f59e086ff601a021813d9a8a7e",
    "0x7e29307802afe8efa2acab6df34d8898730de9fc21cdcb808c0cd9d60d44e7db",
    "0xe54dc0cf8f4312d0d4d650b2fdc6c7dbc0f80596416a75ff2327cf4e2c5a341f",
    "0x74fa61703db53765209330a9a304c205ec4b15bfc90a70194eda702fe6038ed1",
    "0x662b0a035e5a5e7e4948d5f236bff2109cc181b3d70b0b5054f5e3444e7648f9",
    "0x38f016dae4d2d08379da77fe1efe5345e89aa025c53de983ab40b9cda8b27db6",
    "0xfbe287387756f84c3123000af0245359c6a371b827dfb30831b084ed86cbe624",
  ];

  for (let objectId of objectIds) {
    const object = await objectApi.getObject(suiClient, objectId);

    if (object.data?.content?.dataType === "moveObject") {
      const fields = object.data?.content.fields;
      if ("liquidate_locked" in fields) {
        console.log(`${objectId}`, fields.liquidate_locked);
      }
    }
  }
}

async function main() {
  // await getDynamicFields();

  // await getDynamicFieldObjectByName();

  // await getObject();

  await getPasckageContracts();

  // await getObjects();
}

main();
