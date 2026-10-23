import { describe, expect, it } from 'vitest';
import { convertiCarta, scegliStampe, type Carta, type CartaScryfall } from './carta.ts';
import { distanza, IndiceCarte, normalizza } from './nomi.ts';

const img = (id: string) => ({ small: `https://img/small/${id}.jpg`, normal: `https://img/normal/${id}.jpg` });

/** Stampa di Scryfall di esempio, con i soli campi che usiamo. */
function stampa(dati: Partial<CartaScryfall> & { name: string }): CartaScryfall {
  return {
    set: 'fra',
    collector_number: '1',
    rarity: 'common',
    cmc: 1,
    mana_cost: '{R}',
    type_line: 'Instant',
    oracle_text: 'Testo.',
    colors: ['R'],
    color_identity: ['R'],
    image_uris: img(dati.name),
    booster: true,
    scryfall_uri: `https://scryfall.com/${dati.name}`,
    ...dati,
  };
}

describe('convertiCarta', () => {
  it('carta normale', () => {
    const carta = convertiCarta(stampa({ name: 'Lightning Bolt', colors: ['R', 'W'], color_identity: ['R', 'W'] }));
    expect(carta).toMatchObject({
      nome: 'Lightning Bolt',
      numero: '1',
      rarita: 'common',
      valore: 1,
      colori: ['W', 'R'], // in ordine WUBRG
      facce: [{ nome: 'Lightning Bolt', costo: '{R}', tipo: 'Instant', testo: 'Testo.' }],
      immagini: [{ piccola: 'https://img/small/Lightning Bolt.jpg', normale: 'https://img/normal/Lightning Bolt.jpg' }],
    });
  });

  it('carta a due facce con un\'immagine per faccia e colori solo sulle facce', () => {
    const carta = convertiCarta(
      stampa({
        name: 'Fronte // Retro',
        colors: undefined,
        image_uris: undefined,
        card_faces: [
          { name: 'Fronte', mana_cost: '{G}', type_line: 'Creature', colors: ['G'], image_uris: img('fronte') },
          { name: 'Retro', type_line: 'Creature', colors: ['B'], image_uris: img('retro') },
        ],
      }),
    );
    expect(carta.colori).toEqual(['B', 'G']);
    expect(carta.facce.map((f) => f.nome)).toEqual(['Fronte', 'Retro']);
    expect(carta.immagini).toHaveLength(2);
  });

  it('carta "prepare" con due facce ma una sola immagine', () => {
    const carta = convertiCarta(
      stampa({ name: 'Angelo // Incantesimo', card_faces: [{ name: 'Angelo' }, { name: 'Incantesimo' }] }),
    );
    expect(carta.facce).toHaveLength(2);
    expect(carta.immagini).toHaveLength(1);
  });
});

describe('scegliStampe', () => {
  it('tiene una sola stampa per carta, la versione normale da busta', () => {
    const scelte = scegliStampe([
      stampa({ name: 'Opt', collector_number: '300', frame_effects: ['showcase'] }),
      stampa({ name: 'Opt', collector_number: '45' }),
      stampa({ name: 'Opt', collector_number: '12', booster: false, promo: true }),
      stampa({ name: 'Shock', collector_number: '9' }),
    ]);
    expect(scelte.map((s) => `${s.name} ${s.collector_number}`).sort()).toEqual(['Opt 45', 'Shock 9']);
  });
});

describe('nomi', () => {
  const carte: Carta[] = [
    convertiCarta(stampa({ name: 'Lightning Bolt' })),
    convertiCarta(stampa({ name: "Urza's Saga" })),
    convertiCarta(stampa({ name: 'Lim-Dûl the Necromancer' })),
    convertiCarta(stampa({ name: 'Fronte // Retro', card_faces: [{ name: 'Fronte' }, { name: 'Retro' }] })),
  ];
  const indice = new IndiceCarte(carte);

  it('normalizza maiuscole, accenti, apostrofi e spazi', () => {
    expect(normalizza('  URZA’S   saga ')).toBe("urza's saga");
    expect(normalizza('Lim-Dûl')).toBe('lim-dul');
  });

  it('trova le carte ignorando maiuscole, accenti e apostrofi', () => {
    expect(indice.trova('lightning bolt')?.nome).toBe('Lightning Bolt');
    expect(indice.trova('Urza’s Saga')?.nome).toBe("Urza's Saga");
    expect(indice.trova('Lim-Dul the Necromancer')?.nome).toBe('Lim-Dûl the Necromancer');
  });

  it('per le carte a due facce basta il nome della prima faccia', () => {
    expect(indice.trova('Fronte')?.nome).toBe('Fronte // Retro');
    expect(indice.trova('Fronte // Retro')?.nome).toBe('Fronte // Retro');
    expect(indice.trova('Retro')).toBeUndefined();
  });

  it('suggerisce il nome giusto per un errore di battitura', () => {
    expect(indice.suggerisci('Lightnig Bolt')).toBe('Lightning Bolt');
    expect(indice.suggerisci('Lighting Blot')).toBe('Lightning Bolt');
  });

  it('non suggerisce nulla per nomi troppo diversi', () => {
    expect(indice.suggerisci('Grizzly Bears')).toBeUndefined();
  });

  it('distanza tra parole', () => {
    expect(distanza('gatto', 'gatto')).toBe(0);
    expect(distanza('gatto', 'gatti')).toBe(1);
    expect(distanza('', 'abc')).toBe(3);
  });
});
