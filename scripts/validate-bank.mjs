// Sanity check for the question bank. Imports each per-mode card array
// directly and asserts counts, coverage, uniqueness, and per-mode requirements.
import { MEZCLA_CARDS } from "../lib/cards/mezcla.ts";
import { ROMPEHIELOS_CARDS } from "../lib/cards/rompehielos.ts";
import { AMIGOS_CARDS } from "../lib/cards/amigos.ts";
import { CONOCERSE_CARDS } from "../lib/cards/conocerse.ts";
import { CITA_CARDS } from "../lib/cards/cita.ts";
import { MAS_PROFUNDO_CARDS } from "../lib/cards/mas-profundo.ts";
import { DEBATE_CARDS } from "../lib/cards/debate.ts";
import { PRACTICA_CARDS } from "../lib/cards/practica.ts";

const cards = [
  ...MEZCLA_CARDS,
  ...ROMPEHIELOS_CARDS,
  ...AMIGOS_CARDS,
  ...CONOCERSE_CARDS,
  ...CITA_CARDS,
  ...MAS_PROFUNDO_CARDS,
  ...DEBATE_CARDS,
  ...PRACTICA_CARDS,
];

const errors = [];
const ok = (cond, msg) => {
  if (!cond) errors.push(msg);
};

ok(cards.length === 2500, `expected 2500 cards, found ${cards.length}`);

// unique ids
const ids = new Set();
for (const c of cards) {
  if (ids.has(c.id)) errors.push(`duplicate id: ${c.id}`);
  ids.add(c.id);
}

const TARGET = {
  mezcla: 300,
  rompehielos: 300,
  amigos: 305,
  conocerse: 365,
  cita: 320,
  "mas-profundo": 335,
  debate: 300,
  practica: 275,
};
const LEVELS = ["principiante", "intermedio", "avanzado"];

const byMode = {};
for (const c of cards) {
  byMode[c.mode] ??= { total: 0, levels: {} };
  byMode[c.mode].total++;
  byMode[c.mode].levels[c.level] = (byMode[c.mode].levels[c.level] ?? 0) + 1;
}

for (const [mode, target] of Object.entries(TARGET)) {
  const info = byMode[mode];
  ok(info, `missing mode: ${mode}`);
  if (!info) continue;
  ok(info.total === target, `${mode}: expected ${target}, got ${info.total}`);
  for (const lvl of LEVELS) {
    ok((info.levels[lvl] ?? 0) > 0, `${mode}: no cards for level ${lvl}`);
  }
}

// every card has questionEs and translationEn
for (const c of cards) {
  ok(!!c.questionEs, `${c.id}: missing questionEs`);
  ok(!!c.translationEn, `${c.id}: missing translationEn`);
}

// every practica card has a hint
for (const c of cards.filter((c) => c.mode === "practica")) {
  ok(c.hintEs, `practica card without hintEs: ${c.id}`);
}
// every mas-profundo card has intensity
for (const c of cards.filter((c) => c.mode === "mas-profundo")) {
  ok(c.intensity, `mas-profundo card without intensity: ${c.id}`);
}

console.log("Mode distribution:");
for (const [mode, info] of Object.entries(byMode)) {
  console.log(`  ${mode.padEnd(13)} ${info.total}  ${JSON.stringify(info.levels)}`);
}

if (errors.length) {
  console.error(`\n❌ ${errors.length} problem(s):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`\n✅ All checks passed (${cards.length} cards).`);
