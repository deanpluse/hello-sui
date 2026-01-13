import * as eventApi from "../src/events";
import { EventId } from "@mysten/sui/client";

async function getLatestEvents() {
  // const eventType =
  //   "0xefe8b36d5b2e43728cc323298626b83177803521d195cfb11e15b910e892fddf::open_obligation::ObligationCreatedEvent";

  // const eventType =
  //   "0x6e641f0dca8aedab3101d047e96439178f16301bf0b57fe8745086ff1195eb3e::liquidate::LiquidateEventV2";

  const eventType =
    "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::LiquidateEvent";

  const events = await eventApi.getLatestEvents(eventType);
  if (events.length > 0) {
    console.log("==event[0]==\n", events[0]);
    // events.forEach((ele) => {
    //   console.log("==event==", new Date(Number((ele as any).timestampMs)));
    // });
  } else {
    console.log("==no event==");
  }
}

async function getEventById() {
  const eventId: EventId = {
    txDigest: "4KSxobAn2o2Xf57YjVY6uZmoVVfWwjMGBMQErBHv5voH",
    eventSeq: "3",
  };
  const event = await eventApi.getEventById(eventId);
  console.log("==event==", event);
}

async function testE() {
  const packages = [
    "0x578374a1f5182013268bbe9b2b080c5d14cbed1a48f9990c5f8a1c33bf100e69",
    "0xa45b8ffca59e5b44ec7c04481a04cb620b0e07b2b183527bca4e5f32372c5f1a",
    "0x157854718810185bd2400b7bf19ef7a86ad8dd87be2515576ae32b5ede32201b",
    "0x32243989d7363f209bbfc54112db408b24a01b27a3b0b3928e541daa18b2d5eb",
    "0x38fe42a5a69f7eb3635404389e8003be9457b1a5c873f133184648c7e9bd47b7",
    "0x94395cb33657aff9d8e0b278db498acaab50bad2160d28d4fad1be21687c3357",
    "0xc05a9cdf09d2f2451dea08ca72641e013834baef3d2ea5fcfee60a9d1dc3c7d9",
    "0xefe8b36d5b2e43728cc323298626b83177803521d195cfb11e15b910e892fddf",
    "0x3fc1f14ca1017cff1df9cd053ce1f55251e9df3019d728c7265f028bb87f0f97",
    "0x6e641f0dca8aedab3101d047e96439178f16301bf0b57fe8745086ff1195eb3e",
    "0x83bbe0b3985c5e3857803e2678899b03f3c4a31be75006ab03faf268c014ce41",
    "0xb32236966eeb02ee85f8a49352f3dda0082433e94a0536ebe354ce911393f497",
    "0xbf47d96986af814ed74342fc6e90f2f35b995958c7f372c3a2501853f935b3cd",
    "0xc2596018248934aa86b3065390bf69ba5f7007e34df7e4032b736eb256f82f1c",
    "0xc38f849e81cfe46d4e4320f508ea7dda42934a329d5a6571bb4c3cb6ea63f5da",
    "0xe7dbb371a9595631f7964b7ece42255ad0e738cc85fe6da26c7221b220f01af6",
  ];
  for (const ele of packages) {
    const eventType = `${ele}::liquidate::LiquidateEventV2`;
    const events = await eventApi.getLatestEvents(eventType);
    if (events.length > 0) {
      console.log("==package==", ele);
    }
  }
}

async function main() {
  await getLatestEvents();
  // await testE();
  // await getEventById();
}

main();
