// Promemoria (non errori): pool delle serate già giocate che non sono ancora stati scritti.
// I pool si possono inserire anche giorni dopo la serata: niente blocca la build.

import type { DatiLega } from './valida.ts';

export interface PoolMancanti {
  serata: number;
  /** Identificativi dei giocatori, in ordine alfabetico. */
  giocatori: string[];
}

/**
 * Per ogni serata con almeno un round, i presenti che non hanno carte in `serata-N`.
 * Gli assenti sono esclusi: quella sera non hanno aperto buste.
 */
export function poolMancanti(dati: DatiLega): PoolMancanti[] {
  const giocate = new Set(dati.round.map((r) => r.serata));
  const risultato: PoolMancanti[] = [];
  for (const serata of dati.lega.serate) {
    if (!giocate.has(serata.numero)) continue;
    const giocatori = dati.giocatori
      .filter((g) => !serata.assenti.includes(g.id))
      .filter((g) => !g.pool.some((p) => p.serata === serata.numero && p.carte.length > 0))
      .map((g) => g.id)
      .sort();
    if (giocatori.length > 0) risultato.push({ serata: serata.numero, giocatori });
  }
  return risultato;
}
