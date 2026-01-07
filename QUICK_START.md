# Quick Start Guide - Running the Frontend

## Prerequisites

1. **Node.js** (v18 or higher)
2. **pnpm** (or npm/yarn)
3. **PostgreSQL** (for database features)
4. **Solana Wallet** (Phantom or Solflare browser extension)

## Step 1: Install Dependencies

```bash
cd /home/konquest/code_repo/development/drmr
pnpm install
```

## Step 2: Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Network Configuration
NEXT_PUBLIC_MODE=devnet  # or mainnet-beta for mainnet

# Solana RPC Endpoints (required - get free ones from Helius, QuickNode, or Alchemy)
NEXT_PUBLIC_SOLANA_RPC_DEVNET=https://api.devnet.solana.com
# Or use a custom RPC:
# NEXT_PUBLIC_SOLANA_RPC_DEVNET=https://devnet.helius-rpc.com/?api-key=YOUR_KEY

NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://api.mainnet-beta.solana.com
# Or use a custom RPC:
# NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# DRMR Token Mint Address (get this from your token creation)
NEXT_PUBLIC_DRMR_MINT=YourDRMRTokenMintAddressHere

# Database (if using database features)
DATABASE_URL="postgresql://username:password@localhost:5432/drmr_dashboard"

# Admin Password (optional, for admin features)
ADMIN_PASSWORD=your-secure-password
```

**Important:** 
- Replace `YourDRMRTokenMintAddressHere` with your actual DRMR token mint address
- For better performance, use a custom RPC endpoint (Helius, QuickNode, or Alchemy offer free tiers)
- Public RPC endpoints have rate limits and may cause 403 errors

## Step 3: Set Up Database (Optional - only if using database features)

If you need database features (staking records, validators, etc.):

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Or push schema without migrations
pnpm db:push
```

## Step 4: Run Development Server

```bash
pnpm dev
```

The app will start at: **http://localhost:3000**

## Step 5: Test Your Integration

1. **Open the app** in your browser: http://localhost:3000
2. **Connect your wallet** (Phantom or Solflare)
3. **Navigate to Staking page** (`/staking`)
4. **Test DRMR staking features:**
   - Check if DRMR balance loads
   - Try staking (if implemented)
   - Check staking pool data
   - Test reward claiming

## Production Build

To build for production:

```bash
# Build the app
pnpm build

# Start production server
pnpm start
```

## Troubleshooting

### Issue: "Wallet not connected"
- Make sure you have a Solana wallet extension installed (Phantom/Solflare)
- Refresh the page after connecting

### Issue: "RPC rate limit" or 403 errors
- Set up a custom RPC endpoint in `.env.local`
- Get free RPC from: https://www.helius.dev/ or https://www.quicknode.com/

### Issue: "DRMR token not found"
- Make sure `NEXT_PUBLIC_DRMR_MINT` is set correctly in `.env.local`
- Verify the token mint address is correct for your network (devnet/mainnet)

### Issue: "Account does not exist" (staking)
- This is normal if you haven't staked yet - the staker account is created on first stake

### Issue: Database connection errors
- Make sure PostgreSQL is running
- Verify `DATABASE_URL` in `.env.local` is correct
- Run `pnpm db:push` to sync schema

## Testing Checklist

- [ ] Wallet connects successfully
- [ ] DRMR token balance displays
- [ ] Staking pool data loads
- [ ] Staker data loads (if you've staked before)
- [ ] Can stake DRMR tokens
- [ ] Can claim rewards
- [ ] Can withdraw rewards
- [ ] Can unstake (after lock-up period)

## Next Steps

1. Test all staking functions
2. Add error handling and user feedback
3. Add loading states
4. Add transaction confirmation modals
5. Deploy to production (Vercel recommended for Next.js)

