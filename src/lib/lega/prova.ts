// Aiuti per i test: costruiscono i dati della lega direttamente, senza file YAML.

import type { Lega } from '../dati/schema.ts';
import type { DatiLega, Round } from '../dati/valida.ts';

/** Partita scritta come nei file: "2-1" o "1-1-1"; null = da giocare. */
export type PartitaBreve = [string, string, string | null];

export function round(numeroGlobale: number, partite: PartitaBreve[], bye: string | null = null): Round {
  return {
    serata: Math.ceil(numeroGlobale / 2),
    round: ((numeroGlobale - 1) % 2) + 1,
    numeroGlobale,
    partite: partite.map(([a, b, risultato]) => {
      if (risultato === null) return { giocatori: [a, b], risultato: null };
      const [v1, v2, pareggi = 0] = risultato.split('-').map(Number) as [number, number, number?];
      return { giocatori: [a, b], risultato: { vittorie: [v1, v2], pareggi } };
    }),
    bye,
    percorso: `data/rounds/serata-${Math.ceil(numeroGlobale / 2)}-round-${((numeroGlobale - 1) % 2) + 1}.yml`,
  };
}

/** Una lega con 5 serate tutte con data; `assenti[i]` sono gli assenti della serata i + 1. */
export function lega(ids: string[], rounds: Round[], assenti: string[][] = []): DatiLega {
  const serate: Lega['serate'] = [1, 2, 3, 4, 5].map((numero) => ({
    numero,
    data: `2026-11-0${numero}`,
    assenti: assenti[numero - 1] ?? [],
  }));
  return {
    lega: { nome: 'Prova', set: 'fra', serate },
    giocatori: ids.map((id) => ({ id, nome: id.toUpperCase(), pool: [] })),
    round: rounds,
  };
}
