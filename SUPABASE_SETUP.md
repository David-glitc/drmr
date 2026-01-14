# Supabase PostgreSQL Setup Guide

This guide walks you through setting up Supabase as your PostgreSQL database for the DRMR Dashboard.

## 1. Create a Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Enter:
   - **Organization**: Select or create one
   - **Project Name**: `drmr-dashboard`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"**
5. Wait for the project to be provisioned (2-3 minutes)

## 2. Get Database Connection Strings

1. In your Supabase project, go to **Settings → Database**
2. Scroll to **"Connection string"** section
3. Copy both connection strings:

### Connection Pooler (for application)
```
postgresql://postgres.[YOUR-PROJECT-REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Direct Connection (for migrations)
```
postgresql://postgres.[YOUR-PROJECT-REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
```

## 3. Configure Environment Variables

Create or update your `.env.local` file (NOT committed to git):

```env
# Supabase PostgreSQL - Connection Pooler (for app)
DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase PostgreSQL - Direct Connection (for migrations)
DIRECT_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Solana Network Mode
NEXT_PUBLIC_MODE="devnet"

# Optional: Custom RPC endpoints
NEXT_PUBLIC_SOLANA_RPC_MAINNET=""
NEXT_PUBLIC_SOLANA_RPC_DEVNET=""

# Admin Configuration
ADMIN_PASSWORD="your-secure-admin-password"
ADMIN_WALLET_ADDRESSES="your-admin-wallet-address"
```

Replace the placeholders:
- `[YOUR-PROJECT-REF]`: Your Supabase project reference (found in URL)
- `[YOUR-PASSWORD]`: The database password you created

## 4. Generate Prisma Client

```bash
pnpm db:generate
```

## 5. Push Schema to Supabase

For initial setup or development:
```bash
pnpm db:push
```

This will create all tables in your Supabase database.

## 6. Run Migrations (Production)

For production deployments:
```bash
pnpm db:migrate
```

## 7. Verify Connection

Test the database connection:
```bash
pnpm db:test
```

Or open Prisma Studio to view/edit data:
```bash
pnpm db:studio
```

---

## Database Schema

The DRMR Dashboard uses the following tables:

| Table | Description |
|-------|-------------|
| `User` | Wallet addresses and user info |
| `UserActivity` | Activity tracking (connections, stakes, etc.) |
| `UserData` | Key-value store for user preferences |
| `PlatformMetrics` | Platform-wide statistics |
| `AdminSession` | Admin authentication sessions |
| `Validator` | Solana validator information |
| `StakingRecord` | User staking records |

---

## Troubleshooting

### "Can't reach database server"
- Check your DATABASE_URL is correct
- Ensure Supabase project is running (not paused)
- Verify firewall/network allows outbound connections

### "Permission denied"
- Check password is correct
- Verify project reference ID

### "SSL connection required"
- Add `?sslmode=require` to your connection string if needed

### Prisma migration errors
- Use DIRECT_URL for migrations (port 5432)
- DATABASE_URL should use pooler (port 6543)

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:test` | Test database connection |

---

## Security Best Practices

1. ✅ Never commit `.env` files to git
2. ✅ Use connection pooling for production
3. ✅ Rotate database passwords regularly
4. ✅ Enable Row Level Security (RLS) in Supabase for sensitive data
5. ✅ Use environment variables for all secrets
