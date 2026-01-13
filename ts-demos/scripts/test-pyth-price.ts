import { getPrice } from "../src/pyth/price";
import { constants } from "../src/pyth/constants";

async function testPythPrice() {
  try {
    console.log("Testing Pyth price parsing...");

    // Test with SUI price feed on testnet
    const result = await getPrice("TESTNET", constants.TESTNET.FEED_IDS.SUI);

    if (result) {
      console.log("✅ Price parsing successful!");
      console.log(`Raw value: ${result.rawValue}`);
      console.log(`Actual price: $${result.price.toFixed(4)}`);
      console.log(`Value type: ${result.valueType}`);
    } else {
      console.log("❌ Price parsing failed - no result returned");
    }
  } catch (error) {
    console.error("❌ Error testing Pyth price:", error);
  }
}

// Run the test
testPythPrice();
