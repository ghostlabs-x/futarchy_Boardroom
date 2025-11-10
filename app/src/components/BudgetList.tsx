"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useProgram } from "@/hooks/useProgram";
import { deriveBudgetPda } from "@/utils/anchor";
import BudgetCard from "./BudgetCard";
import toast from "react-hot-toast";

export default function BudgetList() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const program = useProgram();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMint, setSearchMint] = useState("");

  // For now, we'll need to search by collection mint
  // In a production app, you'd want to track all budgets created by the user
  const handleSearch = async () => {
    if (!searchMint || !program || !publicKey) {
      toast.error("Please enter a collection mint address");
      return;
    }

    try {
      const collectionMint = new PublicKey(searchMint);
      const [budgetPda] = deriveBudgetPda(collectionMint);

      // Try to fetch the budget account
      try {
        // First, check if the account exists on-chain
        const accountInfo = await connection.getAccountInfo(budgetPda);
        if (!accountInfo) {
          toast.error("Budget account not found on-chain. Make sure you're on Devnet and the collection mint is correct.");
          return;
        }

        console.log("Budget PDA found on-chain:", budgetPda.toBase58());
        console.log("Account data length:", accountInfo.data.length);

        // Try to fetch using Anchor's account namespace
        const accountNamespace = (program.account as any);
        let budgetAccount = null;
        
        if (accountNamespace && accountNamespace["BudgetPDA"]) {
          budgetAccount = await accountNamespace["BudgetPDA"].fetch(budgetPda);
        } else if (accountNamespace && accountNamespace["budgetPDA"]) {
          budgetAccount = await accountNamespace["budgetPDA"].fetch(budgetPda);
        } else {
          // Fallback: try to decode manually using Anchor's coder
          try {
            const coder = (program as any).coder;
            if (coder && coder.accounts) {
              // Try different account name variations
              try {
                budgetAccount = coder.accounts.decode("BudgetPDA", accountInfo.data);
              } catch (e1) {
                try {
                  budgetAccount = coder.accounts.decode("budgetPDA", accountInfo.data);
                } catch (e2) {
                  // Manual deserialization as last resort
                  // BudgetPDA structure: 8 (discriminator) + 32 (authority) + 32 (collection_mint) + 2 (year) + 4 (expense_count) + 1 (bump)
                  const data = accountInfo.data;
                  if (data.length >= 79) {
                    const authority = new PublicKey(data.slice(8, 40));
                    const collectionMint = new PublicKey(data.slice(40, 72));
                    const year = data.readUInt16LE(72);
                    const expenseCount = data.readUInt32LE(74);
                    const bump = data[78];
                    
                    budgetAccount = {
                      authority,
                      collectionMint,
                      year,
                      expenseCount,
                      bump,
                    };
                    console.log("Manually decoded budget account:", budgetAccount);
                  }
                }
              }
            }
          } catch (decodeError) {
            console.error("Error decoding account:", decodeError);
          }
        }

        if (budgetAccount) {
          console.log("Budget account decoded:", budgetAccount);
          // Check if this budget belongs to the connected wallet
          const authorityPubkey = new PublicKey(budgetAccount.authority);
          if (authorityPubkey.toString() === publicKey.toString()) {
            setBudgets([{
              pda: budgetPda,
              collectionMint,
              ...budgetAccount,
            }]);
            toast.success("Budget found!");
          } else {
            toast.error(`This budget belongs to a different wallet. Authority: ${authorityPubkey.toString()}`);
          }
        } else {
          toast.error("Budget account exists but couldn't be decoded. Check console for details.");
        }
      } catch (error: any) {
        console.error("Error fetching budget:", error);
        const errorMessage = error?.message || "Unknown error";
        toast.error(`Failed to fetch budget: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Invalid collection mint:", error);
      toast.error("Invalid collection mint address");
    }
  };

  useEffect(() => {
    if (program && publicKey) {
      // In a production app, you'd fetch all budgets here
      // For now, we'll rely on search functionality
      setLoading(false);
    }
  }, [program, publicKey]);

  if (loading) {
    return (
      <div className="card p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading budgets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          Find Budget by Collection Mint
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchMint}
            onChange={(e) => setSearchMint(e.target.value)}
            placeholder="Enter collection mint address..."
            className="flex-1 px-4 py-2 bg-black border border-[#282828] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm transition-colors"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors"
          >
            Search
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Enter the collection mint address from when you created the budget
        </p>
      </div>

      {/* Monthly Expense Allowance Section */}
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4 text-white">
          Monthly Expense Allowance
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-[#282828]">
            <span className="text-gray-400">Project:</span>
            <span className="text-white font-semibold">Omnipair</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-400">Monthly Expense Allowance:</span>
            <span className="text-primary-400 font-semibold text-lg">
              {Number(50000).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Budgets List */}
      {budgets.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {budgets.map((budget, index) => (
            <BudgetCard key={index} budget={budget} />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <svg
            className="mx-auto h-16 w-16 text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-400">
            No budgets found. Search for a budget using the collection mint address above.
          </p>
        </div>
      )}
    </div>
  );
}

