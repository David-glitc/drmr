This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Setup

Create a `.env.local` file in the root directory with your Solana RPC endpoint:

```bash
# Solana RPC Configuration
# Set a custom RPC endpoint to avoid rate limits and 403 errors
# You can get free RPC endpoints from:
# - Helius: https://www.helius.dev/
# - QuickNode: https://www.quicknode.com/
# - Alchemy: https://www.alchemy.com/solana

# Network mode: Set the default network (devnet, mainnet, or testnet)
# This determines which network the app uses by default
NEXT_PUBLIC_MODE=devnet

# Network-specific RPC endpoints (recommended)
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_SOLANA_RPC_DEVNET=https://solana-devnet.g.alchemy.com/v2/YOUR_API_KEY

# Fallback: Single RPC endpoint for both networks (legacy)
# NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com

# Example with API key (Helius format):
# NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
# NEXT_PUBLIC_SOLANA_RPC_DEVNET=https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY

# Example with API key (QuickNode format):
# NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://YOUR_ENDPOINT.solana-mainnet.quiknode.pro/YOUR_API_KEY/
# NEXT_PUBLIC_SOLANA_RPC_DEVNET=https://YOUR_ENDPOINT.solana-devnet.quiknode.pro/YOUR_API_KEY/

# Admin Password (Server-side only)
# Set this to enable admin access via Ctrl+Shift+D shortcut
# This password is verified server-side and never exposed to the client
ADMIN_PASSWORD=your-secure-admin-password-here
```

**Important:** 
- Set `NEXT_PUBLIC_MODE` to control the default network (`devnet`, `mainnet`, or `testnet`). Defaults to `devnet` if not set.
- Without a custom RPC endpoint, you may encounter 403 errors due to rate limiting on public endpoints.
- The app uses Devnet by default; Mainnet is coming soon.

### Database Setup

This project uses PostgreSQL with Prisma ORM. Set up your database:

1. **Install PostgreSQL** (if not already installed)
   - macOS: `brew install postgresql`
   - Ubuntu: `sudo apt-get install postgresql`
   - Windows: Download from [PostgreSQL website](https://www.postgresql.org/download/)

2. **Create a database**:
   ```bash
   createdb drmr_dashboard
   ```

3. **Set DATABASE_URL in `.env.local`**:
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/drmr_dashboard"
   ```

4. **Run Prisma migrations**:
   ```bash
   npx prisma migrate dev
   ```

5. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

6. **Sync validators** (required for staking functionality):
   ```bash
   # Sync devnet validators (default)
   npx tsx scripts/sync-validators.ts devnet
   
   # Or sync mainnet validators
   npx tsx scripts/sync-validators.ts mainnet-beta
   ```

   Validators are automatically synced when you visit the staking page, but you can also manually sync them using the script above.

### Running the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
