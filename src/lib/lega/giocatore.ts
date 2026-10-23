// Dati per la pagina di un giocatore: il pool raggruppato per colore e lo storico delle sue partite.

import type { Carta } from '../carte/carta.ts';
import { IndiceCarte } from '../carte/nomi.ts';
import type { DatiLega, Giocatore } from '../dati/valida.ts';
import { testoRisultato, vincitore } from './match.ts';

// --- Pool -----------------------------------------------------------------------

export interface CartaDelPool {
  /** Nome di Scryfall, o quello scritto nel file se la carta non è nella cache. */
  nome: string;
  /** Copie in tutto, sommando le serate. */
  copie: number;
  /** Copie sbustate a ogni serata, dalla prima. */
  perSerata: { serata: number; copie: number }[];
  /** Dati di Scryfall; null se la carta non è nella cache. */
  carta: Carta | null;
}

export interface PoolGiocatore {
  /** Carte in tutto, contando le copie. */
  totale: number;
  /** Carte arrivate a ogni serata (solo le serate con almeno una carta). */
  perSerata: { serata: number; carte: number }[];
  /** Una voce per carta (le copie della stessa carta sono unite), in ordine di nome. */
  carte: CartaDelPool[];
}

/** Pool di tutte le serate messo insieme: le copie della stessa carta si sommano. */
export function poolDelGiocatore(giocatore: Giocatore, carte: Carta[]): PoolGiocatore {
  const indice = new IndiceCarte(carte);
  const unite = new Map<string, CartaDelPool>();
  for (const { serata, carte: righe } of giocatore.pool) {
    for (const { nome, copie } of righe) {
      const carta = indice.trova(nome) ?? null;
      // La stessa carta può essere scritta in modi un po' diversi in serate diverse.
      const chiave = carta?.nome ?? nome;
      let voce = unite.get(chiave);
      if (!voce) {
        voce = { nome: chiave, copie: 0, perSerata: [], carta };
        unite.set(chiave, voce);
      }
      voce.copie += copie;
      const giaNellaSerata = voce.perSerata.find((s) => s.serata === serata);
      if (giaNellaSerata) giaNellaSerata.copie += copie;
      else voce.perSerata.push({ serata, copie });
    }
  }

  const elenco = [...unite.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  const perSerata = giocatore.pool
    .map(({ serata, carte: righe }) => ({ serata, carte: righe.reduce((n, r) => n + r.copie, 0) }))
    .filter((s) => s.carte > 0);

  return { totale: elenco.reduce((n, c) => n + c.copie, 0), perSerata, carte: elenco };
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
