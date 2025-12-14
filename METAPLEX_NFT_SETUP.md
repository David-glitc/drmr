# Metaplex NFT Integration

## Overview

The application now uses **Metaplex** to fetch and display NFTs with full metadata, including images, descriptions, and collection information.

## What's New

### 1. SolanaTokenService (`lib/services/solana-token-service.ts`)

A comprehensive service for fetching:
- **SPL Tokens**: Token balances with amounts and decimals
- **NFTs**: Full Metaplex metadata including images, descriptions, collections
- **SOL Balance**: Native Solana balance

**Features:**
- Uses Metaplex SDK for NFT metadata
- Handles errors gracefully
- Returns structured data with explorer links
- Filters out invalid NFTs (no images)

### 2. NFT Card Component (`components/NftCard.tsx`)

Beautiful image card component for displaying NFTs:

**Features:**
- Responsive image display with loading states
- Error handling for broken images
- Collection badges
- Explorer links
- Copy mint address functionality
- Hover effects and animations

### 3. Updated Portfolio Service

The portfolio service now:
- Uses `SolanaTokenService` for NFT fetching
- Returns full NFT metadata (images, descriptions, etc.)
- Integrates with existing caching system

### 4. Enhanced NFT Display

NFTs are now displayed in a responsive grid:
- 2 columns on mobile
- 3 columns on tablet
- 4 columns on desktop
- Empty state when no NFTs found

## Installation

The Metaplex dependency has been added to `package.json`:

```json
"@metaplex-foundation/js": "^0.19.2"
```

Run:
```bash
pnpm install
```

## Usage

### Fetching NFTs

```typescript
import { SolanaTokenService } from "@/lib/services/solana-token-service";
import { connectionManager } from "@/lib/connection-manager";

const service = new SolanaTokenService(connectionManager.getDefaultConnection());
const nfts = await service.getNFTs(walletAddress);
```

### Displaying NFTs

```tsx
import { NftCard } from "@/components/NftCard";

{nfts.map((nft) => (
  <NftCard key={nft.mint} nft={nft} />
))}
```

### Using in Portfolio Hook

The portfolio hook automatically fetches NFTs:

```typescript
import { usePortfolio } from "@/hooks/usePortfolio";

const { nfts, tokens, activity } = usePortfolio();
// nfts now includes full metadata with images
```

## NFT Data Structure

```typescript
interface NFT {
  mint: string;                    // NFT mint address
  name: string;                    // NFT name
  description: string;             // NFT description
  image: string;                   // Image URL
  explorerLink: string;            // Solscan link
  collection?: string;             // Collection name (if part of collection)
  attributes?: Array<{            // NFT attributes
    trait_type: string;
    value: string;
  }>;
}
```

## Features

### Image Handling
- ✅ Loading states with spinner
- ✅ Error fallback for broken images
- ✅ Lazy loading support
- ✅ Responsive images

### User Experience
- ✅ Hover effects
- ✅ Collection badges
- ✅ Quick actions (View, Copy)
- ✅ Empty states

### Performance
- ✅ Integrated with caching system
- ✅ Optimized image loading
- ✅ Error boundaries

## Customization

### NFT Card Styling

The `NftCard` component uses Tailwind classes and can be customized:

```tsx
<NftCard 
  nft={nft}
  className="custom-class" // Add custom classes if needed
/>
```

### Grid Layout

Modify the grid in `portfolio/page.tsx`:

```tsx
<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
  {nfts.map((nft) => (
    <NftCard key={nft.mint} nft={nft} />
  ))}
</div>
```

## Error Handling

The service handles various error scenarios:

1. **Invalid Wallet Address**: Returns empty array
2. **Network Errors**: Logs error and continues
3. **Metadata Loading Failures**: Returns minimal NFT data
4. **Image Loading Failures**: Shows placeholder

## Performance Considerations

### Caching
- NFT data is cached for 30 seconds
- Images are cached by browser
- Use `onChainCache` for custom caching

### Rate Limiting
- Metaplex requests are batched
- Consider using private RPC for production
- Monitor RPC usage

### Large Collections
- NFTs are loaded in batches
- Consider pagination for wallets with 100+ NFTs
- Lazy loading images improves performance

## Production Recommendations

1. **Use Private RPC**: 
   - Helius, QuickNode, or Alchemy
   - Better rate limits
   - More reliable

2. **Image Optimization**:
   - Consider using CDN for images
   - Implement image compression
   - Use next/image for optimization

3. **Error Monitoring**:
   - Track failed NFT fetches
   - Monitor RPC errors
   - Alert on high error rates

## Troubleshooting

### NFTs Not Loading?

1. Check wallet address is valid
2. Verify RPC endpoint is accessible
3. Check browser console for errors
4. Ensure Metaplex is installed: `pnpm install`

### Images Not Displaying?

1. Check image URLs in NFT metadata
2. Verify CORS settings
3. Check network tab for failed requests
4. Images may be on IPFS (needs gateway)

### Slow Loading?

1. Use private RPC endpoint
2. Implement pagination
3. Add loading skeletons
4. Cache more aggressively

## Next Steps

- [ ] Add NFT filtering (by collection)
- [ ] Add NFT search
- [ ] Add floor price fetching
- [ ] Add NFT transfer functionality
- [ ] Add NFT marketplace links
- [ ] Add collection grouping

