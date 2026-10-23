import { describe, expect, it } from 'vitest';
import type { Carta } from '../carte/carta.ts';
import {
  fasciaCosto,
  filtra,
  filtriAttivi,
  leggiStato,
  scriviStato,
  statoVuoto,
  vocePool,
  type StatoPool,
  type VocePool,
} from './filtri.ts';

function carta(nome: string, colori: string[], valore: number, tipo: string, rarita: Carta['rarita'], testo = ''): Carta {
  return {
    nome,
    set: 'fra',
    numero: '1',
    rarita,
    valore,
    colori,
    identita: colori,
    facce: [{ nome, costo: '', tipo, testo }],
    immagini: [],
    scryfall: '',
  };
}

const voci: VocePool[] = [
  vocePool('Serra Angel', carta('Serra Angel', ['W'], 5, 'Creature — Angel', 'uncommon', 'Flying, vigilance'), [
    { serata: 1, copie: 1 },
  ]),
  vocePool('Lightning Bolt', carta('Lightning Bolt', ['R'], 1, 'Instant', 'common', 'Deals 3 damage'), [
    { serata: 1, copie: 2 },
    { serata: 3, copie: 1 },
  ]),
  vocePool('Wear // Tear', carta('Wear // Tear', ['R', 'W'], 2, 'Instant', 'rare'), [{ serata: 2, copie: 1 }]),
  vocePool('Ornithopter', carta('Ornithopter', [], 0, 'Artifact Creature — Thopter', 'mythic', 'Flying'), [
    { serata: 3, copie: 1 },
  ]),
  vocePool('Grizzly Bears', carta('Grizzly Bears', ['G'], 2, 'Creature — Bear', 'common'), [{ serata: 2, copie: 3 }]),
];

const stato = (modifiche: Partial<StatoPool>): StatoPool => ({ ...statoVuoto(), ...modifiche });
const nomi = (s: StatoPool) => filtra(voci, s).visibili.map((v) => voci[v.indice]!.nome);

describe('voci del pool', () => {
  it('ricava colore, tipi e fascia di costo', () => {
    expect(voci[2]).toMatchObject({ colore: 'multi', tipi: ['istantaneo'], costo: '2', copie: { '2': 1 } });
    expect(voci[3]).toMatchObject({ colore: 'incolore', tipi: ['creatura', 'artefatto'], costo: '0-1' });
    expect([0, 1, 2, 5, 6, 9].map(fasciaCosto)).toEqual(['0-1', '0-1', '2', '5', '6+', '6+']);
  });
});

describe('filtri', () => {
  it('senza filtri mostra tutto, ordinato per colore e poi per costo', () => {
    expect(nomi(statoVuoto())).toEqual(['Serra Angel', 'Lightning Bolt', 'Grizzly Bears', 'Wear // Tear', 'Ornithopter']);
    expect(filtra(voci, statoVuoto()).copie).toBe(9);
  });

  it('cerca nel nome, nel tipo e nel testo, ignorando maiuscole', () => {
    expect(nomi(stato({ q: 'flying' }))).toEqual(['Serra Angel', 'Ornithopter']);
    expect(nomi(stato({ q: 'BEAR' }))).toEqual(['Grizzly Bears']);
    expect(nomi(stato({ q: 'artifact flying' }))).toEqual(['Ornithopter']);
  });

  it('nello stesso gruppo basta un valore, tra gruppi diversi servono tutti', () => {
    expect(nomi(stato({ colori: ['R', 'G'] }))).toEqual(['Lightning Bolt', 'Grizzly Bears']);
    expect(nomi(stato({ colori: ['R', 'multi'], tipi: ['istantaneo'] }))).toEqual(['Lightning Bolt', 'Wear // Tear']);
    expect(nomi(stato({ tipi: ['creatura'], costi: ['0-1'] }))).toEqual(['Ornithopter']);
    expect(nomi(stato({ rarita: ['rare', 'mythic'] }))).toEqual(['Wear // Tear', 'Ornithopter']);
  });

  it('con il filtro per serata conta solo le copie di quelle serate', () => {
    const esito = filtra(voci, stato({ serate: ['3'] }));
    expect(esito.visibili.map((v) => [voci[v.indice]!.nome, v.copie])).toEqual([
      ['Lightning Bolt', 1],
      ['Ornithopter', 1],
    ]);
    expect(esito.copie).toBe(2);
  });

  it('ordina per nome, costo, rarità e serata', () => {
    expect(nomi(stato({ ordine: 'nome' }))).toEqual(['Grizzly Bears', 'Lightning Bolt', 'Ornithopter', 'Serra Angel', 'Wear // Tear']);
    expect(nomi(stato({ ordine: 'costo' }))).toEqual(['Ornithopter', 'Lightning Bolt', 'Grizzly Bears', 'Wear // Tear', 'Serra Angel']);
    expect(nomi(stato({ ordine: 'rarita' }))).toEqual(['Ornithopter', 'Wear // Tear', 'Serra Angel', 'Grizzly Bears', 'Lightning Bolt']);
    expect(nomi(stato({ ordine: 'serata' }))).toEqual(['Lightning Bolt', 'Serra Angel', 'Grizzly Bears', 'Wear // Tear', 'Ornithopter']);
  });
});

describe('stato nell\'indirizzo', () => {
  it('scrive solo quello che serve e lo rilegge uguale', () => {
    const s = stato({ q: 'goblin', colori: ['R', 'G'], serate: ['2'], ordine: 'costo', vista: 'immagini' });
    const testo = scriviStato(s);
    expect(testo).toBe('q=goblin&colore=R,G&serata=2&ordine=costo&vista=immagini');
    expect(leggiStato(new URLSearchParams(testo))).toEqual(s);
    expect(scriviStato(statoVuoto())).toBe('');
    expect(filtriAttivi(s)).toBe(3);
  });

  it('scarta i valori sconosciuti e i doppioni', () => {
    const letto = leggiStato(new URLSearchParams('colore=R,X,R&tipo=boh&ordine=a-caso&vista=griglia&costo=6+'));
    expect(letto).toEqual(stato({ colori: ['R'] }));
  });

  it('legge il "+" della fascia 6+ quando è scritto come %2B', () => {
    expect(leggiStato(new URLSearchParams('costo=6%2B')).costi).toEqual(['6+']);
  });
});
