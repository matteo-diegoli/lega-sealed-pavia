// Abbinamenti svizzeri del prossimo round (vedi PIANO.md):
// - ordine della classifica dopo l'ultimo round giocato; si parte dal primo, che affronta il
//   giocatore più in alto ancora libero e mai incontrato nel ciclo, e così via scendendo;
// - backtracking: si accetta un abbinamento solo se i round rimasti nel ciclo si possono ancora
//   abbinare senza rivincite (così R7 e R10 sono sempre abbinabili);
// - ciclo 1 (R1–R7): mai rivincite; ciclo 2 (R8–R10): mai rivincite dentro il ciclo 2;
// - bye (presenti dispari): al più basso in classifica tra chi ne ha avuti meno;
// - se le assenze rendono impossibile evitare le rivincite: il minor numero possibile,
//   preferendo quelle giocate più tempo fa, con un avviso.

import { NUMERO_SERATE, ROUND_PER_SERATA } from '../dati/schema.ts';
import type { DatiLega } from '../dati/valida.ts';
import { calcolaClassifica, moltiplicatore } from './classifica.ts';

/** Ultimo round del ciclo 1 (girone senza rivincite). */
export const ULTIMO_ROUND_CICLO_1 = 7;

/** Round totali della lega. */
export const ROUND_TOTALI = NUMERO_SERATE * ROUND_PER_SERATA;

/** Errore che impedisce di calcolare gli abbinamenti, già scritto in italiano. */
export class ErroreAbbinamenti extends Error {
  constructor(messaggio: string) {
    super(messaggio);
    this.name = 'ErroreAbbinamenti';
  }
}

export interface Rivincita {
  giocatori: [string, string];
  /** Ultimo round (globale) in cui si erano già affrontati in questo ciclo. */
  roundPrecedente: number;
}

export interface Abbinamenti {
  serata: number;
  /** Round della serata: 1 o 2. */
  round: number;
  /** Round dall'inizio della lega: da 1 a 10. */
  numeroGlobale: number;
  ciclo: 1 | 2;
  finale: boolean;
  /** Dal tavolo 1 in giù; in ogni partita c'è prima chi sta più in alto in classifica. */
  partite: [string, string][];
  bye: string | null;
  rivincite: Rivincita[];
  /** Messaggi da leggere prima di annunciare gli abbinamenti. */
  avvisi: string[];
}

/** I dati che servono a cercare gli abbinamenti di un round. */
export interface Richiesta {
  /** Giocatori presenti, dal primo all'ultimo in classifica. */
  ordine: string[];
  /** Tutti i giocatori della lega: nei round futuri si suppone che ci siano tutti. */
  tutti: string[];
  /** Coppie già incontrate nel ciclo (chiave di `chiaveCoppia`) → ultimo round in cui si sono affrontate. */
  incontri: Map<string, number>;
  /** Round del ciclo, dopo questo, che devono restare abbinabili senza rivincite. */
  roundFuturi: number;
  /** Chi può ricevere il bye, in ordine di preferenza (vuoto se i presenti sono pari). */
  candidatiBye: string[];
}

export interface Esito {
  partite: [string, string][];
  bye: string | null;
  rivincite: Rivincita[];
  /** Falso se non si è potuto garantire che i round futuri del ciclo siano abbinabili. */
  futuroGarantito: boolean;
}

/** Chiave di una coppia di giocatori, uguale in qualunque ordine. */
export function chiaveCoppia(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Serata e round (della serata) di un round globale, es. 5 → serata 3, round 1. */
export function serataDelRound(numeroGlobale: number): { serata: number; round: number } {
  return {
    serata: Math.ceil(numeroGlobale / ROUND_PER_SERATA),
    round: ((numeroGlobale - 1) % ROUND_PER_SERATA) + 1,
  };
}

/** Il prossimo round da abbinare; errore se il precedente non ha tutti i risultati o la lega è finita. */
export function prossimoRound(dati: DatiLega): number {
  const ultimo = dati.round.at(-1);
  if (!ultimo) return 1;
  const mancanti = ultimo.partite.filter((p) => p.risultato === null);
  if (mancanti.length > 0) {
    const elenco = mancanti.map((p) => p.giocatori.join(' – ')).join(', ');
    throw new ErroreAbbinamenti(
      `Nel file ${ultimo.percorso} mancano dei risultati (${elenco}): scrivili prima di abbinare il round successivo.`,
    );
  }
  if (ultimo.numeroGlobale >= ROUND_TOTALI) {
    throw new ErroreAbbinamenti(`La lega è finita: tutti i ${ROUND_TOTALI} round sono già stati abbinati.`);
  }
  return ultimo.numeroGlobale + 1;
}

/** Calcola gli abbinamenti del prossimo round. */
export function calcolaAbbinamenti(dati: DatiLega): Abbinamenti {
  const numeroGlobale = prossimoRound(dati);
  const { serata, round } = serataDelRound(numeroGlobale);
  const datiSerata = dati.lega.serate.find((s) => s.numero === serata);
  if (!datiSerata) {
    throw new ErroreAbbinamenti(`In data/league.yml manca la serata ${serata}: aggiungila con data e assenti.`);
  }
  if (datiSerata.data === null) {
    throw new ErroreAbbinamenti(
      `In data/league.yml la serata ${serata} non ha ancora una data: scrivila (es. data: 2026-11-05) e controlla gli assenti.`,
    );
  }

  const nomi = new Map(dati.giocatori.map((g) => [g.id, g.nome]));
  const nome = (id: string) => nomi.get(id) ?? id;
  const assenti = new Set(datiSerata.assenti);
  const classifica = calcolaClassifica(dati, numeroGlobale - 1);
  const ordine = classifica.righe.map((r) => r.id).filter((id) => !assenti.has(id));
  if (ordine.length < 2) {
    throw new ErroreAbbinamenti(`Alla serata ${serata} ci sono meno di due giocatori presenti: non si può abbinare niente.`);
  }

  const ciclo = numeroGlobale <= ULTIMO_ROUND_CICLO_1 ? 1 : 2;
  const inizioCiclo = ciclo === 1 ? 1 : ULTIMO_ROUND_CICLO_1 + 1;
  const fineCiclo = ciclo === 1 ? ULTIMO_ROUND_CICLO_1 : ROUND_TOTALI;

  const incontri = new Map<string, number>();
  const byeAvuti = new Map(dati.giocatori.map((g) => [g.id, 0]));
  for (const r of dati.round) {
    if (r.bye) byeAvuti.set(r.bye, (byeAvuti.get(r.bye) ?? 0) + 1);
    if (r.numeroGlobale < inizioCiclo) continue;
    for (const p of r.partite) incontri.set(chiaveCoppia(...p.giocatori), r.numeroGlobale);
  }

  // Con n giocatori (pari) non si possono giocare più di n − 1 round senza rivincite:
  // oltre quel limite non ha senso chiedere ai round futuri di evitarle.
  const giocatoriPari = dati.giocatori.length + (dati.giocatori.length % 2);
  const roundFuturi = Math.max(
    0,
    Math.min(fineCiclo - numeroGlobale, giocatoriPari - 1 - (numeroGlobale - inizioCiclo + 1)),
  );

  // Bye: chi ne ha avuti meno, e tra questi il più basso in classifica.
  const posizione = new Map(ordine.map((id, i) => [id, i]));
  const candidatiBye =
    ordine.length % 2 === 0
      ? []
      : [...ordine].sort((a, b) => byeAvuti.get(a)! - byeAvuti.get(b)! || posizione.get(b)! - posizione.get(a)!);

  const esito = cercaAbbinamento({ ordine, tutti: dati.giocatori.map((g) => g.id), incontri, roundFuturi, candidatiBye });

  const avvisi: string[] = [];
  if (esito.bye !== null && esito.bye !== candidatiBye[0]) {
    avvisi.push(
      `Il bye va a ${nome(esito.bye)} invece che a ${nome(candidatiBye[0]!)}: altrimenti non si riuscivano a evitare le rivincite.`,
    );
  }
  if (esito.bye !== null && byeAvuti.get(esito.bye)! > 0) {
    avvisi.push(`${nome(esito.bye)} riceve un altro bye: tutti gli altri presenti ne hanno già avuto almeno uno.`);
  }
  for (const r of esito.rivincite) {
    avvisi.push(
      `Rivincita inevitabile per le assenze: ${nome(r.giocatori[0])} – ${nome(r.giocatori[1])} ` +
        `(si sono già affrontati nel round ${r.roundPrecedente}).`,
    );
  }
  if (esito.rivincite.length === 0 && !esito.futuroGarantito) {
    avvisi.push(
      `Per le assenze non si può garantire che i prossimi round del ciclo ${ciclo} si abbinino senza rivincite: potrebbero servirne.`,
    );
  }

  return {
    serata,
    round,
    numeroGlobale,
    ciclo,
    finale: moltiplicatore(serata) > 1,
    partite: esito.partite,
    bye: esito.bye,
    rivincite: esito.rivincite,
    avvisi,
  };
}

/**
 * Cerca gli abbinamenti di un round, in tre tentativi:
 * 1. senza rivincite e con i round futuri del ciclo ancora abbinabili;
 * 2. senza rivincite (il futuro non è garantito);
 * 3. con il minor numero di rivincite, le più vecchie possibile.
 */
export function cercaAbbinamento(richiesta: Richiesta): Esito {
  const { ordine, incontri, candidatiBye } = richiesta;
  const byeDaProvare = candidatiBye.length > 0 ? candidatiBye : [null];
  const futuro = new ControlloFuturo(richiesta.tutti);
  const giaIncontrati = futuro.maschera([...incontri.keys()].map((k) => k.split('|') as [string, string]));

  for (const controllaFuturo of [true, false]) {
    for (const bye of byeDaProvare) {
      const restanti = ordine.filter((id) => id !== bye);
      const partite = primoAbbinamento(restanti, (a, b) => !incontri.has(chiaveCoppia(a, b)), (partite) =>
        !controllaFuturo || futuro.possibile(giaIncontrati | futuro.maschera(partite), richiesta.roundFuturi),
      );
      if (partite) return { partite, bye, rivincite: [], futuroGarantito: controllaFuturo || richiesta.roundFuturi === 0 };
    }
  }

  // Rivincite inevitabili: si confrontano tutti gli abbinamenti possibili.
  let migliore: { esito: Esito; costo: number[] } | null = null;
  for (const [indiceBye, bye] of byeDaProvare.entries()) {
    const restanti = ordine.filter((id) => id !== bye);
    for (const partite of tuttiGliAbbinamenti(restanti)) {
      const rivincite = partite
        .filter(([a, b]) => incontri.has(chiaveCoppia(a, b)))
        .map(([a, b]) => ({ giocatori: [a, b] as [string, string], roundPrecedente: incontri.get(chiaveCoppia(a, b))! }));
      // Meno rivincite; poi la più recente il più indietro possibile; poi il bye preferito.
      const costo = [rivincite.length, Math.max(0, ...rivincite.map((r) => r.roundPrecedente)), indiceBye];
      if (!migliore || confrontaCosti(costo, migliore.costo) < 0) {
        migliore = { esito: { partite, bye, rivincite, futuroGarantito: false }, costo };
      }
    }
  }
  if (!migliore) throw new Error('Nessun abbinamento possibile: non dovrebbe mai succedere.');
  return migliore.esito;
}

function confrontaCosti(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return 0;
}

/**
 * Primo abbinamento completo "dall'alto in basso": il primo libero affronta il più alto
 * ammesso, ecc. Se più avanti non si riesce a chiudere, torna indietro (backtracking).
 */
function primoAbbinamento(
  ordine: string[],
  ammesso: (a: string, b: string) => boolean,
  accetta: (partite: [string, string][]) => boolean,
): [string, string][] | null {
  const liberi = ordine.map(() => true);
  const partite: [string, string][] = [];

  const cerca = (): boolean => {
    const i = liberi.indexOf(true);
    if (i === -1) return accetta(partite);
    liberi[i] = false;
    for (let j = i + 1; j < ordine.length; j++) {
      if (!liberi[j] || !ammesso(ordine[i]!, ordine[j]!)) continue;
      liberi[j] = false;
      partite.push([ordine[i]!, ordine[j]!]);
      if (cerca()) return true;
      partite.pop();
      liberi[j] = true;
    }
    liberi[i] = true;
    return false;
  };

  return cerca() ? partite.map(([a, b]) => [a, b]) : null;
}

/** Tutti gli abbinamenti completi, nello stesso ordine "dall'alto in basso". */
function* tuttiGliAbbinamenti(ordine: string[]): Generator<[string, string][]> {
  if (ordine.length === 0) {
    yield [];
    return;
  }
  const [primo, ...altri] = ordine as [string, ...string[]];
  for (let j = 0; j < altri.length; j++) {
    const resto = altri.filter((_, k) => k !== j);
    for (const partite of tuttiGliAbbinamenti(resto)) yield [[primo, altri[j]!], ...partite];
  }
}

/**
 * Controlla se i prossimi k round si possono abbinare senza rivincite, supponendo che ci
 * siano tutti i giocatori. Le coppie già giocate sono i bit di un BigInt; con un numero
 * dispari di giocatori si aggiunge un "bye" finto, che si può ricevere più volte.
 */
class ControlloFuturo {
  private readonly indice: Map<string, number>;
  private readonly n: number;
  private readonly finto: number;
  private readonly memoria = new Map<string, boolean>();

  constructor(giocatori: string[]) {
    this.indice = new Map(giocatori.map((id, i) => [id, i]));
    this.finto = giocatori.length % 2 === 1 ? giocatori.length : -1;
    this.n = giocatori.length + (this.finto === -1 ? 0 : 1);
  }

  private bit(i: number, j: number): bigint {
    return 1n << BigInt(Math.min(i, j) * this.n + Math.max(i, j));
  }

  maschera(coppie: [string, string][]): bigint {
    let m = 0n;
    for (const [a, b] of coppie) {
      const i = this.indice.get(a);
      const j = this.indice.get(b);
      if (i !== undefined && j !== undefined) m |= this.bit(i, j);
    }
    return m;
  }

  possibile(usate: bigint, k: number): boolean {
    if (k <= 0) return true;
    const chiave = `${usate}:${k}`;
    const salvato = this.memoria.get(chiave);
    if (salvato !== undefined) return salvato;

    const libera = (i: number, j: number) => i === this.finto || j === this.finto || (usate & this.bit(i, j)) === 0n;

    // Scorciatoia: ogni giocatore deve avere ancora almeno k avversari possibili.
    let risultato = true;
    for (let i = 0; i < this.n && risultato; i++) {
      let avversari = 0;
      for (let j = 0; j < this.n; j++) if (j !== i && libera(i, j)) avversari++;
      if (avversari < k) risultato = false;
    }

    if (risultato) {
      const liberi = new Array<boolean>(this.n).fill(true);
      const cerca = (nuove: bigint): boolean => {
        const i = liberi.indexOf(true);
        if (i === -1) return this.possibile(usate | nuove, k - 1);
        liberi[i] = false;
        for (let j = i + 1; j < this.n; j++) {
          if (!liberi[j] || !libera(i, j)) continue;
          liberi[j] = false;
          const coppia = i === this.finto || j === this.finto ? 0n : this.bit(i, j);
          if (cerca(nuove | coppia)) return true;
          liberi[j] = true;
        }
        liberi[i] = true;
        return false;
      };
      risultato = cerca(0n);
    }

    this.memoria.set(chiave, risultato);
    return risultato;
  }
}

/** Il file YAML del round, con i risultati da scrivere (null). */
export function fileDelRound(abbinamenti: Abbinamenti, oggi: string): string {
  const righe = [
    `# Abbinamenti calcolati da "npm run pair" il ${oggi}.`,
    '# A fine partita scrivi il risultato al posto di null: 2-0, 2-1, 1-2, 1-1-1, ...',
    '',
    `serata: ${abbinamenti.serata}`,
    `round: ${abbinamenti.round}`,
    '',
    'partite:',
    ...abbinamenti.partite.flatMap(([a, b]) => [`  - giocatori: [${a}, ${b}]`, '    risultato: null']),
    '',
    `bye: ${abbinamenti.bye ?? 'null'}`,
    '',
  ];
  return righe.join('\n');
}
