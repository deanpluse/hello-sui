const MVR_Constants = {
  appsPackageId:
    "0x62c1f5b1cb9e3bfc3dd1f73c95066487b662048a6358eabdbf67f6cdeca6db4b",
  appsRegistryTableId:
    "0xe8417c530cde59eddf6dfb760e8a0e3e2c6f17c69ddaab5a73dd6a6e65fc463b",
  appsRegistryId:
    "0x0e5d473a055b6b7d014af557a13ad9075157fdc19b6d51562a18511afd397727",

  appsNameType:
    "0x62c1f5b1cb9e3bfc3dd1f73c95066487b662048a6358eabdbf67f6cdeca6db4b::name::Name",
  // TODO: Replace this logic with MVR logic once GQL is out.
  packageInfoIds: {
    mainnet:
      "0x0f6b71233780a3f362137b44ac219290f4fd34eb81e0cb62ddf4bb38d1f9a3a1",
    testnet:
      "0xb96f44d08ae214887cae08d8ae061bbf6f0908b1bfccb710eea277f45150b9f4",
    devnet: "",
    localnet: "",
  },
};

const CHAIN_IDs = {
  MAINNET: "35834a8a",
  TESTNET: "4c78adac",
};

const config = {
  SUI_COIN_TYPE: "0x2::sui::SUI",
  MAINNET: {
    SUI_COIN_TYPE: "0x2::sui::SUI",
    SUI_COIN_DECIMALS: 9,
    WALRUS_COIN_TYPE:
      "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
    WALRUS_COIN_DECIMALS: 9,
    USDC_COIN_TYPE:
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
    USDC_COIN_DECIMALS: 6,
    USDT_COIN_TYPE:
      "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
    USDT_COIN_DECIMALS: 6,
    WUSDC_COIN_TYPE:
      "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
    WUSDC_COIN_DECIMALS: 6,
    CETUS_COIN_TYPE:
      "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
    CETUS_COIN_DECIMALS: 9,
    DEEP_COIN_TYPE:
      "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
    DEEP_COIN_DECIMALS: 6,

    HASUI_COIN_TYPE:
      "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
    HASUI_COIN_DECIMALS: 9,
  },
  TESTNET: {
    WALRUS_COIN_TYPE:
      // '0x8190b041122eb492bf63cb464476bd68c6b7e570a4079645a8b28732b6197a82::wal::WAL',
      "0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL",
    WALRUS_COIN_DECIMALS: 9,
  },
  MVR: MVR_Constants,
  CHAIN_IDs,
};

export default config;
