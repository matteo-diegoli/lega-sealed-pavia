// Riepilogo della lega per le pagine del sito: a che punto siamo, classifica attuale
// con le variazioni di posizione, evoluzione serata per serata e punti della finale.

import { NUMERO_SERATE, ROUND_PER_SERATA } from '../dati/schema.ts';
import type { DatiLega } from '../dati/valida.ts';
import { calcolaClassifica, classificaDellaSerata, ultimoRoundDellaSerata, type Classifica } from './classifica.ts';

/** Round totali della lega (10). */
export const NUMERO_ROUND = NUMERO_SERATE * ROUND_PER_SERATA;

export interface StatoLega {
  /** Round con tutti i risultati, contati di fila dal primo (da 0 a 10). */
  roundGiocati: number;
  /** Round già abbinato ma senza tutti i risultati; null se non c'è. */
  roundInCorso: number | null;
  /** Serata in corso, o la prossima da giocare (da 1 a 5). */
  serata: number;
  /** Vero quando tutti i 10 round hanno i risultati. */
  finita: boolean;
}

export interface Tappa {
  /** Serata conclusa (tutti i suoi round hanno i risultati). */
  serata: number;
  classifica: Classifica;
  /** Posizioni guadagnate (positive) o perse (negative) rispetto alla serata prima. */
  variazioni: Map<string, number>;
}

export interface ClassificaAttuale {
  classifica: Classifica;
  /** Variazioni rispetto alla serata indicata in `rispettoAllaSerata` (vuote se non c'è). */
  variazioni: Map<string, number>;
  rispettoAllaSerata: number | null;
}

function roundCompleto(dati: DatiLega, numeroGlobale: number): boolean {
  const round = dati.round.find((r) => r.numeroGlobale === numeroGlobale);
  return round !== undefined && round.partite.every((p) => p.risultato !== null);
}

export function statoLega(dati: DatiLega): StatoLega {
  let roundGiocati = 0;
  while (roundGiocati < NUMERO_ROUND && roundCompleto(dati, roundGiocati + 1)) roundGiocati += 1;
  const roundInCorso = dati.round.some((r) => r.numeroGlobale === roundGiocati + 1) ? roundGiocati + 1 : null;
  const prossimo = Math.min(roundInCorso ?? roundGiocati + 1, NUMERO_ROUND);
  return {
    roundGiocati,
    roundInCorso,
    serata: Math.ceil(prossimo / ROUND_PER_SERATA),
    finita: roundGiocati === NUMERO_ROUND,
  };
}

/** Posizioni guadagnate da ciascuno passando dalla classifica `prima` a quella `dopo`. */
export function variazioni(prima: Classifica, dopo: Classifica): Map<string, number> {
  const posizioniPrima = new Map(prima.righe.map((r) => [r.id, r.posizione]));
  return new Map(dopo.righe.map((r) => [r.id, (posizioniPrima.get(r.id) ?? r.posizione) - r.posizione]));
}

/** Classifica al termine di ogni serata conclusa, dalla prima all'ultima. */
export function evoluzione(dati: DatiLega): Tappa[] {
  const { roundGiocati } = statoLega(dati);
  const tappe: Tappa[] = [];
  for (let serata = 1; ultimoRoundDellaSerata(serata) <= roundGiocati; serata++) {
    const classifica = classificaDellaSerata(dati, serata);
    const precedente = tappe.at(-1);
    tappe.push({ serata, classifica, variazioni: precedente ? variazioni(precedente.classifica, classifica) : new Map() });
  }
  return tappe;
}

/** Classifica con tutti i risultati registrati, confrontata con l'ultima serata conclusa prima di questi. */
export function classificaAttuale(dati: DatiLega): ClassificaAttuale {
  const classifica = calcolaClassifica(dati);
  const riferimento = evoluzione(dati)
    .filter((t) => ultimoRoundDellaSerata(t.serata) < classifica.finoAlRound)
    .at(-1);
  return {
    classifica,
    variazioni: riferimento ? variazioni(riferimento.classifica, classifica) : new Map(),
    rispettoAllaSerata: riferimento?.serata ?? null,
  };
}

/** Punti fatti da ciascuno nella finale (già con il ×2). */
export function puntiInFinale(dati: DatiLega): Map<string, number> {
  const prima = new Map(classificaDellaSerata(dati, NUMERO_SERATE - 1).righe.map((r) => [r.id, r.punti]));
  return new Map(calcolaClassifica(dati).righe.map((r) => [r.id, r.punti - (prima.get(r.id) ?? 0)]));
}

/** Data AAAA-MM-GG scritta per esteso, es. "2026-10-22" → "giovedì 22 ottobre". */
export function formattaData(testo: string): string {
  return new Date(`${testo}T00:00:00Z`).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}
