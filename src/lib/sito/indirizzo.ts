// Indirizzo pubblico del sito: si scrive una volta in data/league.yml ("indirizzo:")
// e si può scavalcare al momento della build con la variabile SITO_URL.
// Da qui astro.config.mjs ricava "site" (es. https://matteo-diegoli.github.io)
// e "base" (es. /lega-sealed-pavia/), cioè la sottocartella in cui vive il sito.

/** Indirizzo usato se league.yml non ne indica uno. */
export const INDIRIZZO_PREDEFINITO = 'https://matteo-diegoli.github.io/lega-sealed-pavia/';

export interface Indirizzo {
  /** Indirizzo completo, sempre con la barra finale. */
  completo: string;
  /** Solo protocollo e dominio, es. https://matteo-diegoli.github.io */
  site: string;
  /** Sottocartella, con le barre: "/" oppure "/lega-sealed-pavia/". */
  base: string;
}

/** Controlla e scompone un indirizzo; lancia un errore in italiano se non è valido. */
export function scomponiIndirizzo(testo: string): Indirizzo {
  let url: URL;
  try {
    url = new URL(testo.trim());
  } catch {
    throw new Error(`indirizzo del sito non valido: "${testo}". Scrivilo completo, es. ${INDIRIZZO_PREDEFINITO}`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`l'indirizzo del sito deve iniziare con https:// (trovato "${testo}")`);
  }
  if (url.search || url.hash) {
    throw new Error(`l'indirizzo del sito non può contenere "?" o "#" (trovato "${testo}")`);
  }
  const base = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  return { completo: `${url.origin}${base}`, site: url.origin, base };
}

/** Sceglie l'indirizzo: prima SITO_URL, poi quello di league.yml, poi quello predefinito. */
export function scegliIndirizzo(daVariabile: string | undefined, daLega: string | undefined | null): Indirizzo {
  const scelto = daVariabile?.trim() || daLega?.trim() || INDIRIZZO_PREDEFINITO;
  return scomponiIndirizzo(scelto);
}

/**
 * Percorso di una pagina del sito tenendo conto della sottocartella.
 * percorso('/lega-sealed-pavia/', 'match/') → '/lega-sealed-pavia/match/'
 */
export function unisciPercorso(base: string, pagina: string): string {
  const inizio = base.endsWith('/') ? base : `${base}/`;
  return inizio + pagina.replace(/^\/+/, '');
}
