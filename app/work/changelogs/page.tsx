"use client";

import { useState } from "react";
import Link from "next/link";

interface ChangelogEntry {
  version: string;
  date: string;
  type: "feature" | "improvement" | "fix" | "ui";
  title: string;
  description: string[];
  image?: string;
  imageAlt?: string;
}

const changelogData: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "December 2024",
    type: "feature",
    title: "Initial Release - Complete Dashboard Overhaul",
    description: [
      "Complete UI redesign with dark theme and red/blue accents",
      "Full mobile responsiveness across all pages",
      "Portfolio management with real-time SOL balance and SPL tokens",
      "Staking functionality with devnet validator integration",
      "Receive and Send modals with QR code support",
      "Token logo caching system with IndexedDB",
      "Loading states and skeleton components",
      "Network configuration (Devnet/Mainnet toggle)",
      "Database integration for validators and staking records"
    ],
    image: "/screenshots/portfolio-page.png",
    imageAlt: "Portfolio page showing balance card, tokens list, and collectibles section"
  },
  {
    version: "0.9.0",
    date: "December 2024",
    type: "feature",
    title: "Staking Workflow Implementation",
    description: [
      "Enhanced staking modal with amount slider",
      "Percentage buttons (25%, 50%, 75%, Max)",
      "Validator card selection replacing dropdown",
      "Real-time APY display for validators",
      "Stake account creation and delegation",
      "Database synchronization for staking records"
    ],
    image: "/screenshots/staking-page.png",
    imageAlt: "Staking page with modal showing amount slider and validator selection"
  },
  {
    version: "0.8.0",
    date: "December 2024",
    type: "ui",
    title: "UI Uniformity & Design System",
    description: [
      "Removed all gradients and blur effects",
      "Standardized button, card, and input styles",
      "Consistent flat design throughout",
      "Fixed SOL logo display in circular containers",
      "Improved visual consistency across all pages"
    ]
  },
  {
    version: "0.7.0",
    date: "December 2024",
    type: "feature",
    title: "Token Logo Management",
    description: [
      "Server-side API route using Metaplex",
      "IndexedDB caching for persistent storage",
      "Multi-source fallback (Metaplex → Jupiter → Placeholder)",
      "Automatic cache cleanup",
      "Skeleton loading states for logos"
    ]
  },
  {
    version: "0.6.0",
    date: "December 2024",
    type: "feature",
    title: "Modals & User Interactions",
    description: [
      "Receive modal with QR code generation",
      "Address copy functionality",
      "Send modal with amount input and recipient field",
      "USD conversion display",
      "Token selector for SOL/SPL tokens"
    ],
    image: "/screenshots/receive-modal.png",
    imageAlt: "Receive modal with QR code and wallet address. Send modal also available."
  },
  {
    version: "0.5.0",
    date: "December 2024",
    type: "improvement",
    title: "Loading States & UX Improvements",
    description: [
      "Dashboard loader with progress bar",
      "Skeleton components for all loading states",
      "Balance, token, NFT, and activity skeletons",
      "Smooth fade-out animations",
      "Minimum display time for better UX"
    ]
  },
  {
    version: "0.4.0",
    date: "December 2024",
    type: "feature",
    title: "Portfolio Management",
    description: [
      "Real-time SOL balance display",
      "SPL token list with logos",
      "NFT collectibles gallery",
      "Activity history tracking",
      "USD value conversion",
      "Empty states for NFTs"
    ]
  },
  {
    version: "0.3.0",
    date: "December 2024",
    type: "improvement",
    title: "Mobile Responsiveness",
    description: [
      "Collapsible sidebar navigation",
      "Adaptive grid layouts",
      "Mobile-optimized modals",
      "Horizontal scroll for tables",
      "Responsive breakpoints (mobile/tablet/desktop)"
    ]
  },
  {
    version: "0.2.0",
    date: "December 2024",
    type: "ui",
    title: "Theme Implementation",
    description: [
      "Dark base theme (#0a0a0f, #111118)",
      "Red and blue accent colors",
      "Removed yellow accents",
      "Standardized component styles",
      "Consistent border and background colors"
    ]
  },
  {
    version: "0.1.0",
    date: "December 2024",
    type: "fix",
    title: "Error Handling & Debugging",
    description: [
      "RPC rate limiting protection",
      "Network mismatch detection",
      "Fallback to public endpoints",
      "Enhanced error messages",
      "Debug logging for troubleshooting"
    ]
  }
];

const typeColors = {
  feature: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  improvement: "text-green-400 bg-green-500/10 border-green-500/30",
  fix: "text-red-400 bg-red-500/10 border-red-500/30",
  ui: "text-purple-400 bg-purple-500/10 border-purple-500/30",
};

const typeLabels = {
  feature: "Feature",
  improvement: "Improvement",
  fix: "Fix",
  ui: "UI",
};

export default function ChangelogsPage() {
  const [filter, setFilter] = useState<string>("all");

  const filteredChangelogs =
    filter === "all"
      ? changelogData
      : changelogData.filter((entry) => entry.type === filter);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">
                Changelog
              </h1>
              <p className="text-xs sm:text-sm text-white/60">
                Track all changes, updates, and improvements to the DRMR Dashboard
              </p>
            </div>
            <Link
              href="/portfolio"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Back to Dashboard
            </Link>
          </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-xl border px-4 py-2 text-xs sm:text-sm font-semibold transition ${
            filter === "all"
              ? "border-white/20 bg-white/10 text-white"
              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          All
        </button>
        {Object.entries(typeLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-xl border px-4 py-2 text-xs sm:text-sm font-semibold transition ${
              filter === key
                ? `${typeColors[key as keyof typeof typeColors]} border-current`
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Changelog Entries */}
      <div className="space-y-6">
        {filteredChangelogs.map((entry, index) => (
          <div
            key={index}
            className="rounded-2xl border border-white/10 bg-[#111118] p-4 sm:p-6"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-lg border px-3 py-1 text-xs font-semibold ${typeColors[entry.type]}`}
                >
                  {typeLabels[entry.type]}
                </span>
                <h2 className="text-lg sm:text-xl font-semibold text-white">
                  {entry.title}
                </h2>
              </div>
              <div className="flex items-center gap-4 text-sm text-white/60">
                <span>v{entry.version}</span>
                <span>•</span>
                <span>{entry.date}</span>
              </div>
            </div>

            {/* Description */}
            <ul className="space-y-2 mb-4">
              {entry.description.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className="flex items-start gap-2 text-sm text-white/70"
                >
                  <span className="text-blue-400 mt-1.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* Image */}
            {entry.image && (
              <div className="mt-4 rounded-xl border border-white/10 overflow-hidden bg-white/5">
                <img
                  src={entry.image}
                  alt={entry.imageAlt || entry.title}
                  className="w-full h-auto object-cover max-h-[600px]"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="p-8 text-center text-white/60 text-sm">Image not available</div>';
                    }
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

          {/* Empty State */}
          {filteredChangelogs.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#111118] p-8 text-center">
              <p className="text-white/60">No changelog entries found for this filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

