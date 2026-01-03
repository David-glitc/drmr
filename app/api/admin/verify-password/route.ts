import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/verify-password
 * Verify admin password against environment variable
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    // Get admin password from environment variable
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error("[Admin API] ADMIN_PASSWORD environment variable is not set");
      return NextResponse.json(
        { success: false, error: "Admin authentication is not configured" },
        { status: 500 }
      );
    }

    // Compare passwords (use constant-time comparison in production)
    const isValid = password === adminPassword;

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
    return NextResponse.json(
      { success: false, error: "Failed to verify password" },
      { status: 500 }
    );
  }
}
