"use client";

import type { ReactNode } from "react";
import {
  modeLabel,
  levelLabel,
  type ConversationCard as Card,
  type Difficulty,
  type Mode,
  type Theme,
} from "@/lib/types";
import type { NextMethod } from "@/lib/analytics";
import ConversationCard from "./ConversationCard";
import ThemeToggle from "./ThemeToggle";

type Props = {
  card: Card | null;
  mode: Mode;
  level: Difficulty;
  /** Position of the current card within this flow (1-based). */
  cardNumber: number;
  theme: Theme;
  showTranslation: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onNext: (method: NextMethod) => void;
  onToggleTranslation: () => void;
  onToggleTheme: () => void;
  onHome: () => void;
  onRestart: () => void;
  /** Optional inline slot rendered above the controls (feedback prompt). */
  feedback?: ReactNode;
};

export default function CardScreen({
  card,
  mode,
  level,
  cardNumber,
  theme,
  showTranslation,
  canGoBack,
  onBack,
  onNext,
  onToggleTranslation,
  onToggleTheme,
  onHome,
  onRestart,
  feedback,
}: Props) {
  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-5">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-2 pt-2">
        <button
          type="button"
          onClick={onHome}
          aria-label="Inicio"
          className="flex h-10 items-center gap-2 rounded-full border border-line bg-paper/70 pl-2 pr-3 text-ink/80 transition-colors hover:bg-paper active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 11l9-8 9 8M5 10v10h14V10" />
          </svg>
          <span className="font-serif text-base font-semibold">Cartita</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-sm font-semibold text-ink">
              {modeLabel(mode)}
            </span>
            <span className="text-xs text-muted">
              {levelLabel(level)}
              {card ? ` · Carta ${cardNumber}` : ""}
            </span>
          </div>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </header>

      {/* Card area */}
      <main className="flex flex-1 flex-col justify-center py-5">
        {card ? (
          <ConversationCard
            key={card.id}
            card={card}
            showTranslation={showTranslation}
            onToggleTranslation={onToggleTranslation}
            onSwipeNext={() => onNext("swipe")}
          />
        ) : (
          <div className="flex min-h-[58dvh] flex-col items-center justify-center rounded-[2rem] border border-dashed border-line bg-paper/60 px-6 py-10 text-center animate-fade-up">
            <span className="text-3xl" aria-hidden="true">
              🌿
            </span>
            <p className="mt-4 text-balance font-serif text-xl font-semibold text-ink">
              Has visto todas las preguntas de este modo y nivel.
            </p>
            <p className="mt-2 text-sm text-muted">
              Puedes empezar de nuevo o cambiar de modo.
            </p>
            <button
              type="button"
              onClick={onRestart}
              className="mt-6 rounded-2xl bg-terracotta px-6 py-3 font-serif text-base font-semibold text-paper shadow-card transition-all active:scale-[0.99]"
            >
              Empezar de nuevo
            </button>
            <button
              type="button"
              onClick={onHome}
              className="mt-3 text-sm font-medium text-muted underline-offset-4 hover:underline"
            >
              Cambiar modo
            </button>
          </div>
        )}
      </main>

      {/* Feedback prompt (inline, above the controls — never blocks the card) */}
      {feedback}

      {/* Controls */}
      <nav className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack}
          className={[
            "flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border text-base font-semibold transition-all active:scale-[0.98]",
            canGoBack
              ? "border-line bg-paper text-ink hover:bg-paper/70"
              : "cursor-not-allowed border-line/60 bg-paper/40 text-muted/50",
          ].join(" ")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Atrás
        </button>

        <button
          type="button"
          onClick={() => onNext("button")}
          disabled={!card}
          className={[
            "flex h-14 flex-[1.6] items-center justify-center gap-2 rounded-2xl text-base font-semibold shadow-card transition-all active:scale-[0.98]",
            card
              ? "bg-terracotta text-paper"
              : "cursor-not-allowed bg-line/60 text-muted",
          ].join(" ")}
        >
          Otra carta
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </nav>
    </div>
  );
}
