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

  it('raggruppa per colore nell\'ordine W U B R G, multicolore, incolore', () => {
    const pool = poolDelGiocatore(giocatore, carte);
    expect(pool.gruppi.map((g) => [g.chiave, g.totale])).toEqual([
      ['W', 1],
      ['R', 1],
      ['G', 4],
      ['multi', 1],
      ['incolore', 1],
    ]);
  });

  it('somma le copie della stessa carta tra le serate e ordina per valore di mana', () => {
    const verde = poolDelGiocatore(giocatore, carte).gruppi.find((g) => g.chiave === 'G')!;
    expect(verde.carte.map((c) => [c.nome, c.copie])).toEqual([
      ['Giant Growth', 1],
      ['Grizzly Bears', 3],
    ]);
  });

  it('usa il nome completo di Scryfall e conta le carte per serata', () => {
    const pool = poolDelGiocatore(giocatore, carte);
    expect(pool.gruppi.find((g) => g.chiave === 'multi')!.carte[0]!.nome).toBe('Wear // Tear');
    expect(pool.totale).toBe(8);
    expect(pool.perSerata).toEqual([
      { serata: 1, carte: 6 },
      { serata: 3, carte: 2 },
    ]);
  });

  it('senza la cache delle carte le mette tutte tra le "non trovate"', () => {
    const pool = poolDelGiocatore(giocatore, []);
    expect(pool.gruppi.map((g) => g.chiave)).toEqual(['sconosciute']);
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
