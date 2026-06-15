# Cartita

**Cartas para hablar en español.** A calm, Mediterranean, mobile-first conversation-card app for Spanish learners and social moments. Pick a difficulty and one of 8 modes, then swipe through large question cards — reveal an English translation any time.

No accounts, no backend, no AI. All 500 cards live in the codebase.

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
lib/            types, questions (the 500-card bank), cardEngine, theme, haptics
public/         manifest.json, sw.js, icons/
scripts/        validate-bank.mjs (dev tools)
```

## Question bank

`lib/questions.ts` holds 500 typed `ConversationCard`s. Distribution: Mezcla 60, Rompehielos 60, Amigos 60, Conocerse 75, Cita 65, Más Profundo 65, Debate 60, Práctica 55 — each mode covering all three levels.

Re-check the bank with:

```bash
node scripts/validate-bank.mjs
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
