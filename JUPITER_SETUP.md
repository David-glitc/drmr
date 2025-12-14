# Jupiter API Integration Setup

## API Key Configuration

Your Jupiter Ultra API key has been integrated into the application. To use it:

### 1. Add API Key to Environment Variables

Add the following to your `.env` file:

```env
JUPITER_API_KEY="1598ddb5-9c69-4c76-a10e-1b586b11e01f"
```

### 2. Restart Development Server

After adding the API key, restart your development server:

```bash
pnpm dev
```

## What's Included

### API Routes
- `/api/jupiter/quote` - Get swap quotes
- `/api/jupiter/price` - Get token prices

### React Hooks
- `useJupiterQuote` - Fetch swap quotes
- `useJupiterPrice` - Fetch token prices

### Service
- `JupiterService` - Client-side service for Jupiter API (uses API routes)

## Usage Example

```typescript
import { useJupiterQuote } from "@/hooks/useJupiterQuote";
import { TOKEN_MINTS } from "@/lib/services/jupiter-service";

// Get quote for SOL to USDC swap
const { data: quote, isLoading } = useJupiterQuote({
  inputMint: TOKEN_MINTS.SOL,
  outputMint: TOKEN_MINTS.USDC,
  amount: "1000000000", // 1 SOL in lamports
  slippageBps: 50, // 0.5%
});
```

## Token Mints

Common token mints are available in `TOKEN_MINTS`:

- `TOKEN_MINTS.SOL` - Solana
- `TOKEN_MINTS.USDC` - USD Coin
- `TOKEN_MINTS.USDT` - Tether USD

Add DRMR mint address when available.

## Production Deployment

Make sure to add `JUPITER_API_KEY` to your production environment variables:
- Vercel: Project Settings → Environment Variables
- Other platforms: Add as environment variable

