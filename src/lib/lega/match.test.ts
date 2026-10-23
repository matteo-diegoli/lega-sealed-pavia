import { describe, expect, it } from 'vitest';
import { roundCorrente, storico, testoRisultato, vincitore } from './match.ts';
import { lega, round } from './prova.ts';

describe('match', () => {
  const ids = ['a', 'b', 'c', 'd'];
  const giocati = [
    round(1, [['a', 'b', '2-0'], ['c', 'd', '2-1']]),
    round(2, [['a', 'c', '2-1'], ['b', 'd', '1-1-1']]),
    round(3, [['a', 'd', '0-2'], ['b', 'c', '2-0']]),
  ];

  it('trova il round in corso, anche con qualche risultato già scritto', () => {
    const dati = lega(ids, [...giocati, round(4, [['a', 'b', '2-0'], ['c', 'd', null]])]);
    expect(roundCorrente(dati)?.numeroGlobale).toBe(4);
  });

  it('nessun round in corso se il prossimo non è ancora abbinato', () => {
    expect(roundCorrente(lega(ids, giocati))).toBeNull();
    expect(roundCorrente(lega(ids, []))).toBeNull();
  });

  it('raggruppa i round giocati per serata, dal più recente', () => {
    const dati = lega(ids, [...giocati, round(4, [['a', 'b', null], ['c', 'd', null]])], [[], ['d']]);
    const serate = storico(dati);
    expect(serate.map((s) => [s.serata, s.round.map((r) => r.numeroGlobale)])).toEqual([
      [2, [3]],
      [1, [2, 1]],
    ]);
    expect(serate[0]).toMatchObject({ data: '2026-11-02', assenti: ['d'] });
  });

  it('legge vincitore e risultato', () => {
    const [vinta, pari] = giocati[1]!.partite;
    expect(vincitore(vinta!)).toBe(0);
    expect(testoRisultato(vinta!)).toBe('2-1');
    expect(vincitore(pari!)).toBe('pareggio');
    expect(testoRisultato(pari!)).toBe('1-1-1');
    expect(vincitore(giocati[2]!.partite[0]!)).toBe(1);
    const daGiocare = { giocatori: ['a', 'b'] as [string, string], risultato: null };
    expect(vincitore(daGiocare)).toBeNull();
    expect(testoRisultato(daGiocare)).toBeNull();
  });
});
