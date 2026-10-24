// npm run controlla: controlla i dati in data/ e stampa gli errori in italiano.
// Parte da solo anche prima di "npm run build" (vedi "prebuild" in package.json).

import { controllaDati } from '../src/lib/dati/carica.ts';
import { poolMancanti } from '../src/lib/dati/promemoria.ts';

const esito = controllaDati();

if (esito.ok) {
  const { lega, giocatori, round } = esito.dati;
  console.log(`✅ Dati a posto: ${lega.nome}, ${giocatori.length} giocatori, ${round.length} round.`);
  // Solo un promemoria: i pool si possono scrivere anche giorni dopo la serata.
  for (const { serata, giocatori: chi } of poolMancanti(esito.dati)) {
    console.log(`⚠️  Pool della serata ${serata} ancora da inserire: ${chi.join(', ')}`);
  }
} else {
  const quanti = esito.errori.length === 1 ? '1 problema' : `${esito.errori.length} problemi`;
  console.error(`\nHo trovato ${quanti} nei dati:\n`);
  for (const e of esito.errori) console.error(`  ❌ ${e}`);
  console.error('\nCorreggi i file indicati e rilancia "npm run controlla".\n');
  process.exitCode = 1;
}
