import { Transaction } from "@mysten/sui/transactions";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

async function callReadFunc(
  packageId: string,
  moduleId: string,
  funName: string,
  args: any[]
) {
  const client = new SuiClient({
    url: getFullnodeUrl("mainnet"),
  });

  try {
    const objectId = args[0];
    console.log("Checking object:", objectId);

    const objectInfo = await client.getObject({
      id: objectId,
      options: {
        showType: true,
        showContent: true,
      },
    });

    if (!objectInfo.data) {
      console.error("Object not found:", objectId);
      return;
    }

    const tx = new Transaction();

    const target = `${packageId}::${moduleId}::${funName}`;
    console.log("Calling target:", target);

    // Method 1: Use the object's id field directly
    // Every Sui object has an id field which is of type UID
    console.log("Trying Method 1: Using object's id field");

    // Get the Market object first
    const marketObject = tx.object(objectId);

    // Call the uid() function on the Market object to get the UID
    const marketUid = tx.moveCall({
      target: `0xefe8b36d5b2e43728cc323298626b83177803521d195cfb11e15b910e892fddf::market::uid`,
      arguments: [marketObject],
    });

    tx.moveCall({
      target,
      arguments: [marketUid],
    });

    const senderAddress =
      "0x2e3de0972cf884bbcb0a76f96fdde5463e73a51ef4196b882ec2cb904363d3dc";

    const inspectResult = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: senderAddress,
    });

    if (inspectResult.effects?.status.status === "success") {
      console.log("✅ Function call successful");

      if (inspectResult.results && inspectResult.results.length > 0) {
        // Get the result of the last moveCall (is_allow_all)
        const lastResult =
          inspectResult.results[inspectResult.results.length - 1];
        if (lastResult.returnValues && lastResult.returnValues.length > 0) {
          const returnValue = lastResult.returnValues[0];
          const bytes = returnValue[0];
          const boolValue = bytes[0] === 1;
          console.log("is_allow_all result:", boolValue);
        }
      }

      if (inspectResult.events && inspectResult.events.length > 0) {
        console.log("Events:", inspectResult.events);
      }
    } else {
      console.error(
        "❌ Function call failed:",
        inspectResult.effects?.status.error
      );
      console.log("Full result:", inspectResult);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

if (require.main === module) {
  const packageId =
    "0x1318fdc90319ec9c24df1456d960a447521b0a658316155895014a6e39b5482f";
  const moduleId = "whitelist";
  const funName = "is_allow_all";
  const args = [
    "0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061939d9",
  ];

  console.log(`Calling: ${packageId}::${moduleId}::${funName}`);

  // Try the main method first
  callReadFunc(packageId, moduleId, funName, args)
}
