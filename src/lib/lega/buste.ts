// Buste da consegnare a ogni serata.
// Regole (vedi PIANO.md):
// - 6 buste alla serata 1, poi 1 a ogni serata;
// - chi è assente riceve tutte le buste saltate alla prima serata in cui si presenta
//   (chi salta la finale non recupera niente);
// - dalla serata 2, 1 busta extra all'ultimo in classifica al termine della serata precedente,
//   contando solo chi era presente alla serata precedente ed è presente a questa, e senza chi
//   l'ha ricevuta alla serata precedente (se l'ultimo è escluso passa al penultimo, e così via);
//   la busta extra non si recupera;
// - la busta extra si decide solo quando la serata precedente ha tutti i risultati.

import { NUMERO_SERATE, ROUND_PER_SERATA } from '../dati/schema.ts';
import type { DatiLega } from '../dati/valida.ts';
import { classificaDellaSerata, ultimoRoundDellaSerata } from './classifica.ts';

/** Buste normali della prima serata e di quelle successive. */
const BUSTE_PRIMA_SERATA = 6;
const BUSTE_ALTRE_SERATE = 1;

export interface BusteGiocatore {
  id: string;
  nome: string;
  presente: boolean;
  /** Buste di questa serata (0 se assente). */
  normali: number;
  /** Buste delle serate saltate subito prima di questa. */
  recuperate: number;
  /** 1 se riceve la busta extra. */
  extra: number;
  totale: number;
}

export interface BusteSerata {
  serata: number;
  /** Nello stesso ordine dei giocatori nei dati. */
  giocatori: BusteGiocatore[];
  /** Chi riceve la busta extra; null alla serata 1 o se non si può ancora decidere. */
  extra: string | null;
  /** Spiega perché la busta extra non è ancora decisa; null se è tutto a posto. */
  avviso: string | null;
}

/** Buste normali previste per una serata. */
export function busteNormali(serata: number): number {
  return serata === 1 ? BUSTE_PRIMA_SERATA : BUSTE_ALTRE_SERATE;
}

function assenti(dati: DatiLega, serata: number): Set<string> {
  return new Set(dati.lega.serate.find((s) => s.numero === serata)?.assenti ?? []);
}

/** Vero se la serata ha entrambi i round registrati e tutti i risultati. */
function serataCompleta(dati: DatiLega, serata: number): boolean {
  const ultimo = ultimoRoundDellaSerata(serata);
  const rounds = dati.round.filter((r) => r.numeroGlobale > ultimo - ROUND_PER_SERATA && r.numeroGlobale <= ultimo);
  return rounds.length === ROUND_PER_SERATA && rounds.every((r) => r.partite.every((p) => p.risultato !== null));
}

/** Chi riceve quante buste alla serata indicata, e perché. */
export function busteDellaSerata(dati: DatiLega, serata: number): BusteSerata {
  if (!(Number.isInteger(serata) && serata >= 1 && serata <= NUMERO_SERATE)) {
    throw new Error(`la serata ${serata} non esiste: le serate vanno da 1 a ${NUMERO_SERATE}`);
  }
  const assentiOra = assenti(dati, serata);

  let extra: string | null = null;
  let avviso: string | null = null;
  if (serata > 1) {
    if (serataCompleta(dati, serata - 1)) {
      const assentiPrima = assenti(dati, serata - 1);
      const extraPrima = busteDellaSerata(dati, serata - 1).extra;
      const candidati = classificaDellaSerata(dati, serata - 1).righe.filter(
        (r) => !assentiPrima.has(r.id) && !assentiOra.has(r.id) && r.id !== extraPrima,
      );
      extra = candidati.at(-1)?.id ?? null;
    } else {
      avviso = `La busta extra si decide quando la serata ${serata - 1} ha tutti i risultati.`;
    }
  }

  const giocatori = dati.giocatori.map((g): BusteGiocatore => {
    const presente = !assentiOra.has(g.id);
    let recuperate = 0;
    if (presente) {
      // Torna indietro finché trova serate saltate.
      for (let s = serata - 1; s >= 1 && assenti(dati, s).has(g.id); s--) recuperate += busteNormali(s);
    }
    const normali = presente ? busteNormali(serata) : 0;
    const busteExtra = g.id === extra ? 1 : 0;
    return { id: g.id, nome: g.nome, presente, normali, recuperate, extra: busteExtra, totale: normali + recuperate + busteExtra };
  });

  return { serata, giocatori, extra, avviso };
}

/** La prima serata che non ha ancora tutti i risultati (a lega finita, l'ultima). */
export function prossimaSerata(dati: DatiLega): number {
  for (let s = 1; s <= NUMERO_SERATE; s++) if (!serataCompleta(dati, s)) return s;
  return NUMERO_SERATE;
}
