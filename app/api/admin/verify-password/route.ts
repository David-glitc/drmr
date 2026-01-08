import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/verify-password
 * Verify admin password against environment variable
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    console.log("[Admin API] Password verification request received");

    if (!password) {
      console.log("[Admin API] No password provided");
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    // Get admin password from environment variable
    const adminPassword = process.env.ADMIN_PASSWORD;

    console.log("[Admin API] ADMIN_PASSWORD is set:", !!adminPassword);

    if (!adminPassword) {
      console.error("[Admin API] ADMIN_PASSWORD environment variable is not set");
      return NextResponse.json(
        { success: false, error: "Admin authentication is not configured. Please set ADMIN_PASSWORD in your .env.local file." },
        { status: 500 }
      );
    }

    // Compare passwords (use constant-time comparison in production)
    const isValid = password === adminPassword;

    console.log("[Admin API] Password match:", isValid);

    if (isValid) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid password" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("[Admin API] Error verifying password:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to verify password";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
