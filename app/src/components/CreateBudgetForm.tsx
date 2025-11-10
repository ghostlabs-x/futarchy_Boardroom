"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { useProgram } from "@/hooks/useProgram";
import {
  deriveBudgetPda,
  deriveMetadataAccount,
  deriveMasterEdition,
} from "@/utils/anchor";
import { TOKEN_METADATA_PROGRAM_ID } from "@/utils/constants";
import {
  uploadMetadataToPinata,
  createBudgetMetadata,
} from "@/utils/pinata";
import toast from "react-hot-toast";

export default function CreateBudgetForm() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const program = useProgram();

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [uri, setUri] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [uploadingMetadata, setUploadingMetadata] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey || !program) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!name || !symbol) {
      toast.error("Please fill in name and symbol");
      return;
    }

    setLoading(true);
    let finalUri = uri;
    const toastId = toast.loading("Creating budget collection...");

    // If URI is not provided, upload metadata to Pinata
    if (!uri) {
      try {
        setUploadingMetadata(true);
        toast.loading("Uploading metadata to IPFS...", { id: toastId });
        
        const metadata = createBudgetMetadata(name, symbol, year);
        finalUri = await uploadMetadataToPinata(
          metadata,
          `budget-${symbol.toLowerCase()}-${year}.json`
        );
        
        setUri(finalUri);
        toast.success("Metadata uploaded to IPFS!", { id: toastId });
        toast.loading("Creating budget collection...", { id: toastId });
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
      // Generate a new collection mint
      const collectionMint = Keypair.generate();

      // Derive PDAs
      const [budgetPda] = await deriveBudgetPda(collectionMint.publicKey);
      const collectionTokenAccount = await getAssociatedTokenAddress(
        collectionMint.publicKey,
        publicKey
      );
      const metadataAccount = deriveMetadataAccount(collectionMint.publicKey);
      const masterEdition = deriveMasterEdition(collectionMint.publicKey);

      // Create the budget collection
      const tx = await program.methods
        .createBudgetCollection(name, symbol, finalUri, year)
        .accounts({
          budgetPda,
          collectionMint: collectionMint.publicKey,
          collectionTokenAccount,
          metadataAccount,
          masterEdition,
          payer: publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        })
        .signers([collectionMint])
        .rpc();

      toast.success("Budget collection created!", { id: toastId });
      console.log("Transaction signature:", tx);
      console.log("Collection mint:", collectionMint.publicKey.toBase58());
      console.log("Budget PDA:", budgetPda.toBase58());

      // Reset form
      setName("");
      setSymbol("");
      setUri("");
      setYear(new Date().getFullYear());
    } catch (error: any) {
      console.error("Error creating budget collection:", error);
      
      // Get detailed error logs if available
      let errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (error.logs) {
        console.error("Transaction logs:", error.logs);
        errorMessage += `\n\nLogs: ${error.logs.join("\n")}`;
      }
      if (error.simulationResponse) {
        console.error("Simulation response:", error.simulationResponse);
      }
      
      toast.error(`Failed to create budget: ${errorMessage}`, { 
        id: toastId,
        duration: 10000 // Show longer to read logs
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <h2 className="text-2xl font-bold mb-6 text-white">
        Create Budget Collection
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Budget Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Budget 2026"
            className="w-full px-4 py-2 bg-black border border-[#282828] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Symbol
          </label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g., BUD26"
            maxLength={10}
            className="w-full px-4 py-2 bg-black border border-[#282828] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            disabled={loading}
          />
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
                  if (!name || !symbol) {
                    toast.error("Please fill in name and symbol first");
                    return;
                  }
                  setUploadingMetadata(true);
                  const toastId = toast.loading("Uploading metadata...");
                  try {
                    const metadata = createBudgetMetadata(name, symbol, year);
                    const ipfsUrl = await uploadMetadataToPinata(
                      metadata,
                      `budget-${symbol.toLowerCase()}-${year}.json`
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
                disabled={loading || uploadingMetadata || !name || !symbol}
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
            Year
          </label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            min={2024}
            max={2100}
            className="w-full px-4 py-2 bg-black border border-[#282828] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !publicKey}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Creating..." : "Create Budget Collection"}
        </button>
      </form>
    </div>
  );
}

