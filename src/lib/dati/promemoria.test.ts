import { describe, expect, it } from 'vitest';
import { lega, round } from '../lega/prova.ts';
import { poolMancanti } from './promemoria.ts';

const carta = { nome: 'Unsummon', copie: 1 };

describe('poolMancanti', () => {
  it('segnala solo le serate con almeno un round', () => {
    const dati = lega(['anna', 'bruno'], [round(1, [['anna', 'bruno', '2-1']])]);
    expect(poolMancanti(dati)).toEqual([{ serata: 1, giocatori: ['anna', 'bruno'] }]);
  });

  it('non segnala chi ha il pool della serata, né gli assenti', () => {
    const dati = lega(
      ['anna', 'bruno', 'carla', 'dario'],
      [round(1, [['anna', 'bruno', '2-1'], ['carla', 'dario', '2-0']]), round(3, [['anna', 'bruno', '2-1']], 'carla')],
      [[], ['dario']],
    );
    dati.giocatori[0]!.pool = [{ serata: 1, carte: [carta] }, { serata: 2, carte: [carta] }];
    dati.giocatori[1]!.pool = [{ serata: 2, carte: [] }]; // serata scritta ma vuota: manca ancora
    expect(poolMancanti(dati)).toEqual([
      { serata: 1, giocatori: ['bruno', 'carla', 'dario'] },
      { serata: 2, giocatori: ['bruno', 'carla'] },
    ]);
  });

  it('niente promemoria quando tutti i pool ci sono', () => {
    const dati = lega(['anna', 'bruno'], [round(1, [['anna', 'bruno', '2-1']])]);
    for (const g of dati.giocatori) g.pool = [{ serata: 1, carte: [carta] }];
    expect(poolMancanti(dati)).toEqual([]);
  });
});
