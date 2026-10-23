// Schemi Zod che descrivono la forma dei file YAML in data/.
// Qui si controlla solo la forma di ogni singolo file; i controlli che
// incrociano più file (giocatori esistenti, assenti, ecc.) sono in valida.ts.

import { z } from 'zod';

// Messaggi generici di Zod in italiano (quelli specifici sono scritti a mano sotto).
z.config(z.locales.it());

/** Numero di serate della lega (formato fisso: vedi PIANO.md). */
export const NUMERO_SERATE = 5;

/** Round giocati in ogni serata. */
export const ROUND_PER_SERATA = 2;

/** Identificativo di un giocatore: minuscole, cifre e trattini, senza spazi né accenti. */
export const ID_GIOCATORE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const idGiocatore = z
  .string({ error: 'serve l\'identificativo di un giocatore (es. "anna")' })
  .regex(ID_GIOCATORE, {
    error: 'identificativo non valido: usa solo lettere minuscole, cifre e trattini, senza spazi né accenti (es. "anna" o "anna-rossi")',
  });

/** Data nel formato AAAA-MM-GG, controllando che esista davvero (niente 31 febbraio). */
const data = z
  .string({ error: 'la data va scritta come AAAA-MM-GG (es. 2026-10-22), oppure null se non è ancora decisa' })
  .refine(
    (testo) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(testo)) return false;
      const giorno = new Date(`${testo}T00:00:00Z`);
      return !Number.isNaN(giorno.getTime()) && giorno.toISOString().startsWith(testo);
    },
    { error: 'data non valida: usa il formato AAAA-MM-GG (es. 2026-10-22)' },
  );

// ---------------------------------------------------------------------------
// data/league.yml
// ---------------------------------------------------------------------------

export const schemaSerata = z.strictObject({
  numero: z
    .number({ error: 'il numero della serata deve essere un numero (es. 1)' })
    .int()
    .min(1)
    .max(NUMERO_SERATE, { error: `la lega ha solo ${NUMERO_SERATE} serate` }),
  data: data.nullable(),
  // "assenti:" lasciato vuoto in YAML vale null: lo trattiamo come lista vuota.
  assenti: z
    .array(idGiocatore, { error: 'gli assenti vanno scritti come lista, es. [anna, bruno] oppure []' })
    .nullish()
    .transform((assenti) => assenti ?? []),
});

export const schemaLega = z.strictObject({
  nome: z.string({ error: 'manca il nome della lega' }).trim().min(1, { error: 'il nome della lega è vuoto' }),
  set: z
    .string({ error: 'manca il codice del set (es. fra)' })
    .regex(/^[a-z0-9]{3,6}$/, { error: 'il codice del set va scritto in minuscolo, come su Scryfall (es. fra)' }),
  serate: z
    .array(schemaSerata, { error: 'manca l\'elenco delle serate' })
    .min(1, { error: 'serve almeno una serata' }),
});

// ---------------------------------------------------------------------------
// data/players/<id>.yml
// ---------------------------------------------------------------------------

/** Una riga del pool: "Nome carta" oppure "2 Nome carta". */
export const RIGA_POOL = /^(?:(\d+)\s+)?(\S.*)$/;

export const schemaRigaPool = z
  .string({
    error: 'ogni carta va scritta come testo, es. Grizzly Bears oppure 2 Grizzly Bears (se il nome contiene ":" mettilo tra virgolette)',
  })
  .transform((riga, ctx) => {
    const trovato = RIGA_POOL.exec(riga.trim());
    const copie = trovato?.[1] === undefined ? 1 : Number(trovato[1]);
    if (!trovato || copie < 1) {
      ctx.addIssue({
        code: 'custom',
        message: `riga "${riga}" non valida: scrivi il nome della carta, con il numero di copie davanti se più di una (es. "2 Grizzly Bears")`,
      });
      return z.NEVER;
    }
    return { nome: trovato[2].replace(/\s+/g, ' ').trim(), copie };
  });

/** Chiave del pool: "serata-1", "serata-2", … */
export const CHIAVE_SERATA = /^serata-(\d+)$/;

export const schemaGiocatore = z.strictObject({
  nome: z.string({ error: 'manca il nome del giocatore' }).trim().min(1, { error: 'il nome del giocatore è vuoto' }),
  pool: z
    .record(
      z.string().regex(CHIAVE_SERATA),
      // Una serata lasciata vuota in YAML vale null: la trattiamo come lista vuota.
      z
        .array(schemaRigaPool, { error: 'le carte di una serata vanno scritte come lista, una per riga con "- "' })
        .nullable()
        .transform((righe) => righe ?? []),
      // Zod usa questo messaggio anche quando una chiave non è nella forma "serata-N".
      { error: 'nel pool le carte vanno divise per serata, scrivendo serata-1:, serata-2:, …' },
    )
    .nullish()
    .transform((pool) => pool ?? {}),
});

// ---------------------------------------------------------------------------
// data/rounds/serata-X-round-Y.yml
// ---------------------------------------------------------------------------

/**
 * Risultato BO3: "2-1" (vittorie del primo – vittorie del secondo)
 * oppure "1-1-1" (con il numero di partite pareggiate in fondo).
 */
export const schemaRisultato = z
  .string({ error: 'il risultato va scritto come 2-1 oppure 1-1-1, o null se la partita non è ancora giocata' })
  .transform((testo, ctx) => {
    const trovato = /^(\d)-(\d)(?:-(\d))?$/.exec(testo.trim());
    const [v1, v2, pareggi] = trovato ? [Number(trovato[1]), Number(trovato[2]), Number(trovato[3] ?? 0)] : [0, 0, 0];
    const valido = trovato && v1 <= 2 && v2 <= 2 && !(v1 === 2 && v2 === 2) && v1 + v2 + pareggi > 0;
    if (!valido) {
      ctx.addIssue({
        code: 'custom',
        message: `risultato "${testo}" non valido: in un BO3 si scrive vittorie-vittorie (es. "2-1", "2-0") o vittorie-vittorie-pareggi (es. "1-1-1"), con al massimo 2 vittorie a testa`,
      });
      return z.NEVER;
    }
    return { vittorie: [v1, v2] as [number, number], pareggi };
  });

export const schemaPartita = z.strictObject({
  giocatori: z
    .tuple([idGiocatore, idGiocatore], { error: 'una partita ha esattamente due giocatori, es. [anna, bruno]' })
    .refine(([a, b]) => a !== b, { error: 'un giocatore non può giocare contro sé stesso' }),
  risultato: schemaRisultato.nullable(),
});

export const schemaRound = z.strictObject({
  serata: z.number({ error: 'il numero della serata deve essere un numero (es. 1)' }).int().min(1).max(NUMERO_SERATE),
  round: z
    .number({ error: 'il numero del round deve essere un numero (1 o 2)' })
    .int()
    .min(1, { error: `in ogni serata i round sono numerati da 1 a ${ROUND_PER_SERATA}` })
    .max(ROUND_PER_SERATA, { error: `in ogni serata i round sono numerati da 1 a ${ROUND_PER_SERATA}` }),
  partite: z
    .array(schemaPartita, { error: 'manca l\'elenco delle partite' })
    .nullish()
    .transform((partite) => partite ?? []),
  bye: idGiocatore.nullish().transform((bye) => bye ?? null),
});

// ---------------------------------------------------------------------------
// Tipi dei dati già controllati
// ---------------------------------------------------------------------------

export type Serata = z.output<typeof schemaSerata>;
export type Lega = z.output<typeof schemaLega>;
export type CartaPool = z.output<typeof schemaRigaPool>;
export type Risultato = z.output<typeof schemaRisultato>;
export type Partita = z.output<typeof schemaPartita>;
