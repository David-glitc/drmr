import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkDatabaseHealth } from "@/lib/db-health";

// GET /api/users - Get all users with pagination
export async function GET(request: NextRequest) {
  try {
    // Check database health first
    const health = await checkDatabaseHealth();
    if (!health.healthy) {
      return NextResponse.json(
        { 
          error: "Database connection failed",
          message: health.message,
          details: health.error,
          users: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        },
        { status: 503 }
      );
    }
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const isAdmin = searchParams.get("isAdmin");
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { walletAddress: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
      ];
    }
    
    if (isAdmin !== null && isAdmin !== undefined) {
      where.isAdmin = isAdmin === "true";
    }
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { activities: true, userData: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);
    
    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, email, username, isAdmin } = body;
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }
    
    const user = await prisma.user.create({
      data: {
        walletAddress,
        email,
        username,
        isAdmin: isAdmin || false,
      },
    });
    
    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    console.error("Error creating user:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "User with this wallet address already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

