import { useMemo } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { Program } from "@coral-xyz/anchor";
import { getProgram } from "@/utils/anchor";

export function useProgram(): Program | null {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    if (!wallet) return null;
    return getProgram(connection, wallet);
  }, [connection, wallet]);

  return program;
}

