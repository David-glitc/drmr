"use client";

/**
 * Token Logo Cache Service
 * 
 * Uses IndexedDB to cache token logos locally for faster loading
 * and reduced network requests.
 */

const DB_NAME = "drmr-token-logos";
const DB_VERSION = 1;
const STORE_NAME = "logos";

interface CachedLogo {
  mint: string;
  url: string;
  blob: Blob;
  timestamp: number;
}

class TokenLogoCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Initialize IndexedDB
   */
  private async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        console.warn("[TokenLogoCache] IndexedDB not available");
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("[TokenLogoCache] Failed to open IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "mint" });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get cached logo URL from IndexedDB
   */
  async get(mint: string): Promise<string | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(mint);

      request.onsuccess = () => {
        const cached: CachedLogo | undefined = request.result;
        if (cached) {
          // Check if cache is still valid
          const age = Date.now() - cached.timestamp;
          if (age < this.CACHE_DURATION) {
            // Create object URL from blob
            const url = URL.createObjectURL(cached.blob);
            resolve(url);
          } else {
            // Cache expired, delete it
            this.delete(mint);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.warn(`[TokenLogoCache] Error reading cache for ${mint}`);
        resolve(null);
      };
    });
  }

  /**
   * Cache a logo by downloading it and storing in IndexedDB
   */
  async set(mint: string, logoUrl: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    try {
      // Download the image
      const response = await fetch(logoUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch logo: ${response.status}`);
      }

      const blob = await response.blob();

      // Store in IndexedDB
      const transaction = this.db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const cached: CachedLogo = {
        mint,
        url: logoUrl,
        blob,
        timestamp: Date.now(),
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(cached);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log(`[TokenLogoCache] Cached logo for ${mint}`);
    } catch (error) {
      console.warn(`[TokenLogoCache] Failed to cache logo for ${mint}:`, error);
    }
  }

  /**
   * Delete a cached logo
   */
  async delete(mint: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.delete(mint);
  }

  /**
   * Clear all cached logos
   */
  async clear(): Promise<void> {
    await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
  }

  /**
   * Get cache size (approximate)
   */
  async getSize(): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        resolve(0);
      };
    });
  }

  /**
   * Clean up expired cache entries
   */
  async cleanup(): Promise<void> {
    await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("timestamp");
    const cutoff = Date.now() - this.CACHE_DURATION;

    return new Promise((resolve) => {
      const request = index.openCursor(IDBKeyRange.upperBound(cutoff));
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => resolve();
    });
  }
}

export const tokenLogoCache = new TokenLogoCache();

