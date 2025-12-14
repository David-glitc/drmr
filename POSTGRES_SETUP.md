# PostgreSQL Setup for Production

## Your Database Connection

Your Aiven PostgreSQL connection string:
```
postgres://avnadmin:AVNS_lkyZnpUdhDOJ7E-9lJO@drmr-1-drmr-dashboard.b.aivencloud.com:25898/defaultdb?sslmode=require
```

## Setup Steps

### 1. Install PostgreSQL Driver

```bash
pnpm add pg
pnpm add -D @types/pg
```

### 2. Update Environment Variables

Create/update your `.env` file:

```env
DATABASE_URL="postgres://avnadmin:AVNS_lkyZnpUdhDOJ7E-9lJO@drmr-1-drmr-dashboard.b.aivencloud.com:25898/defaultdb?sslmode=require"
```

**Note**: Prisma accepts both `postgres://` and `postgresql://` formats, but `postgresql://` is preferred. You can use either.

### 3. Generate Prisma Client

```bash
pnpm db:generate
```

### 4. Push Schema to Database

```bash
pnpm db:push
```

Or create a migration:

```bash
pnpm db:migrate dev --name init
```

### 5. Verify Connection

Test the connection:

```bash
pnpm db:studio
```

This will open Prisma Studio where you can verify tables were created.

## Build Configuration

The build will work automatically because:

1. ✅ Schema is updated to use `postgresql` provider
2. ✅ Prisma Client will be generated during build
3. ✅ Connection string is in environment variables
4. ✅ All code uses Prisma (database-agnostic)

## Production Deployment

### Vercel
Add `DATABASE_URL` in project settings → Environment Variables

### Other Platforms
Set `DATABASE_URL` as an environment variable in your hosting platform.

## Connection String Format

Your current format works, but for consistency, you can also use:

```env
DATABASE_URL="postgresql://avnadmin:AVNS_lkyZnpUdhDOJ7E-9lJO@drmr-1-drmr-dashboard.b.aivencloud.com:25898/defaultdb?sslmode=require"
```

Both `postgres://` and `postgresql://` work with Prisma.

## Troubleshooting

### Connection Issues

1. **SSL Required**: Your connection string includes `sslmode=require` - this is correct for Aiven
2. **Firewall**: Make sure your deployment platform can access Aiven's IPs
3. **Credentials**: Verify username/password are correct

### Build Errors

If you see Prisma errors during build:
1. Make sure `DATABASE_URL` is set in build environment
2. Run `pnpm db:generate` before building
3. Check that `pg` package is installed

### Migration Issues

If migrations fail:
```bash
# Reset and push schema directly
pnpm db:push --force-reset
```

## Next Steps

1. ✅ Schema updated to PostgreSQL
2. ⏳ Install `pg` driver: `pnpm add pg @types/pg`
3. ⏳ Set `DATABASE_URL` environment variable
4. ⏳ Run `pnpm db:push` to create tables
5. ⏳ Test with `pnpm build`

