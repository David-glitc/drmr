# State Management & Connection Revamp

## Overview

This revamp introduces a modern, optimized architecture for:
- **Connection Management**: Intelligent connection pooling and health monitoring
- **On-Chain Data Retrieval**: Caching, batching, and retry logic
- **State Management**: Centralized, persistent, and reactive state

## New Architecture

### 1. Connection Manager (`lib/connection-manager.ts`)

**Features:**
- Connection pooling (reuses connections)
- Health monitoring
- Multiple network support
- Custom configuration per connection

**Usage:**
```typescript
import { connectionManager } from "@/lib/connection-manager";

// Get default connection
const connection = connectionManager.getDefaultConnection();

// Get connection for specific network
const mainnetConnection = connectionManager.getNetworkConnection("mainnet-beta");

// Health check
const isHealthy = await connectionManager.healthCheck(connection);
```

### 2. On-Chain Cache (`lib/onchain/cache.ts`)

**Features:**
- TTL-based caching
- Memory + localStorage persistence
- Automatic invalidation
- Pattern-based cache clearing

**Usage:**
```typescript
import { onChainCache } from "@/lib/onchain/cache";

// Get cached data
const data = onChainCache.get("balance:address123");

// Set cache with TTL
onChainCache.set("balance:address123", balanceData, 30000); // 30s TTL

// Invalidate
onChainCache.invalidate("balance:address123");
onChainCache.invalidatePattern("balance:.*"); // Pattern matching
```

### 3. On-Chain Fetcher (`lib/onchain/fetcher.ts`)

**Features:**
- Automatic retry with exponential backoff
- Request deduplication
- Batch requests
- Built-in caching integration

**Usage:**
```typescript
import { onChainFetcher } from "@/lib/onchain/fetcher";

// Fetch with retry and cache
const balance = await onChainFetcher.fetch(
  "balance:address123",
  async () => {
    return await connection.getBalance(publicKey);
  },
  {
    cache: true,
    cacheTTL: 10000,
    retries: 3,
  }
);

// Batch multiple requests
const results = await onChainFetcher.batch([
  {
    key: "balance:addr1",
    fetcher: () => fetchBalance(addr1),
  },
  {
    key: "balance:addr2",
    fetcher: () => fetchBalance(addr2),
  },
]);
```

### 4. Enhanced State Atoms (`lib/state/atoms.ts`)

**New Atoms:**
- `walletErrorAtom` - Error state management
- `connectionStatusAtom` - Connection health
- `accountDataAtom` - Cached account data
- `portfolioDataAtom` - Cached portfolio data
- `cacheTimestampAtom` - Cache timing (persisted)
- `cacheDataAtom` - Cache storage (persisted)
- `autoRefreshAtom` - Auto-refresh setting (persisted)
- `refreshIntervalAtom` - Refresh interval (persisted)
- `networkAtom` - Network selection (persisted)

**Derived Atoms:**
- `isConnectedAtom` - Computed connection status
- `hasWalletAtom` - Computed wallet presence
- `shouldRefreshAtom` - Computed refresh decision

**Usage:**
```typescript
import { useAtom, useAtomValue } from "jotai";
import {
  walletAddressAtom,
  isConnectedAtom,
  autoRefreshAtom,
} from "@/lib/state";

function MyComponent() {
  const [walletAddress, setWalletAddress] = useAtom(walletAddressAtom);
  const isConnected = useAtomValue(isConnectedAtom);
  const [autoRefresh, setAutoRefresh] = useAtom(autoRefreshAtom);
  
  // ...
}
```

### 5. Enhanced Hooks

#### `useEnhancedWallet()`

**Improvements:**
- Better error handling
- Connection health monitoring
- Automatic cache invalidation on disconnect
- Retry logic

**Usage:**
```typescript
import { useEnhancedWallet } from "@/hooks/useEnhancedWallet";

function MyComponent() {
  const {
    walletAddress,
    walletStatus,
    walletError, // NEW: Error state
    isConnected,
    connect,
    disconnect,
    sendSol,
  } = useEnhancedWallet();
  
  // Error handling
  if (walletError) {
    console.error("Wallet error:", walletError);
  }
}
```

#### `useEnhancedAccount()`

**Improvements:**
- Intelligent caching
- Automatic refresh based on settings
- Better error handling
- Optimistic updates

**Usage:**
```typescript
import { useEnhancedAccount } from "@/hooks/useEnhancedAccount";

function MyComponent() {
  const {
    data,
    isLoading,
    isError,
    error,
    refresh, // Manual refresh
  } = useEnhancedAccount();
  
  // Data is automatically cached and refreshed
}
```

#### `useEnhancedPortfolio()`

**Improvements:**
- Same benefits as `useEnhancedAccount`
- Optimized for portfolio data
- Cache-aware

**Usage:**
```typescript
import { useEnhancedPortfolio } from "@/hooks/useEnhancedPortfolio";

function MyComponent() {
  const {
    tokens,
    nfts,
    activity,
    isLoading,
    refresh,
  } = useEnhancedPortfolio();
}
```

## Migration Guide

### Step 1: Update Imports

**Old:**
```typescript
import { useWallet } from "@/hooks/useWallet";
import { useSolanaAccount } from "@/hooks/useSolanaAccount";
import { usePortfolio } from "@/hooks/usePortfolio";
```

**New (Recommended):**
```typescript
import { useEnhancedWallet } from "@/hooks/useEnhancedWallet";
import { useEnhancedAccount } from "@/hooks/useEnhancedAccount";
import { useEnhancedPortfolio } from "@/hooks/useEnhancedPortfolio";
```

**Note:** Old hooks still work for backward compatibility.

### Step 2: Update State Imports

**Old:**
```typescript
import { walletAddressAtom, walletStatusAtom } from "@/lib/state";
```

**New:**
```typescript
import {
  walletAddressAtom,
  walletStatusAtom,
  walletErrorAtom, // NEW
  isConnectedAtom, // NEW - derived
  autoRefreshAtom, // NEW
} from "@/lib/state";
```

### Step 3: Use Enhanced Features

**Add Error Handling:**
```typescript
const { walletError } = useEnhancedWallet();

if (walletError) {
  // Show error to user
  return <ErrorDisplay message={walletError} />;
}
```

**Use Auto-Refresh Settings:**
```typescript
const [autoRefresh, setAutoRefresh] = useAtom(autoRefreshAtom);
const [refreshInterval, setRefreshInterval] = useAtom(refreshIntervalAtom);

// User can toggle auto-refresh
<Switch checked={autoRefresh} onChange={setAutoRefresh} />
```

**Manual Cache Control:**
```typescript
import { onChainCache } from "@/lib/onchain/cache";

// Clear cache when needed
onChainCache.invalidate("portfolio:address123");

// Clear all wallet-related cache
onChainCache.invalidatePattern(".*:address123.*");
```

## Benefits

### Performance
- ✅ **Reduced RPC calls** - Intelligent caching reduces API usage
- ✅ **Request deduplication** - Multiple components requesting same data = 1 request
- ✅ **Connection pooling** - Reuses connections efficiently
- ✅ **Batch requests** - Multiple requests in parallel

### Reliability
- ✅ **Automatic retries** - Handles transient network errors
- ✅ **Health monitoring** - Detects connection issues
- ✅ **Error handling** - Better error states and recovery
- ✅ **Cache invalidation** - Ensures data freshness

### Developer Experience
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Persistent settings** - User preferences saved
- ✅ **Reactive** - Automatic updates when state changes
- ✅ **Backward compatible** - Old code still works

## Configuration

### Environment Variables

```env
# Solana RPC endpoint
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com

# Or use default cluster URLs
# mainnet-beta, devnet, testnet
```

### Default Settings

- **Cache TTL**: 30 seconds (configurable per request)
- **Retry attempts**: 3 (configurable)
- **Retry delay**: Exponential backoff (1s, 2s, 4s)
- **Auto-refresh**: Enabled by default
- **Refresh interval**: 30 seconds (configurable)

## Best Practices

1. **Use enhanced hooks** for new code
2. **Cache expensive operations** (balance checks, portfolio data)
3. **Invalidate cache** after transactions
4. **Handle errors gracefully** using error atoms
5. **Respect user preferences** (auto-refresh settings)
6. **Monitor connection health** in production

## Troubleshooting

### Cache not updating?
```typescript
// Manually invalidate
onChainCache.invalidate("key");

// Or clear all
onChainCache.clear();
```

### Connection issues?
```typescript
// Check health
const isHealthy = await connectionManager.healthCheck();

// Get fresh connection
const connection = connectionManager.getDefaultConnection();
```

### Too many requests?
- Check cache TTL settings
- Enable request deduplication (automatic)
- Use batch requests for multiple addresses

## Next Steps

1. Gradually migrate to enhanced hooks
2. Add error boundaries for better UX
3. Monitor cache hit rates
4. Adjust TTL based on usage patterns
5. Add analytics for connection health

