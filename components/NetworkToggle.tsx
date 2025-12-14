"use client";

import { useAtom } from "jotai";
import { networkAtom } from "@/lib/state/atoms";

export function NetworkToggle() {
  const [network, setNetwork] = useAtom(networkAtom);

  const toggleNetwork = () => {
    setNetwork(network === "mainnet-beta" ? "devnet" : "mainnet-beta");
  };

  return (
    <button
      onClick={toggleNetwork}
      className={`
        relative inline-flex h-8 items-center rounded-full border px-3 transition-colors
        ${network === "mainnet-beta"
          ? "border-rose-500/50 bg-rose-500/20 hover:bg-rose-500/30"
          : "border-amber-500/50 bg-amber-500/20 hover:bg-amber-500/30"
        }
      `}
      title={`Switch to ${network === "mainnet-beta" ? "devnet" : "mainnet"}`}
    >
      <span className="text-xs font-semibold text-white">
        {network === "mainnet-beta" ? "Mainnet" : "Devnet"}
      </span>
    </button>
  );
}

