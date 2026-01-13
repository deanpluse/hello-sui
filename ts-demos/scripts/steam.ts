import { Steam } from "../src/steam";

// getAllPools();
const steam = new Steam();

async function getPoolsByCoinTypes() {
  const coinTypeA =
    "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL";
  const coinTypeB =
    "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";
  const pools = await steam.getPoolsByCoinTypes([coinTypeA, coinTypeB]);
  console.log(pools);
}

async function main() {
  await getPoolsByCoinTypes();
}

main();
