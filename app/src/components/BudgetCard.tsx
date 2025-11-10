"use client";

import { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useProgram } from "@/hooks/useProgram";
import { deriveExpensePda } from "@/utils/anchor";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { fetchNftMetadata } from "@/utils/metaplex";
import ExpenseList from "./ExpenseList";

interface BudgetCardProps {
  budget: {
    pda: PublicKey;
    collectionMint: PublicKey;
    authority: PublicKey;
    year: number;
    expenseCount: number;
    bump: number;
  };
}

export default function BudgetCard({ budget }: BudgetCardProps) {
  const { connection } = useConnection();
  const program = useProgram();
  const [collectionMetadata, setCollectionMetadata] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expensesLoading, setExpensesLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!connection || !program) return;

      try {
        // Fetch collection metadata
        try {
          const metadata = await fetchNftMetadata(connection, budget.collectionMint);
          setCollectionMetadata(metadata);
        } catch (error) {
          console.error("Error fetching collection metadata:", error);
        }

        // Fetch all expenses for this budget
        const expenseList: any[] = [];
        for (let i = 0; i < budget.expenseCount; i++) {
          try {
            const [expensePda] = deriveExpensePda(budget.collectionMint, i);
            
            // Check if account exists on-chain first
            const accountInfo = await connection.getAccountInfo(expensePda);
            if (!accountInfo) {
              console.warn(`Expense ${i} account not found on-chain`);
              continue;
            }

            // Try to fetch expense account with fallbacks
            const accountNamespace = (program.account as any);
            let expenseAccount = null;
            
            if (accountNamespace && accountNamespace["ExpensePDA"]) {
              try {
                expenseAccount = await accountNamespace["ExpensePDA"].fetch(expensePda);
              } catch (e) {
                console.warn(`Failed to fetch ExpensePDA for expense ${i}:`, e);
              }
            }
            
            if (!expenseAccount && accountNamespace && accountNamespace["expensePDA"]) {
              try {
                expenseAccount = await accountNamespace["expensePDA"].fetch(expensePda);
              } catch (e) {
                console.warn(`Failed to fetch expensePDA for expense ${i}:`, e);
              }
            }

            // Fallback: manual deserialization
            if (!expenseAccount && accountInfo.data.length >= 79) {
              try {
                const coder = (program as any).coder;
                if (coder && coder.accounts) {
                  try {
                    expenseAccount = coder.accounts.decode("ExpensePDA", accountInfo.data);
                  } catch (e1) {
                    try {
                      expenseAccount = coder.accounts.decode("expensePDA", accountInfo.data);
                    } catch (e2) {
                      // Manual deserialization as last resort
                      // ExpensePDA structure: 8 (discriminator) + 32 (budget) + 32 (mint) + 4 (expense_type len) + expense_type string + 8 (approved_amount) + 8 (spent) + 1 (variance_pct) + 1 (bump)
                      const data = accountInfo.data;
                      if (data.length < 90) {
                        console.warn(`Expense ${i} account data too short: ${data.length} bytes`);
                        continue;
                      }
                      
                      const budgetPda = new PublicKey(data.slice(8, 40));
                      const mint = new PublicKey(data.slice(40, 72));
                      
                      // Read expense_type string (4-byte length prefix + string)
                      let offset = 72;
                      const typeLen = data.readUInt32LE(offset);
                      offset += 4;
                      const expenseType = data.slice(offset, offset + typeLen).toString('utf8');
                      offset += typeLen;
                      
                      // Align to 8 bytes for u64 fields
                      while (offset % 8 !== 0) {
                        offset++;
                      }
                      
                      const approvedAmount = data.readBigUInt64LE(offset);
                      offset += 8;
                      const spent = data.readBigUInt64LE(offset);
                      offset += 8;
                      const variancePct = data[offset];
                      offset += 1;
                      const bump = data[offset];
                      
                      expenseAccount = {
                        budget: budgetPda,
                        budgetPda, // Alias for compatibility
                        mint,
                        approvedAmount: approvedAmount.toString(),
                        spent: spent.toString(),
                        variancePct,
                        bump,
                        expenseType,
                      };
                      console.log(`Manually decoded expense ${i}:`, expenseAccount);
                    }
                  }
                }
              } catch (decodeError) {
                console.error(`Error decoding expense ${i}:`, decodeError);
                continue;
              }
            }

            if (expenseAccount) {
              // Get expense mint from the account
              const expenseMint = new PublicKey(expenseAccount.mint);
              
              // Try to fetch expense metadata
              let expenseMetadata = null;
              try {
                expenseMetadata = await fetchNftMetadata(connection, expenseMint);
              } catch (error) {
                console.error(`Error fetching expense ${i} metadata:`, error);
              }

              // Get approved amount from metadata JSON (PRIMARY source)
              // This is the canonical source to avoid confusion as token balances get consumed
              // Attributes are stored in the JSON file at the URI, not in the metadata account itself
              let approvedAmount = BigInt(0);
              if (expenseMetadata) {
                try {
                  // Get the URI from the metadata account
                  const metadataObj = (expenseMetadata as any).metadata || expenseMetadata;
                  const uri = metadataObj?.data?.uri || metadataObj?.uri;
                  
                  if (uri) {
                    // Fetch the JSON from the URI (IPFS/Arweave)
                    const response = await fetch(uri);
                    if (response.ok) {
                      const jsonData = await response.json();
                      // Extract "Approved Amount" from attributes in the JSON
                      const attributes = jsonData?.attributes || [];
                      
                      if (Array.isArray(attributes)) {
                        const approvedAmountAttr = attributes.find(
                          (attr: any) => attr.trait_type === "Approved Amount"
                        );
                        if (approvedAmountAttr && approvedAmountAttr.value) {
                          approvedAmount = BigInt(approvedAmountAttr.value);
                          console.log(`Using approved amount from metadata JSON for expense ${i}: ${approvedAmount.toString()}`);
                        }
                      }
                    }
                  }
                } catch (error) {
                  console.warn(`Could not extract approved amount from metadata URI for expense ${i}:`, error);
                  // Fallback to PDA if metadata fetch fails
                  if (expenseAccount.approvedAmount) {
                    approvedAmount = BigInt(expenseAccount.approvedAmount);
                  } else if (expenseAccount.approved_amount) {
                    approvedAmount = BigInt(expenseAccount.approved_amount);
                  }
                }
              } else {
                // Fallback to PDA if metadata not available
                if (expenseAccount.approvedAmount) {
                  approvedAmount = BigInt(expenseAccount.approvedAmount);
                } else if (expenseAccount.approved_amount) {
                  approvedAmount = BigInt(expenseAccount.approved_amount);
                }
              }

              // Get token balance (remaining tokens)
              const expenseAta = await getAssociatedTokenAddress(
                expenseMint,
                expensePda,
                true
              );
              
              let remainingBalance = 0;
              try {
                const balance = await connection.getTokenAccountBalance(expenseAta);
                remainingBalance = parseInt(balance.value.amount);
              } catch (error) {
                console.error(`Error fetching expense ${i} balance:`, error);
              }

              // Calculate actual spent amount
              // Spent = Initial Approved Amount - Remaining Balance
              // Use approved amount from metadata (primary source) and remaining token balance
              const approvedAmountBigInt = approvedAmount;
              const remainingBalanceBigInt = BigInt(remainingBalance);
              
              // Calculate spent: Approved Amount - Remaining Balance
              let actualSpent: bigint;
              if (approvedAmountBigInt === BigInt(0)) {
                // If no approved amount, nothing can be spent
                actualSpent = BigInt(0);
              } else if (remainingBalanceBigInt >= approvedAmountBigInt) {
                // If remaining balance is >= approved amount, nothing has been spent
                actualSpent = BigInt(0);
              } else {
                // Spent = Approved - Remaining
                actualSpent = approvedAmountBigInt - remainingBalanceBigInt;
                // Ensure spent is never negative
                if (actualSpent < BigInt(0)) {
                  actualSpent = BigInt(0);
                }
              }
              
              // TODO: Variance Handling - Future Enhancement
              // When variance percentage is consumed (spent > approved_amount but <= max_allowed),
              // we need to handle the overage. Options:
              // 1. Track variance overage separately in the ExpensePDA account
              // 2. Mint additional tokens to represent the variance overage for tracking
              // 3. Calculate variance overage in the UI and display separately
              // For now, actualSpent represents only the base approved amount spent.
              // Variance overage would need to be: actualSpent - approvedAmount (when > approvedAmount)
              // Max allowed = approvedAmount * (100 + variancePct) / 100

              expenseList.push({
                pda: expensePda,
                mint: expenseMint,
                ...expenseAccount,
                // Ensure approvedAmount is set (use the resolved value)
                approvedAmount: approvedAmountBigInt.toString(),
                metadata: expenseMetadata,
                remainingBalance,
                actualSpent: actualSpent.toString(),
              });
            }
          } catch (error) {
            console.error(`Error fetching expense ${i}:`, error);
          }
        }

        setExpenses(expenseList);
      } catch (error) {
        console.error("Error fetching budget data:", error);
      } finally {
        setLoading(false);
        setExpensesLoading(false);
      }
    };

    fetchData();
  }, [budget, connection, program]);

  const totalApproved = expenses.reduce((sum, exp) => {
    const approved = Number(exp.approvedAmount || 0);
    return sum + (isNaN(approved) ? 0 : approved);
  }, 0);
  const totalSpent = expenses.reduce((sum, exp) => {
    const approved = Number(exp.approvedAmount || 0);
    let spent = Number(exp.actualSpent || 0);
    // Ensure spent is never negative and is zero if no amount consumed
    // Same validation logic as ExpenseList to prevent displaying huge incorrect numbers
    if (isNaN(spent) || spent < 0 || approved === 0) {
      spent = 0;
    }
    // Additional safety check: if spent exceeds approved by more than reasonable variance (e.g., 200%),
    // it's likely a calculation error, so set to 0
    // TODO: When variance handling is implemented, this should account for variance percentage
    if (approved > 0 && spent > approved * 2) {
      console.warn(`Suspicious spent amount detected: ${spent} for approved ${approved}. Setting to 0.`);
      spent = 0;
    }
    return sum + spent;
  }, 0);
  const totalRemaining = expenses.reduce((sum, exp) => {
    const remaining = Number(exp.remainingBalance || 0);
    return sum + (isNaN(remaining) ? 0 : remaining);
  }, 0);

  return (
    <div className="card p-6">
      {/* Budget Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {collectionMetadata?.metadata?.name || collectionMetadata?.name || `Budget ${budget.year}`}
            </h2>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <span>Year: {budget.year}</span>
              <span>•</span>
              {collectionMetadata?.metadata?.symbol && (
                <>
                  <span>Symbol: <span className="text-primary-400 font-semibold">{collectionMetadata.metadata.symbol}</span></span>
                  <span>•</span>
                </>
              )}
              <span>Expenses: {budget.expenseCount}</span>
              <span>•</span>
              <span className="font-mono text-xs">
                {budget.collectionMint.toBase58().slice(0, 8)}...
                {budget.collectionMint.toBase58().slice(-8)}
              </span>
            </div>
          </div>
          <a
            href={`https://explorer.solana.com/address/${budget.collectionMint.toBase58()}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-500 hover:text-primary-400 text-sm"
          >
            View on Explorer →
          </a>
        </div>

        {/* Budget Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4 border-primary-500/20">
            <p className="text-sm text-gray-400 mb-1">Total Approved</p>
            <p className="text-2xl font-bold text-white">
              {totalApproved.toLocaleString()}
            </p>
          </div>
          <div className="card p-4 border-primary-500/20">
            <p className="text-sm text-gray-400 mb-1">Total Spent</p>
            <p className="text-2xl font-bold text-red-400">
              {totalSpent.toLocaleString()}
            </p>
          </div>
          <div className="card p-4 border-primary-500/20">
            <p className="text-sm text-gray-400 mb-1">Remaining Balance</p>
            <p className="text-2xl font-bold text-green-400">
              {totalRemaining.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Expense Items ({expenses.length})
        </h3>
        {expensesLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading expenses...</p>
          </div>
        ) : expenses.length > 0 ? (
          <ExpenseList expenses={expenses} />
        ) : (
          <div className="card p-8 text-center border-dashed">
            <p className="text-gray-400">No expenses found for this budget</p>
          </div>
        )}
      </div>
    </div>
  );
}

