/**
 * Donation configuration & helpers (Ko-fi).
 *
 * Everything here is driven by `NEXT_PUBLIC_*` env vars so the feature can be
 * switched off or removed without touching component code. The whole flow is
 * intentionally optional and self-contained: if nothing is configured, every
 * helper degrades to "no donations" and the UI hides itself.
 *
 * SSR-safe: env vars are read directly (inlined at build time); `window` and
 * `localStorage` are only touched inside guarded, client-only functions.
 */

export type DonationOptionId = "coffee" | "wine" | "super_cocktail";

export type DonationOption = {
  id: DonationOptionId;
  /** Full button label, e.g. "☕ Café · €3". */
  label: string;
  amount: 3 | 5 | 10;
  url: string;
};

/** localStorage key holding the ms timestamp until which prompts are hidden. */
const COOLDOWN_KEY = "cartita_donation_clicked_until";
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

/** Trim and treat empty strings as "not configured". */
function clean(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

export function donationsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DONATIONS_ENABLED === "true";
}

/**
 * The configured donation options, in display order. Options whose Ko-fi URL
 * is missing are omitted (rather than rendered as broken links).
 */
export function getDonationOptions(): DonationOption[] {
  if (!donationsEnabled()) return [];

  // Referenced statically so Next.js can inline each NEXT_PUBLIC_ value.
  const defs: Array<Omit<DonationOption, "url"> & { url: string | null }> = [
    {
      id: "coffee",
      label: "☕ Café · €3",
      amount: 3,
      url: clean(process.env.NEXT_PUBLIC_KOFI_COFFEE_URL),
    },
    {
      id: "wine",
      label: "🍷 Vino · €5",
      amount: 5,
      url: clean(process.env.NEXT_PUBLIC_KOFI_WINE_URL),
    },
    {
      id: "super_cocktail",
      label: "🍸 Súper cóctel · €10",
      amount: 10,
      url: clean(process.env.NEXT_PUBLIC_KOFI_COCKTAIL_URL),
    },
  ];

  return defs.filter((d): d is DonationOption => d.url !== null);
}

/** The generic Ko-fi profile URL (footer link + single-button fallback). */
export function getKofiProfileUrl(): string | null {
  if (!donationsEnabled()) return null;
  return clean(process.env.NEXT_PUBLIC_KOFI_PROFILE_URL);
}

/** True while the 60-day post-click cooldown is active. */
export function shouldSuppressDonationPrompt(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

/**
 * Whether an automatic donation prompt may be shown right now: donations on,
 * not in cooldown, and at least one place to send the user.
 */
export function canShowDonationPrompt(): boolean {
  if (!donationsEnabled()) return false;
  if (shouldSuppressDonationPrompt()) return false;
  return getDonationOptions().length > 0 || getKofiProfileUrl() !== null;
}

/** Start the 60-day cooldown after the user clicks a donation option. */
export function setDonationClickedCooldown(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now() + SIXTY_DAYS_MS));
  } catch {
    // ignore storage errors
  }
}

/** Open a Ko-fi URL in a new tab. Client-only; no-op during SSR. */
export function openDonationUrl(url: string): void {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}
