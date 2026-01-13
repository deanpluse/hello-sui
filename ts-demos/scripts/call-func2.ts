import { Transaction } from "@mysten/sui/transactions";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Keypair } from "@mysten/sui/cryptography";
import { bcs } from "@mysten/sui/bcs";

async function callIsLiquidatableViaDynamicField(
  client: SuiClient,
  packageId: string,
  obligationId: string
) {
  try {
    // Get the obligation object info
    const obligationInfo = await client.getObject({
      id: obligationId,
      options: {
        showType: true,
        showOwner: true,
      },
    });

    if (!obligationInfo.data) {
      console.error("Obligation object not found:", obligationId);
      return;
    }

    console.log("=== Obligation Info ===");
    console.log("Type:", obligationInfo.data.type);
    console.log("Owner:", obligationInfo.data.owner);

    // Extract the type parameter from the obligation type
    const obligationType = obligationInfo.data.type!;
    const typeMatch = obligationType.match(/Obligation<(.+)>$/);
    if (!typeMatch) {
      console.error("Could not extract type parameter from obligation type");
      return;
    }
    const typeParameter = typeMatch[1];
    console.log("Type parameter:", typeParameter);

    // Check if it's owned by another object (dynamic field)
    if (
      obligationInfo.data.owner &&
      typeof obligationInfo.data.owner === "object" &&
      "ObjectOwner" in obligationInfo.data.owner
    ) {
      const parentObjectId = obligationInfo.data.owner.ObjectOwner;
      console.log("Parent object ID:", parentObjectId);

      // Get the parent object (the dynamic field)
      const parentInfo = await client.getObject({
        id: parentObjectId,
        options: {
          showType: true,
          showOwner: true,
          showContent: true,
        },
      });

      if (!parentInfo.data) {
        console.error("Parent object not found:", parentObjectId);
        return;
      }

      console.log("Parent type:", parentInfo.data.type);
      console.log("Parent owner:", parentInfo.data.owner);

      // Check if the parent is also owned by another object
      if (
        parentInfo.data.owner &&
        typeof parentInfo.data.owner === "object" &&
        "ObjectOwner" in parentInfo.data.owner
      ) {
        const grandParentId = parentInfo.data.owner.ObjectOwner;
        console.log("Grand parent object ID:", grandParentId);

        // Get the grand parent object
        const grandParentInfo = await client.getObject({
          id: grandParentId,
          options: {
            showType: true,
            showOwner: true,
          },
        });

        if (grandParentInfo.data) {
          console.log("Grand parent type:", grandParentInfo.data.type);
          console.log("Grand parent owner:", grandParentInfo.data.owner);

          // Now try to call the function through dynamic field access
          const tx = new Transaction();

          // Create a reference to the grand parent object
          let grandParentRef;
          if (
            grandParentInfo.data.owner &&
            typeof grandParentInfo.data.owner === "object" &&
            "Shared" in grandParentInfo.data.owner
          ) {
            console.log("✅ Grand parent is a shared object");
            grandParentRef = tx.sharedObjectRef({
              objectId: grandParentId,
              initialSharedVersion:
                grandParentInfo.data.owner.Shared.initial_shared_version,
              mutable: false,
            });
          } else {
            console.log("✅ Grand parent is address-owned");
            grandParentRef = tx.object(grandParentId);
          }

          // Try to access the dynamic field and call the function
          // This is a complex approach that might require specific knowledge of the contract structure
          console.log("\n=== Attempting Dynamic Field Access ===");

          // For now, let's try a different approach: look for wrapper functions
          // that might be able to handle ObjectOwner obligations
          console.log("Looking for wrapper functions that might work...");

          // Let's see if there are any entry functions in the suilend module
          // that might be able to handle this case
          try {
            const suilendModule = await client.getNormalizedMoveModule({
              package: packageId,
              module: "suilend",
            });

            console.log("\n=== Suilend Module Functions ===");
            Object.entries(suilendModule.exposedFunctions).forEach(
              ([funcName, funcDef]) => {
                if (
                  funcName.includes("liquidat") ||
                  funcName.includes("obligation") ||
                  funcDef.isEntry
                ) {
                  console.log(`${funcName}:`);
                  console.log(
                    `  Parameters:`,
                    JSON.stringify(funcDef.parameters, null, 2)
                  );
                  console.log(`  Is Entry:`, funcDef.isEntry);
                  console.log("---");
                }
              }
            );
          } catch (error: any) {
            console.log("Could not get suilend module info:", error.message);
          }
        }
      }
    }

    // Alternative approach: suggest using a different method
    console.log("\n=== Recommendation ===");
    console.log(
      "❌ Direct access to ObjectOwner obligations is not supported in Sui transactions."
    );
    console.log("💡 Possible solutions:");
    console.log(
      "1. Use the web interface or SDK that handles dynamic field access internally"
    );
    console.log(
      "2. Look for entry functions that accept the parent object as parameter"
    );
    console.log(
      "3. Use a different approach like querying the obligation state through RPC"
    );
    console.log(
      "4. Check if there are batch/wrapper functions that handle multiple obligations"
    );
  } catch (error) {
    console.error("Error:", error);
  }
}

// Alternative: Try to query the obligation state directly through RPC
async function queryObligationState(client: SuiClient, obligationId: string) {
  try {
    console.log("\n=== Querying Obligation State Directly ===");

    const obligationInfo = await client.getObject({
      id: obligationId,
      options: {
        showType: true,
        showOwner: true,
        showContent: true,
      },
    });

    if (
      obligationInfo.data?.content &&
      "fields" in obligationInfo.data.content
    ) {
      const fields = obligationInfo.data.content.fields as any;

      console.log("Obligation fields:", JSON.stringify(fields, null, 2));

      // Try to extract liquidation-related information from the fields
      if (
        fields.weighted_borrowed_value_usd &&
        fields.weighted_borrowed_value_upper_bound_usd
      ) {
        const borrowedValue = BigInt(
          fields.weighted_borrowed_value_usd.fields.value
        );
        const upperBound = BigInt(
          fields.weighted_borrowed_value_upper_bound_usd.fields.value
        );

        console.log("Borrowed value:", borrowedValue.toString());
        console.log("Upper bound:", upperBound.toString());

        // Simple heuristic: if borrowed value is close to upper bound, it might be liquidatable
        const ratio = Number((borrowedValue * 1000n) / upperBound) / 1000;
        console.log("Utilization ratio:", ratio);

        if (ratio > 0.85) {
          console.log(
            "🚨 This obligation might be liquidatable (high utilization)"
          );
        } else {
          console.log("✅ This obligation appears to be healthy");
        }
      }
    }
  } catch (error) {
    console.error("Error querying obligation state:", error);
  }
}

if (require.main === module) {
  const packageId =
    "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf";
  const obligationId =
    "0xe3840a7b20f2fca576efe19bbc3d62fc48d10e1576b5c04783e35a370273df95";

  const client = new SuiClient({
    url: getFullnodeUrl("mainnet"),
  });

  // Try the dynamic field approach first
  callIsLiquidatableViaDynamicField(client, packageId, obligationId).then(
    () => {
      // Then try the direct state query approach
      queryObligationState(client, obligationId);
    }
  );
}
