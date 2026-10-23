import { describe, expect, it } from 'vitest';
import type { Carta } from '../carte/carta.ts';
import { lega, round } from '../lega/prova.ts';
import { anteprimaClassifica, anteprimaGiocatore, anteprimaMatch } from './anteprime.ts';
import { datiStrutturatiLega, testoJsonLd } from './dati-strutturati.ts';
import { accorcia, svgAnteprima, xml } from './immagine-anteprima.ts';

const ids = ['a', 'b', 'c', 'd'];

function carta(nome: string, colori: string[]): Carta {
  return {
    nome,
    set: 'fra',
    numero: '1',
    rarita: 'common',
    valore: 2,
    colori,
    identita: colori,
    facce: [{ nome, costo: '', tipo: 'Creature', testo: '' }],
    immagini: [],
    scryfall: '',
  };
}

describe('anteprime', () => {
  it('lega non iniziata: annuncia la prima serata', () => {
    const a = anteprimaClassifica(lega(ids, []));
    expect(a.etichetta).toBe('Si parte domenica 1 novembre');
    expect(a.descrizione).toBe('4 giocatori, 5 serate, set Reality Fracture. Si comincia domenica 1 novembre.');
    expect(a.oro).toBe(false);
  });

  it('a metà lega mostra i primi tre con medaglie e punti', () => {
    const dati = lega(ids, [round(1, [['a', 'b', '2-0'], ['c', 'd', '2-1']])]);
    const a = anteprimaClassifica(dati);
    expect(a.etichetta).toBe('Dopo il round 1 di 10');
    expect(a.righe.map((r) => [r.testo, r.destra, r.medaglia])).toEqual([
      ['A', '3 pt', 1],
      ['C', '3 pt', 2],
      ['D', '0 pt', 3],
    ]);
    expect(a.descrizione).toBe('Dopo il round 1 di 10: in testa A con 3 punti, poi C e D.');
  });

  it('match: abbinamenti del round in corso e bye', () => {
    const dati = lega(['a', 'b', 'c'], [round(1, [['a', 'b', null]], 'c')]);
    const a = anteprimaMatch(dati);
    expect(a.intestazione).toBe('Round 1');
    expect(a.righe.map((r) => r.testo)).toEqual(['A – B', 'Bye: C']);
    expect(a.descrizione).toBe('Serata 1 · domenica 1 novembre, round 1 di 10: A – B.');
  });

  it('match: senza abbinamenti lo dice', () => {
    const a = anteprimaMatch(lega(ids, []));
    expect(a.righe).toEqual([{ testo: 'Abbinamenti in arrivo' }]);
  });

  it('giocatore: posizione, bilancio e colori del pool', () => {
    const dati = lega(ids, [round(1, [['a', 'b', '2-0'], ['c', 'd', '1-1-1']])]);
    dati.giocatori[0]!.pool = [
      { serata: 1, carte: [{ nome: 'Uno', copie: 2 }, { nome: 'Due', copie: 1 }, { nome: 'Tre', copie: 1 }] },
    ];
    const carte = [carta('Uno', ['R']), carta('Due', ['R', 'G']), carta('Tre', [])];
    const a = anteprimaGiocatore(dati, dati.giocatori[0]!, carte);
    expect(a.etichetta).toBe('1° posto · 3 pt');
    expect(a.righe[0]).toMatchObject({ testo: '1 vittoria · 0 sconfitte', destra: '3 pt', medaglia: 1 });
    expect(a.righe[1]).toEqual({
      testo: '4 carte nel pool',
      colori: [
        { colore: 'R', carte: 3 },
        { colore: 'G', carte: 1 },
      ],
    });
    expect(a.descrizione).toBe('A: 1° posto con 3 punti. Pool di 4 carte (soprattutto rosso e verde).');
    expect(a.oro).toBe(true);
    // Con un pareggio compare anche il pareggio.
    expect(anteprimaGiocatore(dati, dati.giocatori[2]!, carte).righe[0]!.testo).toBe('0 vittorie · 1 pareggio · 0 sconfitte');
  });

  it('il testo nell\'SVG è protetto e accorciato', () => {
    expect(xml('A & B <c>')).toBe('A &amp; B &lt;c&gt;');
    expect(accorcia('abcdef', 4)).toBe('abc…');
    const svg = svgAnteprima({ titolo: '', descrizione: '', etichetta: 'x', intestazione: 'R&D', righe: [], oro: false }, 'Lega');
    expect(svg).toContain('R&amp;D');
  });
});

describe('dati strutturati', () => {
  it('una serie con una serata per ogni data decisa', () => {
    const dati = lega(ids, []);
    dati.lega.serate[4]!.data = null;
    const jsonLd = datiStrutturatiLega(dati, 'https://esempio.it/');
    expect(jsonLd).toMatchObject({ '@type': 'EventSeries', startDate: '2026-11-01', url: 'https://esempio.it/' });
    expect(jsonLd).not.toHaveProperty('endDate');
    expect((jsonLd.subEvent as unknown[]).length).toBe(4);
  });

  it('nel testo "<" non può chiudere lo script', () => {
    expect(testoJsonLd({ nome: '</script>' })).toBe('{"nome":"\\u003c/script>"}');
  });
});
