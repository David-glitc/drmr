/**
 * On-Chain Data Cache Manager
 * 
 * Provides intelligent caching for on-chain data with:
 * - TTL (Time To Live) support
 * - Automatic invalidation
 * - Memory and localStorage persistence
 * - Cache warming strategies
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class OnChainCache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 30000; // 30 seconds
  private readonly MAX_CACHE_SIZE = 100;

  /**
   * Get cached data if still valid
   */
  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      // Try localStorage
      return this.getFromStorage<T>(key);
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // Clean up old entries if cache is too large
    if (this.memoryCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey !== undefined) {
        this.memoryCache.delete(firstKey);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    this.memoryCache.set(key, entry);
    this.setToStorage(key, entry);
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(`drmr-cache-${key}`);
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.invalidate(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("drmr-cache-")) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Get from localStorage
   */
  private getFromStorage<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(`drmr-cache-${key}`);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);
      const now = Date.now();

      if (now - entry.timestamp > entry.ttl) {
        localStorage.removeItem(`drmr-cache-${key}`);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  /**
   * Set to localStorage
   */
  private setToStorage<T>(key: string, entry: CacheEntry<T>): void {
    try {
      localStorage.setItem(`drmr-cache-${key}`, JSON.stringify(entry));
    } catch {
      // Ignore localStorage errors (quota exceeded, etc.)
    }
  }

  /**
   * Check if cache entry exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.memoryCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      keys: Array.from(this.memoryCache.keys()),
    };
  }
}

export const onChainCache = new OnChainCache();

