export type RequestEvent = {
  path: string;
  method: string;
  timestamp: number;
};

const events: RequestEvent[] = [];
const maxEvents = 10000;

export function recordRequest(path: string, method: string): void {
  const now = Date.now();
  events.push({ path, method, timestamp: now });
  if (events.length > maxEvents) {
    events.splice(0, events.length - maxEvents);
  }
}

export type RangeKey = "daily" | "weekly" | "monthly";

export type TimeBucket = {
  key: string;
  label: string;
  timestamp: number;
  count: number;
};

export function getViewBuckets(range: RangeKey): TimeBucket[] {
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const windowMs =
    range === "daily"
      ? 30 * msPerDay
      : range === "weekly"
      ? 12 * 7 * msPerDay
      : 12 * 30 * msPerDay;
  const from = now - windowMs;

  const filtered = events.filter((e) => e.timestamp >= from);

  const bucketMap = new Map<string, TimeBucket>();

  for (const e of filtered) {
    const d = new Date(e.timestamp);
    let key: string;
    let label: string;

    if (range === "daily") {
      key = d.toISOString().slice(0, 10);
      label = key;
    } else if (range === "weekly") {
      const firstDay = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const diff = d.getTime() - firstDay.getTime();
      const week = Math.floor(diff / (7 * msPerDay)) + 1;
      key = `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
      label = key;
    } else {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      key = `${year}-${month}`;
      label = key;
    }

    const existing = bucketMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      bucketMap.set(key, {
        key,
        label,
        timestamp: d.getTime(),
        count: 1,
      });
    }
  }

  const buckets = Array.from(bucketMap.values());
  buckets.sort((a, b) => a.timestamp - b.timestamp);
  return buckets;
}

