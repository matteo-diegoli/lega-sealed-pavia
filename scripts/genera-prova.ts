// npm run genera-prova: crea dati FITTIZI per provare il sito (8 giocatori, 2 serate giocate).
// Usa sempre la stessa sequenza casuale, quindi genera sempre gli stessi dati.
// Non sovrascrive giocatori o round già presenti, a meno di lanciarlo con "--forza".

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dump } from 'js-yaml';
import type { Carta } from '../src/lib/carte/carta.ts';
import { controllaDati, leggiCacheCarte } from '../src/lib/dati/carica.ts';
import { FILE_LEGA } from '../src/lib/dati/valida.ts';

const GIOCATORI = [
  { id: 'anna', nome: 'Anna Bianchi' },
  { id: 'bruno', nome: 'Bruno Ferrari' },
  { id: 'carla', nome: 'Carla Russo' },
  { id: 'dario', nome: 'Dario Colombo' },
  { id: 'elena', nome: 'Elena Ricci' },
  { id: 'fabio', nome: 'Fabio Marino' },
  { id: 'giulia', nome: 'Giulia Greco' },
  { id: 'marco', nome: 'Marco Bruno' },
];
/** Assente alla serata 2. */
const ASSENTE_SERATA_2 = 'marco';
const DATA_SERATA_2 = '2026-10-29';
const SEME_INIZIALE = 2026;

type Esito = { a: string; b: string; risultato: string };
type RoundFittizio = { serata: number; round: number; partite: Esito[]; bye: string | null };

/** Generatore di numeri casuali con seme (mulberry32): stesso seme, stessi numeri. */
function casuale(seme: number): () => number {
  let s = seme >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sceglie n elementi diversi da una lista. */
function pesca<T>(lista: T[], n: number, rnd: () => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, n);
}

/** Una busta semplificata: 1 rara (1 volta su 8 mitica), 3 non comuni, 10 comuni. */
function busta(perRarita: Record<string, Carta[]>, rnd: () => number): string[] {
  const rara = rnd() < 1 / 8 && perRarita.mythic.length > 0 ? perRarita.mythic : perRarita.rare;
  return [...pesca(rara, 1, rnd), ...pesca(perRarita.uncommon, 3, rnd), ...pesca(perRarita.common, 10, rnd)].map((c) => c.nome);
}

/** Abbinamenti senza rivincite con il metodo "a cerchio" (girone all'italiana): un round per indice. */
function roundRobin(ids: string[], indice: number): [string, string][] {
  const [fisso, ...ruotanti] = ids;
  const giro = [...ruotanti.slice(indice % ruotanti.length), ...ruotanti.slice(0, indice % ruotanti.length)];
  const cerchio = [fisso, ...giro];
  const n = cerchio.length;
  return Array.from({ length: n / 2 }, (_, i) => [cerchio[i], cerchio[n - 1 - i]] as [string, string]);
}

/** Risultato plausibile: 2-1 (metà delle volte), 2-0, ogni tanto un pareggio 1-1-1. */
function risultato(rnd: () => number): string {
  const x = rnd();
  const vinceIlPrimo = rnd() < 0.5;
  if (x < 0.1) return '1-1-1';
  const [v, p] = x < 0.6 ? [2, 1] : [2, 0];
  return vinceIlPrimo ? `${v}-${p}` : `${p}-${v}`;
}

function punti(rounds: RoundFittizio[]): Map<string, number> {
  const tot = new Map(GIOCATORI.map((g) => [g.id, 0]));
  const aggiungi = (id: string, p: number) => tot.set(id, (tot.get(id) ?? 0) + p);
  for (const r of rounds) {
    for (const { a, b, risultato: ris } of r.partite) {
      const [va, vb] = ris.split('-').map(Number);
      if (va > vb) aggiungi(a, 3);
      else if (vb > va) aggiungi(b, 3);
      else {
        aggiungi(a, 1);
        aggiungi(b, 1);
      }
    }
    if (r.bye !== null) aggiungi(r.bye, 3);
  }
  return tot;
}

/** Prova un seme: va bene se dopo la serata 1 c'è un solo ultimo in classifica e non è l'assente della serata 2. */
function genera(seme: number, perRarita: Record<string, Carta[]>) {
  const rnd = casuale(seme);
  const ids = GIOCATORI.map((g) => g.id);
  const rounds: RoundFittizio[] = [];

  // Serata 1: round 1 e 2, tutti presenti.
  for (let r = 0; r < 2; r++) {
    rounds.push({
      serata: 1,
      round: r + 1,
      partite: roundRobin(ids, r).map(([a, b]) => ({ a, b, risultato: risultato(rnd) })),
      bye: null,
    });
  }
  const classifica = punti(rounds);
  const minimo = Math.min(...classifica.values());
  const ultimi = [...classifica].filter(([, p]) => p === minimo).map(([id]) => id);
  if (ultimi.length !== 1 || ultimi[0] === ASSENTE_SERATA_2) return null;
  const ultimo = ultimi[0];

  // Serata 2: round 3 e 4, senza l'assente; chi doveva giocare con lui ha il bye.
  for (let r = 2; r < 4; r++) {
    let bye: string | null = null;
    const partite: Esito[] = [];
    for (const [a, b] of roundRobin(ids, r)) {
      if (a === ASSENTE_SERATA_2) bye = b;
      else if (b === ASSENTE_SERATA_2) bye = a;
      else partite.push({ a, b, risultato: risultato(rnd) });
    }
    rounds.push({ serata: 2, round: r - 1, partite, bye });
  }

  // Pool: 6 buste alla serata 1; alla serata 2 una busta ai presenti, più una all'ultimo dopo la serata 1.
  const pool = new Map(
    ids.map((id) => {
      const serata1 = Array.from({ length: 6 }, () => busta(perRarita, rnd)).flat();
      const buste2 = id === ASSENTE_SERATA_2 ? 0 : id === ultimo ? 2 : 1;
      const serata2 = Array.from({ length: buste2 }, () => busta(perRarita, rnd)).flat();
      return [id, { serata1, serata2 }];
    }),
  );
  return { rounds, pool, ultimo };
}

/** Lista di carte → righe del pool, con il numero di copie davanti per le doppie. */
function righePool(nomi: string[]): string[] {
  const copie = new Map<string, number>();
  for (const n of nomi) copie.set(n, (copie.get(n) ?? 0) + 1);
  return [...copie]
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([nome, n]) => (n > 1 ? `${n} ${nome}` : nome));
}

function cartellaPiena(percorso: string): boolean {
  return existsSync(percorso) && readdirSync(percorso).some((f) => f.endsWith('.yml'));
}

function principale() {
  const forza = process.argv.includes('--forza');
  if (!forza && (cartellaPiena('data/players') || cartellaPiena('data/rounds'))) {
    console.error('❌ Ci sono già giocatori o round in data/: non li sovrascrivo.');
    console.error('   Se vuoi davvero sostituirli con i dati fittizi lancia: npm run genera-prova -- --forza');
    process.exitCode = 1;
    return;
  }

  const cache = leggiCacheCarte();
  if (cache === null) {
    console.error('❌ Manca la cache delle carte: lancia prima "npm run scryfall".');
    process.exitCode = 1;
    return;
  }
  // Solo carte del set della lega, senza le terre base.
  const carte = cache.carte.filter((c) => c.set === cache.set && !c.facce[0].tipo.startsWith('Basic Land'));
  const perRarita: Record<string, Carta[]> = { common: [], uncommon: [], rare: [], mythic: [] };
  for (const c of carte) perRarita[c.rarita]?.push(c);

  let seme = SEME_INIZIALE;
  let dati = genera(seme, perRarita);
  while (dati === null) dati = genera(++seme, perRarita);

  // league.yml: data e assente della serata 2 (unico dato fittizio nel file vero).
  const lega = readFileSync(FILE_LEGA, 'utf8');
  const serata2 = /(- numero: 2\r?\n\s*data:) [^\r\n]*(\r?\n\s*assenti:) [^\r\n]*/;
  if (!serata2.test(lega)) throw new Error(`non trovo la serata 2 in ${FILE_LEGA}`);
  writeFileSync(FILE_LEGA, lega.replace(serata2, `$1 ${DATA_SERATA_2}   # FITTIZIA: rimettere null con i dati veri$2 [${ASSENTE_SERATA_2}]`));

  rmSync('data/players', { recursive: true, force: true });
  rmSync('data/rounds', { recursive: true, force: true });
  mkdirSync('data/players', { recursive: true });
  mkdirSync('data/rounds', { recursive: true });

  const intestazione = '# Dati FITTIZI generati da "npm run genera-prova": da sostituire con quelli veri.\n\n';
  for (const g of GIOCATORI) {
    const { serata1, serata2: carte2 } = dati.pool.get(g.id)!;
    const pool: Record<string, string[]> = { 'serata-1': righePool(serata1) };
    if (carte2.length > 0) pool['serata-2'] = righePool(carte2);
    writeFileSync(`data/players/${g.id}.yml`, intestazione + dump({ nome: g.nome, pool }, { lineWidth: -1 }));
  }

  for (const r of dati.rounds) {
    const partite = r.partite.map((p) => `  - giocatori: [${p.a}, ${p.b}]\n    risultato: ${p.risultato}\n`).join('');
    const testo = `${intestazione}serata: ${r.serata}\nround: ${r.round}\n\npartite:\n${partite}\nbye: ${r.bye ?? 'null'}\n`;
    writeFileSync(`data/rounds/serata-${r.serata}-round-${r.round}.yml`, testo);
  }

  console.log(`Creati ${GIOCATORI.length} giocatori e ${dati.rounds.length} round (seme ${seme}).`);
  console.log(`Ultimo dopo la serata 1: ${dati.ultimo} (busta extra alla serata 2). Assente alla serata 2: ${ASSENTE_SERATA_2}.`);

  const esito = controllaDati();
  if (esito.ok) {
    console.log('✅ I dati generati superano il controllo.');
  } else {
    console.error('❌ I dati generati non superano il controllo:');
    for (const e of esito.errori) console.error(`  ❌ ${e}`);
    process.exitCode = 1;
  }
}

principale();
