# Cartita

**Cartas para hablar en español.** A calm, Mediterranean, mobile-first conversation-card app for Spanish learners and social moments. Pick a difficulty and one of 8 modes, then swipe through large question cards — reveal an English translation any time.

No accounts, no backend, no AI. All 2,500 cards live in the codebase.

## Stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS** for the warm, vintage theme (light/dark)
- **Framer Motion** for swipe gestures and subtle animation
- **PWA** — installable, standalone fullscreen, offline app shell
- Local component state + `localStorage` (theme, last level/mode). No backend, no database, no auth.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

Build & serve production:

```bash
npm run build
npm start
```

## Features

- **3 levels** — Principiante, Intermedio, Avanzado (grammar/complexity scales with level).
- **8 modes** — Mezcla, Rompehielos, Amigos, Conocerse, Cita, Más Profundo, Debate, Práctica.
- **No repeats** within a session until the pool for that mode + level is exhausted, then a calm "empezar de nuevo" message.
- **Más Profundo** gradually deepens using each card's `intensity` (1–5).
- **Práctica** cards include a subtle speaking hint (`hintEs`).
- **Swipe** the card or use **Siguiente** to advance; **Atrás** to go back. Subtle haptics where supported.
- **Theme** follows the system by default; a manual toggle persists in `localStorage`.

## Project layout

```
app/            layout, page (state machine), globals.css
assets/         source files (e.g. icon-sources/) not shipped in public/
components/      StartScreen, CardScreen, ConversationCard, selectors, ThemeToggle
lib/            types, questions (combines lib/cards/*), cardEngine, theme, haptics
lib/cards/      per-mode card banks (mezcla, rompehielos, amigos, conocerse, cita, mas-profundo, debate, practica)
public/         manifest.json, sw.js, icons/
scripts/        validate-bank.mjs, analyze-bank.mjs, test-engine.mjs (dev tools)
```

## Question bank

`lib/questions.ts` combines the per-mode banks in `lib/cards/` into 2,500 typed `ConversationCard`s. Distribution: Mezcla 300, Rompehielos 300, Amigos 305, Conocerse 365, Cita 320, Más Profundo 335, Debate 300, Práctica 275 — each mode covering all three levels (principiante/intermedio/avanzado).

Re-check the bank with:

```bash
node scripts/validate-bank.mjs   # counts, coverage, uniqueness
node scripts/analyze-bank.mjs    # accents, duplicates, punctuation checks
node scripts/test-engine.mjs     # card engine behavior
```

## Icons

The PWA icons in `public/icons/` (`icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png`) are resized from `assets/icon-sources/cartita_icononly.png`. To regenerate after updating the source image:

```bash
node -e "
const sharp = require('sharp');
const src = 'assets/icon-sources/cartita_icononly.png';
for (const [name, size] of [['icon-192.png',192],['icon-512.png',512],['maskable-512.png',512],['apple-touch-icon.png',180]]) {
  sharp(src).resize(size, size).png({ compressionLevel: 9, palette: true }).toFile('public/icons/' + name);
}
"
```

## Deploy

Standard Next.js app — deploy to **Vercel** with zero config (no server/runtime dependencies).

### Abuse protection for `/api/*`

The `/api/*` routes (events, suggestions, analytics/session) are public and
write to Neon, which bills by usage. Two layers ship in code via
[`middleware.ts`](middleware.ts): a same-origin guard (cross-site POSTs get
`403`) and a best-effort per-IP burst guard (`429`). The burst guard is a
backstop only — serverless instances are isolated, so it caps per-instance
bursts, not global volume.

The durable, cross-instance layer must be configured once after deploy:
**Vercel → Project → Firewall** → add a rate-limit rule on path `/api/*`
(e.g. ~60 requests/min per IP → challenge or deny). This is dashboard-managed,
not committed code.
