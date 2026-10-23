import { describe, expect, it } from 'vitest';
import type { Carta } from '../carte/carta.ts';
import { calcolaClassifica } from '../lega/classifica.ts';
import { lega, round } from '../lega/prova.ts';
import { apiClassifica, apiGiocatori, apiMatch, testoLlms } from './api.ts';

const ids = ['a', 'b', 'c', 'd'];
const contesto = { sito: 'https://esempio.it/lega/', aggiornato: '2026-11-03T20:00:00.000Z' };

const orso: Carta = {
  nome: 'Grizzly Bears',
  set: 'fra',
  numero: '1',
  rarita: 'common',
  valore: 2,
  colori: ['G'],
  identita: ['G'],
  facce: [{ nome: 'Grizzly Bears', costo: '{1}{G}', tipo: 'Creature — Bear', testo: '' }],
  immagini: [],
  scryfall: 'https://scryfall.com/card/fra/1',
};

// Serata 1 giocata, serata 2: round 3 abbinato con una partita ancora da giocare.
const dati = lega(ids, [
  round(1, [['a', 'b', '2-0'], ['c', 'd', '2-1']]),
  round(2, [['a', 'c', '1-1-1'], ['b', 'd', '0-2']]),
  round(3, [['a', 'd', null], ['b', 'c', '2-1']]),
]);

describe('api', () => {
  it('classifica: stessi punti e posizioni del calcolo delle pagine, percentuali da 0 a 100', () => {
    const json = apiClassifica(dati, contesto);
    const vera = calcolaClassifica(dati);
    expect(json.classifica.map((r) => [r.id, r.posizione, r.punti])).toEqual(
      vera.righe.map((r) => [r.id, r.posizione, r.punti]),
    );
    // Come nella pagina: contano anche i risultati già scritti del round in corso.
    expect(json.dopoIlRound).toBe(3);
    expect(json.stato).toMatchObject({ roundGiocati: 2, roundInCorso: 3, finita: false });
    expect(json.stato.prossimaSerata).toEqual({ numero: 2, data: '2026-11-02' });
    const a = json.classifica.find((r) => r.id === 'a')!;
    expect(a.percentuali.gw).toBe(66.7); // 3 game vinti e 1 pari su 5: (9 + 1) / 15
    expect(a.pagina).toBe('https://esempio.it/lega/giocatori/a/');
    expect(json).toMatchObject({ versione: 1, lega: 'Prova', sito: 'https://esempio.it/lega/' });
  });

  it('match: partite con vincitore, pareggio e "da giocare"; finale ×2', () => {
    const json = apiMatch(dati, contesto);
    expect(json.serate).toHaveLength(5);
    const [r1, r2] = json.serate[0]!.round;
    expect(r1!.partite[0]).toEqual({ giocatori: ['a', 'b'], risultato: '2-0', vincitore: 'a', esito: 'vittoria' });
    expect(r2!.partite[0]).toMatchObject({ risultato: '1-1-1', vincitore: null, esito: 'pareggio' });
    expect(json.serate[1]!.round[0]!.partite[0]).toEqual({
      giocatori: ['a', 'd'],
      risultato: null,
      vincitore: null,
      esito: 'da-giocare',
    });
    expect(json.serate[4]).toMatchObject({ finale: true, moltiplicatorePunti: 2, round: [] });
    expect(json.serate[0]).toMatchObject({ finale: false, moltiplicatorePunti: 1 });
  });

  it('giocatori: partite in ordine, pool con dati di Scryfall e carte sconosciute', () => {
    const conPool = {
      ...dati,
      giocatori: dati.giocatori.map((g) =>
        g.id === 'b'
          ? {
              ...g,
              pool: [
                { serata: 1, carte: [{ nome: 'grizzly bears', copie: 2 }, { nome: 'Carta Inventata', copie: 1 }] },
                { serata: 2, carte: [{ nome: 'Grizzly Bears', copie: 1 }] },
              ],
            }
          : g,
      ),
    };
    const b = apiGiocatori(conPool, [orso], contesto).giocatori.find((g) => g.id === 'b')!;
    expect(b.partite.map((p) => [p.round, p.esito, p.avversario, p.risultato])).toEqual([
      [1, 'sconfitta', 'a', '0-2'],
      [2, 'sconfitta', 'd', '0-2'],
      [3, 'vittoria', 'c', '2-1'],
    ]);
    expect(b.pool.totale).toBe(4);
    expect(b.pool.carte).toEqual([
      { nome: 'Carta Inventata', copie: 1, perSerata: [{ serata: 1, copie: 1 }] },
      {
        nome: 'Grizzly Bears',
        copie: 3,
        perSerata: [
          { serata: 1, copie: 2 },
          { serata: 2, copie: 1 },
        ],
        colori: ['G'],
        valore: 2,
        rarita: 'common',
        tipo: 'Creature — Bear',
        costo: '{1}{G}',
        scryfall: 'https://scryfall.com/card/fra/1',
      },
    ]);
  });

  it('llms.txt: situazione, classifica e link completi', () => {
    const testo = testoLlms(dati, contesto);
    expect(testo.startsWith('# Prova\n')).toBe(true);
    expect(testo).toContain('Giocati 2 round su 10. Prossima serata: la 2 (2026-11-02).');
    expect(testo).toContain('[Match](https://esempio.it/lega/match/)');
    expect(testo).toContain('[Giocatori](https://esempio.it/lega/api/giocatori.json)');
    expect(testo).toContain('aggiornato il 2026-11-03');
  });

  it('llms.txt prima dell\'inizio', () => {
    const testo = testoLlms(lega(ids, []), contesto);
    expect(testo).toContain('La lega non è ancora iniziata: si comincia il 2026-11-01.');
    expect(testo).toContain('Nessun risultato ancora.');
  });
});
