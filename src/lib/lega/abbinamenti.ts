// Abbinamenti svizzeri del prossimo round (vedi PIANO.md). Si guarda tutta la lega, dal round da
// abbinare fino all'ultimo (nei round futuri si suppone che ci siano tutti), e si sceglie così:
// 1. il maggior numero di scontri mai disputati in tutta la lega; a parità, il maggior numero
//    già in questo round (gli scontri nuovi si giocano il prima possibile);
// 2. se una coppia deve rigiocare, quella che si è affrontata meno volte: nessuno si affronta
//    per la terza volta se un'altra coppia può farlo per la seconda;
// 3. a parità: la classifica. Bye al più basso tra chi ne ha avuti meno; poi, dall'alto in basso,
//    ognuno contro il più alto possibile.
// Le ripetizioni scelte prima che i due abbiano incontrato tutti hanno un avviso.

import { NUMERO_SERATE, ROUND_PER_SERATA } from '../dati/schema.ts';
import type { DatiLega } from '../dati/valida.ts';
import { calcolaClassifica, moltiplicatore } from './classifica.ts';

/** Round totali della lega. */
export const ROUND_TOTALI = NUMERO_SERATE * ROUND_PER_SERATA;

/** Errore che impedisce di calcolare gli abbinamenti, già scritto in italiano. */
export class ErroreAbbinamenti extends Error {
  constructor(messaggio: string) {
    super(messaggio);
    this.name = 'ErroreAbbinamenti';
  }
}

/** Una partita tra due giocatori che si sono già affrontati. */
export interface Ripetizione {
  giocatori: [string, string];
  /** Quante volte si affrontano contando questa: 2 = seconda volta. */
  volta: number;
  /** Round (globali) in cui si erano già affrontati. */
  roundPrecedenti: number[];
}

export interface Abbinamenti {
  serata: number;
  /** Round della serata: 1 o 2. */
  round: number;
  /** Round dall'inizio della lega: da 1 a 10. */
  numeroGlobale: number;
  finale: boolean;
  /** Dal tavolo 1 in giù; in ogni partita c'è prima chi sta più in alto in classifica. */
  partite: [string, string][];
  bye: string | null;
  ripetizioni: Ripetizione[];
  /** Messaggi da leggere prima di annunciare gli abbinamenti. */
  avvisi: string[];
}

/** I dati che servono a cercare gli abbinamenti di un round. */
export interface Richiesta {
  /** Giocatori presenti, dal primo all'ultimo in classifica. */
  ordine: string[];
  /** Tutti i giocatori della lega: nei round futuri si suppone che ci siano tutti. */
  tutti: string[];
  /** Coppie già incontrate (chiave di `chiaveCoppia`) → round in cui si sono affrontate. */
  incontri: Map<string, number[]>;
  /** Round della lega che restano dopo questo. */
  roundFuturi: number;
  /** Chi può ricevere il bye, in ordine di preferenza (vuoto se i presenti sono pari). */
  candidatiBye: string[];
}

export interface Esito {
  partite: [string, string][];
  bye: string | null;
  ripetizioni: Ripetizione[];
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

  const incontri = new Map<string, number[]>();
  const byeAvuti = new Map(dati.giocatori.map((g) => [g.id, 0]));
  for (const r of dati.round) {
    if (r.bye) byeAvuti.set(r.bye, (byeAvuti.get(r.bye) ?? 0) + 1);
    for (const p of r.partite) {
      const chiave = chiaveCoppia(...p.giocatori);
      incontri.set(chiave, [...(incontri.get(chiave) ?? []), r.numeroGlobale]);
    }
  }

  // Bye: chi ne ha avuti meno, e tra questi il più basso in classifica.
  const posizione = new Map(ordine.map((id, i) => [id, i]));
  const candidatiBye =
    ordine.length % 2 === 0
      ? []
      : [...ordine].sort((a, b) => byeAvuti.get(a)! - byeAvuti.get(b)! || posizione.get(b)! - posizione.get(a)!);

  const tutti = dati.giocatori.map((g) => g.id);
  const esito = cercaAbbinamento({ ordine, tutti, incontri, roundFuturi: ROUND_TOTALI - numeroGlobale, candidatiBye });

  const avvisi: string[] = [];
  if (esito.bye !== null && esito.bye !== candidatiBye[0]) {
    avvisi.push(`Il bye va a ${nome(esito.bye)} invece che a ${nome(candidatiBye[0]!)}: così si giocano più scontri nuovi.`);
  }
  if (esito.bye !== null && byeAvuti.get(esito.bye)! > 0) {
    avvisi.push(`${nome(esito.bye)} riceve un altro bye: tutti gli altri presenti ne hanno già avuto almeno uno.`);
  }
  // Rigiocare è normale quando i due hanno già incontrato tutti; prima di allora si avvisa.
  const haIncontratoTutti = (id: string) => tutti.every((altro) => altro === id || incontri.has(chiaveCoppia(id, altro)));
  for (const r of esito.ripetizioni) {
    const [a, b] = r.giocatori;
    if (haIncontratoTutti(a) && haIncontratoTutti(b)) continue;
    avvisi.push(
      `${nome(a)} – ${nome(b)} si affrontano per la ${r.volta}ª volta (prima: round ${r.roundPrecedenti.join(', ')}) ` +
        `anche se non hanno ancora incontrato tutti: è la scelta che fa giocare più scontri nuovi da qui alla fine della lega.`,
    );
  }

  return {
    serata,
    round,
    numeroGlobale,
    finale: moltiplicatore(serata) > 1,
    partite: esito.partite,
    bye: esito.bye,
    ripetizioni: esito.ripetizioni,
    avvisi,
  };
}

/**
 * Costo di un insieme di partite: alla posizione t (da 0) quante partite si giocano tra due
 * giocatori che si erano già affrontati almeno t + 1 volte. Si confronta in ordine
 * (`confronta`): prima conta il numero di ripetizioni, poi quelle per la terza volta, ecc.
 * L'ultima voce (`TEMPO`) dice quanto presto arrivano le ripetizioni: ognuna pesa quanti
 * round mancano alla fine della lega contando il suo, così si preferisce rimandarle.
 */
type Costo = number[];

const LIVELLI = ROUND_TOTALI;
const TEMPO = LIVELLI;

function costoZero(): Costo {
  return new Array<number>(LIVELLI + 1).fill(0);
}

function somma(a: Costo, b: Costo): Costo {
  return a.map((x, i) => x + b[i]!);
}

/** a − b, voce per voce: a + c < b vale se e solo se c < b − a. */
function differenza(a: Costo, b: Costo): Costo {
  return a.map((x, i) => x - b[i]!);
}

function confronta(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return 0;
}

/** Cerca gli abbinamenti di un round con i criteri descritti in cima al file. */
export function cercaAbbinamento(richiesta: Richiesta): Esito {
  const { ordine, incontri, candidatiBye, roundFuturi } = richiesta;
  const piano = new Pianificatore(richiesta.tutti, incontri);
  const byeDaProvare = candidatiBye.length > 0 ? candidatiBye : [null];

  // Si confrontano: costo da qui alla fine della lega, costo di questo round, bye preferito.
  // A parità vince il primo trovato, cioè il più vicino alla classifica.
  let migliore: { partite: [string, string][]; bye: string | null; chiave: number[] } | null = null;
  for (const [indiceBye, bye] of byeDaProvare.entries()) {
    const restanti = ordine.filter((id) => id !== bye);
    for (const partite of tuttiGliAbbinamenti(restanti)) {
      const coppie = partite.map(([a, b]) => piano.coppia(a, b));
      const { costo, volte } = piano.gioca(piano.volteIniziali, coppie, roundFuturi + 1);
      // Tetto per i round futuri: arrivare al massimo a pareggiare il migliore (+1 all'ultima voce).
      let tetto: Costo | null = null;
      if (migliore) {
        tetto = differenza(migliore.chiave.slice(0, TEMPO + 1), costo);
        tetto[TEMPO]!++;
      }
      const futuro = piano.migliorFuturo(volte, roundFuturi, tetto);
      if (!futuro.esatto) continue;
      const chiave = [...somma(costo, futuro.costo), ...costo, indiceBye];
      if (!migliore || confronta(chiave, migliore.chiave) < 0) migliore = { partite, bye, chiave };
    }
  }
  if (!migliore) throw new Error('Nessun abbinamento possibile: non dovrebbe mai succedere.');

  const ripetizioni = migliore.partite
    .filter(([a, b]) => incontri.has(chiaveCoppia(a, b)))
    .map(([a, b]) => {
      const roundPrecedenti = incontri.get(chiaveCoppia(a, b))!;
      return { giocatori: [a, b] as [string, string], volta: roundPrecedenti.length + 1, roundPrecedenti };
    });
  return { partite: migliore.partite, bye: migliore.bye, ripetizioni };
}

/** Tutti gli abbinamenti completi, "dall'alto in basso": il primo contro il secondo, poi il terzo, ecc. */
function* tuttiGliAbbinamenti<T>(ordine: T[]): Generator<[T, T][]> {
  if (ordine.length === 0) {
    yield [];
    return;
  }
  const [primo, ...altri] = ordine as [T, ...T[]];
  for (let j = 0; j < altri.length; j++) {
    const resto = altri.filter((_, k) => k !== j);
    for (const partite of tuttiGliAbbinamenti(resto)) yield [[primo, altri[j]!], ...partite];
  }
}

/**
 * Calcola il costo minimo dei round futuri, supponendo che ci siano tutti i giocatori.
 * Le volte che ogni coppia si è affrontata stanno in un Uint8Array n × n; con un numero
 * dispari di giocatori si aggiunge un "bye" finto, che si può ricevere più volte e non costa niente.
 */
class Pianificatore {
  private readonly indice: Map<string, number>;
  private readonly n: number;
  private readonly finto: number;
  /** Tutti gli abbinamenti completi di un round futuro. */
  private readonly abbinamenti: [number, number][][];
  private readonly memoria = new Map<string, { costo: Costo; esatto: boolean }>();
  private readonly limiti = new Map<string, Costo>();
  readonly volteIniziali: Uint8Array;

  constructor(giocatori: string[], incontri: Map<string, number[]>) {
    this.indice = new Map(giocatori.map((id, i) => [id, i]));
    this.finto = giocatori.length % 2 === 1 ? giocatori.length : -1;
    this.n = giocatori.length + (this.finto === -1 ? 0 : 1);
    this.abbinamenti = [...tuttiGliAbbinamenti(Array.from({ length: this.n }, (_, i) => i))];
    this.volteIniziali = new Uint8Array(this.n * this.n);
    for (const [chiave, round] of incontri) {
      const [a, b] = chiave.split('|') as [string, string];
      const i = this.indice.get(a);
      const j = this.indice.get(b);
      if (i !== undefined && j !== undefined) this.volteIniziali[Math.min(i, j) * this.n + Math.max(i, j)] = round.length;
    }
  }

  /** Posizione di una coppia di giocatori. */
  coppia(a: string, b: string): [number, number] {
    return [this.indice.get(a)!, this.indice.get(b)!];
  }

  /** Costo di un round a `mancanti` round dalla fine (contando questo) e volte aggiornate dopo averlo giocato. */
  gioca(volte: Uint8Array, partite: [number, number][], mancanti: number): { costo: Costo; volte: Uint8Array } {
    const costo = costoZero();
    const dopo = volte.slice();
    for (const [x, y] of partite) {
      if (x === this.finto || y === this.finto) continue;
      const posto = Math.min(x, y) * this.n + Math.max(x, y);
      const prima = dopo[posto]!;
      for (let t = 0; t < prima && t < LIVELLI; t++) costo[t]!++;
      if (prima > 0) costo[TEMPO]! += mancanti;
      dopo[posto] = prima + 1;
    }
    return { costo, volte: dopo };
  }

  /**
   * Costo che i prossimi k round non possono comunque evitare. Al livello t, una partita è
   * "sotto il livello" se i due si erano affrontati meno di t + 1 volte; una coppia ne può
   * giocare al massimo min(k, t + 1 − volte) e ogni giocatore al massimo k (una per round).
   * Quante se ne possono giocare al massimo lo dice un flusso massimo (rilassato: può contare
   * mezze partite, quindi non sbaglia mai per eccesso); inoltre in un round non sono più di
   * quante ne permette un solo abbinamento (es. in un triangolo se ne gioca una sola per round).
   * Le partite che restano sono per forza al livello t.
   * Per `TEMPO`: la somma dei pesi è la somma, round per round, delle ripetizioni giocate fin lì;
   * e nei primi j round le ripetizioni sono almeno quelle inevitabili in j round.
   */
  limiteInferiore(volte: Uint8Array, k: number): Costo {
    if (k <= 0) return costoZero();
    const chiave = `${k}:${volte.join(',')}`;
    const salvato = this.limiti.get(chiave);
    if (salvato) return salvato;
    const limite = this.limiteDeiLivelli(volte, k).slice();
    for (let j = 1; j <= k; j++) limite[TEMPO]! += this.limiteDeiLivelli(volte, j)[0]!;
    this.limiti.set(chiave, limite);
    return limite;
  }

  /** Il limite inferiore dei livelli (senza `TEMPO`) per i prossimi k round. */
  private limiteDeiLivelli(volte: Uint8Array, k: number): Costo {
    const limite = costoZero();
    const chiave = `L${k}:${volte.join(',')}`;
    const salvato = this.limiti.get(chiave);
    if (salvato) return salvato;

    const partitePerRound = this.n / 2 - (this.finto === -1 ? 0 : 1);
    const reali = this.n - (this.finto === -1 ? 0 : 1);
    const capacita = new Int32Array(reali * reali);
    for (let t = 0; t < LIVELLI; t++) {
      const vicini = new Array<number>(reali).fill(0);
      for (let i = 0; i < reali; i++) {
        for (let j = i + 1; j < reali; j++) {
          const c = Math.min(k, Math.max(0, t + 1 - volte[i * this.n + j]!));
          capacita[i * reali + j] = capacita[j * reali + i] = c;
          if (c === 0) continue;
          vicini[i]! |= 1 << j;
          vicini[j]! |= 1 << i;
        }
      }
      const sotto = Math.min(
        Math.floor(flussoMassimo(capacita, reali, k) / 2),
        k * Math.min(partitePerRound, abbinamentoMassimo(vicini)),
      );
      limite[t] = Math.max(0, k * partitePerRound - sotto);
      // Se tutte le partite possono stare sotto il livello, lo stesso vale per i livelli più alti.
      if (limite[t] === 0) break;
    }
    this.limiti.set(chiave, limite);
    return limite;
  }

  /**
   * Il costo minimo dei prossimi k round, se è minore di `tetto`; altrimenti basta sapere che
   * non lo è (`esatto: false`, con un costo che non supera quello vero). Il tetto permette di
   * abbandonare presto le strade che non possono battere la migliore già trovata.
   */
  migliorFuturo(volte: Uint8Array, k: number, tetto: Costo | null = null): { costo: Costo; esatto: boolean } {
    if (k <= 0) return { costo: costoZero(), esatto: true };
    const chiave = `${k}:${volte.join(',')}`;
    const salvato = this.memoria.get(chiave);
    if (salvato && (salvato.esatto || (tetto && confronta(salvato.costo, tetto) >= 0))) return salvato;

    const limite = this.limiteInferiore(volte, k);
    if (tetto && confronta(limite, tetto) >= 0) return { costo: limite, esatto: false };

    // Prima gli abbinamenti che costano meno in questo round: si trova presto una buona soluzione.
    const prove = this.abbinamenti.map((partite) => this.gioca(volte, partite, k)).sort((a, b) => confronta(a.costo, b.costo));
    let migliore: Costo | null = null;
    let soglia = tetto;
    for (const { costo, volte: dopo } of prove) {
      if (soglia && confronta(somma(costo, this.limiteInferiore(dopo, k - 1)), soglia) >= 0) continue;
      const resto = this.migliorFuturo(dopo, k - 1, soglia && differenza(soglia, costo));
      if (!resto.esatto) continue;
      const totale = somma(costo, resto.costo);
      if (!soglia || confronta(totale, soglia) < 0) migliore = soglia = totale;
      if (confronta(totale, limite) === 0) break;
    }
    // Nessuna strada sotto il tetto: il costo vero è almeno il tetto.
    const esito = migliore ? { costo: migliore, esatto: true } : { costo: tetto!, esatto: false };
    this.memoria.set(chiave, esito);
    return esito;
  }
}

/** Il massimo numero di partite giocabili insieme in un round, date le coppie ammesse (`vicini[i]`: bit j = i-j ammessa). */
function abbinamentoMassimo(vicini: number[], liberi = (1 << vicini.length) - 1): number {
  if (liberi === 0) return 0;
  const i = 31 - Math.clz32(liberi & -liberi);
  const altri = liberi & ~(1 << i);
  // O i resta senza avversario in questo abbinamento, o gioca contro uno dei suoi vicini liberi.
  let migliore = abbinamentoMassimo(vicini, altri);
  for (let possibili = vicini[i]! & altri; possibili !== 0; possibili &= possibili - 1) {
    const j = 31 - Math.clz32(possibili & -possibili);
    migliore = Math.max(migliore, 1 + abbinamentoMassimo(vicini, altri & ~(1 << j)));
    if (2 * migliore >= vicini.length - 1) break;
  }
  return migliore;
}

/**
 * Flusso massimo nel grafo "sdoppiato": ogni giocatore ha una copia a sinistra e una a destra,
 * con al massimo `perGiocatore` unità per copia; la coppia i-j porta fino a `capacita[i·m + j]`
 * unità da i a j e altrettante da j a i. Metà del flusso è un limite superiore alle partite giocabili.
 */
function flussoMassimo(capacita: Int32Array, m: number, perGiocatore: number): number {
  const nodi = 2 * m + 2;
  const sorgente = 0;
  const pozzo = nodi - 1;
  const residuo = new Int32Array(nodi * nodi);
  for (let i = 0; i < m; i++) {
    residuo[sorgente * nodi + 1 + i] = perGiocatore;
    residuo[(1 + m + i) * nodi + pozzo] = perGiocatore;
    for (let j = 0; j < m; j++) residuo[(1 + i) * nodi + 1 + m + j] = capacita[i * m + j]!;
  }

  let flusso = 0;
  const padre = new Int32Array(nodi);
  const coda = new Int32Array(nodi);
  for (;;) {
    // Cammino più corto con capacità residua (Edmonds-Karp).
    padre.fill(-1);
    padre[sorgente] = sorgente;
    coda[0] = sorgente;
    let fine = 1;
    for (let q = 0; q < fine && padre[pozzo] === -1; q++) {
      const u = coda[q]!;
      for (let v = 0; v < nodi; v++) {
        if (padre[v] === -1 && residuo[u * nodi + v]! > 0) {
          padre[v] = u;
          coda[fine++] = v;
        }
      }
    }
    if (padre[pozzo] === -1) return flusso;
    let aumento = Infinity;
    for (let v = pozzo; v !== sorgente; v = padre[v]!) aumento = Math.min(aumento, residuo[padre[v]! * nodi + v]!);
    for (let v = pozzo; v !== sorgente; v = padre[v]!) {
      residuo[padre[v]! * nodi + v]! -= aumento;
      residuo[v * nodi + padre[v]!]! += aumento;
    }
    flusso += aumento;
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
