import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/token-logo/cache
 * Pre-cache token logos for faster loading
 * 
 * Body: { mints: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mints } = body;

    if (!Array.isArray(mints)) {
      return NextResponse.json(
        { error: "mints must be an array" },
        { status: 400 }
      );
    }

    // This endpoint is mainly for triggering cache warming
    // Actual caching happens client-side via IndexedDB
    return NextResponse.json({
      success: true,
      message: `Cache warming initiated for ${mints.length} tokens`,
      note: "Logos will be cached client-side when fetched",
    });
  } catch (error) {
    console.error("[TokenLogoCache API] Error:", error);
    return NextResponse.json(
      { error: "Failed to process cache request", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/token-logo/cache
 * Get cache statistics (client-side only, this is a placeholder)
 */
export async function GET() {
  return NextResponse.json({
    message: "Cache statistics are available client-side only",
    note: "Use tokenLogoCache.getSize() in the client to get cache size",
  });
}

