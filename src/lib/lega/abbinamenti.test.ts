import { describe, expect, it } from 'vitest';
import { validaDati } from '../dati/valida.ts';
import type { DatiLega } from '../dati/valida.ts';
import {
  ErroreAbbinamenti,
  ROUND_TOTALI,
  calcolaAbbinamenti,
  cercaAbbinamento,
  chiaveCoppia,
  fileDelRound,
  type Richiesta,
} from './abbinamenti.ts';
import { lega, round, type PartitaBreve } from './prova.ts';

/** Coppie già incontrate scritte come "a-b": la i-esima si considera giocata nel round i + 1. */
function incontriDa(incontri: string[]): Map<string, number[]> {
  const mappa = new Map<string, number[]>();
  incontri.forEach((c, i) => {
    const chiave = chiaveCoppia(...(c.split('-') as [string, string]));
    mappa.set(chiave, [...(mappa.get(chiave) ?? []), i + 1]);
  });
  return mappa;
}

/** Richiesta con valori di comodo: le coppie già incontrate si scrivono come "a-b". */
function richiesta(ordine: string[], incontri: string[] = [], altro: Partial<Richiesta> = {}): Richiesta {
  return {
    ordine,
    tutti: ordine,
    incontri: incontriDa(incontri),
    roundFuturi: 0,
    candidatiBye: [],
    ...altro,
  };
}

describe('cercaAbbinamento', () => {
  it('abbina dall\'alto in basso', () => {
    expect(cercaAbbinamento(richiesta(['a', 'b', 'c', 'd'])).partite).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('salta chi si è già incontrato', () => {
    expect(cercaAbbinamento(richiesta(['a', 'b', 'c', 'd'], ['a-b'])).partite).toEqual([['a', 'c'], ['b', 'd']]);
  });

  it('torna indietro se più in basso non si chiude', () => {
    // a-c lascerebbe b-d, già giocata: si passa ad a-d.
    expect(cercaAbbinamento(richiesta(['a', 'b', 'c', 'd'], ['a-b', 'c-d', 'b-d'])).partite).toEqual([
      ['a', 'd'],
      ['b', 'c'],
    ]);
  });

  it('evita abbinamenti che toglierebbero scontri nuovi ai round futuri', () => {
    // 6 giocatori, due gruppi X = {x1, x2, x3} e Y = {y1, y2, y3}; nei primi due round solo X contro Y.
    // Il primo abbinamento "di classifica" sarebbe di nuovo X contro Y (x1-y3, x2-y1, x3-y2):
    // restano allora due triangoli, e il round dopo qualcuno deve per forza rigiocare.
    const esito = cercaAbbinamento(
      richiesta(['x1', 'y3', 'x2', 'y1', 'x3', 'y2'], ['x1-y1', 'x2-y2', 'x3-y3', 'x1-y2', 'x2-y3', 'x3-y1'], {
        roundFuturi: 2,
      }),
    );
    expect(esito.partite).toEqual([['x1', 'y3'], ['x2', 'x3'], ['y1', 'y2']]);
    expect(esito.ripetizioni).toEqual([]);
  });

  it('a parità di scontri nuovi in tutta la lega, li gioca subito', () => {
    // a-b già giocata; 3 round con 4 giocatori: una ripetizione serve comunque, meglio più avanti.
    const esito = cercaAbbinamento(richiesta(['a', 'b', 'c', 'd'], ['a-b'], { roundFuturi: 2 }));
    expect(esito.partite).toEqual([['a', 'c'], ['b', 'd']]);
    expect(esito.ripetizioni).toEqual([]);
  });

  it('se una coppia deve rigiocare, sceglie quella che si è affrontata meno volte', () => {
    // a-b si sono già affrontati due volte, tutte le altre coppie una volta.
    const esito = cercaAbbinamento(richiesta(['a', 'b', 'c', 'd'], ['a-b', 'a-b', 'a-c', 'a-d', 'b-c', 'b-d', 'c-d']));
    expect(esito.partite).toEqual([['a', 'c'], ['b', 'd']]);
    expect(esito.ripetizioni).toEqual([
      { giocatori: ['a', 'c'], volta: 2, roundPrecedenti: [3] },
      { giocatori: ['b', 'd'], volta: 2, roundPrecedenti: [6] },
    ]);
  });

  it('dà il bye al primo candidato, o al successivo se serve a evitare ripetizioni', () => {
    expect(cercaAbbinamento(richiesta(['a', 'b', 'c'], [], { candidatiBye: ['c', 'b', 'a'] })).bye).toBe('c');
    const esito = cercaAbbinamento(richiesta(['a', 'b', 'c'], ['a-b'], { candidatiBye: ['c', 'b', 'a'] }));
    expect(esito).toMatchObject({ bye: 'b', partite: [['a', 'c']], ripetizioni: [] });
  });
});

describe('calcolaAbbinamenti', () => {
  it('si ferma se mancano dei risultati', () => {
    const dati = lega(['a', 'b'], [round(1, [['a', 'b', null]])]);
    expect(() => calcolaAbbinamenti(dati)).toThrow(ErroreAbbinamenti);
    expect(() => calcolaAbbinamenti(dati)).toThrow(/mancano dei risultati \(a – b\)/);
  });

  it('si ferma se la serata non ha la data', () => {
    const dati = lega(['a', 'b'], [round(1, [['a', 'b', '2-0']]), round(2, [['a', 'b', '2-0']])]);
    dati.lega.serate[1]!.data = null;
    expect(() => calcolaAbbinamenti(dati)).toThrow(/serata 2 non ha ancora una data/);
  });

  it('si ferma a lega finita', () => {
    const rounds = Array.from({ length: ROUND_TOTALI }, (_, i) => round(i + 1, [['a', 'b', '2-0']]));
    expect(() => calcolaAbbinamenti(lega(['a', 'b'], rounds))).toThrow(/La lega è finita/);
  });

  it('lascia fuori gli assenti e dà il bye al più basso in classifica senza bye', () => {
    const dati = lega(['a', 'b', 'c', 'd'], [
      round(1, [['a', 'b', '2-0'], ['c', 'd', '2-1']]),
      round(2, [['a', 'd', '2-0'], ['b', 'c', '0-2']]),
    ], [[], ['b']]);
    // Classifica dopo R2: a 6 (GW 100%), c 6 (GW 80%), d 0, b 0. Alla serata 2 b è assente:
    // presenti a, c, d → bye a d (il più basso), a contro c.
    const r3 = calcolaAbbinamenti(dati);
    expect(r3).toMatchObject({ serata: 2, round: 1, numeroGlobale: 3, finale: false });
    expect(r3.bye).toBe('d');
    expect(r3.partite).toEqual([['a', 'c']]);
    expect(r3.avvisi).toEqual([]);
  });

  it('segna la finale', () => {
    const rounds = Array.from({ length: 8 }, (_, i) => round(i + 1, [['a', 'b', '2-0']]));
    const r9 = calcolaAbbinamenti(lega(['a', 'b'], rounds));
    expect(r9).toMatchObject({ serata: 5, round: 1, numeroGlobale: 9, finale: true });
  });

  it('il file del round supera il controllo dei dati', () => {
    const dati = lega(['anna', 'bruno', 'carla'], []);
    const abbinamenti = calcolaAbbinamenti(dati);
    const esito = validaDati([
      { percorso: 'data/league.yml', testo: 'nome: Prova\nset: fra\nserate:\n  - numero: 1\n    data: 2026-10-22\n    assenti: []\n' },
      ...['anna', 'bruno', 'carla'].map((id) => ({ percorso: `data/players/${id}.yml`, testo: `nome: ${id}\n` })),
      { percorso: 'data/rounds/serata-1-round-1.yml', testo: fileDelRound(abbinamenti, '2026-10-22') },
    ]);
    expect(esito.ok ? [] : esito.errori).toEqual([]);
  });
});

// Leghe intere simulate con risultati a caso: il motore non deve mai bloccarsi.

/** Numeri casuali ripetibili (mulberry32). */
function casuale(seme: number): () => number {
  return () => {
    seme = (seme + 0x6d2b79f5) | 0;
    let t = Math.imul(seme ^ (seme >>> 15), 1 | seme);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RISULTATI = ['2-0', '2-1', '1-2', '0-2', '1-1-1', '1-0'];

/** Gioca tutti i 10 round; restituisce i dati e gli avvisi di ogni round. */
function simula(seme: number, assentiPerSerata: (caso: () => number, ids: string[]) => string[][]) {
  const caso = casuale(seme);
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const dati: DatiLega = lega(ids, [], assentiPerSerata(caso, ids));
  const avvisi: string[][] = [];
  for (let n = 1; n <= ROUND_TOTALI; n++) {
    const abb = calcolaAbbinamenti(dati);
    expect(abb.numeroGlobale).toBe(n);
    avvisi.push(abb.avvisi);

    // Ogni presente compare una volta sola; nessun assente.
    const assenti = dati.lega.serate[abb.serata - 1]!.assenti;
    const inGioco = [...abb.partite.flat(), ...(abb.bye ? [abb.bye] : [])];
    expect([...inGioco].sort()).toEqual(ids.filter((id) => !assenti.includes(id)));

    const partite: PartitaBreve[] = abb.partite.map(([a, b]) => [a, b, RISULTATI[Math.floor(caso() * RISULTATI.length)]!]);
    dati.round.push(round(n, partite, abb.bye));
  }
  return { dati, avvisi };
}

/** Quante volte si è affrontata ogni coppia, nei round dal `dal` al `al`. */
function volteDelleCoppie(dati: DatiLega, dal = 1, al = ROUND_TOTALI): Map<string, number> {
  const volte = new Map<string, number>();
  for (const r of dati.round.filter((r) => r.numeroGlobale >= dal && r.numeroGlobale <= al)) {
    for (const p of r.partite) {
      const chiave = chiaveCoppia(...p.giocatori);
      volte.set(chiave, (volte.get(chiave) ?? 0) + 1);
    }
  }
  return volte;
}

// Ogni lega simulata richiede circa mezzo secondo (si guarda sempre fino alla fine della lega):
// ne bastano 30 per tipo, e il limite di 5 secondi di Vitest non basta.
describe('leghe simulate', { timeout: 120_000 }, () => {
  it('senza assenze: tutti si affrontano nei primi 7 round, poi nessuno per la terza volta', () => {
    for (let seme = 1; seme <= 30; seme++) {
      const { dati, avvisi } = simula(seme, () => []);
      expect(avvisi.flat()).toEqual([]);
      expect([...volteDelleCoppie(dati, 1, 7).values()]).toEqual(Array(28).fill(1));
      expect(Math.max(...volteDelleCoppie(dati).values())).toBe(2);
    }
  });

  it('con assenze a caso: abbinamenti sempre validi e ripetizioni anticipate solo con avviso', () => {
    for (let seme = 1; seme <= 30; seme++) {
      const { dati, avvisi } = simula(seme, (caso, ids) =>
        [1, 2, 3, 4, 5].map(() => ids.filter(() => caso() < 0.12).slice(0, 3)),
      );
      // Avversari già incontrati da ognuno, round dopo round.
      const avversari = new Map<string, Set<string>>(dati.giocatori.map((g) => [g.id, new Set()]));
      for (const r of dati.round) {
        for (const { giocatori: [a, b] } of r.partite) {
          const anticipata = avversari.get(a)!.has(b) && (avversari.get(a)!.size < 7 || avversari.get(b)!.size < 7);
          if (anticipata) expect(avvisi[r.numeroGlobale - 1]!.some((x) => x.includes(' si affrontano per la '))).toBe(true);
        }
        for (const { giocatori: [a, b] } of r.partite) {
          avversari.get(a)!.add(b);
          avversari.get(b)!.add(a);
        }
      }
    }
  });
});

describe('il caso vero della serata 2 (Claudio e Iacopo assenti)', () => {
  // I primi 4 round della lega, come sono andati; poi tutti presenti e risultati a caso.
  const ids = ['matteo', 'riccardo', 'massimo', 'claudio', 'salvatore', 'diego', 'simone', 'iacopo'];
  const giocati = [
    round(1, [['matteo', 'riccardo', '2-1'], ['massimo', 'claudio', '2-0'], ['salvatore', 'diego', '2-1'], ['simone', 'iacopo', '2-0']]),
    round(2, [['matteo', 'massimo', '2-0'], ['riccardo', 'diego', '2-1'], ['simone', 'salvatore', '2-0'], ['claudio', 'iacopo', '2-0']]),
    round(3, [['matteo', 'simone', '0-2'], ['massimo', 'diego', '2-0'], ['riccardo', 'salvatore', '2-1']]),
    round(4, [['simone', 'riccardo', '2-1'], ['matteo', 'diego', '2-1'], ['massimo', 'salvatore', '2-0']]),
  ];

  it('entro la fine della lega tutti si affrontano, e nessuno tre volte', { timeout: 60_000 }, () => {
    for (let seme = 1; seme <= 20; seme++) {
      const caso = casuale(seme);
      const dati = lega(ids, [...giocati], [[], ['claudio', 'iacopo']]);
      for (let n = 5; n <= ROUND_TOTALI; n++) {
        const abb = calcolaAbbinamenti(dati);
        const partite: PartitaBreve[] = abb.partite.map(([a, b]) => [a, b, RISULTATI[Math.floor(caso() * RISULTATI.length)]!]);
        dati.round.push(round(n, partite, abb.bye));
      }
      const volte = volteDelleCoppie(dati);
      expect(volte.size).toBe(28);
      expect(Math.max(...volte.values())).toBe(2);
    }
  });
});
