# Quick Start: PostgreSQL Setup

## ✅ What's Already Done

1. ✅ Prisma schema updated to use `postgresql` provider
2. ✅ PostgreSQL driver (`pg`) added to package.json
3. ✅ TypeScript types for PostgreSQL added
4. ✅ Prisma client configured for production

## 🚀 Next Steps

### 1. Install Dependencies

```bash
pnpm install
```

This will install the `pg` driver needed for PostgreSQL.

### 2. Set Environment Variable

Add your Aiven PostgreSQL connection string to `.env`:

```env
DATABASE_URL="postgres://avnadmin:AVNS_lkyZnpUdhDOJ7E-9lJO@drmr-1-drmr-dashboard.b.aivencloud.com:25898/defaultdb?sslmode=require"
```

**Note**: Both `postgres://` and `postgresql://` work with Prisma. Your format is correct!

### 3. Generate Prisma Client

```bash
pnpm db:generate
```

### 4. Create Database Tables

```bash
pnpm db:push
```

This will create all tables in your PostgreSQL database.

### 5. Verify Build

```bash
pnpm build
```

The build should work now! Prisma Client will be generated automatically during the build process.

## 🔍 Verify Connection

Test your database connection:

```bash
pnpm db:studio
```

This opens Prisma Studio where you can see your tables and data.

## 📝 Production Deployment

### Environment Variables

Make sure to set `DATABASE_URL` in your production environment:

**Vercel:**
- Go to Project Settings → Environment Variables
- Add `DATABASE_URL` with your connection string

**Other Platforms:**
- Add `DATABASE_URL` as an environment variable in your hosting platform

### Build Process

The build will automatically:
1. Generate Prisma Client
2. Connect to your PostgreSQL database
3. Use the connection string from `DATABASE_URL`

## ✅ Checklist

- [ ] Run `pnpm install` to install `pg` driver
- [ ] Set `DATABASE_URL` in `.env` file
- [ ] Run `pnpm db:push` to create tables
- [ ] Test with `pnpm build`
- [ ] Set `DATABASE_URL` in production environment

## 🎉 You're Ready!

Your app is now configured for PostgreSQL. The build will work with your Aiven database connection string.

