// Temporary analysis script for reviewing the existing card bank.
// Run: node scripts/analyze-bank.mjs
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
console.log(`Total cards: ${cards.length}`);

// 1. Duplicate IDs
const idCounts = new Map();
for (const c of cards) idCounts.set(c.id, (idCounts.get(c.id) ?? 0) + 1);
const dupIds = [...idCounts.entries()].filter(([, n]) => n > 1);
console.log(`\nDuplicate IDs: ${dupIds.length}`);
for (const [id, n] of dupIds) console.log(`  ${id} x${n}`);

// 2. Missing opening ¿ when "?" present
const missingOpen = cards.filter(
  (c) => c.questionEs.includes("?") && !c.questionEs.includes("¿")
);
console.log(`\nMissing opening ¿: ${missingOpen.length}`);
for (const c of missingOpen.slice(0, 30)) console.log(`  ${c.id}: ${c.questionEs}`);

// 3. Accent heuristics: sentence-initial unaccented question words
const accentRe = /(?:^|¿)(Que|Como|Cuando|Donde|Cual|Cuales|Quien|Quienes|Cuanto|Cuanta|Cuantos|Cuantas|Por que)\b/g;
const accentIssues = [];
for (const c of cards) {
  const m = c.questionEs.match(accentRe);
  if (m) accentIssues.push({ id: c.id, text: c.questionEs, matches: m });
}
console.log(`\nPotential missing accents (sentence-initial): ${accentIssues.length}`);
for (const c of accentIssues.slice(0, 40)) console.log(`  ${c.id}: ${c.text}`);

// 3b. Common unaccented words anywhere (mas/aun/tambien/gustaria/podrias/asi/dificil/facil/util/segun/traves)
const wordRe = /\b(mas|aun|tambien|gustaria|podrias|podria|asi|dificil|facil|util|traves|esta|estas|ti|tu|el|si|porque|porqué|unico|unica|publico|publica|rapido|rapida|ultimo|ultima|practico|practica|economico|psicologico|tecnologico|emocion|reaccion|opcion|relacion|version|generacion|decision|tradicion|situacion|conexion|atencion)\b/gi;
const wordIssues = [];
for (const c of cards) {
  const matches = [...c.questionEs.matchAll(wordRe)].map((m) => m[0]);
  // filter to ones clearly missing accent (these specific words should virtually always carry accents in these forms)
  const flagged = matches.filter((w) =>
    ["mas", "aun", "tambien", "gustaria", "podrias", "podria", "dificil", "facil", "util", "traves", "unico", "unica", "publico", "publica", "rapido", "rapida", "ultimo", "ultima", "practico", "economico", "psicologico", "tecnologico", "emocion", "reaccion", "opcion", "relacion", "version", "generacion", "decision", "tradicion", "situacion", "conexion", "atencion", "porque"].includes(w.toLowerCase())
  );
  if (flagged.length) wordIssues.push({ id: c.id, text: c.questionEs, flagged });
}
console.log(`\nPotential missing accents (common words): ${wordIssues.length}`);
for (const c of wordIssues.slice(0, 60)) console.log(`  ${c.id}: [${c.flagged.join(",")}] ${c.text}`);

// 4. Near-duplicate questionEs (normalize: lowercase, strip accents/punct, collapse whitespace)
function norm(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
const byNorm = new Map();
for (const c of cards) {
  const key = norm(c.questionEs);
  if (!byNorm.has(key)) byNorm.set(key, []);
  byNorm.get(key).push(c.id);
}
const exactDupes = [...byNorm.entries()].filter(([, ids]) => ids.length > 1);
console.log(`\nExact-text duplicates (after normalization): ${exactDupes.length}`);
for (const [text, ids] of exactDupes.slice(0, 60)) console.log(`  [${ids.join(", ")}] ${text}`);

// 5. Missing translations / questions
const missingFields = cards.filter((c) => !c.questionEs || !c.translationEn);
console.log(`\nMissing questionEs/translationEn: ${missingFields.length}`);
for (const c of missingFields) console.log(`  ${c.id}`);

// 6. mas-profundo intensity coverage
const mp = cards.filter((c) => c.mode === "mas-profundo");
const noIntensity = mp.filter((c) => !c.intensity);
console.log(`\nmas-profundo without intensity: ${noIntensity.length}`);
for (const c of noIntensity) console.log(`  ${c.id}`);

// 7. practica hint coverage
const practica = cards.filter((c) => c.mode === "practica");
const noHint = practica.filter((c) => !c.hintEs);
console.log(`\npractica without hintEs: ${noHint.length} / ${practica.length}`);

// 8. "favorito/favorita" overuse and "por qué" overuse
const favorito = cards.filter((c) => /favorit[oa]/i.test(c.questionEs));
console.log(`\nCards with "favorito/favorita": ${favorito.length}`);
const porque = cards.filter((c) => /por qu[eé]\?/i.test(c.questionEs));
console.log(`Cards ending in "por qué?": ${porque.length}`);

// 9. Very short or very long questionEs
const lens = cards.map((c) => c.questionEs.length);
const tooShort = cards.filter((c) => c.questionEs.length < 15);
const tooLong = cards.filter((c) => c.questionEs.length > 160);
console.log(`\nVery short questionEs (<15 chars): ${tooShort.length}`);
for (const c of tooShort) console.log(`  ${c.id}: ${c.questionEs}`);
console.log(`Very long questionEs (>160 chars): ${tooLong.length}`);
for (const c of tooLong) console.log(`  ${c.id} (${c.questionEs.length}): ${c.questionEs}`);

// 10. ID numbering ranges per mode/level (for new ID continuation)
const ranges = {};
for (const c of cards) {
  const m = c.id.match(/^(.+)-(\d+)$/);
  if (!m) continue;
  const key = `${c.mode}|${c.level}`;
  const num = parseInt(m[2], 10);
  ranges[key] ??= { min: num, max: num, count: 0, prefix: m[1] };
  ranges[key].min = Math.min(ranges[key].min, num);
  ranges[key].max = Math.max(ranges[key].max, num);
  ranges[key].count++;
}
console.log(`\nID ranges per mode/level:`);
for (const [key, r] of Object.entries(ranges)) {
  console.log(`  ${key.padEnd(28)} count=${r.count} min=${r.min} max=${r.max} prefix=${r.prefix}`);
}
