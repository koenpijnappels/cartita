import type { ConversationCard } from "./types";
import { MEZCLA_CARDS } from "./cards/mezcla";
import { ROMPEHIELOS_CARDS } from "./cards/rompehielos";
import { AMIGOS_CARDS } from "./cards/amigos";
import { CONOCERSE_CARDS } from "./cards/conocerse";
import { CITA_CARDS } from "./cards/cita";
import { MAS_PROFUNDO_CARDS } from "./cards/mas-profundo";
import { DEBATE_CARDS } from "./cards/debate";
import { PRACTICA_CARDS } from "./cards/practica";

export const QUESTIONS: ConversationCard[] = [
  ...MEZCLA_CARDS,
  ...ROMPEHIELOS_CARDS,
  ...AMIGOS_CARDS,
  ...CONOCERSE_CARDS,
  ...CITA_CARDS,
  ...MAS_PROFUNDO_CARDS,
  ...DEBATE_CARDS,
  ...PRACTICA_CARDS,
];
