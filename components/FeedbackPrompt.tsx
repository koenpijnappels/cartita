"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { submitSuggestion, type FeedbackResponse } from "@/lib/analytics";
import { canShowDonationPrompt } from "@/lib/donations";
import DonationPrompt from "./DonationPrompt";
import type { Difficulty, Mode } from "@/lib/types";

type Props = {
  /** Called once for the user's answer (or "dismissed" via the × button). */
  onResponse: (response: FeedbackResponse) => void;
  /** Called when the prompt should be removed from the screen. */
  onClose: () => void;
  /** Called when the user taps "Compartir Cartita" (for analytics). */
  onShareClicked: () => void;
  /** Current level/mode, stored alongside a submitted idea for context. */
  level: Difficulty | null;
  mode: Mode | null;
};

type View =
  | "ask"
  | "donation"
  | "thanks-yes"
  | "thanks-okay"
  | "idea-form"
  | "idea-sent";

/**
 * Small, calm feedback prompt shown once per session after 20 cards.
 * It is an inline card (rendered above the controls), never a full-screen
 * modal, and it never blocks reading or swiping the current card.
 */
export default function FeedbackPrompt({
  onResponse,
  onClose,
  onShareClicked,
  level,
  mode,
}: Props) {
  const [view, setView] = useState<View>("ask");
  const [responded, setResponded] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [idea, setIdea] = useState("");
  const [sending, setSending] = useState(false);

  function answer(response: Exclude<FeedbackResponse, "dismissed">, next: View) {
    if (!responded) {
      setResponded(true);
      onResponse(response);
    }
    setView(next);
  }

  function handleYes() {
    // Positive feedback is the only trigger for the donation prompt. If
    // donations are off / in cooldown / unconfigured, fall back to the thanks.
    answer("yes", canShowDonationPrompt() ? "donation" : "thanks-yes");
  }

  function handleOkay() {
    answer("okay", "thanks-okay");
  }

  function handleIdea() {
    answer("idea", "idea-form");
  }

  async function handleSendIdea() {
    const message = idea.trim();
    if (!message || sending) return;
    setSending(true);
    // Optimistic: thank the user regardless of network outcome.
    await submitSuggestion(message, level, mode);
    setSending(false);
    setView("idea-sent");
  }

  function handleClose() {
    // The × counts as a "dismissed" response only if nothing else was chosen.
    if (!responded) {
      setResponded(true);
      onResponse("dismissed");
    }
    onClose();
  }

  async function handleShare() {
    onShareClicked();
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Cartita", url });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareNote("Enlace copiado.");
        return;
      }
      setShareNote("Comparte Cartita con quien quieras hablar.");
    } catch {
      // User cancelled the share sheet, or it's unavailable — stay calm.
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      role="region"
      aria-label="Comentarios sobre Cartita"
      className="relative mb-3 rounded-2xl border border-line bg-paper/95 px-4 py-3 shadow-soft backdrop-blur"
    >
      <button
        type="button"
        onClick={handleClose}
        aria-label="Cerrar"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-sand active:scale-95"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <AnimatePresence mode="wait" initial={false}>
        {view === "ask" && (
          <motion.div
            key="ask"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="pr-7 font-serif text-base font-semibold text-ink">
              ¿Te gusta Cartita?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleYes}
                className="rounded-full bg-terracotta px-4 py-2 text-sm font-semibold text-paper transition-all active:scale-95"
              >
                Sí
              </button>
              <button
                type="button"
                onClick={handleOkay}
                className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-sand active:scale-95"
              >
                Más o menos
              </button>
              <button
                type="button"
                onClick={handleIdea}
                className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-sand active:scale-95"
              >
                Tengo una idea
              </button>
            </div>
          </motion.div>
        )}

        {view === "donation" && (
          <motion.div
            key="donation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <DonationPrompt
              source="positive_feedback"
              onDismiss={() => setView("thanks-yes")}
            />
          </motion.div>
        )}

        {view === "thanks-yes" && (
          <motion.div
            key="thanks-yes"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="pr-7 font-serif text-base font-semibold text-ink">
              ¡Gracias! Nos alegra mucho.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleShare}
                className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-sand active:scale-95"
              >
                Compartir Cartita
              </button>
              {shareNote && (
                <span className="text-sm text-muted">{shareNote}</span>
              )}
            </div>
          </motion.div>
        )}

        {view === "thanks-okay" && (
          <motion.p
            key="thanks-okay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pr-7 font-serif text-base font-semibold text-ink"
          >
            Gracias. Seguiremos mejorando.
          </motion.p>
        )}

        {view === "idea-form" && (
          <motion.div
            key="idea-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <label
              htmlFor="cartita-idea"
              className="block pr-7 font-serif text-base font-semibold text-ink"
            >
              ¿Qué te gustaría ver en Cartita?
            </label>
            <textarea
              id="cartita-idea"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              maxLength={2000}
              rows={3}
              autoFocus
              placeholder="Tu idea o sugerencia…"
              className="mt-3 w-full resize-none rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-terracotta"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSendIdea}
                disabled={!idea.trim() || sending}
                className="rounded-full bg-terracotta px-4 py-2 text-sm font-semibold text-paper transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </motion.div>
        )}

        {view === "idea-sent" && (
          <motion.p
            key="idea-sent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pr-7 font-serif text-base font-semibold text-ink"
          >
            ¡Gracias por tu idea!
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
