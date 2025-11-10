import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { PROGRAM_ID } from "./constants";
import idl from "../lib/idl.json";

export function getProgram(
  connection: Connection,
  wallet: AnchorWallet
): Program {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  return new Program(idl as Idl, provider);
}

export function deriveBudgetPda(
  collectionMint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("budget"), collectionMint.toBuffer()],
    programId
  );
}

export function deriveExpensePda(
  collectionMint: PublicKey,
  expenseCount: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  // Ensure expenseCount is a valid number
  const count = Number(expenseCount) || 0;
  
  // Create buffer for u32 (4 bytes) in little-endian format
  const countBuffer = Buffer.allocUnsafe(4);
  countBuffer.writeUInt32LE(count, 0);
  
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("expense"),
      collectionMint.toBuffer(),
      countBuffer,
    ],
    programId
  );
}

export function deriveMetadataAccount(mint: PublicKey): PublicKey {
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  const [metadata] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  return metadata;
}

export function deriveMasterEdition(mint: PublicKey): PublicKey {
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  const [masterEdition] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  return masterEdition;
}

