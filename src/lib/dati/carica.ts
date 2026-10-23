// Legge dal disco i file in data/ e li passa a validaDati.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { FILE_CACHE_CARTE, type CacheCarte } from '../carte/carta.ts';
import { validaDati, type DatiLega, type EsitoControllo, type FileDati } from './valida.ts';

/** Errore con l'elenco dei problemi trovati nei dati, già scritti in italiano. */
export class ErroreDati extends Error {
  readonly errori: string[];

  constructor(errori: string[]) {
    const quanti = errori.length === 1 ? "C'è 1 problema" : `Ci sono ${errori.length} problemi`;
    super(`${quanti} nei dati della lega:\n${errori.map((e) => `  ❌ ${e}`).join('\n')}`);
    this.name = 'ErroreDati';
    this.errori = errori;
  }
}

/** Raccoglie data/league.yml, data/players/* e data/rounds/* (le cartelle mancanti vanno bene). */
export function leggiFileDati(radice = process.cwd()): FileDati[] {
  const files: FileDati[] = [];
  const aggiungi = (percorsoAssoluto: string) => {
    files.push({
      percorso: relative(radice, percorsoAssoluto).split(sep).join('/'),
      testo: readFileSync(percorsoAssoluto, 'utf8'),
    });
  };

  const lega = join(radice, 'data', 'league.yml');
  try {
    aggiungi(lega);
  } catch {
    // Manca: lo segnala validaDati.
  }

  for (const cartella of ['players', 'rounds']) {
    const percorso = join(radice, 'data', cartella);
    let nomi: string[];
    try {
      nomi = readdirSync(percorso, { withFileTypes: true })
        .filter((voce) => voce.isFile() && !voce.name.startsWith('.'))
        .map((voce) => voce.name);
    } catch {
      continue;
    }
    for (const nome of nomi.sort()) aggiungi(join(percorso, nome));
  }
  return files;
}

/** Legge la cache delle carte scaricata da "npm run scryfall"; null se non c'è ancora. */
export function leggiCacheCarte(radice = process.cwd()): CacheCarte | null {
  const percorso = join(radice, ...FILE_CACHE_CARTE.split('/'));
  if (!existsSync(percorso)) return null;
  try {
    return JSON.parse(readFileSync(percorso, 'utf8')) as CacheCarte;
  } catch {
    throw new ErroreDati([`${FILE_CACHE_CARTE}: il file è rovinato. Rilancia "npm run scryfall" per riscaricarlo.`]);
  }
}

export function controllaDati(radice = process.cwd()): EsitoControllo {
  return validaDati(leggiFileDati(radice), leggiCacheCarte(radice)?.carte ?? null);
}

/** Per le pagine del sito: restituisce i dati, o blocca la build con l'elenco degli errori. */
export function caricaDati(radice = process.cwd()): DatiLega {
  const esito = controllaDati(radice);
  if (!esito.ok) throw new ErroreDati(esito.errori);
  return esito.dati;
}
