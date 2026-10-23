import { describe, expect, it } from 'vitest';
import type { Carta } from '../carte/carta.ts';
import type { Giocatore } from '../dati/valida.ts';
import { partiteDelGiocatore, poolDelGiocatore } from './giocatore.ts';
import { lega, round } from './prova.ts';

function carta(nome: string, colori: string[], valore: number): Carta {
  return {
    nome,
    set: 'fra',
    numero: '1',
    rarita: 'common',
    valore,
    colori,
    identita: colori,
    facce: [{ nome: nome.split(' // ')[0]!, costo: '', tipo: '', testo: '' }],
    immagini: [],
    scryfall: '',
  };
}

describe('pool del giocatore', () => {
  const carte = [
    carta('Grizzly Bears', ['G'], 2),
    carta('Giant Growth', ['G'], 1),
    carta('Lightning Bolt', ['R'], 1),
    carta('Wear // Tear', ['R', 'W'], 2),
    carta('Ornithopter', [], 0),
    carta('Serra Angel', ['W'], 5),
  ];
  const giocatore: Giocatore = {
    id: 'anna',
    nome: 'Anna',
    pool: [
      {
        serata: 1,
        carte: [
          { nome: 'Grizzly Bears', copie: 2 },
          { nome: 'Giant Growth', copie: 1 },
          { nome: 'Wear', copie: 1 },
          { nome: 'Ornithopter', copie: 1 },
          { nome: 'Serra Angel', copie: 1 },
        ],
      },
      { serata: 2, carte: [] },
      {
        serata: 3,
        carte: [
          { nome: 'grizzly bears', copie: 1 },
          { nome: 'Lightning Bolt', copie: 1 },
        ],
      },
    ],
  };

  it('somma le copie della stessa carta tra le serate, ricordando quante per serata', () => {
    const pool = poolDelGiocatore(giocatore, carte);
    expect(pool.carte.map((c) => c.nome)).toEqual([
      'Giant Growth',
      'Grizzly Bears',
      'Lightning Bolt',
      'Ornithopter',
      'Serra Angel',
      'Wear // Tear',
    ]);
    expect(pool.carte[1]).toMatchObject({
      copie: 3,
      perSerata: [
        { serata: 1, copie: 2 },
        { serata: 3, copie: 1 },
      ],
    });
  });

  it('usa il nome completo di Scryfall e conta le carte per serata', () => {
    const pool = poolDelGiocatore(giocatore, carte);
    expect(pool.carte.at(-1)!.carta?.colori).toEqual(['R', 'W']);
    expect(pool.totale).toBe(8);
    expect(pool.perSerata).toEqual([
      { serata: 1, carte: 6 },
      { serata: 3, carte: 2 },
    ]);
  });

  it('tiene anche le carte che non sono nella cache', () => {
    const pool = poolDelGiocatore(giocatore, []);
    expect(pool.carte.every((c) => c.carta === null)).toBe(true);
    expect(pool.totale).toBe(8);
  });
});

describe('partite del giocatore', () => {
  const dati = lega(
    ['a', 'b', 'c', 'd', 'e'],
    [
      round(1, [['a', 'b', '2-1'], ['c', 'd', '0-2']], 'e'),
      round(2, [['b', 'c', '1-1-1'], ['d', 'e', '2-0']], 'a'),
      round(3, [['b', 'd', null], ['c', 'e', null]]),
    ],
    [[], ['a']],
  );

  it('mostra i round dal più recente, con il risultato visto dal giocatore', () => {
    expect(partiteDelGiocatore(dati, 'b')).toEqual([
      { numeroGlobale: 3, serata: 2, esito: 'da-giocare', avversario: 'd', risultato: null },
      { numeroGlobale: 2, serata: 1, esito: 'pareggio', avversario: 'c', risultato: '1-1-1' },
      { numeroGlobale: 1, serata: 1, esito: 'sconfitta', avversario: 'a', risultato: '1-2' },
    ]);
  });

  it('segna vittorie, bye e assenze', () => {
    expect(partiteDelGiocatore(dati, 'a').map((r) => [r.numeroGlobale, r.esito, r.risultato])).toEqual([
      [3, 'assente', null],
      [2, 'bye', '2-0'],
      [1, 'vittoria', '2-1'],
    ]);
    expect(partiteDelGiocatore(dati, 'd')[2]).toMatchObject({ esito: 'vittoria', avversario: 'c', risultato: '2-0' });
  });
});
