"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { navItems, settingsNav } from "../../lib/nav";
import { useWallet } from "../../hooks/useWallet";
import { useSolanaAccount } from "../../hooks/useSolanaAccount";
import { useSolPrice } from "../../hooks/useSolPrice";
import { LoadingOverlay } from "../../components/LoadingOverlay";
import { NetworkToggle } from "../../components/NetworkToggle";

const iconMap: Record<string, React.ReactElement> = {
  chart: (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-rose-300" fill="none">
      <path
        d="M5 17V11M10 17V7M15 17V13M20 17V5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  diamond: (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-rose-300" fill="none">
      <path
        d="M12 3l7 7-7 11-7-11 7-7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  ),
  arrows: (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-rose-300" fill="none">
      <path
        d="M7 7h10l-3-3m3 13H7l3 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  coin: (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-rose-300" fill="none">
      <ellipse cx="12" cy="6" rx="8" ry="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M4 6v8c0 1.66 3.58 3 8 3s8-1.34 8-3V6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-rose-300" fill="none">
      <path
        d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M14 3v6h6" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-rose-300" fill="none">
      <path
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a7.97 7.97 0 000-6l-2.2-.4-1-2-2.2.4-1.1-2h-2.2l-1.1 2-2.2-.4-1 2-2.2.4a7.97 7.97 0 000 6l2.2.4 1 2 2.2-.4 1.1 2h2.2l1.1-2 2.2.4 1-2 2.2-.4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { walletAddress, isConnected, isConnecting, walletStatus, connect, disconnect } =
    useWallet();
  const { data: solanaAccount, isLoading: solanaLoading } = useSolanaAccount(
    walletAddress ?? null
  );
  const { data: solPrice } = useSolPrice();

  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      {/* Loading Overlay for Wallet Connection */}
      <LoadingOverlay 
        show={isConnecting} 
        message="Connecting Wallet..."
      />

      <nav className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-slate-950/80 px-3 py-2 backdrop-blur sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img 
              src="/logo.jpg" 
              alt="DRMR Logo" 
              className="h-8 w-8 rounded-full object-cover border border-rose-500/30"
            />
            <div>
              <p className="text-[9px] uppercase tracking-[0.4em] text-rose-300">
                DRMR
              </p>
              <p className="text-sm font-semibold text-white sm:text-base">
                American Dream Dashboard
              </p>
            </div>
          </Link>
            <details className="lg:hidden">
              <summary className="rounded-full border border-white/15 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.3em] text-white">
                Menu
              </summary>
              <div className="mt-2 w-44 rounded-xl border border-white/10 bg-slate-900/95 p-2.5 text-[11px] text-white shadow-xl">
                {navItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 transition ${
                      pathname === item.href
                        ? "bg-white/10 text-white"
                        : "text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    {iconMap[item.icon]}
                    {item.label}
                  </Link>
                ))}
                <Link
                  href={settingsNav.href}
                  className={`mt-1.5 flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 transition ${
                    pathname === settingsNav.href
                      ? "bg-white/10 text-white"
                      : "text-slate-200 hover:bg-white/5"
                  }`}
                >
                  {iconMap[settingsNav.icon]}
                  {settingsNav.label}
                </Link>
              </div>
            </details>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <NetworkToggle />
            {isConnected && walletAddress ? (
              <div className="relative">
                <details className="group">
                  <summary className="flex cursor-pointer items-center gap-1.5 rounded-full border border-rose-500/30 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-rose-500/50">
                    {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                    <span className="text-[10px] text-slate-400">▾</span>
                  </summary>
                  <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-white/10 bg-slate-900/95 p-3.5 text-[10px] text-white shadow-2xl">
                    <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.3em] text-slate-400">
                          Connected Wallet
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-white">
                          {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          void navigator.clipboard.writeText(walletAddress)
                        }
                        className="cursor-pointer rounded-full border border-white/20 p-1.5 text-white transition-all duration-200 hover:scale-110 hover:border-white active:scale-95"
                        aria-label="Copy address"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <rect x="9" y="9" width="11" height="11" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-2.5 text-[10px] text-slate-200">
                      {solanaLoading ? (
                        <p>Fetching on-chain data…</p>
                      ) : solanaAccount ? (
                        <>
                          <p>
                            <span className="text-rose-300">
                              {solanaAccount.balanceSol.toFixed(4)} SOL
                            </span>
                            {solPrice && (
                              <span className="text-slate-300">
                                {" "}
                                •{" "}
                                {(solanaAccount.balanceSol * solPrice).toLocaleString(
                                  "en-US",
                                  {
                                    style: "currency",
                                    currency: "USD",
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )}
                              </span>
                            )}
                            <span> • slot #{solanaAccount.slot}</span>
                          </p>
                          <p className="mt-0.5 text-[9px] text-slate-400">
                            Rent epoch {solanaAccount.rentEpoch ?? "—"}
                            {solanaAccount.executable ? " • Executable" : ""}
                          </p>
                        </>
                      ) : (
                        <p>No on-chain data found.</p>
                      )}
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      <a
                        href={`https://explorer.solana.com/address/${walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 cursor-pointer rounded-full border border-white/20 px-2.5 py-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white"
                      >
                        Explorer
                      </a>
                      <button
                        className="flex-1 cursor-pointer rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.3em] text-rose-300 transition hover:border-rose-500/50 hover:bg-rose-500/20"
                        onClick={disconnect}
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            ) : (
              <button
                className="cursor-pointer rounded-full border border-rose-500/50 bg-rose-500/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-rose-300 transition hover:bg-rose-500/30 hover:border-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => connect()}
                disabled={isConnecting}
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] gap-3 px-4 pb-20 pt-24 sm:px-6 sm:pt-26 lg:gap-4">
        <aside className="fixed left-4 top-24 hidden h-[calc(100vh-6rem)] w-64 flex-col rounded-2xl border border-white/10 bg-slate-900/85 p-5 backdrop-blur lg:left-6 lg:flex">
          <p className="text-xs uppercase tracking-[0.35em] text-rose-200/80">
            Console
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            American Dream
          </h2>
          <nav className="mt-8 flex flex-col gap-3">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    active
                      ? "border-rose-300/60 text-white"
                      : "border-white/10 text-slate-200 hover:border-rose-300/40 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {iconMap[item.icon]}
                    {item.label}
                  </span>
                  <span className="text-xs text-rose-300/80">
                    ⌘{item.label[0]}
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto pt-6">
            <Link
              href={settingsNav.href}
              className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                pathname === settingsNav.href
                  ? "border-sky-300/60 text-white"
                  : "border-white/10 text-slate-200 hover:border-sky-300/40 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                {iconMap[settingsNav.icon]}
                {settingsNav.label}
              </span>
              <span className="text-xs text-sky-300/80">⌘S</span>
            </Link>
          </div>
        </aside>
        <main className="flex w-full min-w-0 flex-col gap-8 sm:gap-10 lg:pl-[17rem]">
          {children}
        </main>
      </div>
    </div>
  );
}

