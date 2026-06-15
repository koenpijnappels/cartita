/**
 * Tiny client for the first-party product-metrics endpoint
 * (`/api/analytics/session`). It tracks two things only — cards viewed per
 * session and whether the feedback prompt was shown — using anonymous,
 * non-fingerprint IDs.
 *
 * Writes are throttled (see `shouldSendCardsViewedUpdate`) so we don't hit the
 * database once per card. Everything is best-effort: SSR-safe, never throws,
 * and never blocks the UI.
 */

import type { Difficulty, Mode } from "./types";

const LS_VISITOR_ID = "cartita_visitor_id";
const SS_SESSION_ID = "cartita_session_id";
const ENDPOINT = "/api/analytics/session";

/** Card counts at which we flush an update to the server. */
const MILESTONES = new Set([1, 5, 10, 20, 30]);

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Stable anonymous visitor id (localStorage) — recognises a returning device. */
export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(LS_VISITOR_ID);
    if (!id) {
      id = uuid();
      localStorage.setItem(LS_VISITOR_ID, id);
    }
    return id;
  } catch {
    return "";
  }
}

/** Per-tab anonymous session id (sessionStorage). */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(SS_SESSION_ID);
    if (!id) {
      id = uuid();
      sessionStorage.setItem(SS_SESSION_ID, id);
    }
    return id;
  } catch {
    return "";
  }
}

/**
 * Whether a `cards_viewed_update` should be sent at this count: at 1, 5, 10,
 * 20, 30, then every 10 thereafter. Keeps DB writes to a handful per session.
 */
export function shouldSendCardsViewedUpdate(cardsViewed: number): boolean {
  if (cardsViewed <= 0) return false;
  if (MILESTONES.has(cardsViewed)) return true;
  return cardsViewed > 30 && cardsViewed % 10 === 0;
}

type LogParams = {
  cardsViewed: number;
  level?: Difficulty | null;
  mode?: Mode | null;
};

type Payload = {
  type: "cards_viewed_update" | "feedback_prompt_shown";
  cardsViewed: number;
  level: Difficulty | null;
  mode: Mode | null;
};

/** Fire-and-forget POST. `useBeacon` survives unload; otherwise a keepalive fetch. */
function send(payload: Payload, useBeacon = false): void {
  try {
    if (typeof window === "undefined") return;
    const visitorId = getOrCreateVisitorId();
    const sessionId = getOrCreateSessionId();
    if (!visitorId || !sessionId) return;

    const body = JSON.stringify({ visitorId, sessionId, ...payload });

    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    }

    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Analytics must never break the product experience.
  }
}

export function logCardsViewedUpdate(params: LogParams): void {
  send({
    type: "cards_viewed_update",
    cardsViewed: params.cardsViewed,
    level: params.level ?? null,
    mode: params.mode ?? null,
  });
}

export function logFeedbackPromptShown(params: LogParams): void {
  send({
    type: "feedback_prompt_shown",
    cardsViewed: params.cardsViewed,
    level: params.level ?? null,
    mode: params.mode ?? null,
  });
}
