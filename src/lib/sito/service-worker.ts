// Testo del service worker (lo script che fa funzionare il sito offline), creato durante la build
// da src/pages/sw.js.ts. Scritto a mano, senza librerie.
//
// Come si comporta:
// - all'installazione salva tutte le pagine del sito e i loro CSS/JS (cartella _astro/);
// - pagine: prima la rete (così si vede sempre la classifica aggiornata), senza rete la copia salvata,
//   e se manca anche quella la pagina "sei offline";
// - CSS, JS e icone: la copia salvata, altrimenti la rete (i file di _astro/ cambiano nome a ogni modifica);
// - immagini delle carte da Scryfall: salvate la prima volta che si vedono, al massimo LIMITE_IMMAGINI;
// - a ogni build cambia la versione: il telefono scarica le pagine nuove e butta le vecchie.

/** Quante immagini di carte tenere al massimo sul telefono. */
export const LIMITE_IMMAGINI = 600;

export interface OpzioniServiceWorker {
  /** Cambia a ogni build. */
  versione: string;
  /** Percorsi da salvare subito, relativi alla sottocartella del sito (es. "match/"). */
  daSalvare: string[];
  /** Percorso della pagina offline, relativo alla sottocartella. */
  paginaOffline: string;
}

export function testoServiceWorker({ versione, daSalvare, paginaOffline }: OpzioniServiceWorker): string {
  return `// Service worker della Lega Sealed Pavia (creato durante la build: non modificare a mano).
const VERSIONE = ${JSON.stringify(versione)};
const CACHE_SITO = 'lega-sito-' + VERSIONE;
const CACHE_CARTE = 'lega-carte';
const LIMITE_IMMAGINI = ${LIMITE_IMMAGINI};
const BASE = new URL(self.registration.scope).pathname;
const DA_SALVARE = ${JSON.stringify(daSalvare)}.map((p) => BASE + p);
const OFFLINE = BASE + ${JSON.stringify(paginaOffline)};

// Installazione: salva le pagine e i file _astro/ che usano.
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_SITO);
      const risorse = new Set();
      for (const indirizzo of DA_SALVARE) {
        const risposta = await fetch(indirizzo, { cache: 'reload' });
        if (!risposta.ok) continue;
        if ((risposta.headers.get('content-type') || '').includes('text/html')) {
          const html = await risposta.clone().text();
          for (const [, trovato] of html.matchAll(/(?:href|src)="([^"]*\\/_astro\\/[^"]+)"/g)) risorse.add(trovato);
        }
        await cache.put(indirizzo, risposta);
      }
      await Promise.all(
        [...risorse].map((r) => cache.add(new URL(r, self.location.href).href).catch(() => {})),
      );
      await self.skipWaiting();
    })(),
  );
});

// Attivazione: butta le versioni vecchie (le immagini delle carte restano).
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      for (const nome of await caches.keys()) {
        if (nome.startsWith('lega-sito-') && nome !== CACHE_SITO) await caches.delete(nome);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (evento) => {
  const richiesta = evento.request;
  if (richiesta.method !== 'GET') return;
  const url = new URL(richiesta.url);

  if (url.hostname === 'cards.scryfall.io') {
    evento.respondWith(immagineCarta(richiesta));
  } else if (url.origin === self.location.origin && url.pathname.startsWith(BASE)) {
    evento.respondWith(richiesta.mode === 'navigate' ? pagina(richiesta) : file(richiesta));
  }
});

// Pagine: prima la rete, poi la copia salvata (ignorando ?q=… dei filtri), poi la pagina offline.
async function pagina(richiesta) {
  const cache = await caches.open(CACHE_SITO);
  try {
    const risposta = await fetch(richiesta);
    if (risposta.ok) cache.put(new URL(richiesta.url).pathname, risposta.clone());
    return risposta;
  } catch {
    return (
      (await cache.match(richiesta, { ignoreSearch: true })) ||
      (await cache.match(OFFLINE)) ||
      new Response('Sei offline.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } })
    );
  }
}

// CSS, JS, icone: prima la copia salvata.
async function file(richiesta) {
  const cache = await caches.open(CACHE_SITO);
  const salvata = await cache.match(richiesta);
  if (salvata) return salvata;
  const risposta = await fetch(richiesta);
  if (risposta.ok) cache.put(richiesta, risposta.clone());
  return risposta;
}

// Immagini delle carte: prima la copia salvata; le nuove si chiedono in modalità CORS
// (Scryfall lo permette) così occupano lo spazio vero e non quello gonfiato delle risposte "opache".
async function immagineCarta(richiesta) {
  const cache = await caches.open(CACHE_CARTE);
  const salvata = await cache.match(richiesta.url);
  if (salvata) return salvata;
  try {
    const risposta = await fetch(richiesta.url, { mode: 'cors', credentials: 'omit' });
    if (risposta.ok) {
      await cache.put(richiesta.url, risposta.clone());
      const chiavi = await cache.keys();
      for (const vecchia of chiavi.slice(0, Math.max(0, chiavi.length - LIMITE_IMMAGINI))) await cache.delete(vecchia);
    }
    return risposta;
  } catch {
    return fetch(richiesta);
  }
}
`;
}
