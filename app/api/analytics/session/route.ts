import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const runtime = "nodejs";

// Low-cardinality whitelists; anything else is coerced to null so the table
// only ever holds known values.
const LEVELS = new Set(["principiante", "intermedio", "avanzado"]);
const MODES = new Set([
  "mezcla",
  "rompehielos",
  "amigos",
  "conocerse",
  "cita",
  "mas-profundo",
  "debate",
  "practica",
]);

type EventType = "cards_viewed_update" | "feedback_prompt_shown";

function cleanEnum(value: unknown, allowed: Set<string>): string | null {
  return typeof value === "string" && allowed.has(value) ? value : null;
}

function cleanId(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 64) : "";
}

function cleanCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  // Clamp to a sane range — never trust the client.
  return Math.min(Math.max(Math.trunc(value), 0), 1_000_000);
}

/**
 * Aggregate session metrics. Upserts one row per "visitorId:sessionId".
 * Never breaks the UX: invalid input → 400, DB/config problems → safe 200.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const visitorId = cleanId(body.visitorId);
  const sessionId = cleanId(body.sessionId);
  const type = body.type as EventType;

  if (
    !visitorId ||
    !sessionId ||
    (type !== "cards_viewed_update" && type !== "feedback_prompt_shown")
  ) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const cardsViewed = cleanCount(body.cardsViewed);
  const level = cleanEnum(body.level, LEVELS);
  const mode = cleanEnum(body.mode, MODES);
  const id = `${visitorId}:${sessionId}`;

  try {
    const sql = getSql();
    // Not configured (e.g. local dev / preview without a DB): safe no-op.
    if (!sql) return NextResponse.json({ ok: true, skipped: true });

    if (type === "cards_viewed_update") {
      await sql`
        insert into analytics_sessions
          (id, visitor_id, session_id, cards_viewed, last_level, last_mode)
        values
          (${id}, ${visitorId}, ${sessionId}, ${cardsViewed}, ${level}, ${mode})
        on conflict (id) do update set
          cards_viewed = greatest(analytics_sessions.cards_viewed, excluded.cards_viewed),
          last_seen_at = now(),
          last_level   = coalesce(excluded.last_level, analytics_sessions.last_level),
          last_mode    = coalesce(excluded.last_mode, analytics_sessions.last_mode)
      `;
    } else {
      await sql`
        insert into analytics_sessions
          (id, visitor_id, session_id, cards_viewed, last_level, last_mode,
           feedback_prompt_shown, feedback_prompt_shown_at, feedback_prompt_card_count)
        values
          (${id}, ${visitorId}, ${sessionId}, ${cardsViewed}, ${level}, ${mode},
           true, now(), ${cardsViewed})
        on conflict (id) do update set
          feedback_prompt_shown      = true,
          feedback_prompt_shown_at   = coalesce(analytics_sessions.feedback_prompt_shown_at, now()),
          feedback_prompt_card_count = excluded.feedback_prompt_card_count,
          cards_viewed = greatest(analytics_sessions.cards_viewed, excluded.cards_viewed),
          last_seen_at = now(),
          last_level   = coalesce(excluded.last_level, analytics_sessions.last_level),
          last_mode    = coalesce(excluded.last_mode, analytics_sessions.last_mode)
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Log server-side for debugging, but keep the client happy.
    console.warn(
      "[analytics/session] write failed:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ ok: false, error: "write_failed" });
  }
}
