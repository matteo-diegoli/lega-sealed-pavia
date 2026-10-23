// Le carte come le salviamo in data/scryfall/carte.json, e la conversione
// dai dati di Scryfall (che contengono molti più campi di quelli che ci servono).

export const FILE_CACHE_CARTE = 'data/scryfall/carte.json';

export type Rarita = 'common' | 'uncommon' | 'rare' | 'mythic' | 'special' | 'bonus';

export interface Immagine {
  piccola: string;
  normale: string;
}

export interface Faccia {
  nome: string;
  costo: string;
  tipo: string;
  testo: string;
}

export interface Carta {
  /** Nome completo in inglese, es. "Blossom-Blessed Angel // Seed Suture". */
  nome: string;
  set: string;
  numero: string;
  rarita: Rarita;
  /** Valore di mana (CMC). */
  valore: number;
  /** Colori della carta (W, U, B, R, G); vuoto = incolore. */
  colori: string[];
  identita: string[];
  /** Una faccia per le carte normali, due per quelle a due facce. */
  facce: Faccia[];
  /** Una immagine, o due per le carte a due facce con il retro stampato. */
  immagini: Immagine[];
  scryfall: string;
}

export interface CacheCarte {
  set: string;
  /** Data e ora dell'ultimo aggiornamento (ISO). */
  aggiornato: string;
  carte: Carta[];
}

// --- Forma (parziale) dei dati di Scryfall ---------------------------------------

interface ImmaginiScryfall {
  small: string;
  normal: string;
}

interface FacciaScryfall {
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  image_uris?: ImmaginiScryfall;
}

export interface CartaScryfall {
  name: string;
  set: string;
  collector_number: string;
  rarity: string;
  cmc?: number;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  card_faces?: FacciaScryfall[];
  image_uris?: ImmaginiScryfall;
  booster?: boolean;
  promo?: boolean;
  variation?: boolean;
  full_art?: boolean;
  frame_effects?: string[];
  scryfall_uri: string;
}

const ORDINE_COLORI = ['W', 'U', 'B', 'R', 'G'];

function ordinaColori(colori: Iterable<string>): string[] {
  return [...new Set(colori)].sort((a, b) => ORDINE_COLORI.indexOf(a) - ORDINE_COLORI.indexOf(b));
}

function immagine(uri: ImmaginiScryfall): Immagine {
  return { piccola: uri.small, normale: uri.normal };
}

export function convertiCarta(c: CartaScryfall): Carta {
  const facceScryfall: FacciaScryfall[] = c.card_faces ?? [c];
  const facce = facceScryfall.map((f) => ({
    nome: f.name,
    costo: f.mana_cost ?? '',
    tipo: f.type_line ?? '',
    testo: f.oracle_text ?? '',
  }));
  // Alcune carte a due facce hanno i colori e le immagini solo sulle facce.
  const colori = c.colors ?? facceScryfall.flatMap((f) => f.colors ?? []);
  const immagini = c.image_uris
    ? [immagine(c.image_uris)]
    : facceScryfall.flatMap((f) => (f.image_uris ? [immagine(f.image_uris)] : []));
  return {
    nome: c.name,
    set: c.set,
    numero: c.collector_number,
    rarita: c.rarity as Rarita,
    valore: c.cmc ?? 0,
    colori: ordinaColori(colori),
    identita: ordinaColori(c.color_identity),
    facce,
    immagini,
    scryfall: c.scryfall_uri,
  };
}

/** Quanto una stampa è "normale": più è basso, meglio è (versione da busta, senza bordi o arte speciali). */
function rarezzaStampa(c: CartaScryfall): number {
  let punti = 0;
  if (c.booster === false) punti += 8;
  if (c.promo) punti += 4;
  if (c.variation) punti += 2;
  if (c.full_art || (c.frame_effects ?? []).some((e) => e === 'showcase' || e === 'extendedart' || e === 'inverted')) punti += 1;
  return punti;
}

/** Numero di collezione per ordinare: "12" < "12a" < "100". */
function confrontaNumero(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true });
}

/** Tra tutte le stampe del set tiene una sola versione per carta, la più normale. */
export function scegliStampe(stampe: CartaScryfall[]): CartaScryfall[] {
  const perNome = new Map<string, CartaScryfall>();
  for (const stampa of stampe) {
    const attuale = perNome.get(stampa.name);
    if (
      attuale === undefined ||
      rarezzaStampa(stampa) < rarezzaStampa(attuale) ||
      (rarezzaStampa(stampa) === rarezzaStampa(attuale) && confrontaNumero(stampa.collector_number, attuale.collector_number) < 0)
    ) {
      perNome.set(stampa.name, stampa);
    }
  }
  return [...perNome.values()];
}
