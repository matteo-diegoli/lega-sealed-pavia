// Richieste all'API di Scryfall, seguendo le sue regole:
// User-Agent che identifica il progetto, Accept JSON e una pausa tra una richiesta e l'altra.
// https://scryfall.com/docs/api

import type { CartaScryfall } from './carta.ts';

const API = 'https://api.scryfall.com';
const INTESTAZIONI = {
  'User-Agent': 'LegaSealedPavia/0.1 (sito di una lega sealed tra amici)',
  Accept: 'application/json',
};
/** Scryfall chiede 50–100 ms tra una richiesta e l'altra: stiamo larghi. */
const PAUSA_MS = 150;
/** Massimo di carte per ogni richiesta a /cards/collection. */
const MAX_PER_RICHIESTA = 75;

let ultimaRichiesta = 0;

async function richiesta<T>(url: string, init: RequestInit = {}): Promise<T> {
  const attesa = ultimaRichiesta + PAUSA_MS - Date.now();
  if (attesa > 0) await new Promise((fatto) => setTimeout(fatto, attesa));
  ultimaRichiesta = Date.now();

  let risposta: Response;
  try {
    risposta = await fetch(url, { ...init, headers: { ...INTESTAZIONI, ...init.headers } });
  } catch (e) {
    throw new Error(`non riesco a collegarmi a Scryfall: controlla la connessione a Internet (${(e as Error).message})`);
  }
  if (!risposta.ok) {
    const corpo = (await risposta.json().catch(() => null)) as { details?: string } | null;
    throw new Error(`Scryfall ha risposto con un errore ${risposta.status}: ${corpo?.details ?? risposta.statusText}`);
  }
  return (await risposta.json()) as T;
}

interface Pagina {
  data: CartaScryfall[];
  has_more: boolean;
  next_page?: string;
}

/** Tutte le stampe di un set (comprese le versioni alternative), pagina per pagina. */
export async function scaricaSet(set: string): Promise<CartaScryfall[]> {
  const stampe: CartaScryfall[] = [];
  let url: string | undefined = `${API}/cards/search?q=${encodeURIComponent(`e:${set}`)}&unique=prints&order=set`;
  while (url !== undefined) {
    const pagina: Pagina = await richiesta<Pagina>(url);
    stampe.push(...pagina.data);
    url = pagina.has_more ? pagina.next_page : undefined;
  }
  return stampe;
}

interface RispostaCollezione {
  data: CartaScryfall[];
  not_found: { name?: string }[];
}

/** Cerca delle carte per nome esatto su tutta Scryfall (serve per le carte di altri set). */
export async function cercaPerNome(nomi: string[]): Promise<{ trovate: CartaScryfall[]; nonTrovate: string[] }> {
  const trovate: CartaScryfall[] = [];
  const nonTrovate: string[] = [];
  for (let i = 0; i < nomi.length; i += MAX_PER_RICHIESTA) {
    const gruppo = nomi.slice(i, i + MAX_PER_RICHIESTA);
    const risposta = await richiesta<RispostaCollezione>(`${API}/cards/collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: gruppo.map((name) => ({ name })) }),
    });
    trovate.push(...risposta.data);
    nonTrovate.push(...risposta.not_found.flatMap((n) => (n.name ? [n.name] : [])));
  }
  return { trovate, nonTrovate };
}
