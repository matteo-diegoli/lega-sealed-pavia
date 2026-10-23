// Simulazione di una lega intera con dati FITTIZI, usando il motore vero:
// abbinamenti svizzeri (abbinamenti.ts), buste (buste.ts), risultati casuali ma ripetibili (seme).
// Non scrive niente su disco: restituisce i dati e il testo dei file; li scrive "npm run genera-prova".

import { dump } from 'js-yaml';
import type { Carta } from '../carte/carta.ts';
import { NUMERO_SERATE } from '../dati/schema.ts';
import { FILE_LEGA, type DatiLega, type FileDati } from '../dati/valida.ts';
import { ROUND_TOTALI, calcolaAbbinamenti } from './abbinamenti.ts';
import { busteDellaSerata } from './buste.ts';
import { ultimoRoundDellaSerata } from './classifica.ts';
import { type PartitaBreve, round as creaRound } from './prova.ts';

export interface OpzioniSimulazione {
  nomeLega: string;
  set: string;
  giocatori: { id: string; nome: string }[];
  /** Data di ognuna delle 5 serate (AAAA-MM-GG). */
  date: string[];
  /** `assenti[i]` = assenti della serata i + 1. */
  assenti: string[][];
  seme: number;
  /** Carte del set da cui pescare le buste. */
  carte: Carta[];
  /** Indirizzo del sito da riscrivere in league.yml (facoltativo). */
  indirizzo?: string | null;
}

export interface Simulazione {
  opzioni: OpzioniSimulazione;
  /** Dati della lega, con i round giocati (e l'eventuale round successivo ancora da giocare). */
  dati: DatiLega;
  /** Avvisi degli abbinamenti, round per round (dal round 1). */
  avvisi: string[][];
  /** Pool di ogni giocatore: `pool.get(id)[s - 1]` = nomi delle carte aperte alla serata s (una per copia). */
  pool: Map<string, string[][]>;
  /** Ultima serata con tutti i risultati. */
  finoAllaSerata: number;
}

/** La lega di prova di "npm run genera-prova": 8 giocatori, un giovedì a settimana. */
export const GIOCATORI_DI_PROVA = [
  { id: 'anna', nome: 'Anna Bianchi' },
  { id: 'bruno', nome: 'Bruno Ferrari' },
  { id: 'carla', nome: 'Carla Russo' },
  { id: 'dario', nome: 'Dario Colombo' },
  { id: 'elena', nome: 'Elena Ricci' },
  { id: 'fabio', nome: 'Fabio Marino' },
  { id: 'giulia', nome: 'Giulia Greco' },
  { id: 'marco', nome: 'Marco Bruno' },
];
/** La serata 1 è quella vera (2026-10-22); le altre date sono inventate. */
export const DATE_DI_PROVA = ['2026-10-22', '2026-10-29', '2026-11-05', '2026-11-12', '2026-11-19'];
/** Marco salta la serata 2 (recupera la busta alla 3), Elena la 4 (recupera alla finale). */
export const ASSENTI_DI_PROVA = [[], ['marco'], [], ['elena'], []];
/** Seme scelto perché la lega di prova non ha rivincite (vedi il test). */
export const SEME_DI_PROVA = 2026;

export function opzioniDiProva(carte: Carta[]): OpzioniSimulazione {
  return {
    nomeLega: 'Lega Sealed Pavia',
    set: 'fra',
    giocatori: GIOCATORI_DI_PROVA,
    date: DATE_DI_PROVA,
    assenti: ASSENTI_DI_PROVA,
    seme: SEME_DI_PROVA,
    carte,
  };
}

/** Carte in una busta semplificata: 1 rara (1 volta su 8 mitica), 3 non comuni, 10 comuni. */
export const CARTE_PER_BUSTA = 14;

/** Generatore di numeri casuali con seme (mulberry32): stesso seme, stessi numeri. */
export function casuale(seme: number): () => number {
  let s = seme >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sceglie n elementi diversi da una lista. */
function pesca<T>(lista: T[], n: number, rnd: () => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
  }
  return copia.slice(0, n);
}

/** Una busta semplificata (vedi CARTE_PER_BUSTA), senza terre base. */
function busta(perRarita: Record<string, Carta[]>, rnd: () => number): string[] {
  const rara = rnd() < 1 / 8 && perRarita.mythic!.length > 0 ? perRarita.mythic! : perRarita.rare!;
  return [...pesca(rara, 1, rnd), ...pesca(perRarita.uncommon!, 3, rnd), ...pesca(perRarita.common!, 10, rnd)].map(
    (c) => c.nome,
  );
}

/** Risultato plausibile: 2-1 (metà delle volte), 2-0, ogni tanto un pareggio 1-1-1. */
function risultato(rnd: () => number): string {
  const x = rnd();
  const vinceIlPrimo = rnd() < 0.5;
  if (x < 0.1) return '1-1-1';
  const [v, p] = x < 0.6 ? [2, 1] : [2, 0];
  return vinceIlPrimo ? `${v}-${p}` : `${p}-${v}`;
}

/** Gioca tutti i 10 round e apre le buste di tutte le 5 serate. */
export function simulaLega(opzioni: OpzioniSimulazione): Simulazione {
  const ids = opzioni.giocatori.map((g) => g.id);
  const dati: DatiLega = {
    lega: {
      nome: opzioni.nomeLega,
      set: opzioni.set,
      indirizzo: opzioni.indirizzo ?? null,
      serate: opzioni.date.map((data, i) => ({ numero: i + 1, data, assenti: opzioni.assenti[i] ?? [] })),
    },
    giocatori: opzioni.giocatori.map((g) => ({ ...g, pool: [] })),
    round: [],
  };

  // Due sequenze casuali separate: i risultati non cambiano se cambiano le buste, e viceversa.
  const rndRisultati = casuale(opzioni.seme);
  const rndBuste = casuale(opzioni.seme ^ 0x9e3779b9);
  const avvisi: string[][] = [];
  for (let n = 1; n <= ROUND_TOTALI; n++) {
    const abb = calcolaAbbinamenti(dati);
    avvisi.push(abb.avvisi);
    const partite = abb.partite.map(([a, b]): PartitaBreve => [a, b, risultato(rndRisultati)]);
    dati.round.push(creaRound(n, partite, abb.bye));
  }

  // Buste: solo carte del set della lega, senza le terre base.
  const perRarita: Record<string, Carta[]> = { common: [], uncommon: [], rare: [], mythic: [] };
  for (const c of opzioni.carte) {
    if (c.set === opzioni.set && !c.facce[0]!.tipo.startsWith('Basic Land')) perRarita[c.rarita]?.push(c);
  }
  const pool = new Map(ids.map((id) => [id, [] as string[][]]));
  for (let serata = 1; serata <= NUMERO_SERATE; serata++) {
    for (const g of busteDellaSerata(dati, serata).giocatori) {
      pool.get(g.id)!.push(Array.from({ length: g.totale }, () => busta(perRarita, rndBuste)).flat());
    }
  }

  return { opzioni, dati, avvisi, pool, finoAllaSerata: NUMERO_SERATE };
}

/**
 * La stessa lega fermata al termine di una serata (da 1 a 4): restano i round giocati fino a lì,
 * più il primo round della serata successiva già abbinato ma senza risultati (come dopo "npm run pair").
 * Le serate successive non hanno ancora data né assenti; il pool arriva fino alla serata in corso.
 */
export function fermaAllaSerata(sim: Simulazione, serata: number): Simulazione {
  if (!(Number.isInteger(serata) && serata >= 1 && serata < NUMERO_SERATE)) {
    throw new Error(`si può fermare la simulazione solo al termine di una serata da 1 a ${NUMERO_SERATE - 1}`);
  }
  const ultimo = ultimoRoundDellaSerata(serata);
  const round = sim.dati.round
    .filter((r) => r.numeroGlobale <= ultimo + 1)
    .map((r) =>
      r.numeroGlobale <= ultimo ? r : { ...r, partite: r.partite.map((p) => ({ ...p, risultato: null })) },
    );
  const inCorso = serata + 1;
  const serate = sim.dati.lega.serate.map((s) => (s.numero <= inCorso ? s : { ...s, data: null, assenti: [] }));
  return {
    ...sim,
    dati: { ...sim.dati, lega: { ...sim.dati.lega, serate }, round },
    avvisi: sim.avvisi.slice(0, ultimo + 1),
    pool: new Map([...sim.pool].map(([id, perSerata]) => [id, perSerata.slice(0, inCorso)])),
    finoAllaSerata: serata,
  };
}

/** Lista di carte → righe del pool, con il numero di copie davanti per le doppie. */
export function righePool(nomi: string[]): string[] {
  const copie = new Map<string, number>();
  for (const n of nomi) copie.set(n, (copie.get(n) ?? 0) + 1);
  return [...copie]
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([nome, n]) => (n > 1 ? `${n} ${nome}` : nome));
}

/** Testo dei file in data/ per la simulazione (league.yml, giocatori, round). */
export function fileDellaSimulazione(sim: Simulazione): FileDati[] {
  const { lega } = sim.dati;
  const avviso = '# Dati FITTIZI generati da "npm run genera-prova": da sostituire con quelli veri.\n\n';

  const serate = lega.serate.map((s) => {
    // La data della serata 1 è quella vera; le altre sono inventate.
    const nota = s.numero > 1 && s.data !== null ? '   # FITTIZIA: rimettere null con i dati veri' : '';
    const assenti = s.assenti.length > 0 ? `[${s.assenti.join(', ')}]   # FITTIZI` : '[]';
    return `  - numero: ${s.numero}\n    data: ${s.data ?? 'null'}${nota}\n    assenti: ${assenti}\n`;
  });
  const testoLega =
    '# Dati generali della lega.\n' +
    '# Le date si scrivono AAAA-MM-GG; null = data non ancora decisa.\n' +
    '# assenti: identificativi di chi non c\'era, es. [anna, bruno] (vuoto = tutti presenti).\n' +
    '# ATTENZIONE: date e assenti delle serate dalla 2 in poi sono FITTIZI (npm run genera-prova).\n\n' +
    `nome: ${lega.nome}\nset: ${lega.set}   # codice Scryfall di Reality Fracture\n\n` +
    (lega.indirizzo
      ? '# Indirizzo pubblico del sito. Per un dominio personale scrivi ad es. https://lega.example.it/\n' +
        '# (si può scavalcare al momento della build con la variabile SITO_URL).\n' +
        `indirizzo: ${lega.indirizzo}\n\n`
      : '') +
    `serate:\n${serate.join('')}`;

  const files: FileDati[] = [{ percorso: FILE_LEGA, testo: testoLega }];

  for (const g of sim.dati.giocatori) {
    const pool: Record<string, string[]> = {};
    sim.pool.get(g.id)!.forEach((carte, i) => {
      if (carte.length > 0) pool[`serata-${i + 1}`] = righePool(carte);
    });
    files.push({ percorso: `data/players/${g.id}.yml`, testo: avviso + dump({ nome: g.nome, pool }, { lineWidth: -1 }) });
  }

  for (const r of sim.dati.round) {
    const partite = r.partite
      .map((p) => {
        const ris = p.risultato === null ? 'null' : [...p.risultato.vittorie, ...(p.risultato.pareggi > 0 ? [p.risultato.pareggi] : [])].join('-');
        return `  - giocatori: [${p.giocatori.join(', ')}]\n    risultato: ${ris}\n`;
      })
      .join('');
    const daGiocare = r.partite.some((p) => p.risultato === null)
      ? '# Da giocare: a fine partita scrivi il risultato al posto di null (2-0, 2-1, 1-2, 1-1-1, ...).\n'
      : '';
    files.push({
      percorso: `data/rounds/serata-${r.serata}-round-${r.round}.yml`,
      testo: `${avviso}${daGiocare}serata: ${r.serata}\nround: ${r.round}\n\npartite:\n${partite}\nbye: ${r.bye ?? 'null'}\n`,
    });
  }
  return files;
}
