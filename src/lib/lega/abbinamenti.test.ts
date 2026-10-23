import { describe, expect, it } from 'vitest';
import { validaDati } from '../dati/valida.ts';
import type { DatiLega } from '../dati/valida.ts';
import {
  ErroreAbbinamenti,
  ROUND_TOTALI,
  ULTIMO_ROUND_CICLO_1,
  calcolaAbbinamenti,
  cercaAbbinamento,
  chiaveCoppia,
  fileDelRound,
  type Richiesta,
} from './abbinamenti.ts';
import { lega, round, type PartitaBreve } from './prova.ts';

/** Richiesta con valori di comodo: le coppie già incontrate si scrivono come "a-b". */
function richiesta(ordine: string[], incontri: string[] = [], altro: Partial<Richiesta> = {}): Richiesta {
  return {
    ordine,
    tutti: ordine,
    incontri: new Map(incontri.map((c, i) => [chiaveCoppia(...(c.split('-') as [string, string])), i + 1])),
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

  it('evita abbinamenti che renderebbero impossibili i round futuri', () => {
    // 6 giocatori, due gruppi X = {x1, x2, x3} e Y = {y1, y2, y3}; nei primi due round solo X contro Y.
    // Il primo abbinamento "di classifica" sarebbe di nuovo X contro Y (x1-y3, x2-y1, x3-y2):
    // restano allora due triangoli, e il round dopo nessuno può giocare senza rivincite.
    const esito = cercaAbbinamento(
      richiesta(['x1', 'y3', 'x2', 'y1', 'x3', 'y2'], ['x1-y1', 'x2-y2', 'x3-y3', 'x1-y2', 'x2-y3', 'x3-y1'], {
        roundFuturi: 2,
      }),
    );
    expect(esito.partite).toEqual([['x1', 'y3'], ['x2', 'x3'], ['y1', 'y2']]);
    expect(esito.futuroGarantito).toBe(true);
    expect(esito.rivincite).toEqual([]);
  });

  it('se il futuro non si può garantire, evita comunque le rivincite di questo round', () => {
    const esito = cercaAbbinamento(richiesta(['a', 'b', 'c', 'd'], ['a-b'], { roundFuturi: 2 }));
    expect(esito.partite).toEqual([['a', 'c'], ['b', 'd']]);
    expect(esito.futuroGarantito).toBe(false);
  });

  it('se servono rivincite, ne fa il meno possibile e le più vecchie', () => {
    const esito = cercaAbbinamento(richiesta(['a', 'b', 'c', 'd'], ['a-d', 'b-c', 'a-c', 'b-d', 'a-b', 'c-d']));
    expect(esito.partite).toEqual([['a', 'd'], ['b', 'c']]);
    expect(esito.rivincite).toEqual([
      { giocatori: ['a', 'd'], roundPrecedente: 1 },
      { giocatori: ['b', 'c'], roundPrecedente: 2 },
    ]);
  });

  it('dà il bye al primo candidato, o al successivo se serve a evitare rivincite', () => {
    expect(cercaAbbinamento(richiesta(['a', 'b', 'c'], [], { candidatiBye: ['c', 'b', 'a'] })).bye).toBe('c');
    const esito = cercaAbbinamento(richiesta(['a', 'b', 'c'], ['a-b'], { candidatiBye: ['c', 'b', 'a'] }));
    expect(esito).toMatchObject({ bye: 'b', partite: [['a', 'c']], rivincite: [] });
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
    expect(r3).toMatchObject({ serata: 2, round: 1, numeroGlobale: 3, ciclo: 1, finale: false });
    expect(r3.bye).toBe('d');
    expect(r3.partite).toEqual([['a', 'c']]);
    expect(r3.avvisi).toEqual([]);
  });

  it('segna la finale', () => {
    const rounds = Array.from({ length: 8 }, (_, i) => round(i + 1, [['a', 'b', '2-0']]));
    const r9 = calcolaAbbinamenti(lega(['a', 'b'], rounds));
    expect(r9).toMatchObject({ serata: 5, round: 1, numeroGlobale: 9, ciclo: 2, finale: true });
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

function coppieDelCiclo(dati: DatiLega, dal: number, al: number): string[] {
  return dati.round
    .filter((r) => r.numeroGlobale >= dal && r.numeroGlobale <= al)
    .flatMap((r) => r.partite.map((p) => chiaveCoppia(...p.giocatori)));
}

// 200 leghe da 10 round l'una richiedono diversi secondi: il limite di 5 secondi di Vitest non basta.
describe('leghe simulate', { timeout: 30_000 }, () => {
  it('senza assenze: mai rivincite nei cicli e tutti si affrontano nel ciclo 1', () => {
    for (let seme = 1; seme <= 200; seme++) {
      const { dati, avvisi } = simula(seme, () => []);
      expect(avvisi.flat()).toEqual([]);
      const ciclo1 = coppieDelCiclo(dati, 1, ULTIMO_ROUND_CICLO_1);
      expect(new Set(ciclo1).size).toBe(28);
      const ciclo2 = coppieDelCiclo(dati, ULTIMO_ROUND_CICLO_1 + 1, ROUND_TOTALI);
      expect(new Set(ciclo2).size).toBe(ciclo2.length);
    }
  });

  it('con assenze a caso: abbinamenti sempre validi e rivincite solo con avviso', () => {
    for (let seme = 1; seme <= 200; seme++) {
      const { dati, avvisi } = simula(seme, (caso, ids) =>
        [1, 2, 3, 4, 5].map(() => ids.filter(() => caso() < 0.12).slice(0, 3)),
      );
      for (const [dal, al] of [[1, ULTIMO_ROUND_CICLO_1], [ULTIMO_ROUND_CICLO_1 + 1, ROUND_TOTALI]] as const) {
        const visti = new Set<string>();
        for (const r of dati.round.filter((r) => r.numeroGlobale >= dal && r.numeroGlobale <= al)) {
          for (const p of r.partite) {
            const chiave = chiaveCoppia(...p.giocatori);
            if (visti.has(chiave)) {
              expect(avvisi[r.numeroGlobale - 1]!.some((a) => a.startsWith('Rivincita inevitabile'))).toBe(true);
            }
            visti.add(chiave);
          }
        }
      }
    }
  });
});
