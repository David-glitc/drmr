"use client";

import { useAtom } from "jotai";
import { networkAtom } from "@/lib/state/atoms";
import { useAtomValue } from "jotai";
import { walletStatusAtom } from "@/lib/state/atoms";

export function NetworkToggle() {
  const [network, setNetwork] = useAtom(networkAtom);
  const walletStatus = useAtomValue(walletStatusAtom);
  const isDisabled = walletStatus !== "connected";

  const toggleNetwork = (targetNetwork: "devnet" | "mainnet-beta") => {
    if (isDisabled) return;
    setNetwork(targetNetwork);
    // Refresh the page to ensure all hooks and services re-initialize with the new network
    window.location.reload();
  };

  return (
    <div className={`relative flex items-center rounded-lg border border-white/10 bg-[#001229] p-1 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {/* Sliding Background */}
      <div
        className={`absolute h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-md bg-white/10 transition-all duration-300 ease-out
          ${network === 'devnet' ? 'left-1' : 'left-[calc(50%+2px)]'}
        `}
      />

      <button
        onClick={() => toggleNetwork("devnet")}
        disabled={isDisabled}
        className={`relative z-10 w-20 py-1.5 text-xs font-medium transition-colors ${network === 'devnet' ? 'text-white' : 'text-white/50 hover:text-white/70'
          }`}
      >
        Devnet
      </button>

      <button
        onClick={() => toggleNetwork("mainnet-beta")}
        disabled={isDisabled}
        className={`relative z-10 w-20 py-1.5 text-xs font-medium transition-colors ${network === 'mainnet-beta' ? 'text-white' : 'text-white/50 hover:text-white/70'
          }`}
      >
        Mainnet
      </button>
    </div>
  );
}
