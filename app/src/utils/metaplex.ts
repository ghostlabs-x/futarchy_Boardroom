import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplTokenMetadata, fetchDigitalAsset, findMetadataPda } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey } from "@metaplex-foundation/umi";
import { Connection, PublicKey as SolanaPublicKey } from "@solana/web3.js";
import { AnchorWallet } from "@solana/wallet-adapter-react";

/**
 * Create a Umi instance for Metaplex operations
 * This provides utilities for interacting with Metaplex Token Metadata
 * Based on: https://developers.metaplex.com/token-metadata/getting-started/js
 */
export function createMetaplexUmi(
  connection: Connection,
  wallet?: AnchorWallet
) {
  const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata());

  // If wallet is provided, set it as the identity
  // Note: AnchorWallet doesn't have signMessage, so we only set publicKey
  // For signing operations, use the wallet adapter directly via useWallet hook
  if (wallet) {
      umi.identity = {
        publicKey: publicKey(wallet.publicKey.toBase58()),
        // signMessage is not available on AnchorWallet
        // If needed, use wallet adapter's signMessage method directly
        signMessage: async (message: Uint8Array) => {
          throw new Error("signMessage not available on AnchorWallet. Use wallet adapter directly.");
        },
        signTransaction: async (transaction) => {
          // Convert Umi transaction to Solana transaction and sign
          const solanaTx = transaction as any;
          const signed = await wallet.signTransaction(solanaTx);
          return signed as any;
        },
        signAllTransactions: async (transactions) => {
          const solanaTxs = transactions as any[];
          const signed = await wallet.signAllTransactions(solanaTxs);
          return signed as any;
        },
      };
  }

  return umi;
}

/**
 * Fetch NFT metadata using Metaplex SDK
 * @param connection - Solana connection
 * @param mintAddress - Mint address of the NFT
 * @returns Digital asset with metadata
 */
export async function fetchNftMetadata(
  connection: Connection,
  mintAddress: SolanaPublicKey
) {
  const umi = createMetaplexUmi(connection);
  const mintPubkey = publicKey(mintAddress.toBase58());
  
  try {
    const asset = await fetchDigitalAsset(umi, mintPubkey);
    return asset;
  } catch (error) {
    console.error("Error fetching NFT metadata:", error);
    throw error;
  }
}

/**
 * Find metadata PDA using Metaplex SDK
 * @param mintAddress - Mint address
 * @returns Metadata PDA public key
 */
export function findMetadataPdaAddress(mintAddress: SolanaPublicKey): SolanaPublicKey {
  const umi = createMetaplexUmi(
    // We need a connection, but for PDA derivation we can use a dummy endpoint
    { rpcEndpoint: "https://api.devnet.solana.com" } as Connection
  );
  const mintPubkey = publicKey(mintAddress.toBase58());
  const metadataPda = findMetadataPda(umi, { mint: mintPubkey });
  return new SolanaPublicKey(metadataPda.toString());
}

/**
 * Convert Solana PublicKey to Umi PublicKey
 */
export function toUmiPublicKey(pubkey: SolanaPublicKey) {
  return publicKey(pubkey.toBase58());
}

/**
 * Convert Umi PublicKey to Solana PublicKey
 */
export function toSolanaPublicKey(pubkey: any) {
  return new SolanaPublicKey(pubkey.toString());
}

