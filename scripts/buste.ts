// npm run buste: stampa le buste da consegnare alla prossima serata.
// npm run buste -- 3: le buste della serata 3.

import { ErroreDati, caricaDati } from '../src/lib/dati/carica.ts';
import { NUMERO_SERATE } from '../src/lib/dati/schema.ts';
import { busteDellaSerata, prossimaSerata } from '../src/lib/lega/buste.ts';

const argomento = process.argv[2];
const scelta = argomento === undefined ? null : Number(argomento);

if (scelta !== null && !(Number.isInteger(scelta) && scelta >= 1 && scelta <= NUMERO_SERATE)) {
  console.error(`❌ "${argomento}" non è una serata: scrivi un numero da 1 a ${NUMERO_SERATE} (es. npm run buste -- 2).`);
  process.exit(1);
}

/** "1 normale + 2 recuperate + 1 extra". */
function dettaglio(normali: number, recuperate: number, extra: number): string {
  const parti: string[] = [];
  if (normali) parti.push(`${normali} ${normali === 1 ? 'normale' : 'normali'}`);
  if (recuperate) parti.push(`${recuperate} ${recuperate === 1 ? 'recuperata' : 'recuperate'}`);
  if (extra) parti.push(`${extra} extra`);
  return parti.join(' + ');
}

try {
  const dati = caricaDati();
  const serata = scelta ?? prossimaSerata(dati);
  const buste = busteDellaSerata(dati, serata);

  console.log(`\nBuste della serata ${serata}\n`);
  const larghezza = Math.max(...buste.giocatori.map((g) => g.nome.length));
  for (const g of buste.giocatori) {
    const assente = serata < NUMERO_SERATE ? 'assente: le recupera alla prossima serata in cui c\'è' : 'assente alla finale: niente da recuperare';
    const testo = g.presente ? `${g.totale}  (${dettaglio(g.normali, g.recuperate, g.extra)})` : `–  ${assente}`;
    console.log(`  ${g.nome.padEnd(larghezza)}  ${testo}`);
  }
  const totale = buste.giocatori.reduce((somma, g) => somma + g.totale, 0);
  console.log(`\n  Totale: ${totale} buste.`);
  if (buste.avviso) console.log(`\n  ⚠️  ${buste.avviso}`);
  console.log('');
} catch (errore) {
  if (!(errore instanceof ErroreDati)) throw errore;
  console.error(`\n${errore.message}\n\nCorreggi i file indicati e rilancia.\n`);
  process.exitCode = 1;
}
