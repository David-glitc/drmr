# Production Database Guide

## SQLite in Production: When and How

### ⚠️ SQLite Limitations

SQLite is **not recommended** for most production web applications because:

1. **Concurrent Writes**: SQLite locks the entire database during writes
   - Only one write operation at a time
   - Can cause timeouts with multiple users
   - Your app tracks user activities (many writes)

2. **No Network Access**: SQLite is file-based
   - Can't scale across multiple servers
   - Difficult to backup while running
   - No built-in replication

3. **Limited Performance**: 
   - Slower than PostgreSQL/MySQL for complex queries
   - No connection pooling
   - Single-threaded writes

### ✅ When SQLite IS Appropriate for Production

SQLite works well for:
- **Low-traffic sites** (< 100 concurrent users)
- **Read-heavy applications** (90%+ reads)
- **Single-server deployments**
- **Embedded applications**
- **Prototypes/MVPs** that need to scale later

### 🚀 How to Use SQLite in Production (If You Must)

If you decide to use SQLite in production, follow these best practices:

#### 1. Optimize Your Prisma Client

Update `lib/prisma.ts` for production:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    // SQLite-specific optimizations
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// SQLite connection pool settings (if using connection pooling library)
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

#### 2. Configure SQLite for Production

**Environment Variables** (`.env.production`):

```env
# Use absolute path for production
DATABASE_URL="file:/var/lib/drmr/production.db?mode=rwc"

# Or with WAL mode (Write-Ahead Logging - better for concurrent reads)
DATABASE_URL="file:/var/lib/drmr/production.db?mode=rwc&journal_mode=WAL"
```

**WAL Mode Benefits:**
- Better concurrent read performance
- Faster writes
- Better crash recovery

#### 3. Set Up Proper File Permissions

```bash
# Create database directory
mkdir -p /var/lib/drmr

# Set proper permissions
chmod 755 /var/lib/drmr
chown your-user:your-group /var/lib/drmr

# Database file will be created automatically
```

#### 4. Implement Connection Pooling (Limited)

SQLite doesn't support true connection pooling, but you can:

```typescript
// lib/prisma.ts - Add connection limits
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  // Limit concurrent operations
  // Note: Prisma handles this internally for SQLite
});
```

#### 5. Set Up Automated Backups

**Backup Script** (`scripts/backup-db.sh`):

```bash
#!/bin/bash
# Backup SQLite database

DB_PATH="/var/lib/drmr/production.db"
BACKUP_DIR="/var/backups/drmr"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# SQLite backup command
sqlite3 $DB_PATH ".backup '$BACKUP_DIR/backup_$DATE.db'"

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.db" -mtime +30 -delete

echo "Backup completed: backup_$DATE.db"
```

**Cron Job** (run every 6 hours):
```bash
0 */6 * * * /path/to/scripts/backup-db.sh
```

#### 6. Optimize Queries

- Use indexes (already in your schema ✅)
- Batch writes when possible
- Use transactions for multiple operations
- Limit query results with pagination (already implemented ✅)

#### 7. Monitor Performance

Add monitoring to detect issues:

```typescript
// lib/prisma.ts - Add query timing
export const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
});

if (process.env.NODE_ENV === 'production') {
  prisma.$on('query' as never, (e: any) => {
    if (e.duration > 1000) { // Log slow queries (>1s)
      console.warn('Slow query detected:', {
        query: e.query,
        duration: e.duration,
        params: e.params,
      });
    }
  });
}
```

### 📊 Recommended: PostgreSQL for Production

For a production dashboard with user tracking, **PostgreSQL is strongly recommended**.

#### Why PostgreSQL?

✅ Handles concurrent writes efficiently  
✅ Scales to millions of users  
✅ Built-in replication and backups  
✅ Better performance for analytics  
✅ Connection pooling  
✅ Network accessible (multi-server)  

#### Migration Steps

1. **Update Prisma Schema**:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

2. **Update Environment Variables**:

```env
# Development (SQLite)
DATABASE_URL="file:./dev.db"

# Production (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/drmr_dashboard?schema=public"
```

3. **Run Migrations**:

```bash
# Generate migration
pnpm db:migrate dev --name init

# Apply to production
pnpm db:migrate deploy
```

4. **Update Prisma Client for Connection Pooling**:

```typescript
// lib/prisma.ts
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  // PostgreSQL connection pooling is handled by Prisma automatically
});
```

### 🗄️ Database Options Comparison

| Feature | SQLite | PostgreSQL | MySQL |
|---------|--------|------------|-------|
| **Concurrent Writes** | ❌ Limited | ✅ Excellent | ✅ Excellent |
| **Scalability** | ❌ Single server | ✅ Multi-server | ✅ Multi-server |
| **Performance** | ⚠️ Good for small scale | ✅ Excellent | ✅ Excellent |
| **Setup Complexity** | ✅ Very Easy | ⚠️ Moderate | ⚠️ Moderate |
| **Cost** | ✅ Free | ✅ Free (self-hosted) | ✅ Free (self-hosted) |
| **Best For** | Small apps, MVPs | Production apps | Production apps |

### 🚀 Quick Setup: PostgreSQL on Vercel/Railway/Render

#### Vercel Postgres (Easiest)

1. Add Vercel Postgres to your project
2. Get connection string from Vercel dashboard
3. Update `.env.production`:
   ```env
   DATABASE_URL="postgresql://..."
   ```
4. Run migrations: `pnpm db:migrate deploy`

#### Railway

1. Create new PostgreSQL database on Railway
2. Copy connection string
3. Update environment variables
4. Deploy

#### Render

1. Create PostgreSQL database
2. Get connection string
3. Update environment variables
4. Deploy

### 📝 Production Checklist

- [ ] Choose database (SQLite for MVP, PostgreSQL for production)
- [ ] Set up automated backups
- [ ] Configure proper file/database permissions
- [ ] Set up monitoring/alerting
- [ ] Test backup/restore process
- [ ] Document database credentials securely
- [ ] Set up connection pooling (PostgreSQL)
- [ ] Configure read replicas if needed (PostgreSQL)
- [ ] Set up database migrations in CI/CD

### 🔒 Security Best Practices

1. **Never commit database files or credentials**
2. **Use environment variables for connection strings**
3. **Restrict database access** (firewall rules)
4. **Use SSL/TLS** for database connections (PostgreSQL)
5. **Regular security updates**
6. **Backup encryption**

### 💡 Recommendation for Your App

Given that your dashboard:
- Tracks user activities (many writes)
- Has an admin panel (concurrent operations)
- May scale with more users

**I recommend PostgreSQL for production**, even if you start with SQLite for development.

You can easily switch by:
1. Changing the `provider` in `schema.prisma`
2. Updating `DATABASE_URL`
3. Running migrations

The code will work the same way! 🎉

