"use client";

import { useCallback } from "react";
import { useAtomValue } from "jotai";
import { walletAddressAtom } from "../lib/state";

export function useUserTracking() {
  const walletAddress = useAtomValue(walletAddressAtom);

  const trackActivity = useCallback(
    async (action: string, metadata?: Record<string, any>) => {
      if (!walletAddress) return;

      try {
        await fetch("/api/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress,
            action,
            metadata,
          }),
        });
      } catch (error) {
        console.error("Error tracking activity:", error);
        // Silently fail - tracking should not break the app
      }
    },
    [walletAddress]
  );

  const trackPageView = useCallback(
    (page: string) => {
      trackActivity("page_view", { page });
    },
    [trackActivity]
  );

  const trackStaking = useCallback(
    (amount: number, type: "stake" | "unstake") => {
      trackActivity(`${type}_transaction`, { amount, type });
    },
    [trackActivity]
  );

  const trackTrade = useCallback(
    (token: string, amount: number, type: "buy" | "sell") => {
      trackActivity(`${type}_trade`, { token, amount, type });
    },
    [trackActivity]
  );

  return {
    trackActivity,
    trackPageView,
    trackStaking,
    trackTrade,
  };
}

