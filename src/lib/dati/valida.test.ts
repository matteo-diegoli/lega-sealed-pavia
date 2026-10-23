import { describe, expect, it } from 'vitest';
import type { Carta } from '../carte/carta.ts';
import { validaDati, type FileDati } from './valida.ts';

// Una lega piccola ma corretta: 4 giocatori, serata 1 con due round giocati.
const LEGA = `
nome: Lega di prova
set: fra
serate:
  - numero: 1
    data: 2026-10-22
    assenti: []
  - numero: 2
    data: null
    assenti: []
`;

const ROUND_1 = `
serata: 1
round: 1
partite:
  - giocatori: [anna, bruno]
    risultato: 2-1
  - giocatori: [carla, dario]
    risultato: 1-1-1
bye: null
`;

const ROUND_2 = `
serata: 1
round: 2
partite:
  - giocatori: [anna, carla]
    risultato: null
  - giocatori: [bruno, dario]
    risultato: 0-2
`;

function giocatore(nome: string, pool = '') {
  return `nome: ${nome}\n${pool}`;
}

function base(): Record<string, string> {
  return {
    'data/league.yml': LEGA,
    'data/players/anna.yml': giocatore('Anna', 'pool:\n  serata-1:\n    - Lightning Bolt\n    - 2 Grizzly Bears\n    - Grizzly Bears\n'),
    'data/players/bruno.yml': giocatore('Bruno'),
    'data/players/carla.yml': giocatore('Carla'),
    'data/players/dario.yml': giocatore('Dario'),
    'data/rounds/serata-1-round-1.yml': ROUND_1,
    'data/rounds/serata-1-round-2.yml': ROUND_2,
  };
}

function controlla(modifiche: Record<string, string | null> = {}) {
  const tutti: Record<string, string | null> = { ...base(), ...modifiche };
  const files: FileDati[] = Object.entries(tutti)
    .filter((voce): voce is [string, string] => voce[1] !== null)
    .map(([percorso, testo]) => ({ percorso, testo }));
  return validaDati(files);
}

/** Controlla che i dati abbiano errori e che uno contenga tutti i pezzi di testo indicati. */
function aspettaErrore(modifiche: Record<string, string | null>, ...pezzi: string[]) {
  const esito = controlla(modifiche);
  expect(esito.ok, 'mi aspettavo un errore').toBe(false);
  if (esito.ok) return;
  const trovato = esito.errori.some((e) => pezzi.every((p) => e.includes(p)));
  expect(trovato, `nessun errore contiene ${JSON.stringify(pezzi)}. Errori:\n${esito.errori.join('\n')}`).toBe(true);
}

describe('dati corretti', () => {
  it('vengono accettati e trasformati', () => {
    const esito = controlla();
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    const { giocatori, round, lega } = esito.dati;
    expect(lega.serate[1]).toEqual({ numero: 2, data: null, assenti: [] });
    expect(giocatori.map((g) => g.id)).toEqual(['anna', 'bruno', 'carla', 'dario']);
    // Le righe della stessa carta si sommano.
    expect(giocatori[0].pool).toEqual([
      {
        serata: 1,
        carte: [
          { nome: 'Lightning Bolt', copie: 1 },
          { nome: 'Grizzly Bears', copie: 3 },
        ],
      },
    ]);
    expect(round.map((r) => r.numeroGlobale)).toEqual([1, 2]);
    expect(round[0].partite[1].risultato).toEqual({ vittorie: [1, 1], pareggi: 1 });
    expect(round[1].partite[0].risultato).toBeNull();
  });

  it('senza giocatori né round (inizio lega) va bene', () => {
    expect(validaDati([{ percorso: 'data/league.yml', testo: LEGA }]).ok).toBe(true);
  });

  it('assenti e pool lasciati vuoti valgono come liste vuote', () => {
    const esito = controlla({
      'data/league.yml': LEGA.replace('assenti: []\n  - numero: 2', 'assenti:\n  - numero: 2'),
      'data/players/bruno.yml': giocatore('Bruno', 'pool:\n  serata-1:\n'),
    });
    expect(esito.ok).toBe(true);
  });

  it('un giocatore assente con il bye a un altro', () => {
    const esito = controlla({
      'data/league.yml': LEGA.replace('assenti: []', 'assenti: [dario]'),
      'data/rounds/serata-1-round-1.yml': ROUND_1.replace(
        '  - giocatori: [carla, dario]\n    risultato: 1-1-1\nbye: null',
        'bye: carla',
      ),
      'data/rounds/serata-1-round-2.yml': null,
    });
    expect(esito.ok).toBe(true);
  });
});

describe('errori in un singolo file', () => {
  it('league.yml mancante', () => {
    aspettaErrore({ 'data/league.yml': null }, 'data/league.yml', 'file mancante');
  });

  it('YAML scritto male indica la riga', () => {
    aspettaErrore({ 'data/players/bruno.yml': 'nome: Bruno\n  pool: [' }, 'data/players/bruno.yml', 'YAML corretto', 'riga');
  });

  it('file vuoto', () => {
    aspettaErrore({ 'data/players/bruno.yml': '   \n' }, 'bruno.yml', 'il file è vuoto');
  });

  it('data inesistente', () => {
    aspettaErrore({ 'data/league.yml': LEGA.replace('2026-10-22', '2026-02-31') }, 'serata 1 › data', 'data non valida');
  });

  it('campo sconosciuto (es. errore di battitura)', () => {
    aspettaErrore({ 'data/players/bruno.yml': 'nome: Bruno\npol: {}' }, 'bruno.yml', 'pol');
  });

  it('nome del file giocatore con maiuscole o spazi', () => {
    aspettaErrore({ 'data/players/Anna Rossi.yml': giocatore('Anna') }, 'Anna Rossi.yml', 'identificativo');
  });

  it('chiave del pool scritta male', () => {
    aspettaErrore({ 'data/players/bruno.yml': giocatore('Bruno', 'pool:\n  serata1:\n    - Opt\n') }, 'bruno.yml, pool › serata1', 'serata-1:');
  });

  it('carta con zero copie', () => {
    aspettaErrore(
      { 'data/players/bruno.yml': giocatore('Bruno', 'pool:\n  serata-1:\n    - 0 Opt\n') },
      'bruno.yml',
      'pool › serata-1 › riga 1',
      '"0 Opt"',
    );
  });

  it('nome di carta con ":" senza virgolette', () => {
    aspettaErrore(
      { 'data/players/bruno.yml': giocatore('Bruno', 'pool:\n  serata-1:\n    - Circle of Protection: Red\n') },
      'bruno.yml',
      'virgolette',
    );
  });

  it.each(['3-0', '2-2', '0-0', '2', 'vinto'])('risultato "%s" non valido', (risultato) => {
    aspettaErrore(
      { 'data/rounds/serata-1-round-1.yml': ROUND_1.replace('risultato: 2-1', `risultato: ${risultato}`) },
      'serata-1-round-1.yml',
      'partita 1 › risultato',
    );
  });

  it('partita con tre giocatori', () => {
    aspettaErrore(
      { 'data/rounds/serata-1-round-1.yml': ROUND_1.replace('[anna, bruno]', '[anna, bruno, carla]') },
      'partita 1 › giocatori',
      'esattamente due',
    );
  });

  it('nome del file round sbagliato', () => {
    aspettaErrore({ 'data/rounds/round-1.yml': ROUND_1 }, 'round-1.yml', 'serata-X-round-Y.yml');
  });

  it('nome del file e contenuto non corrispondono', () => {
    aspettaErrore({ 'data/rounds/serata-1-round-1.yml': ROUND_1.replace('round: 1', 'round: 2') }, 'il nome del file dice');
  });

  it('round 3 in una serata', () => {
    aspettaErrore({ 'data/rounds/serata-1-round-3.yml': ROUND_1.replace('round: 1', 'round: 3') }, 'da 1 a 2');
  });
});

describe('nomi delle carte nei pool', () => {
  const carta = (nome: string): Carta => ({
    nome,
    set: 'fra',
    numero: '1',
    rarita: 'common',
    valore: 1,
    colori: [],
    identita: [],
    facce: [{ nome: nome.split(' // ')[0], costo: '', tipo: '', testo: '' }],
    immagini: [],
    scryfall: '',
  });
  const carte = [carta('Lightning Bolt'), carta('Grizzly Bears'), carta('Opt')];
  const files = (pool: string): FileDati[] =>
    Object.entries({ ...base(), 'data/players/bruno.yml': giocatore('Bruno', pool) }).map(([percorso, testo]) => ({ percorso, testo }));

  it('i nomi vengono riscritti come su Scryfall e le copie sommate', () => {
    const esito = validaDati(files('pool:\n  serata-1:\n    - opt\n    - 2 OPT\n'), carte);
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    const bruno = esito.dati.giocatori.find((g) => g.id === 'bruno');
    expect(bruno?.pool[0].carte).toEqual([{ nome: 'Opt', copie: 3 }]);
  });

  it('carta inesistente con suggerimento', () => {
    const esito = validaDati(files('pool:\n  serata-1:\n    - Lightnig Bolt\n'), carte);
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.errori).toEqual([
      'data/players/bruno.yml, pool › serata-1: la carta "Lightnig Bolt" non esiste. Forse intendevi "Lightning Bolt"? Se è una carta di un altro set, lancia "npm run scryfall".',
    ]);
  });

  it('cache delle carte mancante', () => {
    const esito = validaDati(files('pool:\n  serata-1:\n    - Opt\n'), null);
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.errori[0]).toContain('npm run scryfall');
  });
});

describe('errori tra file diversi', () => {
  it('giocatore inesistente in una partita', () => {
    aspettaErrore(
      { 'data/rounds/serata-1-round-1.yml': ROUND_1.replace('bruno', 'brunoo') },
      'serata-1-round-1.yml, partita 1',
      '"brunoo" non è un giocatore',
      'anna, bruno, carla, dario',
    );
  });

  it('giocatore abbinato due volte', () => {
    aspettaErrore(
      { 'data/rounds/serata-1-round-1.yml': ROUND_1.replace('[carla, dario]', '[carla, anna]') },
      'partita 2',
      '"anna" compare già in partita 1',
    );
  });

  it('giocatore con il bye che gioca anche una partita', () => {
    aspettaErrore({ 'data/rounds/serata-1-round-1.yml': ROUND_1.replace('bye: null', 'bye: anna') }, 'bye', 'compare già');
  });

  it('giocatore assente ma abbinato', () => {
    aspettaErrore({ 'data/league.yml': LEGA.replace('assenti: []', 'assenti: [dario]') }, 'partita 2', '"dario" è segnato assente');
  });

  it('giocatore presente ma non abbinato', () => {
    aspettaErrore(
      { 'data/players/elena.yml': giocatore('Elena') },
      'serata-1-round-1.yml',
      '"elena" non compare nel round',
    );
  });

  it('assente che non è un giocatore', () => {
    aspettaErrore({ 'data/league.yml': LEGA.replace('assenti: []', 'assenti: [zeno]') }, 'serata 1', '"zeno" è tra gli assenti');
  });

  it('pool di una serata che non esiste', () => {
    aspettaErrore({ 'data/players/bruno.yml': giocatore('Bruno', 'pool:\n  serata-3:\n    - Opt\n') }, 'bruno.yml', 'serata 3');
  });

  it('round in una serata senza data', () => {
    aspettaErrore(
      { 'data/rounds/serata-2-round-1.yml': ROUND_2.replace('serata: 1', 'serata: 2').replace('round: 2', 'round: 1') },
      'serata-2-round-1.yml',
      'non ha ancora una data',
    );
  });

  it('round mancante nella sequenza', () => {
    aspettaErrore({ 'data/rounds/serata-1-round-1.yml': null }, 'serata-1-round-2.yml', 'manca il round precedente', 'serata-1-round-1.yml');
  });

  it('risultato mancante ma round successivo già creato', () => {
    aspettaErrore(
      { 'data/rounds/serata-1-round-1.yml': ROUND_1.replace('risultato: 2-1', 'risultato: null') },
      'serata-1-round-1.yml, partita 1',
      'manca il risultato',
    );
  });

  it('serate non in ordine', () => {
    aspettaErrore({ 'data/league.yml': LEGA.replace('numero: 2', 'numero: 3') }, 'serata 2', 'mi aspettavo 2');
  });

  it('data di una serata prima della precedente', () => {
    aspettaErrore({ 'data/league.yml': LEGA.replace('data: null', 'data: 2026-10-01') }, 'non viene dopo');
  });
});
