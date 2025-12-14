import { NextRequest, NextResponse } from "next/server";
import { UserTrackingService } from "@/lib/services/user-tracking-service";

// POST /api/sync-user - Sync user data when wallet connects
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, action = "wallet_connected" } = body;
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }
    
    // Get client IP and user agent
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    
    // Track the activity
    await UserTrackingService.trackActivity(
      walletAddress,
      action,
      { timestamp: new Date().toISOString() },
      ipAddress,
      userAgent
    );
    
    // Get or create user
    const user = await UserTrackingService.getOrCreateUser(walletAddress);
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      { error: "Failed to sync user" },
      { status: 500 }
    );
  }
}

