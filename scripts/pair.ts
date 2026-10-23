// npm run pair: calcola gli abbinamenti del prossimo round e crea il file in data/rounds/.
// npm run pair -- --prova: mostra soltanto gli abbinamenti, senza scrivere niente.

import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ErroreDati, caricaDati, controllaDati } from '../src/lib/dati/carica.ts';
import { ErroreAbbinamenti, ROUND_TOTALI, calcolaAbbinamenti, fileDelRound } from '../src/lib/lega/abbinamenti.ts';
import { calcolaClassifica } from '../src/lib/lega/classifica.ts';

const soloProva = process.argv.slice(2).includes('--prova');

try {
  const dati = caricaDati();
  const abb = calcolaAbbinamenti(dati);
  const nomi = new Map(dati.giocatori.map((g) => [g.id, g.nome]));
  const punti = new Map(calcolaClassifica(dati, abb.numeroGlobale - 1).righe.map((r) => [r.id, r.punti]));
  const chi = (id: string) => `${nomi.get(id)} (${punti.get(id)} pt)`;

  const tipo = abb.finale ? '🏆 FINALE: punti ×2' : `ciclo ${abb.ciclo}`;
  console.log(`\nSerata ${abb.serata} · Round ${abb.round}  (round ${abb.numeroGlobale} di ${ROUND_TOTALI}, ${tipo})\n`);
  abb.partite.forEach(([a, b], i) => console.log(`  Tavolo ${i + 1}:  ${chi(a)}  contro  ${chi(b)}`));
  if (abb.bye) console.log(`  Bye:       ${chi(abb.bye)}`);
  const assenti = dati.lega.serate.find((s) => s.numero === abb.serata)?.assenti ?? [];
  if (assenti.length > 0) console.log(`  Assenti:   ${assenti.map((id) => nomi.get(id)).join(', ')}`);

  if (abb.avvisi.length > 0) {
    console.log('\n  ⚠️  Attenzione:');
    for (const a of abb.avvisi) console.log(`     - ${a}`);
  }

  const file = `data/rounds/serata-${abb.serata}-round-${abb.round}.yml`;
  if (soloProva) {
    console.log(`\n(Solo prova: ${file} non è stato creato.)\n`);
  } else if (existsSync(join(process.cwd(), file))) {
    console.error(`\n❌ ${file} esiste già: non lo sovrascrivo. Se vuoi rifarlo, cancellalo e rilancia.\n`);
    process.exitCode = 1;
  } else {
    writeFileSync(join(process.cwd(), file), fileDelRound(abb, new Date().toISOString().slice(0, 10)), 'utf8');
    const esito = controllaDati();
    if (esito.ok) {
      console.log(`\n✅ Creato ${file}: a fine partite scrivi lì i risultati.\n`);
    } else {
      console.error(`\n❌ Ho creato ${file}, ma il controllo dei dati ha trovato dei problemi:`);
      for (const e of esito.errori) console.error(`  ❌ ${e}`);
      process.exitCode = 1;
    }
  }
} catch (errore) {
  if (errore instanceof ErroreDati) {
    console.error(`\n${errore.message}\n\nCorreggi i file indicati e rilancia.\n`);
  } else if (errore instanceof ErroreAbbinamenti) {
    console.error(`\n❌ ${errore.message}\n`);
  } else {
    throw errore;
  }
  process.exitCode = 1;
}
