import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db-health";

/**
 * Database Health Check Endpoint
 * GET /api/health - Check if database is accessible
 */
export async function GET() {
  const health = await checkDatabaseHealth();
  
  if (health.healthy) {
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      message: health.message,
    });
  }

  return NextResponse.json(
    {
      status: "unhealthy",
      database: "disconnected",
      error: health.error,
      message: health.message,
      // Check if DATABASE_URL is set
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlPreview: process.env.DATABASE_URL
        ? `${process.env.DATABASE_URL.split("@")[0]}@***` // Hide password
        : "Not set",
    },
    { status: 503 }
  );
}

