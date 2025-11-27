"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { navItems, settingsNav } from "../../lib/nav";
import { useWallet } from "../../hooks/useWallet";
import { useSolanaAccount } from "../../hooks/useSolanaAccount";

const iconMap: Record<string, JSX.Element> = {
  chart: (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-sky-300" fill="none">
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
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-sky-300" fill="none">
      <path
        d="M12 3l7 7-7 11-7-11 7-7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  ),
  arrows: (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-sky-300" fill="none">
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
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-sky-300" fill="none">
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
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-sky-300" fill="none">
      <path
        d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M14 3v6h6" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-sky-300" fill="none">
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
  const { walletAddress, isConnected, walletStatus, connect, disconnect } =
    useWallet();
  const { data: solanaAccount, isLoading: solanaLoading } = useSolanaAccount(
    walletAddress ?? null
  );
  const isConnecting = walletStatus === "connecting";

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -left-16 top-10 h-80 w-80 rounded-full bg-rose-500/25 blur-[140px]" />
        <div className="absolute right-0 top-1/4 h-104 w-104 rounded-full bg-sky-500/20 blur-[150px]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-white/5 to-transparent" />
      </div>

      <nav className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.45em] text-rose-300">
              DRMR
            </p>
            <p className="text-base font-semibold text-white sm:text-lg">
              American Dream Dashboard
            </p>
          </div>
            <details className="lg:hidden">
              <summary className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white">
                Menu
              </summary>
              <div className="mt-2 w-48 rounded-2xl border border-white/10 bg-slate-900/95 p-3 text-xs text-white shadow-xl">
                {navItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 transition ${
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
                  className={`mt-2 flex items-center gap-2 rounded-xl px-3 py-2 transition ${
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

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            {isConnected && walletAddress ? (
              <div className="relative">
                <details className="group">
                  <summary className="flex cursor-pointer items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white">
                    {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                    <span className="text-xs text-slate-400">▾</span>
                  </summary>
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-slate-900/95 p-5 text-xs text-white shadow-2xl">
                    <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">
                          Connected Wallet
                        </p>
                        <p className="mt-1 font-semibold text-white">
                          {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          void navigator.clipboard.writeText(walletAddress)
                        }
                        className="rounded-full border border-white/20 p-2 text-white transition hover:border-white"
                        aria-label="Copy address"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <rect x="9" y="9" width="11" height="11" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] text-slate-200">
                      {solanaLoading ? (
                        <p>Fetching on-chain data…</p>
                      ) : solanaAccount ? (
                        <>
                          <p>
                            <span className="text-sky-300">
                              {solanaAccount.balanceSol.toFixed(4)} SOL
                            </span>
                            <span> • slot #{solanaAccount.slot}</span>
                          </p>
                          <p className="mt-1 text-slate-400">
                            Rent epoch {solanaAccount.rentEpoch ?? "—"}
                            {solanaAccount.executable ? " • Executable" : ""}
                          </p>
                        </>
                      ) : (
                        <p>No on-chain data found.</p>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <a
                        href={`https://explorer.solana.com/address/${walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 rounded-full border border-white/20 px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white"
                      >
                        Explorer
                      </a>
                      <button
                        className="flex-1 rounded-full border border-white/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white"
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
                className="rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white transition hover-border-white disabled:opacity-50"
                onClick={() => connect()}
                disabled={isConnecting}
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] gap-6 px-4 pb-24 pt-28 sm:px-6 sm:pt-32 lg:gap-10">
        <aside className="fixed left-6 top-32 hidden h-[calc(100vh-8rem)] w-64 flex-col rounded-3xl border border-white/10 bg-slate-900/85 p-5 backdrop-blur lg:flex">
          <p className="text-xs uppercase tracking-[0.4em] text-sky-200/80">
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
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    active
                      ? "border-sky-300/60 text-white"
                      : "border-white/10 text-slate-200 hover:border-sky-300/40 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {iconMap[item.icon]}
                    {item.label}
                  </span>
                  <span className="text-xs text-sky-300/80">
                    ⌘{item.label[0]}
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto pt-6">
            <Link
              href={settingsNav.href}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                pathname === settingsNav.href
                  ? "border-sky-300/60 text-white"
                  : "border-white/10 text-slate-200 hover:border-sky-300/40 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                {iconMap[settingsNav.icon]}
                {settingsNav.label}
              </span>
              <span className="text-xs text-sky-300/80">⌘S</span>
            </Link>
          </div>
        </aside>
        <main className="flex w-full min-w-0 flex-col gap-8 sm:gap-10 lg:pl-[18rem]">
          {children}
        </main>
      </div>
    </div>
  );
}

