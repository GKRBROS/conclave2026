import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCachedValue, setCachedValue } from "@/lib/analyticsCache";
import { RangeKey, getViewBuckets } from "@/lib/analyticsEvents";

export type AnalyticsRange = RangeKey;

export type SeriesPoint = {
  key: string;
  label: string;
  value: number;
};

export type TimeSeriesMetrics = {
  series: SeriesPoint[];
  total: number;
  movingAverage: number | null;
  latestValue: number;
  growthPercentage: number | null;
  isSpike: boolean;
};

export type OverviewMetrics = {
  totalImages: number;
  totalImagesLast7Days: number;
  totalSessions: number;
  lastImageAt: string | null;
};

export type AiInsights = {
  topCategories: { category: string; count: number }[];
  topPromptTypes: { promptType: string; count: number }[];
  imageSeries: TimeSeriesMetrics;
};

function parseRange(raw: string | null): AnalyticsRange {
  if (raw === "daily" || raw === "weekly" || raw === "monthly") {
    return raw;
  }
  return "daily";
}

function createBucketKey(date: Date, range: AnalyticsRange): string {
  if (range === "daily") {
    return date.toISOString().slice(0, 10);
  }

  if (range === "weekly") {
    const msPerDay = 24 * 60 * 60 * 1000;
    const firstDay = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const diff = date.getTime() - firstDay.getTime();
    const week = Math.floor(diff / (7 * msPerDay)) + 1;
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function computeTimeSeriesMetrics(series: SeriesPoint[]): TimeSeriesMetrics {
  const sorted = [...series].sort((a, b) => a.key.localeCompare(b.key));
  const total = sorted.reduce((sum, p) => sum + p.value, 0);
  const latestValue = sorted.length > 0 ? sorted[sorted.length - 1].value : 0;

  if (sorted.length === 0) {
    return {
      series: [],
      total: 0,
      movingAverage: null,
      latestValue: 0,
      growthPercentage: null,
      isSpike: false,
    };
  }

  const windowSize = Math.min(7, sorted.length);
  const lastSlice = sorted.slice(-windowSize);
  const sumSlice = lastSlice.reduce((sum, p) => sum + p.value, 0);
  const movingAverage = sumSlice / windowSize;

  const prevIndex = sorted.length - windowSize - 1;
  const previousValue =
    prevIndex >= 0 ? sorted[prevIndex].value : sorted[0].value;

  const growthPercentage =
    previousValue > 0
      ? ((latestValue - previousValue) / previousValue) * 100
      : null;

  const isSpike =
    movingAverage > 0 && latestValue > movingAverage * 1.5 ? true : false;

  return {
    series: sorted,
    total,
    movingAverage,
    latestValue,
    growthPercentage,
    isSpike,
  };
}

export function getAnalyticsRangeFromSearchParams(
  searchParams: URLSearchParams
): AnalyticsRange {
  const raw = searchParams.get("range");
  return parseRange(raw);
}

export async function getImageTimeSeries(
  range: AnalyticsRange
): Promise<TimeSeriesMetrics> {
  const cacheKey = `images:${range}`;
  const cached = getCachedValue<TimeSeriesMetrics>(cacheKey);
  if (cached) {
    return cached;
  }

  const now = new Date();
  const daysBack =
    range === "daily" ? 30 : range === "weekly" ? 7 * 12 : 30 * 12;
  const from = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const { data, error } = await supabaseAdmin
    .from("generations")
    .select("id, created_at")
    .gte("created_at", from.toISOString());

  if (error) {
    throw error;
  }

  const bucketMap = new Map<string, SeriesPoint>();

  for (const row of data || []) {
    const createdAt = row.created_at as string | null;
    if (!createdAt) continue;
    const d = new Date(createdAt);
    const key = createBucketKey(d, range);
    const existing = bucketMap.get(key);
    if (existing) {
      existing.value += 1;
    } else {
      bucketMap.set(key, {
        key,
        label: key,
        value: 1,
      });
    }
  }

  const series = Array.from(bucketMap.values());
  const metrics = computeTimeSeriesMetrics(series);
  setCachedValue(cacheKey, metrics, 60_000);
  return metrics;
}

export async function getUserTimeSeries(
  range: AnalyticsRange
): Promise<TimeSeriesMetrics> {
  const cacheKey = `users:${range}`;
  const cached = getCachedValue<TimeSeriesMetrics>(cacheKey);
  if (cached) {
    return cached;
  }

  const now = new Date();
  const daysBack =
    range === "daily" ? 30 : range === "weekly" ? 7 * 12 : 30 * 12;
  const from = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const { data, error } = await supabaseAdmin
    .from("generations")
    .select("phone_no, created_at")
    .gte("created_at", from.toISOString());

  if (error) {
    throw error;
  }

  const firstSeen = new Map<string, Date>();

  for (const row of data || []) {
    const phone = (row.phone_no as string | null) || "";
    const createdAt = row.created_at as string | null;
    if (!phone || !createdAt) continue;
    const d = new Date(createdAt);
    const existing = firstSeen.get(phone);
    if (!existing || d < existing) {
      firstSeen.set(phone, d);
    }
  }

  const bucketMap = new Map<string, SeriesPoint>();

  for (const [, date] of firstSeen) {
    const key = createBucketKey(date, range);
    const existing = bucketMap.get(key);
    if (existing) {
      existing.value += 1;
    } else {
      bucketMap.set(key, {
        key,
        label: key,
        value: 1,
      });
    }
  }

  const series = Array.from(bucketMap.values());
  const metrics = computeTimeSeriesMetrics(series);
  setCachedValue(cacheKey, metrics, 60_000);
  return metrics;
}

export async function getViewTimeSeries(
  range: AnalyticsRange
): Promise<TimeSeriesMetrics> {
  const cacheKey = `views:${range}`;
  const cached = getCachedValue<TimeSeriesMetrics>(cacheKey);
  if (cached) {
    return cached;
  }

  const buckets = getViewBuckets(range);
  const series: SeriesPoint[] = buckets.map((b) => ({
    key: b.key,
    label: b.label,
    value: b.count,
  }));

  const metrics = computeTimeSeriesMetrics(series);
  setCachedValue(cacheKey, metrics, 30_000);
  return metrics;
}

export async function getOverview(): Promise<OverviewMetrics> {
  const cacheKey = "overview";
  const cached = getCachedValue<OverviewMetrics>(cacheKey);
  if (cached) {
    return cached;
  }

  const totalPromise = supabaseAdmin
    .from("generations")
    .select("id", { count: "exact", head: true });

  const recentPromise = supabaseAdmin
    .from("generations")
    .select("id", { count: "exact", head: true })
    .gte(
      "created_at",
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    );

  const lastImagePromise = supabaseAdmin
    .from("generations")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1);

  const [totalRes, recentRes, lastImageRes] = await Promise.all([
    totalPromise,
    recentPromise,
    lastImagePromise,
  ]);

  if (totalRes.error) throw totalRes.error;
  if (recentRes.error) throw recentRes.error;
  if (lastImageRes.error) throw lastImageRes.error;

  const totalImages = totalRes.count ?? 0;
  const totalImagesLast7Days = recentRes.count ?? 0;
  const lastImageAtRow = (lastImageRes.data || [])[0] as
    | { created_at: string }
    | undefined;
  const lastImageAt = lastImageAtRow ? lastImageAtRow.created_at : null;

  const totalSessions = totalImages;

  const overview: OverviewMetrics = {
    totalImages,
    totalImagesLast7Days,
    totalSessions,
    lastImageAt,
  };

  setCachedValue(cacheKey, overview, 60_000);
  return overview;
}

export async function getAiInsights(): Promise<AiInsights> {
  const cacheKey = "ai-insights";
  const cached = getCachedValue<AiInsights>(cacheKey);
  if (cached) {
    return cached;
  }

  const now = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabaseAdmin
    .from("generations")
    .select("category, prompt_type, created_at")
    .gte("created_at", from.toISOString());

  if (error) {
    throw error;
  }

  const categoryMap = new Map<string, number>();
  const promptMap = new Map<string, number>();

  for (const row of data || []) {
    const category = (row.category as string | null) || "Unknown";
    const promptType = (row.prompt_type as string | null) || "unknown";

    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    promptMap.set(promptType, (promptMap.get(promptType) || 0) + 1);
  }

  const topCategories = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topPromptTypes = Array.from(promptMap.entries())
    .map(([promptType, count]) => ({ promptType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const imageSeries = await getImageTimeSeries("daily");

  const insights: AiInsights = {
    topCategories,
    topPromptTypes,
    imageSeries,
  };

  setCachedValue(cacheKey, insights, 120_000);
  return insights;
}

