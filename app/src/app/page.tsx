"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import WalletButton from "@/components/WalletButton";
import CreateBudgetForm from "@/components/CreateBudgetForm";
import CreateExpenseForm from "@/components/CreateExpenseForm";

export default function Home() {
  const { connected } = useWallet();

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-[#282828] bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  mDAO Budget Manager
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Manage budgets and expenses using Solana & Futarchy
                </p>
              </div>
              <Link
                href="/budgets"
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
              >
                View Budgets →
              </Link>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!connected ? (
          <div className="card p-12 text-center">
            <div className="max-w-md mx-auto">
              <svg
                className="mx-auto h-24 w-24 text-primary-500 mb-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              <h2 className="text-2xl font-bold text-white mb-4">
                Welcome to Budget Manager
              </h2>
              <p className="text-gray-400 mb-6">
                Connect your Solana wallet to create and manage budget collections
                and expense items using Metaplex NFT standards.
              </p>
              <div className="flex justify-center">
                <WalletButton />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Create Budget */}
            <div>
              <CreateBudgetForm />
              
              {/* Info Card */}
              <div className="mt-6 card p-4 border-primary-500/20">
                <h3 className="font-semibold text-white mb-2">
                  ℹ️ How it works
                </h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Budget collections are NonFungible NFTs</li>
                  <li>• Each budget can have multiple expense items</li>
                  <li>• Expense items are FungibleAsset tokens</li>
                  <li>• All items are verified in the collection</li>
                </ul>
              </div>
            </div>

            {/* Right Column - Create Expense */}
            <div>
              <CreateExpenseForm />
              
              {/* Usage Guide */}
              <div className="mt-6 card p-4 border-primary-500/20">
                <h3 className="font-semibold text-white mb-2">
                  📝 Steps to Create
                </h3>
                <ol className="text-sm text-gray-300 space-y-1">
                  <li>1. First, create a budget collection (left)</li>
                  <li>2. Copy the collection mint address from logs</li>
                  <li>3. Use it to create expense items (right)</li>
                  <li>4. Set approved amounts and variance limits</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Footer Info */}
        {connected && (
          <div className="mt-8 card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Budget Architecture
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
                <h4 className="font-semibold text-primary-500 mb-2">
                  Launchpad Integration
                </h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• Futarchy Approval</li>
                  <li>• Large Annual Expenses</li>
                  <li>• Planning, Tracking, Metrics</li>
                  <li>• Mitigate time-sensitive expense approvals</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-primary-500 mb-2">
                  Budget Collection
                </h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• NonFungible NFT (supply=1)</li>
                  <li>• Master Edition (no printing)</li>
                  <li>• Collection verified</li>
                  <li>• Year-based tracking</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-primary-500 mb-2">
                  Expense Items
                </h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• FungibleAsset tokens</li>
                  <li>• Verified in collection</li>
                  <li>• Approved amount tracking</li>
                  <li>• Preapproved 'Variance' percentage</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-primary-500 mb-2">
                  Spending System
                </h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• Burn 'budget tokens' to release spend</li>
                  <li>• Triggers USDC transfers</li>
                  <li>• Variance checks</li>
                  <li>• Real-time tracking</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

