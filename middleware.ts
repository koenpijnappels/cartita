import { NextResponse, type NextRequest } from "next/server";

/**
 * Abuse protection for the public, unauthenticated write endpoints under
 * `/api/*` (events, suggestions, analytics/session). These persist to Neon,
 * which bills by usage, so an open POST surface is a cost/DoS amplifier.
 *
 * Two layers live here; a third (the durable one) is the Vercel Firewall
 * rate-limit rule configured in the dashboard — see README "Deploy".
 *
 *   1. Same-origin guard — reject cross-site browser POSTs.
 *   2. Best-effort per-IP burst guard — a backstop only; serverless instances
 *      are isolated so this caps per-instance bursts, not global volume.
 */

// Only guard mutating requests; GETs to API routes (if any) pass through.
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Burst guard: allow BURST requests, refilled at REFILL_PER_SEC tokens/sec.
const BURST = 20;
const REFILL_PER_SEC = 2;
const SWEEP_AFTER_MS = 5 * 60_000; // drop idle buckets after 5 min

type Bucket = { tokens: number; updated: number };
const buckets = new Map<string, Bucket>();

function clientIp(request: NextRequest): string {
  // Next 15 removed `request.ip`; Vercel sets x-forwarded-for (client first).
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Returns true if the request is within the per-IP rate budget. */
function withinRateLimit(ip: string, now: number): boolean {
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { tokens: BURST, updated: now };
    buckets.set(ip, bucket);
  } else {
    const elapsedSec = (now - bucket.updated) / 1000;
    bucket.tokens = Math.min(BURST, bucket.tokens + elapsedSec * REFILL_PER_SEC);
    bucket.updated = now;
  }

  // Opportunistic cleanup so the Map can't grow without bound.
  if (buckets.size > 10_000) {
    for (const [key, b] of buckets) {
      if (now - b.updated > SWEEP_AFTER_MS) buckets.delete(key);
    }
  }

  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

export function middleware(request: NextRequest) {
  if (!MUTATING.has(request.method)) return NextResponse.next();

  // 1. Same-origin guard. The app's fetch/sendBeacon calls always send an
  //    Origin matching the site host; foreign origins are cross-site abuse.
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (originHost !== request.nextUrl.host) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
  }

  // 2. Per-IP burst backstop.
  if (!withinRateLimit(clientIp(request), Date.now())) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
