"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function WalletButton() {
  const { publicKey, connected } = useWallet();

  return (
    <div className="flex items-center gap-4">
      <WalletMultiButton className="!bg-primary-500 hover:!bg-primary-600 !rounded-lg !px-6 !py-3 !text-white !font-medium" />
      {connected && publicKey && (
        <div className="text-sm text-gray-400 font-mono">
          {publicKey.toBase58().slice(0, 4)}...
          {publicKey.toBase58().slice(-4)}
        </div>
      )}
    </div>
  );
}

