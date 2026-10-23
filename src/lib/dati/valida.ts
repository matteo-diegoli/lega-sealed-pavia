// Controllo completo dei dati della lega.
// Riceve il testo dei file (così si può testare senza toccare il disco),
// controlla ogni file con gli schemi e poi la coerenza tra i file.
// Tutti i messaggi di errore sono in italiano e indicano il file da correggere.

import { load, YAMLException } from 'js-yaml';
import type { z } from 'zod';
import { FILE_CACHE_CARTE, type Carta } from '../carte/carta.ts';
import { IndiceCarte } from '../carte/nomi.ts';
import {
  CHIAVE_SERATA,
  ID_GIOCATORE,
  ROUND_PER_SERATA,
  schemaGiocatore,
  schemaLega,
  schemaRound,
  type CartaPool,
  type Lega,
  type Partita,
} from './schema.ts';

/** Un file da controllare: percorso relativo alla cartella del progetto (con "/") e contenuto. */
export interface FileDati {
  percorso: string;
  testo: string;
}

export interface Giocatore {
  id: string;
  nome: string;
  /** Carte aperte, divise per serata (ordinate per numero di serata). */
  pool: { serata: number; carte: CartaPool[] }[];
}

export interface Round {
  serata: number;
  /** Round della serata: 1 o 2. */
  round: number;
  /** Round dall'inizio della lega: da 1 a 10. */
  numeroGlobale: number;
  partite: Partita[];
  bye: string | null;
  percorso: string;
}

export interface DatiLega {
  lega: Lega;
  giocatori: Giocatore[];
  /** Ordinati dal primo all'ultimo. */
  round: Round[];
}

export type EsitoControllo = { ok: true; dati: DatiLega } | { ok: false; errori: string[] };

export const FILE_LEGA = 'data/league.yml';
const CARTELLA_GIOCATORI = 'data/players/';
const CARTELLA_ROUND = 'data/rounds/';
const NOME_FILE_ROUND = /^serata-(\d+)-round-(\d+)\.yml$/;

// Nomi al singolare per descrivere la posizione di un elemento in una lista.
const SINGOLARE: Record<string, string> = {
  serate: 'serata',
  partite: 'partita',
  giocatori: 'giocatore',
  assenti: 'assente',
};

/** Trasforma il percorso di un errore Zod in testo, es. ["partite", 1, "risultato"] → "partita 2 › risultato". */
function descriviPosizione(posizione: readonly PropertyKey[]): string {
  const parti: string[] = [];
  for (const pezzo of posizione) {
    if (typeof pezzo === 'number') {
      const precedente = parti.at(-1);
      if (precedente !== undefined && precedente in SINGOLARE) {
        parti[parti.length - 1] = `${SINGOLARE[precedente]} ${pezzo + 1}`;
      } else {
        parti.push(`riga ${pezzo + 1}`);
      }
    } else {
      parti.push(String(pezzo));
    }
  }
  return parti.join(' › ');
}

function errore(percorso: string, messaggio: string, posizione: readonly PropertyKey[] = []): string {
  const dove = descriviPosizione(posizione);
  return `${percorso}${dove ? `, ${dove}` : ''}: ${messaggio}`;
}

/** Legge il YAML e lo controlla con lo schema. Restituisce i dati, oppure null aggiungendo gli errori. */
function leggi<S extends z.ZodType>(file: FileDati, schema: S, errori: string[]): z.output<S> | null {
  if (file.testo.trim() === '') {
    errori.push(`${file.percorso}: il file è vuoto`);
    return null;
  }
  let grezzo: unknown;
  try {
    grezzo = load(file.testo);
  } catch (e) {
    if (e instanceof YAMLException) {
      const riga = e.mark ? ` (riga ${e.mark.line + 1}, colonna ${e.mark.column + 1})` : '';
      errori.push(`${file.percorso}: il file non è scritto in YAML corretto${riga}: ${e.reason}. Controlla rientri, trattini e due punti.`);
      return null;
    }
    throw e;
  }
  const esito = schema.safeParse(grezzo ?? {});
  if (!esito.success) {
    for (const problema of esito.error.issues) {
      errori.push(errore(file.percorso, problema.message, problema.path));
    }
    return null;
  }
  return esito.data;
}

function elencoGiocatori(ids: Set<string>): string {
  return ids.size > 0 ? [...ids].sort().join(', ') : 'nessuno (manca la cartella data/players/)';
}

/**
 * @param carte le carte della cache di Scryfall, per controllare i nomi nei pool:
 *   null se la cache manca, undefined per saltare il controllo (lo usa lo script che crea la cache).
 */
export function validaDati(files: FileDati[], carte?: Carta[] | null): EsitoControllo {
  const errori: string[] = [];

  // --- 1. Ogni file da solo ---------------------------------------------------

  const fileLega = files.find((f) => f.percorso === FILE_LEGA);
  let lega: Lega | null = null;
  if (fileLega === undefined) {
    errori.push(`${FILE_LEGA}: file mancante. Serve per sapere nome della lega, set e serate.`);
  } else {
    lega = leggi(fileLega, schemaLega, errori);
  }

  const giocatori: Giocatore[] = [];
  const round: Round[] = [];

  for (const file of files) {
    if (file.percorso.startsWith(CARTELLA_GIOCATORI)) {
      const nomeFile = file.percorso.slice(CARTELLA_GIOCATORI.length);
      if (!nomeFile.endsWith('.yml')) {
        errori.push(`${file.percorso}: i file dei giocatori devono finire in .yml`);
        continue;
      }
      const id = nomeFile.slice(0, -'.yml'.length);
      if (!ID_GIOCATORE.test(id)) {
        errori.push(
          `${file.percorso}: il nome del file è l'identificativo del giocatore e può contenere solo lettere minuscole, cifre e trattini, senza spazi né accenti (es. anna.yml)`,
        );
        continue;
      }
      const letto = leggi(file, schemaGiocatore, errori);
      if (letto === null) continue;
      const pool = Object.entries(letto.pool)
        .map(([chiave, carte]) => ({ serata: Number(CHIAVE_SERATA.exec(chiave)![1]), carte: unisciCopie(carte) }))
        .sort((a, b) => a.serata - b.serata);
      giocatori.push({ id, nome: letto.nome, pool });
    } else if (file.percorso.startsWith(CARTELLA_ROUND)) {
      const nomeFile = file.percorso.slice(CARTELLA_ROUND.length);
      const nome = NOME_FILE_ROUND.exec(nomeFile);
      if (nome === null) {
        errori.push(`${file.percorso}: i file dei round si chiamano serata-X-round-Y.yml (es. serata-1-round-2.yml)`);
        continue;
      }
      const letto = leggi(file, schemaRound, errori);
      if (letto === null) continue;
      if (letto.serata !== Number(nome[1]) || letto.round !== Number(nome[2])) {
        errori.push(
          `${file.percorso}: il nome del file dice serata ${nome[1]} round ${nome[2]}, ma dentro c'è scritto serata ${letto.serata} round ${letto.round}. Correggi uno dei due.`,
        );
        continue;
      }
      round.push({
        ...letto,
        numeroGlobale: (letto.serata - 1) * ROUND_PER_SERATA + letto.round,
        percorso: file.percorso,
      });
    }
  }

  // Se qualche file è scritto male, i controlli incrociati darebbero errori confusi: ci fermiamo qui.
  if (errori.length > 0 || lega === null) return { ok: false, errori };

  // --- 2. Coerenza tra i file ---------------------------------------------------

  const ids = new Set(giocatori.map((g) => g.id));
  const serate = new Map(lega.serate.map((s) => [s.numero, s]));

  // Serate numerate 1, 2, 3… in ordine, con le date in ordine e quelle non decise solo in fondo.
  lega.serate.forEach((serata, i) => {
    const posizione = ['serate', i];
    if (serata.numero !== i + 1) {
      errori.push(errore(FILE_LEGA, `le serate vanno numerate in ordine da 1: qui mi aspettavo ${i + 1}, c'è ${serata.numero}`, posizione));
    }
    const precedente = lega.serate[i - 1];
    if (precedente !== undefined && serata.data !== null) {
      if (precedente.data === null) {
        errori.push(errore(FILE_LEGA, `la serata ${serata.numero} ha una data ma la serata ${precedente.numero} no`, posizione));
      } else if (serata.data <= precedente.data) {
        errori.push(errore(FILE_LEGA, `la data ${serata.data} non viene dopo quella della serata precedente (${precedente.data})`, posizione));
      }
    }
    const visti = new Set<string>();
    for (const assente of serata.assenti) {
      if (!ids.has(assente)) {
        errori.push(errore(FILE_LEGA, `"${assente}" è tra gli assenti ma non è un giocatore. Giocatori esistenti: ${elencoGiocatori(ids)}`, posizione));
      }
      if (visti.has(assente)) {
        errori.push(errore(FILE_LEGA, `"${assente}" è scritto due volte tra gli assenti`, posizione));
      }
      visti.add(assente);
    }
  });

  for (const giocatore of giocatori) {
    for (const { serata } of giocatore.pool) {
      if (!serate.has(serata)) {
        errori.push(`${CARTELLA_GIOCATORI}${giocatore.id}.yml: il pool ha carte per la serata ${serata}, che non esiste in ${FILE_LEGA}`);
      }
    }
  }

  // Nomi delle carte: devono esistere nella cache di Scryfall. Li riscriviamo con il nome ufficiale.
  if (carte === null) {
    if (giocatori.some((g) => g.pool.some((p) => p.carte.length > 0))) {
      errori.push(`${FILE_CACHE_CARTE}: file mancante. Lancia "npm run scryfall" per scaricare le carte da Scryfall.`);
    }
  } else if (carte !== undefined) {
    const indice = new IndiceCarte(carte);
    for (const giocatore of giocatori) {
      for (const parte of giocatore.pool) {
        parte.carte = unisciCopie(
          parte.carte.map((carta) => {
            const trovata = indice.trova(carta.nome);
            if (trovata !== undefined) return { ...carta, nome: trovata.nome };
            const suggerimento = indice.suggerisci(carta.nome);
            errori.push(
              `${CARTELLA_GIOCATORI}${giocatore.id}.yml, pool › serata-${parte.serata}: la carta "${carta.nome}" non esiste.` +
                (suggerimento ? ` Forse intendevi "${suggerimento}"?` : '') +
                ` Se è una carta di un altro set, lancia "npm run scryfall".`,
            );
            return carta;
          }),
        );
      }
    }
  }

  round.sort((a, b) => a.numeroGlobale - b.numeroGlobale);

  for (const r of round) {
    const serata = serate.get(r.serata);
    if (serata === undefined) {
      errori.push(`${r.percorso}: la serata ${r.serata} non esiste in ${FILE_LEGA}`);
      continue;
    }
    if (serata.data === null) {
      errori.push(`${r.percorso}: la serata ${r.serata} non ha ancora una data in ${FILE_LEGA}`);
    }

    const assenti = new Set(serata.assenti);
    const inGioco = new Map<string, string>(); // giocatore → dove compare, per i messaggi
    const segna = (id: string, dove: string) => {
      if (!ids.has(id)) {
        errori.push(`${r.percorso}, ${dove}: "${id}" non è un giocatore. Giocatori esistenti: ${elencoGiocatori(ids)}`);
      } else if (assenti.has(id)) {
        errori.push(`${r.percorso}, ${dove}: "${id}" è segnato assente alla serata ${r.serata} in ${FILE_LEGA}`);
      }
      const giàVisto = inGioco.get(id);
      if (giàVisto !== undefined) {
        errori.push(`${r.percorso}, ${dove}: "${id}" compare già in ${giàVisto}. Ogni giocatore gioca una sola volta per round.`);
      } else {
        inGioco.set(id, dove);
      }
    };
    r.partite.forEach((partita, i) => {
      for (const id of partita.giocatori) segna(id, `partita ${i + 1}`);
    });
    if (r.bye !== null) segna(r.bye, 'bye');

    // Ogni giocatore presente deve essere abbinato o avere il bye.
    for (const id of [...ids].sort()) {
      if (!assenti.has(id) && !inGioco.has(id)) {
        errori.push(
          `${r.percorso}: "${id}" non compare nel round. Se era assente, aggiungilo agli assenti della serata ${r.serata} in ${FILE_LEGA}.`,
        );
      }
    }
  }

  // I round vanno in sequenza senza buchi, e un round si apre solo quando il precedente è finito.
  round.forEach((r, i) => {
    if (r.numeroGlobale !== i + 1) {
      const mancante = i + 1;
      const serata = Math.ceil(mancante / ROUND_PER_SERATA);
      const nel = mancante - (serata - 1) * ROUND_PER_SERATA;
      errori.push(`${r.percorso}: manca il round precedente (data/rounds/serata-${serata}-round-${nel}.yml)`);
    }
    const successivo = round[i + 1];
    if (successivo !== undefined) {
      r.partite.forEach((partita, j) => {
        if (partita.risultato === null) {
          errori.push(
            `${r.percorso}, partita ${j + 1}: manca il risultato, ma esiste già il round successivo (${successivo.percorso})`,
          );
        }
      });
    }
  });

  if (errori.length > 0) return { ok: false, errori };
  giocatori.sort((a, b) => a.id.localeCompare(b.id));
  return { ok: true, dati: { lega, giocatori, round } };
}

/** Somma le copie della stessa carta scritta su più righe. */
function unisciCopie(carte: CartaPool[]): CartaPool[] {
  const perNome = new Map<string, CartaPool>();
  for (const carta of carte) {
    const esistente = perNome.get(carta.nome);
    if (esistente) esistente.copie += carta.copie;
    else perNome.set(carta.nome, { ...carta });
  }
  return [...perNome.values()];
}
