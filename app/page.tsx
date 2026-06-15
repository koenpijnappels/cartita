"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import StartScreen from "@/components/StartScreen";
import CardScreen from "@/components/CardScreen";
import FeedbackPrompt from "@/components/FeedbackPrompt";
import { QUESTIONS } from "@/lib/questions";
import { pickNextCard } from "@/lib/cardEngine";
import { haptic } from "@/lib/haptics";
import {
  applyTheme,
  resolveInitialTheme,
  storeTheme,
  getStoredTheme,
} from "@/lib/theme";
import {
  trackAppOpened,
  trackDifficultySelected,
  trackModeSelected,
  trackSessionStarted,
  trackCardViewed,
  trackNextCard,
  trackPreviousCard,
  trackTranslationRevealed,
  trackChangeModeClicked,
  trackFeedbackPromptShown,
  trackFeedbackResponse,
  trackShareClicked,
  type FeedbackResponse,
  type NextMethod,
} from "@/lib/analytics";
import {
  logCardsViewedUpdate,
  logFeedbackPromptShown,
  shouldSendCardsViewedUpdate,
} from "@/lib/serverAnalyticsClient";
import type {
  ConversationCard,
  Difficulty,
  Mode,
  Theme,
} from "@/lib/types";

type Phase = "start" | "cards";

const LS_LEVEL = "cartita:level";
const LS_MODE = "cartita:mode";

// Per-browser-session keys for the feedback prompt + app-opened guard.
const SS_APP_OPENED = "cartita:app_opened";
const SS_CARDS_VIEWED = "cartita_cards_viewed_count";
const SS_FEEDBACK_HANDLED = "cartita_feedback_prompt_handled";

const FEEDBACK_THRESHOLD = 20;

export default function Home() {
  const [phase, setPhase] = useState<Phase>("start");
  const [level, setLevel] = useState<Difficulty | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);

  // Card flow state
  const [history, setHistory] = useState<ConversationCard[]>([]);
  const [index, setIndex] = useState(0);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [exhausted, setExhausted] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const [theme, setTheme] = useState<Theme>("light");

  // Feedback prompt state (after 20 cards viewed this session)
  const [cardsViewed, setCardsViewed] = useState(0);
  const [feedbackHandled, setFeedbackHandled] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const feedbackShownRef = useRef(false);
  // Highest cards_viewed already flushed to the product-metrics endpoint, so
  // each milestone is sent at most once.
  const lastSentCardsRef = useRef(0);

  // ── Theme + persisted selections + service worker + analytics (client) ──
  useEffect(() => {
    setTheme(resolveInitialTheme());
    try {
      const storedLevel = localStorage.getItem(LS_LEVEL);
      const storedMode = localStorage.getItem(LS_MODE);
      if (
        storedLevel === "principiante" ||
        storedLevel === "intermedio" ||
        storedLevel === "avanzado"
      ) {
        setLevel(storedLevel);
      }
      if (storedMode && QUESTIONS.some((q) => q.mode === storedMode)) {
        setMode(storedMode as Mode);
      }
    } catch {
      // ignore storage errors
    }

    // Restore feedback progress so it survives reloads within the session.
    try {
      const storedCount = Number(sessionStorage.getItem(SS_CARDS_VIEWED));
      if (Number.isFinite(storedCount) && storedCount > 0) {
        setCardsViewed(storedCount);
      }
      if (sessionStorage.getItem(SS_FEEDBACK_HANDLED) === "1") {
        setFeedbackHandled(true);
        feedbackShownRef.current = true;
      }
      // app_opened fires once per browser session.
      if (sessionStorage.getItem(SS_APP_OPENED) !== "1") {
        sessionStorage.setItem(SS_APP_OPENED, "1");
        trackAppOpened();
      }
    } catch {
      // sessionStorage may be unavailable; still fire once for this load.
      trackAppOpened();
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // installability is best-effort
      });
    }
  }, []);

  // Follow system changes only while no manual preference is stored.
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getStoredTheme() === null) setTheme(mql.matches ? "dark" : "light");
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Keep the <html> class in sync with the theme on every change.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Flush throttled cards-viewed milestones to the product-metrics endpoint
  // (best-effort; sends at 1/5/10/20/30, then every 10).
  useEffect(() => {
    if (
      cardsViewed > 0 &&
      cardsViewed !== lastSentCardsRef.current &&
      shouldSendCardsViewedUpdate(cardsViewed)
    ) {
      lastSentCardsRef.current = cardsViewed;
      logCardsViewedUpdate({ cardsViewed, level, mode });
    }
  }, [cardsViewed, level, mode]);

  // Open the feedback prompt once, after 20 cards, while viewing cards.
  useEffect(() => {
    if (
      phase === "cards" &&
      !feedbackHandled &&
      !feedbackShownRef.current &&
      cardsViewed >= FEEDBACK_THRESHOLD
    ) {
      feedbackShownRef.current = true;
      setFeedbackOpen(true);
      trackFeedbackPromptShown();
      logFeedbackPromptShown({ cardsViewed, level, mode });
    }
  }, [phase, cardsViewed, feedbackHandled, level, mode]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      storeTheme(next);
      return next;
    });
  }, []);

  // Record that a brand-new card was shown: analytics + session counter.
  const registerCardView = useCallback((card: ConversationCard) => {
    trackCardViewed(card);
    setCardsViewed((n) => {
      const next = n + 1;
      try {
        sessionStorage.setItem(SS_CARDS_VIEWED, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  // ── Card flow helpers ──
  const startFlow = useCallback(
    (m: Mode, l: Difficulty) => {
      const first = pickNextCard(QUESTIONS, m, l, new Set(), 0);
      setHistory(first ? [first] : []);
      setIndex(0);
      setSeenIds(first ? new Set([first.id]) : new Set());
      setExhausted(first === null);
      setShowTranslation(false);
      if (first) registerCardView(first);
    },
    [registerCardView]
  );

  const handleStart = useCallback(() => {
    if (!level || !mode) return;
    try {
      localStorage.setItem(LS_LEVEL, level);
      localStorage.setItem(LS_MODE, mode);
    } catch {
      // ignore
    }
    trackSessionStarted(level, mode);
    startFlow(mode, level);
    setPhase("cards");
  }, [level, mode, startFlow]);

  const handleNext = useCallback(
    (method: NextMethod = "button") => {
      if (!mode || !level || exhausted) return;
      trackNextCard(method, level, mode);
      setShowTranslation(false);

      // Re-show a card already ahead in history (user had gone back).
      if (index < history.length - 1) {
        setIndex(index + 1);
        haptic(10);
        return;
      }

      const next = pickNextCard(QUESTIONS, mode, level, seenIds, history.length);
      if (!next) {
        setExhausted(true);
        return;
      }
      setHistory((h) => [...h, next]);
      setSeenIds((s) => new Set(s).add(next.id));
      setIndex((i) => i + 1);
      registerCardView(next);
      haptic(10);
    },
    [mode, level, exhausted, index, history, seenIds, registerCardView]
  );

  const handleBack = useCallback(() => {
    setShowTranslation(false);
    if (exhausted) {
      setExhausted(false);
      haptic(10);
      return;
    }
    if (index > 0) {
      if (mode && level) trackPreviousCard(level, mode);
      setIndex(index - 1);
      haptic(10);
    }
  }, [exhausted, index, mode, level]);

  const handleToggleTranslation = useCallback(() => {
    setShowTranslation((v) => {
      const next = !v;
      // Only the reveal is interesting; hiding is not tracked.
      if (next) {
        const card = history[index];
        if (card) trackTranslationRevealed(card);
      }
      return next;
    });
  }, [history, index]);

  const handleHome = useCallback(() => {
    trackChangeModeClicked();
    setPhase("start");
    setExhausted(false);
  }, []);

  const handleRestart = useCallback(() => {
    if (mode && level) startFlow(mode, level);
  }, [mode, level, startFlow]);

  // Changing level or mode invalidates the current flow.
  const handleLevelChange = useCallback((l: Difficulty) => {
    trackDifficultySelected(l);
    setLevel(l);
  }, []);
  const handleModeChange = useCallback((m: Mode) => {
    trackModeSelected(m);
    setMode(m);
  }, []);

  // ── Feedback prompt callbacks ──
  const handleFeedbackResponse = useCallback((response: FeedbackResponse) => {
    trackFeedbackResponse(response);
    setFeedbackHandled(true);
    try {
      sessionStorage.setItem(SS_FEEDBACK_HANDLED, "1");
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleFeedbackClose = useCallback(() => setFeedbackOpen(false), []);

  const handleShareClicked = useCallback(
    () => trackShareClicked("feedback_prompt"),
    []
  );

  if (phase === "start" || !mode || !level) {
    return (
      <StartScreen
        level={level}
        mode={mode}
        theme={theme}
        onLevelChange={handleLevelChange}
        onModeChange={handleModeChange}
        onToggleTheme={toggleTheme}
        onStart={handleStart}
      />
    );
  }

  const currentCard = exhausted ? null : history[index] ?? null;
  const canGoBack = exhausted || index > 0;

  return (
    <CardScreen
      card={currentCard}
      mode={mode}
      level={level}
      theme={theme}
      showTranslation={showTranslation}
      canGoBack={canGoBack}
      onBack={handleBack}
      onNext={handleNext}
      onToggleTranslation={handleToggleTranslation}
      onToggleTheme={toggleTheme}
      onHome={handleHome}
      onRestart={handleRestart}
      feedback={
        feedbackOpen ? (
          <FeedbackPrompt
            onResponse={handleFeedbackResponse}
            onClose={handleFeedbackClose}
            onShareClicked={handleShareClicked}
            level={level}
            mode={mode}
          />
        ) : null
      }
    />
  );
}
