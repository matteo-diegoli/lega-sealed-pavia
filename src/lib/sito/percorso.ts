// Percorsi delle pagine dentro il sito: aggiungono la sottocartella (base) scelta in astro.config.mjs.
// Da usare per ogni link interno, es. href={percorso(`giocatori/${id}/`)}.

import { unisciPercorso } from './indirizzo.ts';

/** Percorso di una pagina del sito, es. percorso('match/') → '/lega-sealed-pavia/match/'. */
export function percorso(pagina = ''): string {
  return unisciPercorso(import.meta.env.BASE_URL, pagina);
}

/** Link alla pagina di un giocatore. */
export function linkGiocatore(id: string): string {
  return percorso(`giocatori/${id}/`);
}
