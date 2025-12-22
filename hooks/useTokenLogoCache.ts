"use client";

import { useEffect, useState } from "react";
import { tokenLogoCache } from "../lib/services/token-logo-cache";

/**
 * Hook to manage token logo cache
 * Automatically cleans up expired entries on mount
 */
export function useTokenLogoCache() {
  const [cacheSize, setCacheSize] = useState<number | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => {
    // Clean up expired cache entries on mount
    const cleanup = async () => {
      setIsCleaning(true);
      try {
        await tokenLogoCache.cleanup();
        const size = await tokenLogoCache.getSize();
        setCacheSize(size);
      } catch (error) {
        console.warn("[useTokenLogoCache] Cleanup error:", error);
      } finally {
        setIsCleaning(false);
      }
    };

    cleanup();
  }, []);

  const clearCache = async () => {
    try {
      await tokenLogoCache.clear();
      setCacheSize(0);
    } catch (error) {
      console.error("[useTokenLogoCache] Clear cache error:", error);
      throw error;
    }
  };

  const refreshCacheSize = async () => {
    try {
      const size = await tokenLogoCache.getSize();
      setCacheSize(size);
    } catch (error) {
      console.error("[useTokenLogoCache] Get cache size error:", error);
    }
  };

  return {
    cacheSize,
    isCleaning,
    clearCache,
    refreshCacheSize,
  };
}

