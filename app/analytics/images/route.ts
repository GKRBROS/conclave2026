import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, handleCorsOptions } from "@/lib/cors";
import {
  AnalyticsRange,
  getAnalyticsRangeFromSearchParams,
  getImageTimeSeries,
} from "@/lib/analytics";
import { checkRateLimit } from "@/lib/rateLimiter";

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin") || undefined;
  const searchParams = request.nextUrl.searchParams;
  const range: AnalyticsRange = getAnalyticsRangeFromSearchParams(
    searchParams
  );

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rateKey = `analytics:images:${ip}`;
  const rate = checkRateLimit(rateKey, { windowMs: 60_000, max: 60 });
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests",
        details: "Rate limit exceeded for /analytics/images",
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
    const metrics = await getImageTimeSeries(range);
    return NextResponse.json(
      {
        success: true,
        range,
        metrics,
      },
      { headers: corsHeaders(origin) }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to load image analytics",
        details: error?.message || "Unknown error",
      },
      {
        status: 500,
        headers: corsHeaders(origin),
      }
    );
  }
}

