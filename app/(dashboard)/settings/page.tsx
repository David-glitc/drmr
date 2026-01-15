"use client";

import { useAtom } from "jotai";
import {
  autoRefreshAtom,
  refreshIntervalAtom,
  explorerAtom,
  networkAtom
} from "@/lib/state/atoms";
import { onChainCache } from "@/lib/onchain/cache";
import { useState } from "react";

export default function SettingsPage() {
  const [autoRefresh, setAutoRefresh] = useAtom(autoRefreshAtom);
  const [refreshInterval, setRefreshInterval] = useAtom(refreshIntervalAtom);
  const [explorer, setExplorer] = useAtom(explorerAtom);
  const [network] = useAtom(networkAtom);

  const [cacheCleared, setCacheCleared] = useState(false);

  const handleClearCache = () => {
    onChainCache.clear();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white mb-2">Settings</h1>
        <p className="text-sm text-white/60">
          Customize your dashboard experience.
        </p>
      </div>

      {/* Preferences */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-white">Preferences</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Explorer Selection */}
          <div className="rounded-xl border border-white/10 bg-[#001229] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-white">Block Explorer</p>
                <p className="text-xs text-white/60 mt-1">Preferred explorer for transaction links</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['solana', 'solscan', 'solanafm'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setExplorer(opt)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${explorer === opt
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  {opt === 'solana' ? 'Solana' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Data Settings */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-white">Data & Performance</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Auto Refresh */}
          <div className="rounded-xl border border-white/10 bg-[#001229] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-white">Auto Refresh</p>
                <p className="text-xs text-white/60 mt-1">Automatically update portfolio data</p>
              </div>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoRefresh ? 'bg-blue-500' : 'bg-white/10'
                  }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoRefresh ? 'translate-x-6' : 'translate-x-1'
                  }`} />
              </button>
            </div>

            {/* Interval Slider (only if auto refresh is on) */}
            <div className={`transition-opacity duration-200 ${autoRefresh ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <div className="flex justify-between text-xs text-white/60 mb-2">
                <span>Refresh Interval</span>
                <span>{refreshInterval / 1000}s</span>
              </div>
              <input
                type="range"
                min="10000"
                max="60000"
                step="5000"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-white/40 mt-1">
                <span>10s</span>
                <span>60s</span>
              </div>
            </div>
          </div>

          {/* Cache Management */}
          <div className="rounded-xl border border-white/10 bg-[#001229] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Local Cache</p>
                <p className="text-xs text-white/60 mt-1">Clear stored data to force fresh fetch</p>
              </div>
              <button
                onClick={handleClearCache}
                disabled={cacheCleared}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors border ${cacheCleared
                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                  }`}
              >
                {cacheCleared ? 'Cleared!' : 'Clear Cache'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Network Info (Read Only) */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-white">Network</h2>
        <div className="rounded-xl border border-white/10 bg-[#001229] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Current Network</p>
              <p className="text-xs text-white/60 mt-1">Selected in top navigation</p>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${network === 'mainnet-beta'
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
              }`}>
              {network === 'mainnet-beta' ? 'Mainnet Beta' : 'Devnet'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
