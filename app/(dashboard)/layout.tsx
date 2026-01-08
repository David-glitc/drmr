"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";

import { navItems, settingsNav, adminNavItem, stakingAdminNavItem } from "../../lib/nav";
import { useAdminVerification } from "../../hooks/useAdminVerification";
import { useWallet } from "../../hooks/useWallet";
import { useSolanaAccount } from "../../hooks/useSolanaAccount";
import { useSolPrice } from "../../hooks/useSolPrice";
import { useTokenLogoCache } from "../../hooks/useTokenLogoCache";
import { useConnectionReady } from "../../hooks/useConnectionReady";
import { LoadingOverlay } from "../../components/LoadingOverlay";
import { DashboardLoader } from "../../components/DashboardLoader";
import { NetworkToggle } from "../../components/NetworkToggle";
import { ReceiveModal } from "../../components/ReceiveModal";
import { WalletBalanceSkeleton } from "../../components/Skeletons";
import { AdminPasswordModal } from "../../components/AdminPasswordModal";

const iconMap: Record<string, React.ReactElement> = {
  chart: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 17V11M10 17V7M15 17V13M20 17V5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  diamond: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l7 7-7 11-7-11 7-7z" strokeLinejoin="round" />
    </svg>
  ),
  arrows: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 7h10l-3-3m3 13H7l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  coin: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v8c0 1.66 3.58 3 8 3s8-1.34 8-3V6" strokeLinecap="round" />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" />
      <path d="M14 3v6h6" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      <path d="M19.4 15a7.97 7.97 0 000-6l-2.2-.4-1-2-2.2.4-1.1-2h-2.2l-1.1 2-2.2-.4-1 2-2.2.4a7.97 7.97 0 000 6l2.2.4 1 2 2.2-.4 1.1 2h2.2l1.1-2 2.2.4 1-2 2.2-.4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { walletAddress, isConnected, isConnecting, connect, disconnect } = useWallet();
  const { data: solanaAccount, isLoading: solanaLoading } = useSolanaAccount(
    walletAddress ?? null
  );
  const { data: solPrice } = useSolPrice();
  useTokenLogoCache(); // Initialize and cleanup token logo cache
  const { isReady, isChecking } = useConnectionReady(); // Check if connection is ready
  const { isAdmin: isStakingAdmin } = useAdminVerification(); // Check if connected wallet is staking admin
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [adminPasswordModalOpen, setAdminPasswordModalOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // Check admin authentication on mount and when storage changes
  useEffect(() => {
    const checkAdminAuth = () => {
      const authStatus = localStorage.getItem("admin_authenticated");
      const authTimestamp = localStorage.getItem("admin_auth_timestamp");
      
      // Check if auth is valid (expires after 24 hours)
      if (authStatus === "true" && authTimestamp) {
        const timestamp = parseInt(authTimestamp, 10);
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (now - timestamp < twentyFourHours) {
          setIsAdminAuthenticated(true);
        } else {
          // Auth expired
          localStorage.removeItem("admin_authenticated");
          localStorage.removeItem("admin_auth_timestamp");
          setIsAdminAuthenticated(false);
        }
      } else {
        setIsAdminAuthenticated(false);
      }
    };

    checkAdminAuth();

    // Listen for storage changes (for multi-tab support)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "admin_authenticated" || e.key === "admin_auth_timestamp") {
        checkAdminAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Keyboard shortcut handler (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        if (!isAdminAuthenticated) {
          setAdminPasswordModalOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAdminAuthenticated]);

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] text-white">
      {/* Dashboard Loader - Shows until connection is established */}
      <DashboardLoader isReady={isReady} isChecking={isChecking} />
      
      <LoadingOverlay show={isConnecting} message="Connecting Wallet..." />

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 transform border-r border-white/10 bg-[#0a0a0f] transition-transform duration-300 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-6">
          {/* Logo */}
          <Link href="/portfolio" className="mb-8 flex items-center gap-3">
            <img 
              src="/logo.jpg" 
              alt="DRMR Logo" 
              className="h-10 w-10 rounded-lg object-cover"
            />
            <div>
              <h1 className="text-xl font-bold text-white">DRMR</h1>
              <p className="text-xs text-white/60">Dashboard</p>
          </div>
          </Link>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                  <Link
                    key={item.key}
                    href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    active
                        ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                  <span className={active ? "text-blue-500" : "text-white/50"}>
                    {iconMap[item.icon]}
                  </span>
                    {item.label}
                  </Link>
              );
            })}
            
            {/* Admin Link - Only shown when authenticated */}
            {isAdminAuthenticated && (
              <Link
                key={adminNavItem.key}
                href={adminNavItem.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  pathname === adminNavItem.href
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className={pathname === adminNavItem.href ? "text-blue-500" : "text-white/50"}>
                  {iconMap[adminNavItem.icon]}
                </span>
                {adminNavItem.label}
              </Link>
            )}
            
            {/* Staking Admin Link - Only shown when trusted admin wallet is connected */}
            {isStakingAdmin && (
              <Link
                key={stakingAdminNavItem.key}
                href={stakingAdminNavItem.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  pathname === stakingAdminNavItem.href
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className={pathname === stakingAdminNavItem.href ? "text-red-500" : "text-white/50"}>
                  {iconMap[stakingAdminNavItem.icon]}
                </span>
                {stakingAdminNavItem.label}
              </Link>
            )}
          </nav>

          {/* Settings Link */}
                <Link
                  href={settingsNav.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    pathname === settingsNav.href
                      ? "bg-white/10 text-white"
                : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
            <span className={pathname === settingsNav.href ? "text-blue-500" : "text-white/50"}>
                  {iconMap[settingsNav.icon]}
            </span>
                  {settingsNav.label}
                </Link>
              </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0f]">
          <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 lg:px-6">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Right Side - Wallet Info */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:block">
                <NetworkToggle />
          </div>

            {isConnected && walletAddress ? (
              <div className="relative">
                  <button
                    onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                    className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-white/10 bg-white/5 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-500" />
                    <span className="hidden sm:inline">
                    {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                    </span>
                    <span className="sm:hidden text-[10px]">MW</span>
                    <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Wallet Dropdown */}
                  {walletMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setWalletMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-72 max-w-sm rounded-xl border border-white/10 bg-[#111118] p-4 z-20">
                        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                            <p className="text-xs text-white/60">Connected Wallet</p>
                            <p className="mt-1 font-mono text-sm font-semibold text-white">
                              {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                        </p>
                      </div>
                      <button
                            onClick={() => {
                              void navigator.clipboard.writeText(walletAddress);
                              setWalletMenuOpen(false);
                            }}
                            className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
                      >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>

                      {solanaLoading ? (
                          <WalletBalanceSkeleton />
                      ) : solanaAccount ? (
                          <div className="mb-4 rounded-lg bg-white/5 p-3">
                            <p className="text-sm text-white">
                              <span className="text-blue-500">
                              {solanaAccount.balanceSol.toFixed(4)} SOL
                            </span>
                            {solPrice && (
                                <span className="ml-2 text-white/60">
                                  • ${(solanaAccount.balanceSol * solPrice).toLocaleString("en-US", {
                                    style: "currency",
                                    currency: "USD",
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }).replace("$", "")}
                              </span>
                            )}
                          </p>
                            <p className="mt-1 text-xs text-white/40">
                              Slot #{solanaAccount.slot}
                          </p>
                    </div>
                        ) : null}

                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              console.log("[Layout] Receive button clicked, opening modal");
                              setReceiveModalOpen(true);
                              setWalletMenuOpen(false);
                            }}
                            className="w-full rounded-lg border-2 border-blue-500 bg-red-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-600 flex items-center justify-center gap-2"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Receive
                          </button>
                          <div className="flex gap-2">
                      <a
                        href={`https://explorer.solana.com/address/${walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-medium text-white transition-colors hover:bg-white/10"
                      >
                        Explorer
                      </a>
                      <button
                              onClick={() => {
                                disconnect();
                                setWalletMenuOpen(false);
                              }}
                              className="flex-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                            >
                              Disconnect
                      </button>
                    </div>
                  </div>
                      </div>
                    </>
                  )}
              </div>
            ) : (
                <button
                  onClick={() => connect()}
                  disabled={isConnecting}
                  className="rounded-lg border border-blue-500/50 bg-blue-500/10 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
                >
                  <span className="hidden sm:inline">{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
                  <span className="sm:hidden">{isConnecting ? "..." : "Connect"}</span>
                </button>
              )}

              {/* Settings Icon */}
                <Link
                href="/settings"
                className="rounded-lg p-1.5 sm:p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] p-3 sm:p-4 lg:p-6 xl:p-8">
          {children}
        </main>

        {/* Receive Modal */}
        {isConnected && walletAddress && (
          <ReceiveModal
            isOpen={receiveModalOpen}
            onClose={() => {
              console.log("[Layout] Closing receive modal");
              setReceiveModalOpen(false);
            }}
            walletAddress={walletAddress}
            tokenSymbol="SOL"
          />
        )}

        {/* Admin Password Modal */}
        <AdminPasswordModal
          isOpen={adminPasswordModalOpen}
          onClose={() => setAdminPasswordModalOpen(false)}
          onSuccess={() => setIsAdminAuthenticated(true)}
        />
      </div>
    </div>
  );
}
