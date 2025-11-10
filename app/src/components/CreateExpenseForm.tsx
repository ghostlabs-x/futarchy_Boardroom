"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { useProgram } from "@/hooks/useProgram";
import {
  deriveBudgetPda,
  deriveExpensePda,
  deriveMetadataAccount,
  deriveMasterEdition,
} from "@/utils/anchor";
import { TOKEN_METADATA_PROGRAM_ID } from "@/utils/constants";
import {
  uploadMetadataToPinata,
  createExpenseMetadata,
} from "@/utils/pinata";
import toast from "react-hot-toast";

export default function CreateExpenseForm() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const program = useProgram();

  const [collectionMintStr, setCollectionMintStr] = useState("");
  const [expenseName, setExpenseName] = useState("");
  const [expenseType, setExpenseType] = useState("");
  const [uri, setUri] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [variancePct, setVariancePct] = useState("10");
  const [loading, setLoading] = useState(false);
  const [uploadingMetadata, setUploadingMetadata] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey || !program) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!collectionMintStr || !expenseName || !expenseType || !approvedAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    let finalUri = uri;
    const toastId = toast.loading("Creating expense...");

    // If URI is not provided, upload metadata to Pinata
    if (!uri) {
      try {
        setUploadingMetadata(true);
        toast.loading("Uploading metadata to IPFS...", { id: toastId });
        
        const metadata = createExpenseMetadata(
          expenseName,
          expenseType,
          parseInt(approvedAmount),
          parseInt(variancePct)
        );
        finalUri = await uploadMetadataToPinata(
          metadata,
          `expense-${expenseType.toLowerCase()}-${Date.now()}.json`
        );
        
        setUri(finalUri);
        toast.success("Metadata uploaded to IPFS!", { id: toastId });
        toast.loading("Creating expense...", { id: toastId });
      } catch (error) {
        console.error("Metadata upload error:", error);
        toast.error(
          `Failed to upload metadata: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          { id: toastId }
        );
        setLoading(false);
        setUploadingMetadata(false);
        return;
      } finally {
        setUploadingMetadata(false);
      }
    }

    try {
      const collectionMint = new PublicKey(collectionMintStr);
      const [budgetPda] = deriveBudgetPda(collectionMint);

      // Fetch budget to get expense count
      // Use Anchor's coder to deserialize account data
      let expenseCount = 0;
      try {
        // Try using program.account namespace (try both PascalCase and camelCase)
        const accountNamespace = (program.account as any);
        let budgetAccount = null;
        
        // Try PascalCase first (matches IDL)
        if (accountNamespace && accountNamespace["BudgetPDA"]) {
          budgetAccount = await accountNamespace["BudgetPDA"].fetch(budgetPda);
        } 
        // Try camelCase (Anchor might convert)
        else if (accountNamespace && accountNamespace["budgetPDA"]) {
          budgetAccount = await accountNamespace["budgetPDA"].fetch(budgetPda);
        }
        
        if (budgetAccount) {
          expenseCount = budgetAccount.expenseCount;
        } else {
          // Fallback: fetch and deserialize manually using Anchor's coder
          const accountInfo = await connection.getAccountInfo(budgetPda);
          if (accountInfo?.data) {
            // Try using Anchor's coder to deserialize
            try {
              const coder = (program as any).coder;
              if (coder && coder.accounts) {
                const budgetAccount = coder.accounts.decode("BudgetPDA", accountInfo.data);
                expenseCount = budgetAccount.expenseCount;
              } else {
                throw new Error("Coder not available");
              }
            } catch (decodeError) {
              // Manual deserialization fallback
              // BudgetPDA: 8 (discriminator) + 32 (authority) + 32 (collection_mint) + 2 (year) + 4 (expense_count) + 1 (bump)
              const data = accountInfo.data;
              expenseCount = data.readUInt32LE(74); // 8 + 32 + 32 + 2 = 74
            }
          }
        }
      } catch (error) {
        console.error("Error fetching budget account:", error);
        // If account doesn't exist or fetch fails, default to 0
        expenseCount = 0;
      }

      // Derive expense PDA
      // Ensure expenseCount is a number
      const expenseCountNum = typeof expenseCount === 'number' ? expenseCount : Number(expenseCount) || 0;
      const [expensePda] = deriveExpensePda(collectionMint, expenseCountNum);

      // Generate expense mint
      const expenseMint = Keypair.generate();

      // Derive expense ATA
      const expenseAta = await getAssociatedTokenAddress(
        expenseMint.publicKey,
        expensePda,
        true
      );

      // Derive metadata accounts
      const expenseMetadata = deriveMetadataAccount(expenseMint.publicKey);
      const collectionMetadata = deriveMetadataAccount(collectionMint);
      const collectionMasterEdition = deriveMasterEdition(collectionMint);

      // Create the expense
      // Anchor requires BN for u64 values
      const tx = await program.methods
        .createExpense(
          expenseName,
          expenseType,
          finalUri,
          new BN(approvedAmount),
          parseInt(variancePct)
        )
        .accounts({
          budgetPda,
          expensePda,
          expenseMint: expenseMint.publicKey,
          expenseAta,
          expenseMetadata,
          collectionMint,
          collectionMetadata,
          collectionMasterEdition,
          payer: publicKey,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        })
        .signers([expenseMint])
        .rpc();

      toast.success("Expense created!", { id: toastId });
      console.log("Transaction signature:", tx);
      console.log("Expense mint:", expenseMint.publicKey.toBase58());
      console.log("Expense PDA:", expensePda.toBase58());

      // Reset form
      setExpenseName("");
      setExpenseType("");
      setUri("");
      setApprovedAmount("");
      setVariancePct("10");
    } catch (error) {
      console.error("Error creating expense:", error);
      toast.error(
        `Failed to create expense: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        { id: toastId }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <h2 className="text-2xl font-bold mb-6 text-white">
        Create Expense Item
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Collection Mint Address
          </label>
          <input
            type="text"
            value={collectionMintStr}
            onChange={(e) => setCollectionMintStr(e.target.value)}
            placeholder="Collection mint public key"
            className="w-full px-4 py-2 bg-black border border-[#282828] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm transition-colors"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Expense Name
          </label>
          <input
            type="text"
            value={expenseName}
            onChange={(e) => setExpenseName(e.target.value)}
            placeholder="e.g., Travel Expense"
            className="w-full px-4 py-2 bg-black border border-[#282828] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            disabled={loading}
          />
        </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Expense Type
              </label>
              <input
                type="text"
                value={expenseType}
                onChange={(e) => setExpenseType(e.target.value)}
                placeholder="e.g., Travel, Salaries, Operations"
                maxLength={50}
                className="w-full px-4 py-2 bg-black border border-[#282828] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                disabled={loading}
              />
              <p className="text-xs text-gray-400 mt-1">
                Note: Symbol will be truncated to 10 characters for Metaplex compatibility
              </p>
            </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Metadata URI
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder="Leave empty to auto-upload to Pinata IPFS"
              className="flex-1 px-4 py-2 bg-black border border-[#282828] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              disabled={loading || uploadingMetadata}
            />
            {!uri && (
              <button
                type="button"
                onClick={async () => {
                  if (!expenseName || !expenseType || !approvedAmount) {
                    toast.error("Please fill in expense name, type, and amount first");
                    return;
                  }
                  setUploadingMetadata(true);
                  const toastId = toast.loading("Uploading metadata...");
                  try {
                    const metadata = createExpenseMetadata(
                      expenseName,
                      expenseType,
                      parseInt(approvedAmount),
                      parseInt(variancePct)
                    );
                    const ipfsUrl = await uploadMetadataToPinata(
                      metadata,
                      `expense-${expenseType.toLowerCase()}-${Date.now()}.json`
                    );
                    setUri(ipfsUrl);
                    toast.success("Metadata uploaded!", { id: toastId });
                  } catch (error) {
                    toast.error(
                      `Upload failed: ${
                        error instanceof Error ? error.message : "Unknown error"
                      }`,
                      { id: toastId }
                    );
                  } finally {
                    setUploadingMetadata(false);
                  }
                }}
                disabled={
                  loading ||
                  uploadingMetadata ||
                  !expenseName ||
                  !expenseType ||
                  !approvedAmount
                }
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {uploadingMetadata ? "Uploading..." : "Upload to Pinata"}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {uri
              ? `IPFS URL: ${uri}`
              : "Leave empty and click 'Upload to Pinata' to automatically generate and upload metadata"}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Approved Amount (tokens)
          </label>
          <input
            type="number"
            value={approvedAmount}
            onChange={(e) => setApprovedAmount(e.target.value)}
            placeholder="e.g., 500000000"
            min="1"
            className="w-full px-4 py-2 bg-black border border-[#282828] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            disabled={loading}
          />
          <p className="text-xs text-gray-400 mt-1">
            Note: This represents the budget allocation in tokens
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Variance Percentage (%)
          </label>
          <input
            type="number"
            value={variancePct}
            onChange={(e) => setVariancePct(e.target.value)}
            min="0"
            max="100"
            className="w-full px-4 py-2 bg-black border border-[#282828] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            disabled={loading}
          />
          <p className="text-xs text-gray-400 mt-1">
            Allowed overspend percentage (e.g., 10% allows spending up to 110% of approved amount)
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !publicKey}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Creating..." : "Create Expense"}
        </button>
      </form>
    </div>
  );
}

