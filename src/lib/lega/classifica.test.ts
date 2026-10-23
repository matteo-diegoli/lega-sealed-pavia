import { describe, expect, it } from 'vitest';
import type { DatiLega } from '../dati/valida.ts';
import { calcolaClassifica, classificaDellaSerata, formattaPercentuale, sorteggio, spareggio } from './classifica.ts';
import { lega, round } from './prova.ts';

const riga = (dati: DatiLega, id: string, finoAlRound?: number) =>
  calcolaClassifica(dati, finoAlRound).righe.find((r) => r.id === id)!;

describe('classifica', () => {
  // Esempio calcolato a mano:
  // R1: A batte B 2-0, C batte D 2-1.   R2: A batte C 2-1, B e D pareggiano 1-1-1.
  const quattro = lega(['a', 'b', 'c', 'd'], [
    round(1, [['a', 'b', '2-0'], ['c', 'd', '2-1']]),
    round(2, [['a', 'c', '2-1'], ['b', 'd', '1-1-1']]),
  ]);

  it('conta punti, partite e game', () => {
    expect(riga(quattro, 'a')).toMatchObject({ punti: 6, vittorie: 2, pareggi: 0, sconfitte: 0, gameVinti: 4, gamePersi: 1 });
    expect(riga(quattro, 'b')).toMatchObject({ punti: 1, vittorie: 0, pareggi: 1, sconfitte: 1, gameVinti: 1, gamePersi: 3, gamePareggiati: 1 });
    expect(riga(quattro, 'a').serateGiocate).toBe(1);
  });

  it('calcola MW%, GW%, OMW% e OGW% con il minimo del 33% per gli avversari', () => {
    const b = riga(quattro, 'b');
    expect(b.mw).toBeCloseTo(1 / 6); // il minimo vale solo quando è un avversario
    expect(b.gw).toBeCloseTo(4 / 15);
    expect(b.omw).toBeCloseTo((1 + 1 / 3) / 2); // A 100%, D 16,7% → 33%
    expect(b.ogw).toBeCloseTo((0.8 + 7 / 18) / 2);

    const a = riga(quattro, 'a');
    expect(a.gw).toBeCloseTo(0.8);
    expect(a.omw).toBeCloseTo((1 / 3 + 0.5) / 2); // B 16,7% → 33%, C 50%
    expect(a.ogw).toBeCloseTo((1 / 3 + 0.5) / 2); // B 26,7% → 33%, C 50%
  });

  it('ordina per punti e poi per OMW%', () => {
    const { righe } = calcolaClassifica(quattro);
    expect(righe.map((r) => [r.id, r.posizione])).toEqual([['a', 1], ['c', 2], ['b', 3], ['d', 4]]);
    expect(righe.every((r) => !r.pariMerito)).toBe(true);
  });

  it('il bye vale una vittoria 2-0 ma non è un avversario', () => {
    const dati = lega(['a', 'b', 'c'], [round(1, [['a', 'b', '2-1']], 'c')]);
    const c = riga(dati, 'c');
    expect(c).toMatchObject({ punti: 3, vittorie: 1, bye: 1, gameVinti: 2, gamePersi: 0, serateGiocate: 1 });
    expect(c.mw).toBe(1);
    expect(c.gw).toBe(1);
    expect(c.omw).toBe(0);
    expect(riga(dati, 'a').omw).toBeCloseTo(1 / 3); // B ha 0%, vale 33%
  });

  it('nella finale i punti valgono ×2, ma non nei tie-breaker', () => {
    const dati = lega(['a', 'b', 'c'], [round(9, [['a', 'b', '2-0']], 'c'), round(10, [['b', 'c', '1-1-1']], 'a')]);
    expect(riga(dati, 'a').punti).toBe(12); // vittoria + bye in finale
    expect(riga(dati, 'b').punti).toBe(2);
    expect(riga(dati, 'c').punti).toBe(8);
    expect(riga(dati, 'a').mw).toBe(1);
    expect(riga(dati, 'b').mw).toBeCloseTo(1 / 6);
  });

  it('ignora le partite senza risultato e chi è assente', () => {
    const dati = lega(['a', 'b', 'c', 'd', 'e'], [round(1, [['a', 'b', '2-0'], ['c', 'd', null]])]);
    expect(riga(dati, 'c')).toMatchObject({ punti: 0, vittorie: 0, sconfitte: 0, serateGiocate: 0, mw: 0, omw: 0 });
    expect(riga(dati, 'e')).toMatchObject({ punti: 0, serateGiocate: 0 });
  });

  it('si può fermare a un round o a una serata', () => {
    const dati = lega(['a', 'b'], [round(1, [['a', 'b', '2-0']]), round(2, [['a', 'b', '0-2']]), round(3, [['a', 'b', '0-2']])]);
    expect(calcolaClassifica(dati, 1).finoAlRound).toBe(1);
    expect(riga(dati, 'b', 1).punti).toBe(0);
    expect(classificaDellaSerata(dati, 1).righe.find((r) => r.id === 'b')!.punti).toBe(3);
    expect(classificaDellaSerata(dati, 2).finoAlRound).toBe(3);
    expect(calcolaClassifica(lega(['a', 'b'], [])).finoAlRound).toBe(0);
  });

  it('chi è pari su tutto condivide la posizione', () => {
    // Ciclo perfetto: tutti 3 punti e tutte le percentuali al 50%.
    const dati = lega(['a', 'b', 'c', 'd'], [
      round(1, [['a', 'b', '2-0'], ['c', 'd', '2-0']]),
      round(2, [['b', 'c', '2-0'], ['d', 'a', '2-0']]),
    ]);
    const { righe } = calcolaClassifica(dati);
    expect(righe.map((r) => r.posizione)).toEqual([1, 1, 1, 1]);
    expect(righe.every((r) => r.pariMerito)).toBe(true);
    // L'ordine non dipende dall'ordine dei giocatori nei dati.
    const alContrario = calcolaClassifica({ ...dati, giocatori: [...dati.giocatori].reverse() });
    expect(alContrario.righe.map((r) => r.id)).toEqual(righe.map((r) => r.id));
  });
});

describe('spareggio', () => {
  it('passa chi ha vinto lo scontro diretto', () => {
    expect(spareggio(['a', 'b'], [{ giocatori: ['a', 'b'], punti: [3, 0] }])).toEqual(['a', 'b']);
    expect(spareggio(['a', 'b'], [{ giocatori: ['a', 'b'], punti: [0, 3] }])).toEqual(['b', 'a']);
  });

  it('con più giocatori conta i punti negli scontri tra loro, ignorando gli altri', () => {
    const scontri = [
      { giocatori: ['a', 'b'], punti: [0, 3] },
      { giocatori: ['b', 'c'], punti: [1, 1] },
      { giocatori: ['c', 'x'], punti: [3, 0] },
    ] satisfies { giocatori: [string, string]; punti: [number, number] }[];
    // b: 3 + 1 = 4, c: 1 (la vittoria su x non conta), a: 0
    expect(spareggio(['a', 'b', 'c'], scontri)).toEqual(['b', 'c', 'a']);
  });

  it('altrimenti usa il sorteggio fisso', () => {
    const ordine = spareggio(['anna', 'bruno', 'carla'], []);
    expect(spareggio(['carla', 'anna', 'bruno'], [])).toEqual(ordine);
    expect(ordine.map(sorteggio)).toEqual([...ordine.map(sorteggio)].sort((x, y) => x - y));
  });
});

describe('formattaPercentuale', () => {
  it('scrive le percentuali in italiano', () => {
    expect(formattaPercentuale(5 / 9)).toBe('55,6%');
    expect(formattaPercentuale(1)).toBe('100,0%');
  });
});
