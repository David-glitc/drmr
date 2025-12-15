"use client";

import Link from "next/link";
import { useWallet } from "../hooks/useWallet";
import { useState } from "react";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { NetworkToggle } from "../components/NetworkToggle";

export default function LandingPage() {
  const { walletAddress, isConnected, isConnecting, connect, disconnect } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white scroll-smooth">
      {/* Loading Overlay */}
      <LoadingOverlay 
        show={isConnecting} 
        message="Connecting Wallet..."
      />
      
      {/* Navigation */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-2xl font-bold text-white">
            $DRMR
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="/" className="text-sm font-medium text-white hover:text-sky-300 transition">
              Home
            </Link>
            <Link href="/portfolio" className="text-sm font-medium text-slate-300 hover:text-white transition">
              Analyze
            </Link>
            <a href="#video" className="text-sm font-medium text-slate-300 hover:text-white transition">
              Video
            </a>
            <a href="#community" className="text-sm font-medium text-slate-300 hover:text-white transition">
              Community
            </a>
            <a href="#about" className="text-sm font-medium text-slate-300 hover:text-white transition">
              About
            </a>
          </div>
          <div className="flex items-center gap-4">
            {isConnected ? (
              <div className="hidden items-center gap-2 sm:flex">
                <NetworkToggle />
                <button
                  onClick={disconnect}
                  className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <NetworkToggle />
                <button
                  onClick={connect}
                  disabled={isConnecting}
                  className="rounded-full border border-sky-500/50 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-lg border border-white/20 bg-white/5 p-2 text-white"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-slate-950/95 md:hidden">
            <div className="px-4 py-4 space-y-3">
              <Link href="/" className="block text-sm font-medium text-white">
                Home
              </Link>
              <Link href="/portfolio" className="block text-sm font-medium text-slate-300">
                Analyze
              </Link>
              <a href="#video" className="block text-sm font-medium text-slate-300">
                Video
              </a>
              <a href="#community" className="block text-sm font-medium text-slate-300">
                Community
              </a>
              <a href="#about" className="block text-sm font-medium text-slate-300">
                About
              </a>
              <div className="space-y-3">
                <div className="flex justify-center">
                  <NetworkToggle />
                </div>
                {isConnected ? (
                  <button
                    onClick={disconnect}
                    className="w-full rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-6)}
                  </button>
                ) : (
                  <button
                    onClick={connect}
                    disabled={isConnecting}
                    className="w-full rounded-full border border-sky-500/50 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Revive The American Dream
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300 sm:text-xl">
              The dream isn't dead - it's just been hijacked by Wall Street. Take it back with $DRMR. Real ownership. Real wealth. Real freedom for the people.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/portfolio"
                className="rounded-full border border-sky-500/50 bg-sky-500/20 px-6 py-3 text-base font-semibold text-sky-300 transition hover:bg-sky-500/30"
              >
                Connect Wallet to Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Reclaim The American Dream
            </h2>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-sm">
              <div className="text-3xl mb-4">🏠</div>
              <h3 className="text-xl font-semibold text-white">Own Your Piece of America</h3>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                $DRMR isn't just a token - it's digital real estate in the new American frontier. While house prices soar, smart money is stacking $DRMR for true ownership.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-sm">
              <div className="text-3xl mb-4">💪</div>
              <h3 className="text-xl font-semibold text-white">Power Back to The People</h3>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Wall Street gatekeepers can't stop you from buying $DRMR. No credit checks. No applications. Just pure, decentralized American opportunity.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-sm">
              <div className="text-3xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold text-white">The New Prosperity Gospel</h3>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Work hard, stack $DRMR, build generational wealth. This is how we restore the promise that anyone can make it in America. The dream lives in DeFi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Wallet Analysis Section */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-8 sm:p-12 backdrop-blur-sm">
              <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Check Your $DRMR Potential
                </h2>
                <p className="mt-4 text-lg text-slate-300">
                  Connect your wallet to see how $DRMR can restore your piece of the American Dream
                </p>
              </div>

              <div className="mt-8">
                <Link
                  href="/portfolio"
                  className="block w-full rounded-xl border border-sky-500/50 bg-sky-500/20 px-6 py-4 text-center text-base font-semibold text-sky-300 transition hover:bg-sky-500/30"
                >
                  Connect Wallet to Get Started
                </Link>

                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>100% Read-Only Access</span>
                  <span>•</span>
                  <span>Your funds are always safe</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section id="video" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 sm:p-12 backdrop-blur-sm">
              <div className="aspect-video w-full rounded-xl overflow-hidden">
                <iframe
                  className="h-full w-full"
                  src="https://www.youtube.com/embed/hRxMbbmUaTg"
                  title="$DRMR Revolution Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Manifesto Section */}
      <section id="about" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 sm:p-12 backdrop-blur-sm">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                The $DRMR Manifesto
              </h2>
              <div className="mt-6 space-y-4 text-base leading-7 text-slate-300">
                <p>
                  The American Dream. They told us if we worked hard, we could achieve it. But the system failed us. Wages froze. Costs soared. The dream slipped away.
                </p>
                <p>
                  It's time to take it back. Introducing American Dream Coin — $DRMR. Not just a meme coin — a movement. A community of dreamers. A symbol of defiance. A chance to reclaim the promise that was stolen.
                </p>
                <p>
                  Every token is more than crypto — it's a piece of hope, a stand against the broken system, a belief that the dream still lives.
                </p>
                <p className="font-semibold text-white">
                  The future belongs to those who dare to dream. And the dream starts here. American Dream Coin. Own the dream. Live the dream. Be the dream.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Features */}
      <section id="community" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Why Choose $DRMR
            </h2>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-sm">
              <div className="text-3xl mb-4">🤝</div>
              <h3 className="text-xl font-semibold text-white">Strong Community</h3>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Join thousands of like-minded Americans rebuilding wealth through decentralized finance and true ownership.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-sm">
              <div className="text-3xl mb-4">📈</div>
              <h3 className="text-xl font-semibold text-white">Transparent Growth</h3>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Watch your $DRMR portfolio grow with real-time analytics and community-driven insights.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-sm">
              <div className="text-3xl mb-4">🛡️</div>
              <h3 className="text-xl font-semibold text-white">Secure & Decentralized</h3>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Built on Solana for speed and security. Your keys, your coins, your American Dream.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to Revive Your American Dream?
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Stop watching from the sidelines. Join the $DRMR movement and take control of your financial future today.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/portfolio"
                className="rounded-full border border-sky-500/50 bg-sky-500/20 px-6 py-3 text-base font-semibold text-sky-300 transition hover:bg-sky-500/30"
              >
                Connect Wallet to Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950/50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold text-white">$DRMR</h3>
              <p className="mt-2 text-sm text-slate-400">
                Reviving the American Dream through decentralized finance and true ownership.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Quick Links</h4>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li>
                  <Link href="/" className="hover:text-white transition">
                    Home
                  </Link>
                </li>
                <li>
                  <a href="#video" className="hover:text-white transition">
                    Video
                  </a>
                </li>
                <li>
                  <Link href="/portfolio" className="hover:text-white transition">
                    Wallet Analysis
                  </Link>
                </li>
                <li>
                  <a href="#community" className="hover:text-white transition">
                    Community
                  </a>
                </li>
                <li>
                  <button onClick={connect} className="hover:text-white transition">
                    Connect
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Social</h4>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Telegram
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    YouTube
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-8 text-center text-sm text-slate-400">
            <p>© 2025 $DRMR. Reviving the American Dream, one token at a time.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

