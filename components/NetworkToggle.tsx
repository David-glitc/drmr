"use client";

import { useAtom } from "jotai";
import { networkAtom } from "@/lib/state/atoms";
import { useAtomValue } from "jotai";
import { walletStatusAtom } from "@/lib/state/atoms";

export function NetworkToggle() {
  const [network, setNetwork] = useAtom(networkAtom);
  const walletStatus = useAtomValue(walletStatusAtom);
  const isDisabled = walletStatus !== "connected";

  // Mainnet is coming soon, so we'll keep it on devnet for now
  const isMainnetDisabled = true;

  const toggleNetwork = () => {
    if (isDisabled || isMainnetDisabled) return;
    setNetwork(network === "mainnet-beta" ? "devnet" : "mainnet-beta");
  };

  return (
    <div className="flex items-center gap-2">
    <button
        onClick={() => !isDisabled && setNetwork("devnet")}
      disabled={isDisabled}
      className={`
        relative inline-flex h-8 items-center rounded-full border px-3 transition-colors
        ${isDisabled 
            ? "border-white/10 bg-[#111118] cursor-not-allowed opacity-50" 
            : network === "devnet"
            ? "border-blue-500/50 bg-blue-500/20"
            : "border-white/10 bg-[#111118] hover:bg-white/5"
        }
      `}
        title={isDisabled ? "Connect wallet to change network" : "Devnet (Default)"}
    >
      <span className="text-xs font-semibold text-white">
          Devnet
        </span>
      </button>
      
      <button
        onClick={toggleNetwork}
        disabled={isDisabled || isMainnetDisabled}
        className={`
          relative inline-flex h-8 items-center rounded-full border px-3 transition-colors
          ${isDisabled || isMainnetDisabled
            ? "border-white/10 bg-[#111118] cursor-not-allowed opacity-50" 
            : network === "mainnet-beta"
            ? "border-red-500/50 bg-red-500/20"
            : "border-white/10 bg-[#111118] hover:bg-white/5"
          }
        `}
        title={isMainnetDisabled ? "Mainnet coming soon" : isDisabled ? "Connect wallet to change network" : "Switch to Mainnet"}
      >
        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
          Mainnet
          {isMainnetDisabled && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60">
              Soon
            </span>
          )}
      </span>
    </button>
    </div>
  );
}
