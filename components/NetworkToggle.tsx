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
        relative inline-flex h-7 w-14 items-center rounded-full border transition-colors
        ${isDisabled 
          ? "border-white/10 bg-slate-800/50 cursor-not-allowed opacity-50" 
          : network === "mainnet-beta"
          ? "border-sky-500/50 bg-sky-500/20"
          : "border-amber-500/50 bg-amber-500/20"
        }
      `}
      title={isDisabled ? "Connect wallet to change network" : `Switch to ${network === "mainnet-beta" ? "devnet" : "mainnet"}`}
    >
      <span
        className={`
          inline-block h-5 w-5 transform rounded-full bg-white transition-transform
          ${network === "mainnet-beta" ? "translate-x-8" : "translate-x-1"}
        `}
      />
      <span className="absolute inset-0 flex items-center justify-between px-1.5 text-[9px] font-semibold uppercase tracking-wider">
        <span className={network === "mainnet-beta" ? "text-white/80" : "text-white/40"}>
          Main
        </span>
        <span className={network === "devnet" ? "text-white/80" : "text-white/40"}>
          Dev
        </span>
      </span>
    </button>
  );
}

