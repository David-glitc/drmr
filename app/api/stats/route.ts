import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkDatabaseHealth } from "@/lib/db-health";

// GET /api/stats - Get dashboard statistics
export async function GET() {
  try {
    // Check database health first
    const health = await checkDatabaseHealth();
    if (!health.healthy) {
      return NextResponse.json(
        { 
          error: "Database connection failed",
          message: health.message,
          details: health.error,
          // Return empty stats so UI doesn't break
          totalUsers: 0,
          activeUsers: 0,
          adminUsers: 0,
          totalActivities: 0,
          totalStaked: 0,
          recentUsers: [],
          topUsers: [],
          activityStats: [],
        },
        { status: 503 }
      );
    }
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      totalActivities,
      recentUsers,
      topUsers,
      activityStats,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastActiveAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      prisma.user.count({ where: { isAdmin: true } }),
      prisma.userActivity.count(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          walletAddress: true,
          username: true,
          email: true,
          createdAt: true,
        },
      }),
      prisma.user.findMany({
        take: 10,
        orderBy: { totalStaked: "desc" },
        select: {
          id: true,
          walletAddress: true,
          username: true,
          totalStaked: true,
          totalRewards: true,
        },
      }),
      prisma.userActivity.groupBy({
        by: ["action"],
        _count: true,
        orderBy: { _count: { action: "desc" } },
        take: 10,
      }),
    ]);
    
    // Calculate total staked across all users
    const allUsers = await prisma.user.findMany({
      select: { totalStaked: true },
    });
    const totalStaked = allUsers.reduce(
      (sum, user) => sum + user.totalStaked,
      0
    );
    
    return NextResponse.json({
      totalUsers,
      activeUsers,
      adminUsers,
      totalActivities,
      totalStaked,
      recentUsers,
      topUsers,
      activityStats: activityStats.map((stat) => ({
        action: stat.action,
        count: stat._count,
      })),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

