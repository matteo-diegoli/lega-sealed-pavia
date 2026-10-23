import { describe, expect, it } from 'vitest';
import { INDIRIZZO_PREDEFINITO, scegliIndirizzo, scomponiIndirizzo, unisciPercorso } from './indirizzo.ts';

describe('indirizzo del sito', () => {
  it('scompone un indirizzo di GitHub Pages in site e base', () => {
    expect(scomponiIndirizzo('https://matteo-diegoli.github.io/lega-sealed-pavia')).toEqual({
      completo: 'https://matteo-diegoli.github.io/lega-sealed-pavia/',
      site: 'https://matteo-diegoli.github.io',
      base: '/lega-sealed-pavia/',
    });
  });

  it('un dominio personale ha base "/"', () => {
    expect(scomponiIndirizzo('https://lega.example.it')).toMatchObject({ base: '/', completo: 'https://lega.example.it/' });
  });

  it('rifiuta indirizzi incompleti o con parametri', () => {
    expect(() => scomponiIndirizzo('lega.example.it')).toThrow(/non valido/);
    expect(() => scomponiIndirizzo('ftp://lega.example.it/')).toThrow(/https/);
    expect(() => scomponiIndirizzo('https://lega.example.it/?a=1')).toThrow(/"\?"/);
  });

  it('SITO_URL vince su league.yml, che vince sul predefinito', () => {
    expect(scegliIndirizzo('https://a.it/', 'https://b.it/').site).toBe('https://a.it');
    expect(scegliIndirizzo('  ', 'https://b.it/').site).toBe('https://b.it');
    expect(scegliIndirizzo(undefined, null).completo).toBe(INDIRIZZO_PREDEFINITO);
  });

  it('unisce la sottocartella ai percorsi delle pagine', () => {
    expect(unisciPercorso('/lega-sealed-pavia/', '/match/')).toBe('/lega-sealed-pavia/match/');
    expect(unisciPercorso('/lega-sealed-pavia', '')).toBe('/lega-sealed-pavia/');
    expect(unisciPercorso('/', 'giocatori/anna/')).toBe('/giocatori/anna/');
  });
});
