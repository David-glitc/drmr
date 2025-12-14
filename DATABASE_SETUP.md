# Database Setup Guide

This guide will help you set up the Prisma database for the DRMR Dashboard.

## Prerequisites

- Node.js and pnpm installed
- Prisma CLI (included in dependencies)

## Setup Steps

### 1. Environment Variables

Create a `.env` file in the root directory (if it doesn't exist) and add:

```env
DATABASE_URL="file:./dev.db"
```

For production, you can use PostgreSQL or MySQL:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/drmr_dashboard?schema=public"
```

### 2. Generate Prisma Client

Run the following command to generate the Prisma Client:

```bash
pnpm db:generate
```

### 3. Create Database and Run Migrations

For development (SQLite), push the schema directly:

```bash
pnpm db:push
```

For production or when you want to track migrations:

```bash
pnpm db:migrate
```

This will:
- Create the database file (`dev.db` for SQLite)
- Apply all schema changes
- Generate the Prisma Client

### 4. (Optional) Open Prisma Studio

To view and manage your database visually:

```bash
pnpm db:studio
```

This opens a web interface at `http://localhost:5555` where you can:
- View all tables and data
- Edit records
- Add new records
- Delete records

## Database Schema

The database includes the following models:

### User
- Stores user information linked to wallet addresses
- Tracks staking, rewards, and transaction counts
- Supports admin roles

### UserActivity
- Logs all user actions (wallet connections, staking, trading, etc.)
- Includes metadata, IP address, and user agent
- Indexed for fast queries

### UserData
- Stores key-value pairs for user-specific data
- Useful for preferences, cached values, etc.

### PlatformMetrics
- Snapshot of platform statistics at specific times
- Tracks total users, staked amounts, transactions, etc.
- Can be used for analytics and reporting

### AdminSession
- Manages admin authentication sessions
- (Can be extended for admin authentication)

## API Routes

The following API routes are available:

- `GET /api/users` - List users with pagination and search
- `POST /api/users` - Create a new user
- `GET /api/users/[id]` - Get user details
- `PATCH /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user
- `GET /api/users/[id]/activities` - Get user activities
- `POST /api/users/[id]/activities` - Log user activity
- `GET /api/activities` - Get all activities with filters
- `GET /api/metrics` - Get platform metrics
- `POST /api/metrics` - Record platform metrics snapshot
- `GET /api/stats` - Get dashboard statistics
- `POST /api/sync-user` - Sync user when wallet connects

## Usage in Code

### Track User Activities

```typescript
import { useUserTracking } from "@/hooks/useUserTracking";

function MyComponent() {
  const { trackActivity, trackPageView, trackStaking } = useUserTracking();
  
  useEffect(() => {
    trackPageView("portfolio");
  }, [trackPageView]);
  
  const handleStake = async () => {
    // ... staking logic
    trackStaking(100, "stake");
  };
}
```

### Use User Tracking Service

```typescript
import { UserTrackingService } from "@/lib/services/user-tracking-service";

// Track an activity
await UserTrackingService.trackActivity(
  walletAddress,
  "stake_transaction",
  { amount: 100 }
);

// Update user staking data
await UserTrackingService.updateUserStaking(walletAddress, 1000, 50);

// Update user data
await UserTrackingService.updateUserData(walletAddress, "preferences", {
  theme: "dark",
});
```

## Admin Dashboard

Access the admin dashboard at `/admin` to:
- View all users
- Search and filter users
- Edit user details
- View user activities
- See platform statistics
- Manage user status (active/inactive, admin)

## Notes

- The database uses SQLite by default for easy development
- For production, consider using PostgreSQL or MySQL
- User activities are tracked automatically when using the `useUserTracking` hook
- Platform metrics can be recorded periodically (e.g., via a cron job)

