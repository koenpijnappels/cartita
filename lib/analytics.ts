/**
 * Centralized, privacy-conscious analytics wrapper for Cartita.
 *
 * The rest of the app calls the small `track*` helpers below instead of
 * importing the analytics provider directly. This keeps event names
 * consistent in one place and makes it trivial to swap providers later.
 *
 * Design notes:
 * - Built on Vercel Analytics custom events (`track`). The `<Analytics />`
 *   component lives in the root layout; `track` queues events safely even
 *   before that script loads, and is a no-op during SSR and when analytics
 *   is not configured (e.g. previews, local dev without a Vercel project).
 * - Every call is wrapped so analytics can never throw into the UI.
 * - We deliberately only send IDs, mode, level, intensity and event types —
 *   never the Spanish question text or the English translation.
 */

import { track } from "@vercel/analytics";
import { getSessionId } from "./session";
import type { DonationOptionId } from "./donations";
import type { ConversationCard, Difficulty, Mode } from "./types";

/** Method by which the user advanced to the next card. */
export type NextMethod = "button" | "swipe";

/** Possible answers to the after-20-cards feedback prompt. */
export type FeedbackResponse = "yes" | "okay" | "idea" | "dismissed";

/** Where a donation interaction originated. */
export type DonationSource = "positive_feedback" | "footer";

/** Stable event names. Kept as a union so typos surface at compile time. */
export type AnalyticsEvent =
  | "app_opened"
  | "difficulty_selected"
  | "mode_selected"
  | "session_started"
  | "card_viewed"
  | "next_card"
  | "previous_card"
  | "translation_revealed"
  | "change_mode_clicked"
  | "change_level_clicked"
  | "feedback_prompt_shown"
  | "feedback_response"
  | "share_clicked"
  | "donation_prompt_shown"
  | "donation_prompt_dismissed"
  | "donation_option_clicked"
  | "donation_footer_clicked";

/** Vercel allows flat primitive property values only. */
type EventProperties = Record<string, string | number | boolean | null>;

/**
 * Low-level event dispatch. Never throws; safe to call anywhere, including
 * during server rendering (where it simply does nothing).
 */
export function trackEvent(
  name: AnalyticsEvent,
  properties?: EventProperties
): void {
  try {
    if (properties) track(name, properties);
    else track(name);
  } catch {
    // Analytics must never break the product experience.
  }
}

// ── First-party persistence (Neon via our own API) ──────────────────────────

/**
 * Fire-and-forget POST to one of our `/api/*` routes. Uses `sendBeacon` so the
 * request survives navigation/unload, falling back to a keepalive `fetch`.
 * Never throws; a no-op during SSR or when the browser lacks both.
 */
function beacon(path: string, payload: Record<string, unknown>): void {
  try {
    if (typeof window === "undefined") return;
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(path, new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Persistence must never break the product experience.
  }
}

/** Persist a usage event to our backend, tagged with the current session id. */
function persistEvent(
  type: "session_started" | "card_viewed" | "feedback_response",
  payload: Record<string, unknown> = {}
): void {
  const sessionId = getSessionId();
  if (!sessionId) return;
  beacon("/api/events", { session_id: sessionId, type, ...payload });
}

/** Persist a free-text suggestion. Returns whether the server accepted it. */
export async function submitSuggestion(
  message: string,
  level?: Difficulty | null,
  mode?: Mode | null
): Promise<boolean> {
  try {
    const res = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: getSessionId(),
        message,
        level: level ?? null,
        mode: mode ?? null,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── App / session ──────────────────────────────────────────────────────────

export function trackAppOpened(): void {
  trackEvent("app_opened");
}

export function trackDifficultySelected(level: Difficulty): void {
  trackEvent("difficulty_selected", { level });
}

export function trackModeSelected(mode: Mode): void {
  trackEvent("mode_selected", { mode });
}

export function trackSessionStarted(level: Difficulty, mode: Mode): void {
  trackEvent("session_started", { level, mode });
  persistEvent("session_started", { level, mode });
}

// ── Cards ────────────────────────────────────────────────────────────────--

export function trackCardViewed(card: ConversationCard): void {
  // Only identifiers and metadata — no question or translation text.
  const props: EventProperties = {
    cardId: card.id,
    level: card.level,
    mode: card.mode,
  };
  if (card.intensity !== undefined) props.intensity = card.intensity;
  trackEvent("card_viewed", props);
  persistEvent("card_viewed", {
    card_id: card.id,
    level: card.level,
    mode: card.mode,
    intensity: card.intensity ?? null,
  });
}

export function trackNextCard(
  method: NextMethod,
  level: Difficulty,
  mode: Mode
): void {
  trackEvent("next_card", { method, level, mode });
}

export function trackPreviousCard(level: Difficulty, mode: Mode): void {
  trackEvent("previous_card", { level, mode });
}

export function trackTranslationRevealed(card: ConversationCard): void {
  trackEvent("translation_revealed", {
    cardId: card.id,
    level: card.level,
    mode: card.mode,
  });
}

// ── Navigation changes ──────────────────────────────────────────────────--

export function trackChangeModeClicked(): void {
  trackEvent("change_mode_clicked");
}

export function trackChangeLevelClicked(): void {
  trackEvent("change_level_clicked");
}

// ── Feedback ─────────────────────────────────────────────────────────────--

export function trackFeedbackPromptShown(): void {
  trackEvent("feedback_prompt_shown");
}

export function trackFeedbackResponse(response: FeedbackResponse): void {
  trackEvent("feedback_response", { response });
  persistEvent("feedback_response", { response });
}

export function trackShareClicked(source: string): void {
  trackEvent("share_clicked", { source });
}

// ── Donations ────────────────────────────────────────────────────────────--

export function trackDonationPromptShown(source: DonationSource): void {
  trackEvent("donation_prompt_shown", { source });
}

export function trackDonationPromptDismissed(source: DonationSource): void {
  trackEvent("donation_prompt_dismissed", { source });
}

export function trackDonationOptionClicked(
  option: DonationOptionId,
  amount: 3 | 5 | 10,
  source: DonationSource
): void {
  trackEvent("donation_option_clicked", { option, amount, source });
}

export function trackDonationFooterClicked(): void {
  trackEvent("donation_footer_clicked", { source: "start_footer" });
}
