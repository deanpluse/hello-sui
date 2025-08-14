import { Alphalend } from "../src/alpalend/api";

const alphalend = new Alphalend();

async function getUserPortfolio() {
  const userAddress = "";
  const userPortfolio = await alphalend.getUserPortfolio(userAddress);
  console.log(userPortfolio);
}

async function main() {
  await getUserPortfolio();
}

main();
