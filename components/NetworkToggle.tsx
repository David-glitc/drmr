"use client";

import { useAtom } from "jotai";
import { networkAtom } from "@/lib/state/atoms";
import { useAtomValue } from "jotai";
import { walletStatusAtom } from "@/lib/state/atoms";

export function NetworkToggle() {
  const [network, setNetwork] = useAtom(networkAtom);
  const walletStatus = useAtomValue(walletStatusAtom);
  const isDisabled = walletStatus !== "connected";

  const toggleNetwork = () => {
    if (isDisabled) return;
    setNetwork(network === "mainnet-beta" ? "devnet" : "mainnet-beta");
  };

  return (
    <button
      onClick={toggleNetwork}
      disabled={isDisabled}
      className={`
        relative inline-flex h-8 items-center rounded-full border px-3 transition-colors
        ${isDisabled 
          ? "border-white/10 bg-slate-800/50 cursor-not-allowed opacity-50" 
          : network === "mainnet-beta"
          ? "border-sky-500/50 bg-sky-500/20"
          : "border-amber-500/50 bg-amber-500/20"
        }
      `}
      title={isDisabled ? "Connect wallet to change network" : `Switch to ${network === "mainnet-beta" ? "devnet" : "mainnet"}`}
    >
      <span className="text-xs font-semibold text-white">
        {network === "mainnet-beta" ? "Mainnet" : "Devnet"}
      </span>
    </button>
  );
}

