import { prisma } from "../prisma";

export class UserTrackingService {
  /**
   * Get or create a user by wallet address
   */
  static async getOrCreateUser(walletAddress: string) {
    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress,
          lastActiveAt: new Date(),
        },
      });
    } else {
      // Update last active time
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      });
    }

    return user;
  }

  /**
   * Track a user activity
   */
  static async trackActivity(
    walletAddress: string,
    action: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      const user = await this.getOrCreateUser(walletAddress);

      await prisma.userActivity.create({
        data: {
          userId: user.id,
          action,
          metadata: metadata ? JSON.stringify(metadata) : null,
          ipAddress,
          userAgent,
        },
      });

      // Update user's transaction count if it's a transaction-related action
      if (action.includes("transaction") || action.includes("stake") || action.includes("trade")) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            totalTransactions: { increment: 1 },
            lastActiveAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error("Error tracking activity:", error);
      // Don't throw - tracking should not break the app
    }
  }

  /**
   * Update user staking data
   */
  static async updateUserStaking(
    walletAddress: string,
    stakedAmount: number,
    rewards?: number
  ) {
    try {
      const user = await this.getOrCreateUser(walletAddress);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          totalStaked: stakedAmount,
          ...(rewards !== undefined && { totalRewards: rewards }),
          lastActiveAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error updating user staking:", error);
    }
  }

  /**
   * Update user data
   */
  static async updateUserData(
    walletAddress: string,
    key: string,
    value: any
  ) {
    try {
      const user = await this.getOrCreateUser(walletAddress);

      await prisma.userData.upsert({
        where: {
          userId_key: {
            userId: user.id,
            key,
          },
        },
        update: {
          value: typeof value === "string" ? value : JSON.stringify(value),
        },
        create: {
          userId: user.id,
          key,
          value: typeof value === "string" ? value : JSON.stringify(value),
        },
      });
    } catch (error) {
      console.error("Error updating user data:", error);
    }
  }

  /**
   * Record platform metrics snapshot
   */
  static async recordPlatformMetrics() {
    try {
      const [
        totalUsers,
        activeUsers,
        users,
        totalActivities,
        todayActivities,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            lastActiveAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.user.findMany({
          select: { totalStaked: true, totalTransactions: true },
        }),
        prisma.userActivity.count(),
        prisma.userActivity.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
      ]);

      const totalStaked = users.reduce((sum, user) => sum + user.totalStaked, 0);
      const totalTransactions = users.reduce(
        (sum, user) => sum + user.totalTransactions,
        0
      );

      const todayActiveUsers = await prisma.userActivity.findMany({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        distinct: ["userId"],
      });

      await prisma.platformMetrics.create({
        data: {
          totalUsers,
          activeUsers,
          totalStaked,
          totalVolume: 0,
          totalTransactions,
          dailyActiveUsers: todayActiveUsers.length,
          dailyStaked: 0,
          dailyVolume: 0,
          dailyTransactions: todayActivities,
        },
      });
    } catch (error) {
      console.error("Error recording platform metrics:", error);
    }
  }
}

