// DeepBook V3 constants for mainnet
export const DeepBookConstants = {
  // Package ID for DeepBook V3 core
  PACKAGE_ID:
    "0x2c8d603bc51326b8c13cef9dd07031a408a48dddb541963357661df5d3204809",

  // Mainnet environment
  ENVIRONMENT: "mainnet" as const,

  // DeepBook Indexer API endpoints
  INDEXER_URL: "https://deepbook-indexer.mainnet.mystenlabs.com",
} as const;

export default DeepBookConstants;
