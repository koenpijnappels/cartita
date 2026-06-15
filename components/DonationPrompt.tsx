"use client";

import { useEffect, useState } from "react";
import {
  trackDonationOptionClicked,
  trackDonationPromptDismissed,
  trackDonationPromptShown,
  type DonationSource,
} from "@/lib/analytics";
import {
  getDonationOptions,
  getKofiProfileUrl,
  openDonationUrl,
  setDonationClickedCooldown,
  type DonationOption,
} from "@/lib/donations";

type Props = {
  /** Where this prompt was triggered from (for analytics). */
  source: DonationSource;
  /** Called when the user taps "Ahora no". */
  onDismiss: () => void;
};

/**
 * A small, calm, optional support prompt shown only after positive feedback.
 * Lists the configured Ko-fi drink options (or a single generic button), and
 * gently thanks the user after a click. Never a full-screen modal.
 */
export default function DonationPrompt({ source, onDismiss }: Props) {
  const [thanked, setThanked] = useState(false);

  const options = getDonationOptions();
  const profileUrl = getKofiProfileUrl();
  // Fallback: no per-amount URLs, but a generic profile URL exists.
  const showGenericOnly = options.length === 0 && profileUrl !== null;

  // Fire once when the prompt is actually shown.
  useEffect(() => {
    trackDonationPromptShown(source);
  }, [source]);

  function handleOption(option: DonationOption) {
    openDonationUrl(option.url);
    setDonationClickedCooldown();
    trackDonationOptionClicked(option.id, option.amount, source);
    setThanked(true);
  }

  function handleGeneric() {
    if (!profileUrl) return;
    openDonationUrl(profileUrl);
    setDonationClickedCooldown();
    // No specific option/amount for the generic button — only set the cooldown.
    setThanked(true);
  }

  function handleDismiss() {
    trackDonationPromptDismissed(source);
    onDismiss();
  }

  if (thanked) {
    return (
      <p className="pr-7 font-serif text-base font-semibold text-ink">
        ¡Gracias por apoyar Cartita!
      </p>
    );
  }

  return (
    <div>
      <p className="pr-7 font-serif text-base font-semibold text-ink">
        ¡Qué bien!
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Cartita es gratis y seguirá siendo sencilla. Si te ha regalado una buena
        conversación, puedes apoyar el proyecto.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {showGenericOnly ? (
          <button
            type="button"
            onClick={handleGeneric}
            className="rounded-full bg-terracotta px-4 py-2 text-sm font-semibold text-paper transition-all active:scale-95"
          >
            Apoyar en Ko-fi
          </button>
        ) : (
          options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleOption(option)}
              className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-sand active:scale-95"
            >
              {option.label}
            </button>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="mt-3 text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
      >
        Ahora no
      </button>
    </div>
  );
}
