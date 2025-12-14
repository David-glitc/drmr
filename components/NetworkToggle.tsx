"use client";

import { useAtom } from "jotai";
import { networkAtom } from "@/lib/state/atoms";

export function NetworkToggle() {
  const [network, setNetwork] = useAtom(networkAtom);
  const isMainnet = network === "mainnet-beta";

  const toggleNetwork = () => {
    setNetwork(isMainnet ? "devnet" : "mainnet-beta");
  };

  return (
    <button
      onClick={toggleNetwork}
      className="relative inline-flex h-7 w-14 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:ring-offset-2 focus:ring-offset-slate-950"
      style={{
        backgroundColor: isMainnet ? "rgba(244, 63, 94, 0.2)" : "rgba(245, 158, 11, 0.2)",
        borderColor: isMainnet ? "rgba(244, 63, 94, 0.5)" : "rgba(245, 158, 11, 0.5)",
      }}
      title={`Switch to ${isMainnet ? "devnet" : "mainnet"}`}
      aria-label={`Switch to ${isMainnet ? "devnet" : "mainnet"}`}
    >
      {/* Toggle switch thumb */}
      <span
        className={`
          inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ease-in-out shadow-md
          ${isMainnet ? "translate-x-8" : "translate-x-1"}
        `}
      />
      
      {/* Network labels */}
      <span className="absolute inset-0 flex items-center justify-between px-1.5">
        <span className={`text-[9px] font-semibold uppercase tracking-wider transition-opacity ${
          isMainnet ? "opacity-80" : "opacity-40"
        }`}>
          M
        </span>
        <span className={`text-[9px] font-semibold uppercase tracking-wider transition-opacity ${
          !isMainnet ? "opacity-80" : "opacity-40"
        }`}>
          D
        </span>
      </span>
    </button>
  );
}

