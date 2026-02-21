import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, handleCorsOptions } from "@/lib/cors";
import { getOverview } from "@/lib/analytics";
import { checkRateLimit } from "@/lib/rateLimiter";

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rateKey = `analytics:overview:${ip}`;
  const rate = checkRateLimit(rateKey, { windowMs: 60_000, max: 60 });
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests",
        details: "Rate limit exceeded for /analytics/overview",
      },
      {
        status: 429,
        headers: {
          ...corsHeaders(origin),
          "Retry-After": rate.retryAfterMs
            ? String(Math.ceil(rate.retryAfterMs / 1000))
            : "60",
        },
      }
    );
  }

  try {
    const overview = await getOverview();

    return NextResponse.json(
      {
        success: true,
        overview,
      },
      { headers: corsHeaders(origin) }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to load analytics overview",
        details: error?.message || "Unknown error",
      },
      {
        status: 500,
        headers: corsHeaders(origin),
      }
    );
  }
}

