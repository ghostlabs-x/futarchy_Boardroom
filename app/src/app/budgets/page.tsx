"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import WalletButton from "@/components/WalletButton";
import BudgetList from "@/components/BudgetList";
import { useProgram } from "@/hooks/useProgram";

export default function BudgetsPage() {
  const { connected } = useWallet();
  const program = useProgram();

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-[#282828] bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-primary-500 hover:text-primary-400 transition-colors"
              >
                ← Back to Create
              </Link>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold text-white">
                    Budget Dashboard
                  </h1>
                  <span className="px-2 py-1 bg-primary-500/20 text-primary-400 text-xs rounded border border-primary-500/30">
                    Devnet
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  View and manage your budget collections and expenses
                </p>
              </div>
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h2 className="text-2xl font-bold text-white mb-4">
                Connect Your Wallet
              </h2>
              <p className="text-gray-400 mb-6">
                Connect your Solana wallet to view your budget collections
              </p>
              <div className="flex justify-center">
                <WalletButton />
              </div>
            </div>
          </div>
        ) : (
          <BudgetList />
        )}
      </div>
    </main>
  );
}

