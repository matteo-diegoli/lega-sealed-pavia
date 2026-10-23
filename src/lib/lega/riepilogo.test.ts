import { describe, expect, it } from 'vitest';
import { lega, round } from './prova.ts';
import { classificaAttuale, evoluzione, formattaData, puntiInFinale, statoLega } from './riepilogo.ts';

describe('riepilogo', () => {
  const ids = ['a', 'b', 'c', 'd'];

  it('lega appena iniziata: nessun round giocato, serata 1', () => {
    const dati = lega(ids, []);
    expect(statoLega(dati)).toEqual({ roundGiocati: 0, roundInCorso: null, serata: 1, finita: false });
    expect(evoluzione(dati)).toEqual([]);
    expect(classificaAttuale(dati).rispettoAllaSerata).toBeNull();
  });

  it('riconosce il round in corso e la serata', () => {
    const dati = lega(ids, [
      round(1, [['a', 'b', '2-0'], ['c', 'd', '2-1']]),
      round(2, [['a', 'c', '2-1'], ['b', 'd', null]]),
    ]);
    expect(statoLega(dati)).toEqual({ roundGiocati: 1, roundInCorso: 2, serata: 1, finita: false });
  });

  it('a serata conclusa indica la prossima', () => {
    const dati = lega(ids, [
      round(1, [['a', 'b', '2-0'], ['c', 'd', '2-1']]),
      round(2, [['a', 'c', '2-1'], ['b', 'd', '2-0']]),
    ]);
    expect(statoLega(dati)).toMatchObject({ roundGiocati: 2, roundInCorso: null, serata: 2 });
    expect(evoluzione(dati).map((t) => t.serata)).toEqual([1]);
  });

  it('calcola le variazioni di posizione tra una serata e la successiva', () => {
    // Serata 1: a 1°, c 2°, b 3°, d 4°. Serata 2: d vince due volte e sale.
    const dati = lega(ids, [
      round(1, [['a', 'b', '2-0'], ['c', 'd', '2-1']]),
      round(2, [['a', 'c', '2-1'], ['b', 'd', '0-2']]),
      round(3, [['d', 'a', '2-0'], ['b', 'c', '0-2']]),
      round(4, [['d', 'c', '2-0'], ['a', 'b', '2-0']]),
    ]);
    const [prima, seconda] = evoluzione(dati);
    expect(prima!.variazioni.size).toBe(0);
    const daPrima = new Map(prima!.classifica.righe.map((r) => [r.id, r.posizione]));
    for (const r of seconda!.classifica.righe) {
      expect(seconda!.variazioni.get(r.id)).toBe(daPrima.get(r.id)! - r.posizione);
    }
    expect(seconda!.variazioni.get('d')).toBeGreaterThan(0);

    // A serata conclusa, la classifica attuale si confronta con la serata prima.
    expect(classificaAttuale(dati).rispettoAllaSerata).toBe(1);
  });

  it('durante una serata confronta con l\'ultima serata conclusa', () => {
    const dati = lega(ids, [
      round(1, [['a', 'b', '2-0'], ['c', 'd', '2-1']]),
      round(2, [['a', 'c', '2-1'], ['b', 'd', '0-2']]),
      round(3, [['d', 'a', '2-0'], ['b', 'c', null]]),
    ]);
    expect(classificaAttuale(dati).rispettoAllaSerata).toBe(1);
  });

  it('conta i punti della finale con il ×2', () => {
    const dati = lega(ids, [
      round(7, [['a', 'b', '2-0'], ['c', 'd', '2-0']]),
      round(9, [['a', 'c', '2-1'], ['b', 'd', '1-1-1']]),
    ]);
    const finale = puntiInFinale(dati);
    expect(finale.get('a')).toBe(6);
    expect(finale.get('b')).toBe(2);
    expect(finale.get('c')).toBe(0);
  });
});

describe('formattaData', () => {
  it('scrive la data in italiano', () => {
    expect(formattaData('2026-10-22')).toBe('giovedì 22 ottobre');
  });
});
