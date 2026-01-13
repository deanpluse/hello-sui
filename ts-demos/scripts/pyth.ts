import { Pyth, constants } from "../src/pyth";
import dotenv from "dotenv";
dotenv.config();

// async function getSuiPrice() {
//   console.log("====getPrice====", "Sui");
//   const network = "TESTNET";
//   const feedId = pyth.constants[network].FEED_IDS.SUI;
//   const price = await pyth.getPrice(network, feedId);
//   console.log(price);
// }

async function getPrice() {
  console.log("====getPrice====");
  // const network = "TESTNET";
  // const feedId = pyth.constants[network].FEED_IDS.SUI;
  // const price = await pyth.getPrice(network, feedId);
  // console.log(price);

  const pyth = new Pyth("MAINNET");
  let feedId = constants.MAINNET.FEED_IDS.SUI;
  feedId = "1b2deae525b02c52de4a411c4f37139931215d7cc754e57dd6c84387336ccc74";
  feedId = "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";
  const result = await pyth.getPrice(feedId);
  if (!result) {
    console.log("No result");
    return;
  } else {
    console.log("result", result.toJson());
  }

  const { price, conf, expo, publishTime } = result;

  const readablePrice = Number(price) * 10 ** expo;
  console.log(readablePrice, new Date(publishTime * 1000).toLocaleString());
}

async function main() {
  await getPrice();
}

main();
