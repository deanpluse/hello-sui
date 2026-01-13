import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import scallopApi from "../src/scallop";
import * as eventApi from "../src/events";
import config from "../src/config";
import dotenv from "dotenv";
import { getKeyPairByPrivateKey } from "../src/utils";
import * as objectApi from "../src/object";
dotenv.config();

const suiClient = new SuiClient({
  url: getFullnodeUrl("mainnet"),
});

async function getUserObligations() {
  const ownerAddress =
    "0x4983c34c5df7e0ea1ec1458afbfa736531aa1289c7a2b03ff5f29bd8656c7121";
  const obligations = await scallopApi.getObligationsByOwner(ownerAddress);
  console.log("==obligationsData==", obligations);
}

async function getMarket() {
  const market = await scallopApi.getMarket();
  console.log("==marketData==", market);
}

async function getObligation() {
  const obligationId =
    "0xf97c7c7d4c7eeb6e2725acdd89e7315480c1f848a7226e9a0d40ba7ea7f6a8ef";
  const obligation = await scallopApi.getObligation(obligationId);
  console.log("==obligationData==", JSON.stringify(obligation));
}

async function calculateObligations() {
  const obligationIds = [
    "0x78957db01c8cee8d40b6d39a3f9ca57143b56a35d44009e947103a7754241596",
  ];

  const obligations = [];
  for (let obligationId of obligationIds) {
    const obligationObj = await scallopApi.getObligation(obligationId);
    if (!obligationObj) {
      console.log("==obligation not found==");
      return;
    }

    const { collaterals, debts } = obligationObj;

    let collateralValue = 0;
    for (let collateral of collaterals) {
      const valueInUSD = (Number(collateral.amount) / 1000000) * 3;
      collateralValue += valueInUSD;
    }

    let debtValue = 0;
    for (let debt of debts) {
      const valueInUSD = (Number(debt.amount) / 1000000) * 1;
      debtValue += valueInUSD;
    }

    const riskLevel = collateralValue > 0 ? debtValue / collateralValue : 0;

    const obligation = {
      obligationId,
      collateralValue,
      debtValue,
      riskLevel,
      liquidate_locked: false,
    };
    const object = await objectApi.getObject(suiClient, obligationId);
    if (object.data?.content?.dataType === "moveObject") {
      const fields = object.data?.content.fields;
      if ("liquidate_locked" in fields) {
        obligation.liquidate_locked = fields.liquidate_locked as boolean;
      }
    }

    obligations.push(obligation);
  }

  console.log(
    "==Obligations==",
    obligations
    // .filter(
    //   (ele) =>
    //     ele.liquidate_locked === false &&
    //     ele.riskLevel >= 1 &&
    //     ele.collateralValue > 1
    // )
  );
}

async function getLatestObligation() {
  const eventType =
    "0xefe8b36d5b2e43728cc323298626b83177803521d195cfb11e15b910e892fddf::open_obligation::ObligationCreatedEvent";

  const events = await eventApi.getLatestEvents(eventType);

  for (const event of events) {
    const obligationId = (event.parsedJson as any).obligation;
    console.log("==obligationId==", obligationId);
    const obligation = await scallopApi.getObligation(obligationId);
    console.log("==obligation==", obligation);
  }
}

async function getUserPortfolio() {
  const userAddress =
    "0xa0b545efedd87007b833fe6b38b79ff811648e80337801e2a5e9f44e00455612";
  const userPortfolio = await scallopApi.getUserPortfolio(userAddress);
  console.log("==userPortfolio==", userPortfolio);
}

async function getObligationAccount() {
  const obligationId =
    "0xf91541a57d5dd90ff512610a767e002fcdb536784178b68c665bb1dbdf8f9323";
  const ownerAddress =
    "0x99efdeb464ba8cfabb29e52b4939bd70f16d08f9780fb875e196bfcb0c4a5b6f";

  const obligationAccount = await scallopApi.getObligationAccount(
    obligationId,
    ownerAddress
  );
  console.log("==obligationAccount==", obligationAccount);
}

async function getLiquidityRiskLevel() {
  const obligationId =
    "0xf91541a57d5dd90ff512610a767e002fcdb536784178b68c665bb1dbdf8f9323";
  const ownerAddress =
    "0x99efdeb464ba8cfabb29e52b4939bd70f16d08f9780fb875e196bfcb0c4a5b6f";

  console.time("getLiquidityRiskLevel");
  const riskLevel = await scallopApi.getLiquidityRiskLevel(
    obligationId,
    ownerAddress
  );
  console.timeEnd("getLiquidityRiskLevel");
  console.log("==riskLevel==", riskLevel);
}

async function getLiquidityRiskLevel2() {
  const obligationId =
    "0x454a0bdabfabd4894a338e6f9ff3dc2f64b9209718a844652f2f13045b168c31";

  console.time("getLiquidityRiskLevel2");
  getObligation;
  const riskLevel = await scallopApi.getObligationRiskLevel(obligationId);
  console.timeEnd("getLiquidityRiskLevel2");
  console.log("==riskLevel==", riskLevel);
}

async function liquidate() {
  const privateKey = process.env.SUI_PRIVATE_KEY!;
  const keypair = getKeyPairByPrivateKey(privateKey);

  const obligationId =
    "0x6aee74802b47cb82f723645f000b2119f2b8032ca2a4e61a33f0cc88e8767dec";

  // Debt type: USDC (what was borrowed)
  const debtCoinType = config.MAINNET.USDC_COIN_TYPE;
  // Collateral type: DEEP (what was collateralized)
  const collateralCoinType = config.MAINNET.DEEP_COIN_TYPE;
  const repayAmount = 0.8 * 10 ** 6; // 1 USDC (6 decimals)

  const params: scallopApi.LiquidateParams = {
    obligation: obligationId,
    debtCoinType,
    collateralCoinType,
    repayAmount,
  };

  const result = await scallopApi.liquidate(suiClient, keypair, params);
  console.log("==result==", result);
}

async function checkLiquidateLocked() {
  const obligationIds = [
    "0x98f20eff149c0adea908eb84b88463fe69f011b545934a54d7fb3840370e917e",
    "0x175bc96b4672019b3e0191d53c8d3656dd97ad52d6e8feac5d59bff7b3181607",
    "0x99488f2b84e1fc3c6dc34b46fd830aee6245afc2f87045c1b5ebbf428992d065",
    "0x5ffb42e0a19fe5a5f540f9a2d3c5963e921ef94864f5b825855444f0b0b6b4e8",
    "0x748e0052b76ad2bc4939950ee9f9c3574e1b957f8d6e056c76bdcd682eaeee2d",
    "0x04d86db51ede45374965e4f290f46709e7fa9d8622f58457e4c3539b48139c16",
    "0xaa4d36a74ad69c9eb5100926aca5b19acab404e5c20f330e8738f61646561251",
    "0x195035a25b6eb11b9aa5c922141c30ad4f291140c3e1109ed0b35b239ca7d662",
    "0x8e991acfff7c5f4788709de4c4f9746393e87e839559ce12f9205e6e4e4957f0",
    "0x6f26e0d9d18fa61410cc1d74b408dbe38dc470e8d9e21f8537bec9f4dbbd79ff",
    "0x1ead516ea907aa3c422dc592352300a9fd414bfd136fe181097778048a24f0c6",
    "0xac6bceb981fe877a7309ab43d1318f6b817663e24d300bb20abf8bb73145b475",
    "0x1dd25047649142f586e1ecf592492cc7f39bf474e4671d0ef4b17a1462052afd",
    "0x320dc891a1e859e71433e1bb3c73042b8630552354121bf7579a7bed52bc5fa2",
    "0xb044132a7581e9b1a3a8a900469207819dc4fda4da3b6e937b09db31eb93f2d8",
    "0x68f9346748624b86d3c96bdf2aa003b5de90586dfcc029ea9b24f0fbdcfe1525",
    "0xd26eaf86f0635e90f1e1bea59a5a112bf0f6913b985597ebbe3f4dc918e96e40",
    "0x6a4f80c954f558d5f2f3dcbc5a52a4b80f9fb034338a38cddd84bd2154df7266",
    "0xd4922227b805247ab0ec9e1e1237691c093b520f7473f0825d5410c146df0ce4",
    "0xdc28ed59e9abd76c9d73f607399123afa13767d8253c7a440af615161ec450bd",
    "0x617c5d06651cb8f1176ded1df7a63e343b01ebde5bfb1b9e7b7be590c7cb6ea7",
    "0x925dfe3f19a1873d94f27a3baaab2df747988e0efe4a7902ad235433a2e3b8d2",
    "0x2a96bec65a782369467453821f8e6248f0e89ca609068d983847cc2c1c67ff19",
    "0xf446530673fa7e38e843cfe2e09af4c481e1b9ce25f983bbfc7ec700602192ed",
    "0xb3f1ad7edb3c32e16127418da380f6f2939004d6a640be1df148ffee3bb4f526",
    "0xc23360c3644531b24de64925865a2dbe03433a487118efaf654c51686614dba9",
    "0xecce019be422c4dd4cc5e11ab5a9761a432501e9e92fd1d9768ac2943f1019ad",
    "0x1ce5f2259bdfb724059c4f61c8178f3a9182d89aaa3c87fcecf5d9c2d03121b8",
    "0xf3bb53a8fa233bb9e2ffff0c348a8a2888f9c7c2889d15d8401a4bfec4394d57",
    "0xb284d19f45fd2e5f53f1d14351a21ebb4b1c28edd7ba7f5e6df609bc23faeb6c",
    "0xecbe95c86d6db4c1319dca3af14e040578229b6a976cb388d57226153bd6b2c5",
    "0x1b67553a9fdfbcc30427d8cc69f7363863adb0814126807206e6e978100c7075",
    "0xd40b305bc14afd147f82f56427c0c0cc397ea0ef4632b0c64c2b5d09083b505d",
    "0x62c833cb906ceb2f0ffabdb67651b0dfcb8848a40725464fe4cf12f6f2b18d19",
    "0x2425f17743bad54c01c9e1a9c24a8a83bee818fa24ef12425f3b501aaa26d4ac",
    "0x14305ba6add26aa14ba4399ea16d2059f2385c3e4f57003564cfb458eae4cbbc",
    "0x79a52acba4ceb78f7a8c7ec4f2d97af43e05ae2caee932a783928140ea5ed4a5",
    "0x0df6c6901f91496432b902035a3b4d1f0cc93abb6ebf20e3051b35a49cd1afff",
    "0x4a3eb04be7d6c6efd6acf2fddbf4a0ed76af76fdd64c335339808f1223834e18",
    "0x2f529eb0ff1b783780c927a18bf074d8a7fb602b9aefb5a7fe85956bd242512e",
    "0xa53a6e898e7e2562775a5a02c049013e243b3f0ccbf12cd9586e99f5c9ec1839",
    "0x7120a479f57daf0124951d09e7af747c701ea4a6e56bf05d48705b6a6bd1b422",
    "0x70da3fb9ba5793710599b7f525307add79ab4920265a97e439c8da603e3b7fa8",
    "0x53840d230a6303a0e92fbd8244485c6c3fb802a71e0594bc0817d0ab4aaa8cd3",
    "0x410d4fad10db79c9482aef08c88bf5cc5512c93b664f5d41d40a2c28331345f8",
    "0x696f96d00528c40e14ef48f1d1b810c516cf9c7fce974ba1c7d3c909bd3bd84c",
    "0x7821a5b517f605304896fa7e428f7d3bfff5f13205555723bc8ef128c1f9c7dc",
    "0xb607dd77dbd4a8ccb53d9d696fcb6f07d1328919c4f5fedf5c1956e10eefc6c6",
    "0x2943b8c2a33ccc939b6c995ac82a70bf456cd842f521145b8000de3368bf5860",
    "0x92ca0bacdc8706b8a1742743bc8de5b128a522e14ef66939cb37011b98e2b7f3",
    "0x03b8382628f9bd5e9ad42699d513fda96bd6a97dae564ac9453bf81aa2b6f466",
    "0x7af47c4f2c84aac23740c36d20619529cff0a36668a9d0de8fa01d954e5ebebd",
    "0xc465283275e4accd5f88ac76bc3c325305f6b8ec333b8a8491a33198f29e63ec",
    "0x9f0b2f934c7b4b88ea36a4201387bc3e112df1f7c265eb67435766666d2c3aee",
    "0x5001f6e0eb2558d83df4b649b7af1f3b35e48fa2230851ccd128bf76d4d54be6",
    "0xcd07d878ac8a89de7887bd5e626c352a55479fa303006f9c9c543e715ab6eead",
    "0x76be6db43d069ae150b2565424493f54b27b399e596c6e4722c6c29c579ad327",
    "0x02d8764fe4b1623f342b99c38ca1f873dc5c1f1d3b5e7d93424c77e2d1c7aa2f",
    "0x9640e5e738d12dad4d3e47e0949092b5137f676ed0e0d59505be889b3b220f36",
    "0x7d4b1ee1e6dc8555079e1333932ae3f0f41beab2a2f87414bb71d9e03648c595",
    "0x62df53622d5f4150e4eb96650e6f0481277ed0adf282109dea53ac72f290c28a",
    "0xed079c1dd8017843ced10f8825829e236a7f505972816dfe80a1b75875f5940d",
    "0xcaa16f1cd407a1e0b8da7ddc9410a481bb70f28b00bc33f226b9b23322493340",
    "0x2c6ecb1afae6f9145e9b77522e3207064ba2b9712e4e38e4153b5388923e86c6",
    "0xf69678108aaa76a000379d682f5684ca5c055214e3cb968a2879621b4d0ef655",
    "0x2ecdfbb3f7bb02752645f758a925a4b7748933b70b34316e2f6f1dd24316862e",
    "0x4307e08739ee3e01b8c4f1b4a1b491153577c4657d14ebf8d03fad5ff4084797",
    "0x4444b31a3907bfab4067f3fc5eb5dbf04b36aa1785eb1bdcca25f8bcf265cfcc",
    "0x372cf3b90b7071f24b8b9cfe7ad6fd283cbdc568e91367fa01b048af5561933e",
    "0x349536b8bcf98f5e52ec50d5e6ce23a8c25d69762bf01b60c3b2c6bb178cebb6",
    "0xd047fd7f6e8bef7119b13381f3b36b1bc6fe23449a4709b5d42555a9b98d8ae2",
    "0x841308b95fa9c7f81323fd9077ead731ccdc1bc9f1f781aced2ba3a238b129c6",
    "0x770d29259c22d9c2369f1da5a6a5b87c2cb6b8815df114bcbc2b427ea3c40b6e",
    "0x9244e5d2ee1aa5bf0fbdfd3b9c1ccd2d54156f983db66f93555c619cb29069c1",
    "0x53d596fdee59ea8b82aa8e3df2d57a128d0a4792cf2256a31176302fb19e78d4",
    "0x9dced5b0800c6fe4af59fb2e30f9840475e3ff90cb25eae86a91fb4e5b69e915",
    "0x942544b49fdc95d0ca636161542fd134a4471cba10053e32d8e62c9ced7d3256",
    "0x99b294a0f75cedae9805649ccc97322eebb3109c9351139b5bb1db2928cfa8e9",
    "0xaf3746e6b213da517dfa314eb754ce382685805c564b2fb76e676817568386c3",
    "0x31e5c77cc8aa288b14afdf6ad8f44f2b473ff921d4a5d2df297f70671098934b",
    "0x591990cc653cbb3229504c7152c43c55bd6673350dd85e87a37a5c27d3e5fcda",
    "0x2a952320f477444797f16b0c5825fe973564c7cfc4b22d63a3cf0cd6b6c92284",
    "0x454a0bdabfabd4894a338e6f9ff3dc2f64b9209718a844652f2f13045b168c31",
    "0x511e063ad5dab42d75cabbfa0bd08cb8b1a884e658c581b1f69f80257d5306be",
    "0xf7b443600c0c2b9d0b3056657bab172eca546174aab2cad96a85b0614a834eec",
    "0x1b1af67c339139c539219274bced299b4126cc69948871cce4ec295c80128a20",
    "0x4016f9ec0ba8f7e7503effe58b418353c3b4484cbd2e964ed306dbeafd09a57a",
    "0xc953882304b5b7e0461ce2deaef4f376ed96fc68c9f998b81e0aa14e0829366b",
    "0x5c673691038ccf6efc25f79afbe0f82ec72605e99ef03f1a8e0b613e5ed2a2c3",
    "0x9315a41a6ed8baa87c0300d2fe3f81a163b971222ecb9187d56c3802aa5e55c7",
    "0xf3532c58982257eba7ca93fa8908cf47369647819a7eb31ca205a42055641848",
    "0xb986234bc148a004ba0b6f64bf05ce1b572abec1f77e0ad21d73b89ab6088ff9",
    "0x469616d86817cf5f92e446a5dbefede7e29ba5302425464c285c38d54e33b741",
    "0x9fe4e6b73e4330c9a8882eaaa908308fc8ae8bcbcaaafb6684ab58b41b5d64f7",
    "0xd216cf5e5b5b373050f9fea6c3d39583e3ee51a8753bd383e8c1790ee692cac7",
    "0xfdac6e7aec673979b0ba84e1c8578951edf68b7e6c3504151f3defa4533a2741",
    "0x8258b39e2bb37205793084a1f5bbef5eb06e93ed339bd781b9800af855a6db7e",
    "0xa181958f1b3d5b4f50a75ff274628e5f560c10792b8bfbf05454155adc82af03",
    "0x49b45d3ef7c12265087860b9e57d9ee4fdf73eb201ea9c882145ad259d8ad2cc",
    "0xa235dbf4d236f4a4dc607f5965db333ca2b5df8f636beb5f7d8a25fb8138b1a9",
    "0x8d5ef0aebc5189154196800825e9b5bee83dcda60b4326e81309492dbffcc64b",
    "0x60906ab8b474c5c18332b723b8487db3431501e3bb65a6415019862fec6eab47",
    "0x7ff47f6f97404043e7ba6a7c7ebe9393ff1a406ad8dfa8ce45b265511b401529",
    "0x5c847fb04e872547a2a7ae1117e379a78d51fff7eceefc996fe8fbcc9f4de3cc",
    "0xfebfa02e8b432a517990f1a8ed50765488b2c9747d8401cca4c27fa53b62dbd5",
    "0x14547947d977d8ae45f2d72ef754cf96e3597acafa527be5af4cd9c090236c8b",
    "0xad9538f4b5d7ae8cd18b24f628bf10c9eab249de1a1f46b3988c819334a9f5ca",
    "0x8921c2bb3553556ee39a7d0801a4c7c875220bb795800dca53a020827f033c56",
    "0x96124e397d99ad16e7407b1c80d13fe937daa7c7a9dbf6d936bc1897c3bc2998",
    "0xb2a2fa07732d6cff232410dd8989e02028c1e5c44d39bf421821cb7604cf9658",
    "0xdc617f516c83718e0e0d7f230b52281d55beb1ece858c06881fd2ae5cda2f0f9",
    "0xf3fd28c6e29e094f76d0fd8ec66a8597e35755e59e74b1c37b44bda0ca0ca236",
    "0x62f2eb003096692d8f4bacacfeebe49429de8dab8822d3281ff9f1623334c434",
    "0x348499148e95036fb0360d552cc593757c3df2b06c5086be0cb7ad87ed0670b2",
    "0xf1252c06e8c7df5cecebfbc28257a4bae9a306383a7db3fa3e72b279873a18fa",
    "0xd7b6cb2c642f0c440cf710da28c40e233a2111ffc0fd8e67f87d46a5fde9b540",
    "0x7c48061c84b0fd4d00de7b96caea506f6e561c10426e446af8c2ebac0cc407f8",
    "0x5e90dc5657d007a47af4ddf494d8d16f05a03bf604e6bebc2056750b88ef1120",
    "0xc7bd89808a96fea983bd5acff9c9389c1803015af4c9c7023c515024a96eb4b9",
    "0x4cde29607a5d5ce99189857479f172e3acc85208d86e390fa625fccb8d657546",
    "0x6fe1a61d41c2abe62acff0643718cac535731f267138c17697ed5c2130323759",
    "0x1bc13f679bc3828d4f3596f8b263fe6e20afe6b9e82314d4caea163d297068de",
    "0x4c97957dae609b8efeeeb707c10d14afe87b652f2ce29db5bdf1cbc511a059d0",
    "0xda62a4d08d87df8e370742a56d2eca3795cbd287690970c9da93141a004e8d04",
    "0x9897e8454da246334965f823e6b42ecc3287bdb8be5a20caff5fcc3e8a30b704",
    "0xb4953a7eb57669404b6886bca959775c7efa3a47c7a728ea8d831d6d19646c7e",
    "0x6d389c7c6df5f1ca73a569f1daabe4f2ab62129c145ba67763ffb2cdbf9b31a0",
    "0x830377223352fea0e7b473257c77a41f83deb1e8793d079ba55bce136a5e33fb",
    "0xd0e3ac82c1649443c382f634d589fd701dace6befcefce153f3237d2b265e4ca",
    "0xca4317a14c02ef501e54f9e39971fc06e56f868ffbdd1d91b820a5879faff817",
    "0x7aa09be26c68ec012b819645cef01ca0126dfcd20878915f602f4c839c3b357a",
    "0x0b1acea40d92949c133e517c913204f9022a69d4b40a012fff82dd8205cecd39",
    "0x0473446484072df5da9eb768b2b9ded72f2316b52f807a4e4326657bf39fafcb",
    "0x3f89ee2c16b80f0d158cfbaa3e6cc25af2c5b090a8f70cd40a6d9666cc344cca",
    "0xb8e3c26763dd873878fee404a6d660c8aaa8a9b0367a46b4cd1e081619afba81",
    "0xdd04d1cadffe3aa7e6ea6519b6f12614d75d7834e547af938251204edd20aff2",
    "0xa119285a63c495ad5e22f18d4946936e1a8cb9a92f2575a5fcf0054b35560e5d",
    "0xf97c7c7d4c7eeb6e2725acdd89e7315480c1f848a7226e9a0d40ba7ea7f6a8ef",
    "0x5d8cfe63f00710222a95a3d3db44da9bc20ddfc04ce2336c1fc9919d95288d5c",
    "0xbd215a2183968a8b5cae47842315590311f3639b42815b0956bb45b8277997ee",
    "0x9c908f3331f456f8393164acbfd315c8da95bd935f2bf6cf1eefc59de4a21a54",
    "0xa210d5bc9f3baebf6220329055a51a5b2301056ff3caf2bc07cad1f014bca927",
    "0xac7ca619832133b0aed897859caf469bb723438cb6a962acf0024bc50c52372d",
    "0xc3d8dd16c492d0d81c8855b3fee33339973c99fbb6bab9e4545a23808e7de706",
    "0xe4ad7adf2664cc7456eb98871ec5f1a1012f0349b9b2b07ca5805fe39f735260",
    "0x592ae23bf23db4eac6e07bb90a867f1898e336bca917b80ad9f75bfc031c634c",
    "0x2f7b677c434c560a4642e1ea68f3854466fe6bf926e6247810b30ba32f9a1a4d",
    "0x816fc27b1c87f5cc0745e61a38e8e9b6f4688c216ab87338a5416f0878d8154d",
    "0x9de0d7ca7f0df94c479b2cd18b82f12fae4ef6f59e086ff601a021813d9a8a7e",
    "0x7e29307802afe8efa2acab6df34d8898730de9fc21cdcb808c0cd9d60d44e7db",
    "0xe54dc0cf8f4312d0d4d650b2fdc6c7dbc0f80596416a75ff2327cf4e2c5a341f",
    "0x4a8793f31220f8b9de437a531f1359a11935244ad6f063d44142c81e6619f83b",
    "0x895cd4dd8276c555e94e26c948fc2f9e8714a4d6bf0fcd4af812bcb4245a22c4",
    "0xa3d28813111ea4cb3026f2fd6860e7dc1fd7065b03989c1e027c0e9ffa06f844",
    "0x74fa61703db53765209330a9a304c205ec4b15bfc90a70194eda702fe6038ed1",
    "0x662b0a035e5a5e7e4948d5f236bff2109cc181b3d70b0b5054f5e3444e7648f9",
    "0x45979c50fb0181d566e6e97ac41544a6e0a77f7f63b4dc29852837c8549de925",
    "0x38f016dae4d2d08379da77fe1efe5345e89aa025c53de983ab40b9cda8b27db6",
    "0xfbe287387756f84c3123000af0245359c6a371b827dfb30831b084ed86cbe624",
    "0x40ac4f1721a5f00878034c1c85a437698fe53d02c3714d6fd282236677702b89",
    "0xbeb61bf2229c7e29246e5e0cd1f73912b63a96ecda9496d8c0c0ca6591fd7fc6",
    "0x88a02bf8144fb4780bd05d5d7081b3cf527bf6843641cc3a487176c5d73b7939",
    "0x6e5fd5cdfa0a951f477cba899cfbf5593dfbf35adbf8f24b07a8e1dd37a24dc3",
  ];

  for (let obligationId of obligationIds) {
    const object = await objectApi.getObject(suiClient, obligationId);
    if (object.data?.content?.dataType === "moveObject") {
      const fields = object.data?.content.fields;
      if ("liquidate_locked" in fields) {
        if (!fields.liquidate_locked) console.log(obligationId);
      }
    }
  }
}

async function main() {
  // await getUserObligations();
  // await getMarket();
  // await getObligation();
  // await getLatestObligation();
  // await getUserPortfolio();
  // await getObligationAccount();
  // await getLiquidityRiskLevel2();
  // await getLiquidityRiskLevel();
  // await liquidate();
  // await scallopApi.getAllAddresses();
  // await calculateObligations();
  // await checkLiquidateLocked();
}

main();
