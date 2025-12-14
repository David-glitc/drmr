import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/metrics - Get platform metrics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const latest = searchParams.get("latest") === "true";
    
    if (latest) {
      const metric = await prisma.platformMetrics.findFirst({
        orderBy: { recordedAt: "desc" },
      });
      
      if (!metric) {
        // Return default metrics if none exist
        return NextResponse.json({
          totalUsers: 0,
          activeUsers: 0,
          totalStaked: 0,
          totalVolume: 0,
          totalTransactions: 0,
          dailyActiveUsers: 0,
          dailyStaked: 0,
          dailyVolume: 0,
          dailyTransactions: 0,
          recordedAt: new Date(),
        });
      }
      
      return NextResponse.json(metric);
    }
    
    // Get metrics history
    const limit = parseInt(searchParams.get("limit") || "30");
    const metrics = await prisma.platformMetrics.findMany({
      take: limit,
      orderBy: { recordedAt: "desc" },
    });
    
    return NextResponse.json({ metrics });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}

// POST /api/metrics - Record new platform metrics
export async function POST(request: NextRequest) {
  try {
    // Calculate current metrics
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
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
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
            gte: new Date(new Date().setHours(0, 0, 0, 0)), // Today
          },
        },
      }),
    ]);
    
    const totalStaked = users.reduce((sum, user) => sum + user.totalStaked, 0);
    const totalTransactions = users.reduce(
      (sum, user) => sum + user.totalTransactions,
      0
    );
    
    // Get today's active users
    const todayActiveUsers = await prisma.userActivity.findMany({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      distinct: ["userId"],
    });
    
    const dailyActiveUsers = todayActiveUsers.length;
    
    // Calculate daily staked (simplified - you might want to track this differently)
    const dailyStaked = 0; // This would need to be calculated from daily transactions
    
    const metric = await prisma.platformMetrics.create({
      data: {
        totalUsers,
        activeUsers,
        totalStaked,
        totalVolume: 0, // Would need to track separately
        totalTransactions,
        dailyActiveUsers,
        dailyStaked,
        dailyVolume: 0,
        dailyTransactions: todayActivities,
      },
    });
    
    return NextResponse.json(metric, { status: 201 });
  } catch (error) {
    console.error("Error creating metrics:", error);
    return NextResponse.json(
      { error: "Failed to create metrics" },
      { status: 500 }
    );
  }
}

