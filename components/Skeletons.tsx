"use client";

/**
 * Skeleton Loading Components
 * Used throughout the app for consistent loading states
 */

export function BalanceSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111118] p-4 sm:p-6 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
        <div className="h-4 w-4 bg-white/10 rounded animate-pulse" />
      </div>
      <div className="h-10 sm:h-12 w-48 bg-white/10 rounded-lg mb-2 animate-pulse" />
      <div className="h-5 w-32 bg-white/10 rounded animate-pulse mb-1" />
      <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
      
      {/* Action Buttons Skeleton */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-10 sm:h-12 bg-white/10 rounded-xl animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export function TokenRowSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111118] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Logo Skeleton */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/10 animate-pulse" />
          
          {/* Token Info Skeleton */}
          <div className="flex-1 min-w-0">
            <div className="h-5 w-20 bg-white/10 rounded mb-2 animate-pulse" />
            <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
        
        {/* Amount Skeleton */}
        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="text-right">
            <div className="h-5 w-24 bg-white/10 rounded mb-2 animate-pulse" />
            <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="h-9 w-16 bg-white/10 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function TokenListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <TokenRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function NftCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111118] overflow-hidden">
      {/* Image Skeleton */}
      <div className="aspect-square w-full bg-white/10 animate-pulse" />
      
      {/* Content Skeleton */}
      <div className="p-4">
        <div className="h-5 w-32 bg-white/10 rounded mb-2 animate-pulse" />
        <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function NftGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <NftCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ActivityItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 border-b border-white/10 last:border-0">
      <div className="flex-1">
        <div className="h-4 w-40 bg-white/10 rounded mb-2 animate-pulse" />
        <div className="h-3 w-20 bg-white/10 rounded animate-pulse" />
      </div>
      <div className="h-5 w-16 bg-white/10 rounded animate-pulse" />
    </div>
  );
}

export function ActivityListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111118] overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <ActivityItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function WalletBalanceSkeleton() {
  return (
    <div className="mb-4 rounded-lg bg-white/5 p-3">
      <div className="h-4 w-32 bg-white/10 rounded mb-2 animate-pulse" />
      <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
    </div>
  );
}

export function LogoImageSkeleton({ size = 12 }: { size?: number }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full bg-white/10 animate-pulse`}
      style={{ width: `${size * 0.25}rem`, height: `${size * 0.25}rem` }}
    />
  );
}

export function ChartSkeleton() {
  return (
    <div className="h-40 sm:h-48 w-full">
      <div className="h-full w-full bg-white/10 rounded-xl animate-pulse" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111118] p-4">
      <div className="h-4 w-24 bg-white/10 rounded mb-3 animate-pulse" />
      <div className="h-8 w-32 bg-white/10 rounded mb-2 animate-pulse" />
      <div className="h-3 w-20 bg-white/10 rounded animate-pulse" />
    </div>
  );
}

