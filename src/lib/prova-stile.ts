// TEMPORANEO (Fase 3): dati comuni alle due pagine di prova dello stile.
// Si cancella insieme a src/pages/prova-stile-*.astro dopo la scelta.

import { leggiCacheCarte, caricaDati } from './dati/carica.ts';
import { NUMERO_SERATE } from './dati/schema.ts';
import type { Carta, Rarita } from './carte/carta.ts';
import { IndiceCarte } from './carte/nomi.ts';
import { calcolaClassifica, classificaDellaSerata, formattaPercentuale, moltiplicatore } from './lega/classifica.ts';

export interface RigaVista {
  posizione: string;
  id: string;
  nome: string;
  punti: number;
  record: string;
  omw: string;
  gw: string;
  ogw: string;
  /** Posizioni guadagnate (+) o perse (−) rispetto alla serata precedente. */
  variazione: number;
}

export interface PartitaVista {
  a: string;
  b: string;
  risultato: string | null;
  vincitore: 'a' | 'b' | null;
}

export interface CartaVista {
  nome: string;
  copie: number;
  rarita: Rarita;
  colori: string[];
  immagine: string;
}

const ORDINE_RARITA: Record<Rarita, number> = { mythic: 0, rare: 1, uncommon: 2, common: 3, special: 4, bonus: 5 };

export function datiProvaStile() {
  const dati = caricaDati();
  const nomi = new Map(dati.giocatori.map((g) => [g.id, g.nome]));
  const classifica = calcolaClassifica(dati);
  const ultimoRound = dati.round.at(-1);
  const serataAttuale = ultimoRound?.serata ?? 1;

  // Variazione rispetto al termine della serata precedente.
  const prima = serataAttuale > 1 ? classificaDellaSerata(dati, serataAttuale - 1) : null;
  const posizionePrima = new Map(prima?.righe.map((r, i) => [r.id, i + 1]) ?? []);

  const righe: RigaVista[] = classifica.righe.map((r, i) => ({
    posizione: `${r.posizione}${r.pariMerito ? '=' : ''}`,
    id: r.id,
    nome: r.nome,
    punti: r.punti,
    record: `${r.vittorie}-${r.pareggi}-${r.sconfitte}`,
    omw: formattaPercentuale(r.omw),
    gw: formattaPercentuale(r.gw),
    ogw: formattaPercentuale(r.ogw),
    variazione: (posizionePrima.get(r.id) ?? i + 1) - (i + 1),
  }));

  const partite: PartitaVista[] = (ultimoRound?.partite ?? []).map((p) => {
    const [a, b] = p.giocatori;
    const v = p.risultato?.vittorie;
    return {
      a: nomi.get(a) ?? a,
      b: nomi.get(b) ?? b,
      risultato: p.risultato ? `${v![0]}-${v![1]}${p.risultato.pareggi ? `-${p.risultato.pareggi}` : ''}` : null,
      vincitore: v === undefined || v[0] === v[1] ? null : v[0] > v[1] ? 'a' : 'b',
    };
  });

  // Anteprima del pool del primo in classifica: le carte più rare.
  const primo = dati.giocatori.find((g) => g.id === classifica.righe[0]?.id)!;
  const indice = new IndiceCarte(leggiCacheCarte()?.carte ?? []);
  const carte: CartaVista[] = primo.pool
    .flatMap((s) => s.carte)
    .map((c) => ({ riga: c, carta: indice.trova(c.nome) }))
    .filter((x): x is { riga: (typeof x)['riga']; carta: Carta } => x.carta !== undefined)
    .sort((x, y) => ORDINE_RARITA[x.carta.rarita] - ORDINE_RARITA[y.carta.rarita])
    .slice(0, 8)
    .map(({ riga, carta }) => ({
      nome: carta.nome,
      copie: riga.copie,
      rarita: carta.rarita,
      colori: carta.colori,
      immagine: carta.immagini[0]?.normale ?? '',
    }));
  const totaleCarte = primo.pool.flatMap((s) => s.carte).reduce((n, c) => n + c.copie, 0);

  return {
    nomeLega: dati.lega.nome,
    serataAttuale,
    roundAttuale: ultimoRound?.numeroGlobale ?? 0,
    finale: serataAttuale === NUMERO_SERATE,
    moltiplicatore: moltiplicatore(serataAttuale),
    righe,
    partite,
    bye: ultimoRound?.bye ? (nomi.get(ultimoRound.bye) ?? ultimoRound.bye) : null,
    pool: { nome: primo.nome, carte, totaleCarte },
  };
}
