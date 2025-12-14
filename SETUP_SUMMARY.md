# Database & Admin Dashboard Setup Summary

## ✅ What Has Been Set Up

### 1. Prisma Database Schema
- **Location**: `prisma/schema.prisma`
- **Models Created**:
  - `User` - User accounts linked to wallet addresses
  - `UserActivity` - Activity tracking and logging
  - `UserData` - Key-value storage for user data
  - `PlatformMetrics` - Platform statistics snapshots
  - `AdminSession` - Admin authentication sessions

### 2. Prisma Client
- **Location**: `lib/prisma.ts`
- Singleton pattern for database connections
- Optimized for Next.js serverless functions

### 3. API Routes Created
- `app/api/users/route.ts` - List and create users
- `app/api/users/[id]/route.ts` - Get, update, delete user
- `app/api/users/[id]/activities/route.ts` - User activity management
- `app/api/activities/route.ts` - Global activity tracking
- `app/api/metrics/route.ts` - Platform metrics
- `app/api/stats/route.ts` - Dashboard statistics
- `app/api/sync-user/route.ts` - Sync user on wallet connect

### 4. Admin Dashboard
- **Location**: `app/(dashboard)/admin/page.tsx`
- **Features**:
  - User management (view, edit, delete, activate/deactivate)
  - Real-time statistics
  - Activity tracking visualization
  - User search and pagination
  - User detail modal

### 5. User Tracking Service
- **Location**: `lib/services/user-tracking-service.ts`
- Methods for tracking activities, updating user data, recording metrics

### 6. React Hook for Tracking
- **Location**: `hooks/useUserTracking.ts`
- Easy-to-use hook for tracking user activities from components

### 7. Navigation Updated
- Admin route added to navigation menu

## 🚀 Next Steps

### 1. Generate Prisma Client

If you encounter issues with `pnpm prisma generate`, try:

```bash
# Option 1: Use node directly
node node_modules/prisma/build/index.js generate

# Option 2: Try with npm
npm exec prisma generate

# Option 3: The client will auto-generate on first build
pnpm build
```

### 2. Create Database

```bash
# For SQLite (development)
pnpm db:push

# Or create a migration
pnpm db:migrate
```

### 3. Set Environment Variable

Make sure you have a `.env` file with:
```env
DATABASE_URL="file:./dev.db"
```

### 4. Access Admin Dashboard

1. Start your development server: `pnpm dev`
2. Navigate to `/admin` in your browser
3. The admin dashboard will be available (you may want to add authentication later)

## 📝 Usage Examples

### Track User Activity in Components

```typescript
import { useUserTracking } from "@/hooks/useUserTracking";

function MyComponent() {
  const { trackActivity, trackPageView } = useUserTracking();
  
  useEffect(() => {
    trackPageView("portfolio");
  }, [trackPageView]);
}
```

### Update User Staking Data

```typescript
import { UserTrackingService } from "@/lib/services/user-tracking-service";

await UserTrackingService.updateUserStaking(
  walletAddress,
  1000, // staked amount
  50    // rewards
);
```

### Track Custom Activity

```typescript
await UserTrackingService.trackActivity(
  walletAddress,
  "custom_action",
  { customData: "value" }
);
```

## 🔒 Security Notes

1. **Admin Access**: Currently, the admin dashboard is accessible to anyone. Consider adding:
   - Authentication middleware
   - Role-based access control
   - Admin wallet address whitelist

2. **API Routes**: Consider adding:
   - Rate limiting
   - Authentication checks
   - Input validation

3. **Database**: For production:
   - Use PostgreSQL or MySQL instead of SQLite
   - Set up proper backups
   - Use connection pooling

## 🐛 Troubleshooting

### Prisma Client Generation Issues

If you see ESM/CommonJS errors:
1. Try updating Node.js to a stable LTS version
2. Clear node_modules and reinstall: `rm -rf node_modules pnpm-lock.yaml && pnpm install`
3. The client will generate automatically during build

### Database Connection Issues

1. Check that `.env` file exists with `DATABASE_URL`
2. Ensure the database file/directory is writable
3. For SQLite, the file will be created automatically

### API Route Errors

1. Make sure Prisma Client is generated
2. Check that the database exists and schema is applied
3. Verify environment variables are loaded

## 📊 Database Schema Overview

```
User
├── id (String, Primary Key)
├── walletAddress (String, Unique)
├── email, username (Optional)
├── isAdmin, isActive (Boolean)
├── totalStaked, totalRewards (Float)
├── totalTransactions (Int)
└── Relations: activities[], userData[]

UserActivity
├── id (String, Primary Key)
├── userId (Foreign Key → User)
├── action (String)
├── metadata (JSON String)
├── ipAddress, userAgent (Optional)
└── createdAt (DateTime)

UserData
├── id (String, Primary Key)
├── userId (Foreign Key → User)
├── key (String)
├── value (String/JSON)
└── Unique constraint: (userId, key)

PlatformMetrics
├── id (String, Primary Key)
├── totalUsers, activeUsers (Int)
├── totalStaked, totalVolume (Float)
├── totalTransactions (Int)
├── dailyActiveUsers, dailyStaked, etc.
└── recordedAt (DateTime)
```

## 🎯 Features Implemented

✅ User management (CRUD operations)
✅ Activity tracking and logging
✅ Platform metrics collection
✅ Admin dashboard UI
✅ User search and filtering
✅ Pagination for large datasets
✅ Real-time statistics
✅ User detail views
✅ Activity breakdown visualization

The database and admin dashboard are now fully set up and ready to use!

