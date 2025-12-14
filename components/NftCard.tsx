"use client";

import { useState } from "react";
import type { NftHolding } from "@/lib/types";

interface NftCardProps {
  nft: NftHolding;
}

export function NftCard({ nft }: NftCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 transition-all hover:border-sky-300/50 hover:bg-slate-900/80">
      {/* Image Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-950">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-500"></div>
          </div>
        )}
        {!imageError && nft.image ? (
          <img
            src={nft.image}
            alt={nft.name}
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              imageLoading ? "opacity-0" : "opacity-100"
            }`}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="mt-2 text-xs text-slate-500">No Image</p>
            </div>
          </div>
        )}
        
        {/* Collection Badge */}
        {nft.collection && (
          <div className="absolute top-2 left-2 rounded-full border border-white/20 bg-black/60 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            {nft.collection}
          </div>
        )}
      </div>

      {/* NFT Info */}
      <div className="p-4">
        <h3 className="truncate text-sm font-semibold text-white">
          {nft.name}
        </h3>
        {nft.description && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-400">
            {nft.description}
          </p>
        )}
        
        {/* Actions */}
        <div className="mt-3 flex items-center gap-2">
          {nft.explorerLink && (
            <a
              href={nft.explorerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-center text-xs font-semibold text-white transition hover:border-sky-300/50 hover:bg-sky-500/10"
              onClick={(e) => e.stopPropagation()}
            >
              View
            </a>
          )}
          {nft.mint && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(nft.mint);
              }}
              className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white transition hover:border-sky-300/50 hover:bg-sky-500/10"
              title="Copy mint address"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

