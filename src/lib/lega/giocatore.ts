// Dati per la pagina di un giocatore: il pool raggruppato per colore e lo storico delle sue partite.

import type { Carta } from '../carte/carta.ts';
import { IndiceCarte } from '../carte/nomi.ts';
import type { DatiLega, Giocatore } from '../dati/valida.ts';
import { testoRisultato, vincitore } from './match.ts';

// --- Pool -----------------------------------------------------------------------

export interface CartaDelPool {
  /** Nome scritto nel file del giocatore. */
  nome: string;
  /** Copie in tutto, sommando le serate. */
  copie: number;
  /** Dati di Scryfall; null se la carta non è nella cache. */
  carta: Carta | null;
}

export interface GruppoColore {
  /** "W", "U", "B", "R", "G", "multi", "incolore" o "sconosciute". */
  chiave: string;
  nome: string;
  /** Ordinate per valore di mana, poi per nome. */
  carte: CartaDelPool[];
  /** Carte del gruppo, contando le copie. */
  totale: number;
}

export interface PoolGiocatore {
  /** Carte in tutto, contando le copie. */
  totale: number;
  /** Carte arrivate a ogni serata (solo le serate con almeno una carta). */
  perSerata: { serata: number; carte: number }[];
  /** Solo i gruppi con almeno una carta, nell'ordine W U B R G, multicolore, incolore. */
  gruppi: GruppoColore[];
}

const GRUPPI: { chiave: string; nome: string }[] = [
  { chiave: 'W', nome: 'Bianco' },
  { chiave: 'U', nome: 'Blu' },
  { chiave: 'B', nome: 'Nero' },
  { chiave: 'R', nome: 'Rosso' },
  { chiave: 'G', nome: 'Verde' },
  { chiave: 'multi', nome: 'Multicolore' },
  { chiave: 'incolore', nome: 'Incolore' },
  { chiave: 'sconosciute', nome: 'Carte non trovate' },
];

function chiaveGruppo(carta: Carta | null): string {
  if (!carta) return 'sconosciute';
  if (carta.colori.length === 0) return 'incolore';
  return carta.colori.length === 1 ? carta.colori[0]! : 'multi';
}

/** Pool di tutte le serate messo insieme: le copie della stessa carta si sommano. */
export function poolDelGiocatore(giocatore: Giocatore, carte: Carta[]): PoolGiocatore {
  const indice = new IndiceCarte(carte);
  const unite = new Map<string, CartaDelPool>();
  for (const { carte: righe } of giocatore.pool) {
    for (const { nome, copie } of righe) {
      const carta = indice.trova(nome) ?? null;
      // La stessa carta può essere scritta in modi un po' diversi in serate diverse.
      const chiave = carta?.nome ?? nome;
      const giaVista = unite.get(chiave);
      if (giaVista) giaVista.copie += copie;
      else unite.set(chiave, { nome: carta?.nome ?? nome, copie, carta });
    }
  }

  const gruppi = GRUPPI.map(({ chiave, nome }) => {
    const delGruppo = [...unite.values()]
      .filter((c) => chiaveGruppo(c.carta) === chiave)
      .sort((a, b) => (a.carta?.valore ?? 0) - (b.carta?.valore ?? 0) || a.nome.localeCompare(b.nome));
    return { chiave, nome, carte: delGruppo, totale: delGruppo.reduce((n, c) => n + c.copie, 0) };
  }).filter((g) => g.totale > 0);

  const perSerata = giocatore.pool
    .map(({ serata, carte: righe }) => ({ serata, carte: righe.reduce((n, r) => n + r.copie, 0) }))
    .filter((s) => s.carte > 0);

  return { totale: gruppi.reduce((n, g) => n + g.totale, 0), perSerata, gruppi };
}

// --- Storico delle partite --------------------------------------------------------

export type Esito = 'vittoria' | 'pareggio' | 'sconfitta' | 'da-giocare' | 'bye' | 'assente';

export interface RoundGiocatore {
  numeroGlobale: number;
  serata: number;
  esito: Esito;
  /** Identificativo dell'avversario; null per bye e assenze. */
  avversario: string | null;
  /** Risultato dal punto di vista del giocatore, es. "2-1" (prima i suoi game); null se non c'è. */
  risultato: string | null;
}

/** I round abbinati finora, visti dal giocatore, dal più recente. */
export function partiteDelGiocatore(dati: DatiLega, id: string): RoundGiocatore[] {
  const righe: RoundGiocatore[] = [];
  for (const round of dati.round) {
    const base = { numeroGlobale: round.numeroGlobale, serata: round.serata };
    const partita = round.partite.find((p) => p.giocatori.includes(id));
    if (partita) {
      const lato = partita.giocatori[0] === id ? 0 : 1;
      const esito = vincitore(partita);
      let risultato = testoRisultato(partita);
      // Nel file il risultato è scritto dal punto di vista del primo giocatore: per il secondo si gira.
      if (risultato && lato === 1) {
        const [a, b, ...pareggi] = risultato.split('-');
        risultato = [b, a, ...pareggi].join('-');
      }
      righe.push({
        ...base,
        avversario: partita.giocatori[1 - lato]!,
        risultato,
        esito: esito === null ? 'da-giocare' : esito === 'pareggio' ? 'pareggio' : esito === lato ? 'vittoria' : 'sconfitta',
      });
    } else if (round.bye === id) {
      righe.push({ ...base, avversario: null, risultato: '2-0', esito: 'bye' });
    } else {
      righe.push({ ...base, avversario: null, risultato: null, esito: 'assente' });
    }
  }
  return righe.reverse();
}
