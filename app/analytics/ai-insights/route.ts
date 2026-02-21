import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, handleCorsOptions } from "@/lib/cors";
import { getAiInsights } from "@/lib/analytics";
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

  const rateKey = `analytics:ai-insights:${ip}`;
  const rate = checkRateLimit(rateKey, { windowMs: 60_000, max: 30 });
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests",
        details: "Rate limit exceeded for /analytics/ai-insights",
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
    const insights = await getAiInsights();
    return NextResponse.json(
      {
        success: true,
        insights,
      },
      { headers: corsHeaders(origin) }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to load AI insights",
        details: error?.message || "Unknown error",
      },
      {
        status: 500,
        headers: corsHeaders(origin),
      }
    );
  }
}

