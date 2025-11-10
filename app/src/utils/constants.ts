import { PublicKey } from "@solana/web3.js";

// Program ID from Anchor.toml
export const PROGRAM_ID = new PublicKey(
  "Hz5ZKTWQMRRcCGwMEjnqcQrLEkTp5E8qD2zZKPFxCmXf"
);

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

// RPC Endpoints
export const RPC_ENDPOINTS = {
  mainnet: "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
  localnet: "http://127.0.0.1:8899",
};

export const DEFAULT_CLUSTER = "devnet";

