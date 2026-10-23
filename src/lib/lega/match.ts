// Dati per la pagina dei match: il round da giocare adesso e lo storico dei round giocati, per serata.

import type { Partita } from '../dati/schema.ts';
import type { DatiLega, Round } from '../dati/valida.ts';
import { statoLega } from './riepilogo.ts';

export interface SerataGiocata {
  serata: number;
  data: string | null;
  assenti: string[];
  /** Round con tutti i risultati, dal più recente. */
  round: Round[];
}

/** Il round abbinato ma senza tutti i risultati; null se non c'è (da abbinare, o lega finita). */
export function roundCorrente(dati: DatiLega): Round | null {
  const { roundInCorso } = statoLega(dati);
  return dati.round.find((r) => r.numeroGlobale === roundInCorso) ?? null;
}

/** Round già giocati, raggruppati per serata, dalla serata più recente. */
export function storico(dati: DatiLega): SerataGiocata[] {
  const { roundGiocati } = statoLega(dati);
  const perSerata = new Map<number, Round[]>();
  for (const round of dati.round) {
    if (round.numeroGlobale > roundGiocati) continue;
    perSerata.set(round.serata, [round, ...(perSerata.get(round.serata) ?? [])]);
  }
  return [...perSerata.entries()]
    .sort(([a], [b]) => b - a)
    .map(([serata, round]) => {
      const info = dati.lega.serate.find((s) => s.numero === serata);
      return { serata, data: info?.data ?? null, assenti: info?.assenti ?? [], round };
    });
}

/** Indice del vincitore (0 o 1), "pareggio", o null se la partita non ha ancora un risultato. */
export function vincitore(partita: Partita): 0 | 1 | 'pareggio' | null {
  if (!partita.risultato) return null;
  const [a, b] = partita.risultato.vittorie;
  return a > b ? 0 : b > a ? 1 : 'pareggio';
}

/** Risultato come si scrive nei file: "2-1", oppure "1-1-1" con i game pareggiati. */
export function testoRisultato(partita: Partita): string | null {
  if (!partita.risultato) return null;
  const { vittorie, pareggi } = partita.risultato;
  return `${vittorie[0]}-${vittorie[1]}${pareggi ? `-${pareggi}` : ''}`;
}
