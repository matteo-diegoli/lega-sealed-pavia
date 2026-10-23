// Filtri, ricerca e ordinamento del pool nella pagina del giocatore.
// Codice senza dipendenze dal server: lo usa lo script della pagina nel browser,
// e si può testare senza browser. Lo stato si legge e si scrive nell'indirizzo (?colore=R,G&q=…).

import { normalizza } from '../carte/nomi.ts';
import type { Carta } from '../carte/carta.ts';

// --- Valori dei filtri -------------------------------------------------------------

export const COLORI = [
  { chiave: 'W', nome: 'Bianco' },
  { chiave: 'U', nome: 'Blu' },
  { chiave: 'B', nome: 'Nero' },
  { chiave: 'R', nome: 'Rosso' },
  { chiave: 'G', nome: 'Verde' },
  { chiave: 'multi', nome: 'Multicolore' },
  { chiave: 'incolore', nome: 'Incolore' },
] as const;

/** Dalla più rara alla più comune. */
export const RARITA = [
  { chiave: 'mythic', nome: 'Mitica', sigla: 'M' },
  { chiave: 'rare', nome: 'Rara', sigla: 'R' },
  { chiave: 'uncommon', nome: 'Non comune', sigla: 'N' },
  { chiave: 'common', nome: 'Comune', sigla: 'C' },
  { chiave: 'special', nome: 'Speciale', sigla: 'S' },
  { chiave: 'bonus', nome: 'Bonus', sigla: 'B' },
] as const;

/** Tipi di carta: la parola inglese della riga del tipo e il nome italiano. */
export const TIPI = [
  { chiave: 'creatura', inglese: 'Creature', nome: 'Creatura' },
  { chiave: 'istantaneo', inglese: 'Instant', nome: 'Istantaneo' },
  { chiave: 'stregoneria', inglese: 'Sorcery', nome: 'Stregoneria' },
  { chiave: 'artefatto', inglese: 'Artifact', nome: 'Artefatto' },
  { chiave: 'incantesimo', inglese: 'Enchantment', nome: 'Incantesimo' },
  { chiave: 'terra', inglese: 'Land', nome: 'Terra' },
  { chiave: 'planeswalker', inglese: 'Planeswalker', nome: 'Planeswalker' },
  { chiave: 'battaglia', inglese: 'Battle', nome: 'Battaglia' },
] as const;

/** Fasce di costo (valore di mana). */
export const COSTI = ['0-1', '2', '3', '4', '5', '6+'] as const;

export const ORDINI = [
  { chiave: 'colore', nome: 'Colore' },
  { chiave: 'costo', nome: 'Costo di mana' },
  { chiave: 'nome', nome: 'Nome' },
  { chiave: 'rarita', nome: 'Rarità' },
  { chiave: 'serata', nome: 'Serata' },
] as const;
export type Ordine = (typeof ORDINI)[number]['chiave'];
export const ORDINE_PREDEFINITO: Ordine = 'colore';

export const VISTE = ['lista', 'immagini'] as const;
export type Vista = (typeof VISTE)[number];

// --- Una carta del pool, nella forma che serve ai filtri ------------------------------

export interface VocePool {
  nome: string;
  /** Nome, tipo e testo già normalizzati, per la ricerca. */
  ricerca: string;
  /** Una delle chiavi di COLORI. */
  colore: string;
  rarita: string;
  valore: number;
  tipi: string[];
  /** Una delle fasce di COSTI. */
  costo: string;
  /** Copie sbustate a ogni serata: { "1": 2, "3": 1 }. */
  copie: Record<string, number>;
}

export function chiaveColore(colori: string[]): string {
  if (colori.length === 0) return 'incolore';
  return colori.length === 1 ? colori[0]! : 'multi';
}

export function fasciaCosto(valore: number): string {
  if (valore <= 1) return '0-1';
  if (valore >= 6) return '6+';
  return String(valore);
}

export function tipiDellaCarta(carta: Carta): string[] {
  // Si guarda la parte prima del "—" (i sottotipi come "Zombie" non contano), su tutte le facce.
  const parole = new Set(carta.facce.flatMap((f) => (f.tipo.split('—')[0] ?? '').split(/\s+/)));
  return TIPI.filter((t) => parole.has(t.inglese)).map((t) => t.chiave);
}

/** Converte una carta del pool; `carta` è null se la carta non è nella cache di Scryfall. */
export function vocePool(nome: string, carta: Carta | null, perSerata: { serata: number; copie: number }[]): VocePool {
  const testi = carta ? [carta.nome, ...carta.facce.flatMap((f) => [f.tipo, f.testo])] : [nome];
  return {
    nome,
    ricerca: normalizza(testi.join(' \n ')),
    colore: chiaveColore(carta?.colori ?? []),
    rarita: carta?.rarita ?? 'common',
    valore: carta?.valore ?? 0,
    tipi: carta ? tipiDellaCarta(carta) : [],
    costo: fasciaCosto(carta?.valore ?? 0),
    copie: Object.fromEntries(perSerata.map((s) => [String(s.serata), s.copie])),
  };
}

// --- Stato dei filtri e indirizzo -------------------------------------------------------

export interface StatoPool {
  q: string;
  colori: string[];
  rarita: string[];
  serate: string[];
  tipi: string[];
  costi: string[];
  ordine: Ordine;
  /** null = nessuna vista nell'indirizzo (si usa la preferenza salvata). */
  vista: Vista | null;
}

export function statoVuoto(): StatoPool {
  return { q: '', colori: [], rarita: [], serate: [], tipi: [], costi: [], ordine: ORDINE_PREDEFINITO, vista: null };
}

/** Nome del parametro nell'indirizzo per ogni gruppo di filtri. */
export const PARAMETRI = {
  colori: 'colore',
  rarita: 'rarita',
  serate: 'serata',
  tipi: 'tipo',
  costi: 'costo',
} as const;
export type GruppoFiltro = keyof typeof PARAMETRI;

const VALIDI: Record<GruppoFiltro, (v: string) => boolean> = {
  colori: (v) => COLORI.some((c) => c.chiave === v),
  rarita: (v) => RARITA.some((r) => r.chiave === v),
  serate: (v) => /^[1-9]\d*$/.test(v),
  tipi: (v) => TIPI.some((t) => t.chiave === v),
  costi: (v) => (COSTI as readonly string[]).includes(v),
};

/** Legge lo stato dall'indirizzo, scartando i valori sconosciuti. */
export function leggiStato(parametri: URLSearchParams): StatoPool {
  const stato = statoVuoto();
  stato.q = parametri.get('q')?.trim() ?? '';
  for (const gruppo of Object.keys(PARAMETRI) as GruppoFiltro[]) {
    const valori = (parametri.get(PARAMETRI[gruppo]) ?? '').split(',').filter(VALIDI[gruppo]);
    stato[gruppo] = [...new Set(valori)];
  }
  const ordine = parametri.get('ordine');
  if (ORDINI.some((o) => o.chiave === ordine)) stato.ordine = ordine as Ordine;
  const vista = parametri.get('vista');
  if ((VISTE as readonly string[]).includes(vista ?? '')) stato.vista = vista as Vista;
  return stato;
}

/** Scrive lo stato come parametri dell'indirizzo (solo quello diverso dal predefinito). */
export function scriviStato(stato: StatoPool): string {
  const parametri = new URLSearchParams();
  if (stato.q.trim()) parametri.set('q', stato.q.trim());
  for (const gruppo of Object.keys(PARAMETRI) as GruppoFiltro[]) {
    if (stato[gruppo].length > 0) parametri.set(PARAMETRI[gruppo], stato[gruppo].join(','));
  }
  if (stato.ordine !== ORDINE_PREDEFINITO) parametri.set('ordine', stato.ordine);
  if (stato.vista) parametri.set('vista', stato.vista);
  // Le virgole tra i valori si lasciano leggibili.
  return parametri.toString().replace(/%2C/g, ',');
}

/** Quanti filtri sono attivi (ricerca esclusa). */
export function filtriAttivi(stato: StatoPool): number {
  return (Object.keys(PARAMETRI) as GruppoFiltro[]).reduce((n, g) => n + stato[g].length, 0);
}

// --- Filtro e ordinamento ---------------------------------------------------------

export interface Visibile {
  /** Posizione della carta nell'elenco di partenza. */
  indice: number;
  /** Copie da mostrare: con il filtro per serata, solo quelle delle serate scelte. */
  copie: number;
}

export interface EsitoFiltro {
  visibili: Visibile[];
  /** Carte mostrate, contando le copie. */
  copie: number;
}

const ORDINE_COLORI = COLORI.map((c) => c.chiave as string);
const ORDINE_RARITA = RARITA.map((r) => r.chiave as string);

function primaSerata(voce: VocePool): number {
  return Math.min(...Object.keys(voce.copie).map(Number));
}

const CONFRONTI: Record<Ordine, (a: VocePool, b: VocePool) => number> = {
  nome: () => 0,
  costo: (a, b) => a.valore - b.valore,
  colore: (a, b) => ORDINE_COLORI.indexOf(a.colore) - ORDINE_COLORI.indexOf(b.colore) || a.valore - b.valore,
  rarita: (a, b) => ORDINE_RARITA.indexOf(a.rarita) - ORDINE_RARITA.indexOf(b.rarita),
  serata: (a, b) => primaSerata(a) - primaSerata(b),
};

export function filtra(voci: VocePool[], stato: StatoPool): EsitoFiltro {
  const parole = normalizza(stato.q).split(' ').filter(Boolean);
  const scelta = (valori: string[], valore: string) => valori.length === 0 || valori.includes(valore);

  const visibili: Visibile[] = [];
  voci.forEach((voce, indice) => {
    if (!parole.every((p) => voce.ricerca.includes(p))) return;
    if (!scelta(stato.colori, voce.colore) || !scelta(stato.rarita, voce.rarita) || !scelta(stato.costi, voce.costo)) return;
    if (stato.tipi.length > 0 && !voce.tipi.some((t) => stato.tipi.includes(t))) return;
    const copie = Object.entries(voce.copie)
      .filter(([serata]) => scelta(stato.serate, serata))
      .reduce((n, [, c]) => n + c, 0);
    if (copie > 0) visibili.push({ indice, copie });
  });

  const confronta = CONFRONTI[stato.ordine];
  visibili.sort((a, b) => {
    const va = voci[a.indice]!;
    const vb = voci[b.indice]!;
    return confronta(va, vb) || va.nome.localeCompare(vb.nome);
  });
  return { visibili, copie: visibili.reduce((n, v) => n + v.copie, 0) };
}
