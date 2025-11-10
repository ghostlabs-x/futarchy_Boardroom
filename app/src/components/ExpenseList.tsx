"use client";

import { PublicKey } from "@solana/web3.js";

interface Expense {
  pda: PublicKey;
  mint: PublicKey;
  expenseName?: string;
  expenseType: string;
  approvedAmount: number | string;
  actualSpent?: number | string;
  spent?: number | string; // Legacy field for backwards compatibility
  variancePct: number;
  remainingBalance: number;
  metadata?: any;
}

interface ExpenseListProps {
  expenses: Expense[];
}

export default function ExpenseList({ expenses }: ExpenseListProps) {
  return (
    <div className="space-y-4">
      {expenses.map((expense, index) => {
        const approved = Number(expense.approvedAmount || 0);
        let spent = Number(expense.actualSpent || expense.spent || 0);
        // Ensure spent is never negative and is zero if no amount consumed
        if (isNaN(spent) || spent < 0 || approved === 0) {
          spent = 0;
        }
        const remaining = Number(expense.remainingBalance || 0);
        const spentPercent = approved > 0 ? (spent / approved) * 100 : 0;
        const maxAllowed = approved + (approved * expense.variancePct) / 100;

        return (
          <div
            key={index}
            className="card p-4 border-[#282828] hover:border-[#404040] transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold text-white">
                    {expense.expenseName || expense.metadata?.metadata?.name || expense.metadata?.name || expense.expenseType || `Expense ${index + 1}`}
                  </h4>
                  <span className="px-2 py-1 bg-primary-500/20 text-primary-400 text-xs rounded">
                    {expense.expenseType}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-gray-400 mb-1">Approved</p>
                    <p className="text-white font-medium">
                      {approved.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">Spent</p>
                    <p className="text-red-400 font-medium">
                      {spent.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">Remaining</p>
                    <p className="text-green-400 font-medium">
                      {remaining.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">Variance</p>
                    <p className="text-white font-medium">
                      {expense.variancePct}%
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Spending Progress</span>
                    <span>{spentPercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-[#1a1a1a] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        spentPercent > expense.variancePct
                          ? "bg-red-500"
                          : spentPercent > 80
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(spentPercent, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Max: {maxAllowed.toLocaleString()}</span>
                    <span>
                      {spent > maxAllowed ? (
                        <span className="text-red-400">Over Budget!</span>
                      ) : (
                        `${(maxAllowed - spent).toLocaleString()} remaining`
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="ml-4">
                <a
                  href={`https://explorer.solana.com/address/${expense.mint.toBase58()}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-500 hover:text-primary-400 text-sm"
                >
                  View →
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

