// Classifica della lega con i tie-breaker ufficiali (OMW%, GW%, OGW%).
// Regole (vedi PIANO.md):
// - vittoria 3 punti, pareggio 1, sconfitta 0; nella finale (ultima serata) i punti valgono ×2;
// - il bye vale come vittoria 2-0; l'assenza non conta niente;
// - le partite senza risultato (null) si ignorano;
// - i tie-breaker usano i punti senza il ×2; ogni avversario vale almeno il 33%;
// - pari su tutto: scontro diretto (con più di due giocatori, i punti negli scontri tra loro),
//   poi un sorteggio fisso (sempre lo stesso risultato).

import { NUMERO_SERATE, ROUND_PER_SERATA } from '../dati/schema.ts';
import type { DatiLega } from '../dati/valida.ts';

/** Percentuale minima di un avversario nel calcolo di OMW% e OGW%. */
export const MINIMO_AVVERSARIO = 1 / 3;

/** Punti di una partita (prima del moltiplicatore). */
const PUNTI_VITTORIA = 3;
const PUNTI_PAREGGIO = 1;

/** Differenze più piccole di così si considerano parità (evita errori di arrotondamento). */
const TOLLERANZA = 1e-9;

export interface RigaClassifica {
  /** Posizione in classifica: chi è pari su punti e tie-breaker condivide la stessa. */
  posizione: number;
  /** Vero se almeno un altro giocatore ha la stessa posizione. */
  pariMerito: boolean;
  id: string;
  nome: string;
  /** Punti in classifica, con il ×2 della finale. */
  punti: number;
  /** Partite vinte (bye compresi), pareggiate e perse. */
  vittorie: number;
  pareggi: number;
  sconfitte: number;
  bye: number;
  /** Game vinti, persi e pareggiati (il bye vale 2 game vinti). */
  gameVinti: number;
  gamePersi: number;
  gamePareggiati: number;
  /** Serate in cui ha giocato almeno una partita o ricevuto un bye. */
  serateGiocate: number;
  /** Percentuali da 0 a 1. */
  mw: number;
  omw: number;
  gw: number;
  ogw: number;
}

export interface Classifica {
  /** Ultimo round considerato (da 1 a 10); 0 se non si è ancora giocato. */
  finoAlRound: number;
  /** Dal primo all'ultimo. */
  righe: RigaClassifica[];
}

/** Una partita con risultato, vista come elenco di scontri per lo spareggio. */
export interface Scontro {
  giocatori: [string, string];
  /** Punti ottenuti da ciascuno dei due (senza moltiplicatore). */
  punti: [number, number];
}

interface Conteggio {
  punti: number;
  puntiTieBreaker: number;
  partite: number;
  vittorie: number;
  pareggi: number;
  sconfitte: number;
  bye: number;
  gameVinti: number;
  gamePersi: number;
  gamePareggiati: number;
  avversari: string[];
  serate: Set<number>;
}

/** Moltiplicatore dei punti di una serata: ×2 per la finale. */
export function moltiplicatore(serata: number): number {
  return serata === NUMERO_SERATE ? 2 : 1;
}

/** Ultimo round (globale) di una serata, es. serata 2 → round 4. */
export function ultimoRoundDellaSerata(serata: number): number {
  return serata * ROUND_PER_SERATA;
}

/**
 * Calcola la classifica considerando i round fino a `finoAlRound` compreso
 * (senza limite: tutti quelli registrati).
 */
export function calcolaClassifica(dati: DatiLega, finoAlRound = Number.POSITIVE_INFINITY): Classifica {
  const conteggi = new Map<string, Conteggio>();
  for (const g of dati.giocatori) {
    conteggi.set(g.id, {
      punti: 0,
      puntiTieBreaker: 0,
      partite: 0,
      vittorie: 0,
      pareggi: 0,
      sconfitte: 0,
      bye: 0,
      gameVinti: 0,
      gamePersi: 0,
      gamePareggiati: 0,
      avversari: [],
      serate: new Set(),
    });
  }
  const conteggio = (id: string): Conteggio => {
    const c = conteggi.get(id);
    if (!c) throw new Error(`Giocatore "${id}" sconosciuto: lancia "npm run controlla".`);
    return c;
  };

  const scontri: Scontro[] = [];
  let ultimoRound = 0;

  for (const round of dati.round) {
    if (round.numeroGlobale > finoAlRound) continue;
    ultimoRound = Math.max(ultimoRound, round.numeroGlobale);
    const per = moltiplicatore(round.serata);

    for (const partita of round.partite) {
      if (!partita.risultato) continue;
      const { vittorie, pareggi } = partita.risultato;
      const puntiPartita: [number, number] =
        vittorie[0] > vittorie[1]
          ? [PUNTI_VITTORIA, 0]
          : vittorie[0] < vittorie[1]
            ? [0, PUNTI_VITTORIA]
            : [PUNTI_PAREGGIO, PUNTI_PAREGGIO];
      scontri.push({ giocatori: partita.giocatori, punti: puntiPartita });

      for (const lato of [0, 1] as const) {
        const altro = lato === 0 ? 1 : 0;
        const c = conteggio(partita.giocatori[lato]);
        c.punti += puntiPartita[lato] * per;
        c.puntiTieBreaker += puntiPartita[lato];
        c.partite += 1;
        if (puntiPartita[lato] === PUNTI_VITTORIA) c.vittorie += 1;
        else if (puntiPartita[lato] === PUNTI_PAREGGIO) c.pareggi += 1;
        else c.sconfitte += 1;
        c.gameVinti += vittorie[lato];
        c.gamePersi += vittorie[altro];
        c.gamePareggiati += pareggi;
        c.avversari.push(partita.giocatori[altro]);
        c.serate.add(round.serata);
      }
    }

    if (round.bye) {
      const c = conteggio(round.bye);
      c.punti += PUNTI_VITTORIA * per;
      c.puntiTieBreaker += PUNTI_VITTORIA;
      c.partite += 1;
      c.vittorie += 1;
      c.bye += 1;
      c.gameVinti += 2;
      c.serate.add(round.serata);
    }
  }

  // Percentuali personali, poi quelle degli avversari.
  const mw = new Map<string, number>();
  const gw = new Map<string, number>();
  for (const [id, c] of conteggi) {
    mw.set(id, c.partite === 0 ? 0 : c.puntiTieBreaker / (PUNTI_VITTORIA * c.partite));
    const game = c.gameVinti + c.gamePersi + c.gamePareggiati;
    gw.set(id, game === 0 ? 0 : (PUNTI_VITTORIA * c.gameVinti + PUNTI_PAREGGIO * c.gamePareggiati) / (PUNTI_VITTORIA * game));
  }
  const mediaAvversari = (avversari: string[], percentuali: Map<string, number>): number => {
    if (avversari.length === 0) return 0;
    const somma = avversari.reduce((tot, a) => tot + Math.max(percentuali.get(a) ?? 0, MINIMO_AVVERSARIO), 0);
    return somma / avversari.length;
  };

  const righe: RigaClassifica[] = dati.giocatori.map((g) => {
    const c = conteggio(g.id);
    return {
      posizione: 0,
      pariMerito: false,
      id: g.id,
      nome: g.nome,
      punti: c.punti,
      vittorie: c.vittorie,
      pareggi: c.pareggi,
      sconfitte: c.sconfitte,
      bye: c.bye,
      gameVinti: c.gameVinti,
      gamePersi: c.gamePersi,
      gamePareggiati: c.gamePareggiati,
      serateGiocate: c.serate.size,
      mw: mw.get(g.id) ?? 0,
      omw: mediaAvversari(c.avversari, mw),
      gw: gw.get(g.id) ?? 0,
      ogw: mediaAvversari(c.avversari, gw),
    };
  });

  return { finoAlRound: ultimoRound, righe: ordina(righe, scontri) };
}

/** Classifica al termine di una serata (contando i round giocati fino a lì). */
export function classificaDellaSerata(dati: DatiLega, serata: number): Classifica {
  return calcolaClassifica(dati, ultimoRoundDellaSerata(serata));
}

/** Confronto su punti e tie-breaker: negativo se `a` sta sopra `b`, 0 se sono pari su tutto. */
function confrontaTieBreaker(a: RigaClassifica, b: RigaClassifica): number {
  for (const chiave of ['punti', 'omw', 'gw', 'ogw'] as const) {
    const differenza = b[chiave] - a[chiave];
    if (Math.abs(differenza) > TOLLERANZA) return differenza;
  }
  return 0;
}

/** Ordina per punti e tie-breaker; i gruppi pari su tutto passano dallo spareggio. */
function ordina(righe: RigaClassifica[], scontri: Scontro[]): RigaClassifica[] {
  const ordinate = [...righe].sort(confrontaTieBreaker);
  const risultato: RigaClassifica[] = [];

  for (let inizio = 0; inizio < ordinate.length; ) {
    let fine = inizio + 1;
    while (fine < ordinate.length && confrontaTieBreaker(ordinate[inizio]!, ordinate[fine]!) === 0) fine += 1;

    const gruppo = ordinate.slice(inizio, fine);
    const perId = new Map(gruppo.map((r) => [r.id, r]));
    for (const id of spareggio(gruppo.map((r) => r.id), scontri)) {
      risultato.push({ ...perId.get(id)!, posizione: inizio + 1, pariMerito: gruppo.length > 1 });
    }
    inizio = fine;
  }
  return risultato;
}

/**
 * Mette in ordine giocatori pari su punti e tie-breaker:
 * prima chi ha fatto più punti negli scontri tra loro, poi il sorteggio fisso.
 */
export function spareggio(ids: string[], scontri: Scontro[]): string[] {
  const nelGruppo = new Set(ids);
  const puntiTraLoro = new Map(ids.map((id) => [id, 0]));
  for (const s of scontri) {
    const [a, b] = s.giocatori;
    if (!nelGruppo.has(a) || !nelGruppo.has(b)) continue;
    puntiTraLoro.set(a, puntiTraLoro.get(a)! + s.punti[0]);
    puntiTraLoro.set(b, puntiTraLoro.get(b)! + s.punti[1]);
  }
  return [...ids].sort(
    (a, b) => puntiTraLoro.get(b)! - puntiTraLoro.get(a)! || sorteggio(a) - sorteggio(b) || a.localeCompare(b),
  );
}

/** Numero "a caso" ma sempre uguale per lo stesso identificativo (hash FNV-1a a 32 bit). */
export function sorteggio(id: string): number {
  let hash = 0x811c9dc5;
  for (const carattere of id) {
    hash ^= carattere.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** Percentuale in italiano con un decimale, es. 0.5556 → "55,6%". */
export function formattaPercentuale(valore: number): string {
  return `${(valore * 100).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
