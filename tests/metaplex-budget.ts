import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MetaplexBudget } from "../target/types/metaplex_budget";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createMint,
} from "@solana/spl-token";
import { expect } from "chai";

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

describe("metaplex-budget", () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MetaplexBudget as Program<MetaplexBudget>;
  const payer = provider.wallet as anchor.Wallet;

  let collectionMint: Keypair;
  let budgetPda: PublicKey;
  let collectionTokenAccount: PublicKey;
  let metadataAccount: PublicKey;
  let masterEdition: PublicKey;

  it("Creates a budget collection", async () => {
    collectionMint = Keypair.generate();

    // Derive PDAs
    [budgetPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("budget"), collectionMint.publicKey.toBuffer()],
      program.programId
    );

    collectionTokenAccount = await getAssociatedTokenAddress(
      collectionMint.publicKey,
      payer.publicKey
    );

    // Derive Metaplex metadata account
    [metadataAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    // Derive master edition account
    [masterEdition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const name = "Budget 2026";
    const symbol = "BUD26";
    const uri = "https://arweave.net/budget-2026-metadata";
    const year = 2026;

    try {
      const tx = await program.methods
        .createBudgetCollection(name, symbol, uri, year)
        .accounts({
          budgetPda,
          collectionMint: collectionMint.publicKey,
          collectionTokenAccount,
          metadataAccount,
          masterEdition,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([collectionMint])
        .rpc();

      console.log("Budget collection created:", tx);

      // Fetch and verify budget PDA
      const budgetAccount = await program.account.budgetPDA.fetch(budgetPda);
      expect(budgetAccount.collectionMint.toString()).to.equal(
        collectionMint.publicKey.toString()
      );
      expect(budgetAccount.year).to.equal(year);
      expect(budgetAccount.expenseCount).to.equal(0);
    } catch (error) {
      console.error("Error creating budget collection:", error);
      throw error;
    }
  });

  it("Creates an expense item", async () => {
    const expenseName = "Travel Expense";
    const expenseType = "Travel";
    const uri = "https://arweave.net/travel-expense-metadata";
    const approvedAmount = new anchor.BN(500_000_000); // 500 USDC worth
    const variancePct = 10; // 10% variance allowed

    const budgetAccount = await program.account.budgetPDA.fetch(budgetPda);
    const expenseCount = budgetAccount.expenseCount;

    // Derive expense PDA
    const [expensePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("expense"),
        collectionMint.publicKey.toBuffer(),
        Buffer.from(new Uint8Array(new Uint32Array([expenseCount]).buffer)),
      ],
      program.programId
    );

    const expenseMint = Keypair.generate();

    const expenseAta = await getAssociatedTokenAddress(
      expenseMint.publicKey,
      expensePda,
      true
    );

    // Derive expense metadata account
    const [expenseMetadata] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        expenseMint.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    try {
      const tx = await program.methods
        .createExpense(
          expenseName,
          expenseType,
          uri,
          approvedAmount,
          variancePct
        )
        .accounts({
          budgetPda,
          expensePda,
          expenseMint: expenseMint.publicKey,
          expenseAta,
          expenseMetadata,
          collectionMint: collectionMint.publicKey,
          collectionMetadata: metadataAccount,
          collectionMasterEdition: masterEdition,
          payer: payer.publicKey,
          authority: payer.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([expenseMint])
        .rpc();

      console.log("Expense created:", tx);

      // Fetch and verify expense PDA
      const expenseAccount = await program.account.expensePDA.fetch(expensePda);
      expect(expenseAccount.expenseType).to.equal(expenseType);
      expect(expenseAccount.approvedAmount.toString()).to.equal(
        approvedAmount.toString()
      );
      expect(expenseAccount.spent.toString()).to.equal("0");
      expect(expenseAccount.variancePct).to.equal(variancePct);

      // Verify budget expense count increased
      const updatedBudget = await program.account.budgetPDA.fetch(budgetPda);
      expect(updatedBudget.expenseCount).to.equal(1);
    } catch (error) {
      console.error("Error creating expense:", error);
      throw error;
    }
  });

  // Additional tests for spend functionality would go here
  it("Can spend from expense (placeholder)", async () => {
    // This test would require setting up USDC accounts and treasury
    // Left as placeholder for now
    console.log("Spend test - to be implemented with USDC setup");
  });
});

