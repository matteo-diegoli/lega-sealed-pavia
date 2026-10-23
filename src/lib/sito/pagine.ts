// Elenco delle pagine del sito (percorsi relativi alla sottocartella, senza barra iniziale).
// Lo usa il service worker per salvarle tutte sul telefono alla prima visita.

import type { DatiLega } from '../dati/valida.ts';

/** Pagina mostrata quando manca la rete e la pagina chiesta non è stata salvata. */
export const PAGINA_OFFLINE = 'offline/';

/** Tutte le pagine: Home, Match, una per giocatore e la pagina offline. */
export function pagineDelSito(dati: Pick<DatiLega, 'giocatori'>): string[] {
  return ['', 'match/', ...dati.giocatori.map((g) => `giocatori/${g.id}/`), PAGINA_OFFLINE];
}

/** File fissi di public/ che servono all'app installata. */
export const FILE_APP = [
  'manifest.webmanifest',
  'favicon.svg',
  'icona-192.png',
  'icona-512.png',
  'icona-maskable-512.png',
  'apple-touch-icon.png',
];
