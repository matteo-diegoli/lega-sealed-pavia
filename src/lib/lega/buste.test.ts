import { describe, expect, it } from 'vitest';
import type { DatiLega } from '../dati/valida.ts';
import { busteDellaSerata, prossimaSerata } from './buste.ts';
import { lega, round } from './prova.ts';

const di = (dati: DatiLega, serata: number, id: string) =>
  busteDellaSerata(dati, serata).giocatori.find((g) => g.id === id)!;

// Serata 1 con tutti presenti.
// R1: A batte B, C batte D.   R2: A batte C, B e D pareggiano.
// Classifica dopo la serata 1: A 6, C 3, B 1, D 1 (D ultimo per OMW%).
const serata1 = [
  round(1, [['a', 'b', '2-0'], ['c', 'd', '2-1']]),
  round(2, [['a', 'c', '2-1'], ['b', 'd', '1-1-1']]),
];

describe('buste di una serata', () => {
  it('alla serata 1 tutti ricevono 6 buste e nessuna extra', () => {
    const buste = busteDellaSerata(lega(['a', 'b', 'c', 'd'], []), 1);
    expect(buste.extra).toBeNull();
    expect(buste.avviso).toBeNull();
    for (const g of buste.giocatori) {
      expect(g).toMatchObject({ presente: true, normali: 6, recuperate: 0, extra: 0, totale: 6 });
    }
  });

  it("dalla serata 2 la busta extra va all'ultimo in classifica", () => {
    const dati = lega(['a', 'b', 'c', 'd'], serata1);
    expect(busteDellaSerata(dati, 2).extra).toBe('d');
    expect(di(dati, 2, 'd')).toMatchObject({ normali: 1, recuperate: 0, extra: 1, totale: 2 });
    expect(di(dati, 2, 'a')).toMatchObject({ normali: 1, recuperate: 0, extra: 0, totale: 1 });
  });

  it("se l'ultimo è assente la busta extra passa al penultimo", () => {
    const dati = lega(['a', 'b', 'c', 'd'], serata1, [[], ['d']]);
    expect(busteDellaSerata(dati, 2).extra).toBe('b');
    expect(di(dati, 2, 'b').totale).toBe(2);
    expect(di(dati, 2, 'd')).toMatchObject({ presente: false, normali: 0, recuperate: 0, extra: 0, totale: 0 });
  });

  it('la busta extra non spetta a chi era assente alla serata precedente; al ritorno recupera la busta', () => {
    // Serata 2 senza D. R3: B batte A, bye a C.  R4: C batte B, bye ad A.
    // Dopo la serata 2: A 9, C 9, B 4, D 1 → D è ultimo ma era assente, B ha avuto l'extra
    // alla serata 2 (al posto di D): l'extra va ad A, ultimo tra A e C per i tie-breaker.
    const dati = lega(
      ['a', 'b', 'c', 'd'],
      [...serata1, round(3, [['a', 'b', '0-2']], 'c'), round(4, [['b', 'c', '0-2']], 'a')],
      [[], ['d']],
    );
    expect(busteDellaSerata(dati, 2).extra).toBe('b');
    expect(busteDellaSerata(dati, 3).extra).toBe('a');
    expect(di(dati, 3, 'd')).toMatchObject({ normali: 1, recuperate: 1, extra: 0, totale: 2 });
  });

  it("la busta extra non spetta a chi l'ha ricevuta alla serata precedente, ma due serate dopo sì", () => {
    // Le serate 2 e 3 si giocano come la serata 1: D resta sempre ultimo, B penultimo.
    const ripeti = (serata: number) => {
      const primo = (serata - 1) * 2 + 1;
      return [
        round(primo, [['a', 'b', '2-0'], ['c', 'd', '2-1']]),
        round(primo + 1, [['a', 'c', '2-1'], ['b', 'd', '1-1-1']]),
      ];
    };
    const dati = lega(['a', 'b', 'c', 'd'], [...serata1, ...ripeti(2), ...ripeti(3)]);
    expect(busteDellaSerata(dati, 2).extra).toBe('d');
    expect(busteDellaSerata(dati, 3).extra).toBe('b');
    expect(di(dati, 3, 'd')).toMatchObject({ extra: 0, totale: 1 });
    expect(busteDellaSerata(dati, 4).extra).toBe('d');
  });

  it('chi salta la serata 1 recupera le 6 buste alla serata 2', () => {
    // Serata 1 senza D. R1: A batte B, bye a C.  R2: C batte B, bye ad A.  B è ultimo.
    const dati = lega(
      ['a', 'b', 'c', 'd'],
      [round(1, [['a', 'b', '2-0']], 'c'), round(2, [['b', 'c', '0-2']], 'a')],
      [['d']],
    );
    expect(di(dati, 1, 'd').totale).toBe(0);
    expect(di(dati, 2, 'd')).toMatchObject({ normali: 1, recuperate: 6, extra: 0, totale: 7 });
    expect(busteDellaSerata(dati, 2).extra).toBe('b');
  });

  it('chi salta più serate di fila recupera tutte le buste', () => {
    const dati = lega(['a', 'b', 'c', 'd'], serata1, [[], ['d'], ['d']]);
    expect(di(dati, 3, 'd').totale).toBe(0);
    expect(di(dati, 4, 'd')).toMatchObject({ normali: 1, recuperate: 2 });
  });

  it('se alla serata precedente mancano risultati la busta extra resta in sospeso, con un avviso', () => {
    const dati = lega(['a', 'b', 'c', 'd'], [serata1[0]!, round(2, [['a', 'c', '2-1'], ['b', 'd', null]])]);
    const buste = busteDellaSerata(dati, 2);
    expect(buste.extra).toBeNull();
    expect(buste.avviso).toContain('serata 1');
    expect(di(dati, 2, 'd')).toMatchObject({ extra: 0, totale: 1 });
  });
});

describe('prossima serata', () => {
  it('è la prima serata che non ha ancora tutti i risultati', () => {
    expect(prossimaSerata(lega(['a', 'b', 'c', 'd'], []))).toBe(1);
    expect(prossimaSerata(lega(['a', 'b', 'c', 'd'], [serata1[0]!]))).toBe(1);
    expect(prossimaSerata(lega(['a', 'b', 'c', 'd'], serata1))).toBe(2);
    expect(prossimaSerata(lega(['a', 'b', 'c', 'd'], [...serata1, round(3, [['a', 'b', null]], 'c')]))).toBe(2);
  });

  it("a lega finita resta l'ultima serata", () => {
    const rounds = Array.from({ length: 10 }, (_, i) => round(i + 1, [['a', 'b', '2-0'], ['c', 'd', '2-0']]));
    expect(prossimaSerata(lega(['a', 'b', 'c', 'd'], rounds))).toBe(5);
  });
});
