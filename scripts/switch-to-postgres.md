# Switch from SQLite to PostgreSQL

## Quick Migration Guide

### Step 1: Update Prisma Schema

Change `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

### Step 2: Get PostgreSQL Connection String

**Option A: Vercel Postgres**
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

**Option B: Railway**
```env
DATABASE_URL="postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway"
```

**Option C: Render**
```env
DATABASE_URL="postgresql://user:pass@dpg-xxx.oregon-postgres.render.com/db"
```

**Option D: Self-hosted**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/drmr_dashboard?schema=public"
```

### Step 3: Install PostgreSQL Driver (if needed)

```bash
pnpm add pg @types/pg
```

### Step 4: Create Migration

```bash
# Generate migration from existing schema
pnpm db:migrate dev --name switch_to_postgres

# Or push schema directly (for development)
pnpm db:push
```

### Step 5: Migrate Data (if you have existing SQLite data)

If you have data in SQLite that you want to migrate:

1. Export from SQLite:
```bash
sqlite3 dev.db .dump > backup.sql
```

2. Convert SQLite syntax to PostgreSQL (manual or use a tool)

3. Import to PostgreSQL:
```bash
psql $DATABASE_URL < converted_backup.sql
```

Or use a migration tool like `pgloader`:
```bash
pgloader dev.db postgresql://user:pass@host/db
```

### Step 6: Update Environment Variables

Update your production environment:
- Vercel: Add `DATABASE_URL` in project settings
- Railway: Already set automatically
- Render: Add in environment variables

### Step 7: Deploy

```bash
# Run migrations in production
pnpm db:migrate deploy

# Or if using Vercel, migrations run automatically on deploy
```

### Step 8: Verify

Check that everything works:
- Access `/admin` dashboard
- Create a test user
- Check database connection

## Notes

- Your Prisma client code doesn't need to change!
- All queries work the same way
- Only the connection string and provider change
- PostgreSQL is much better for production workloads

