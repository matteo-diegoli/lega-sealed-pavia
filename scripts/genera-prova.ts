// npm run genera-prova: crea dati FITTIZI per provare il sito (8 giocatori, tutte e 5 le serate).
// Usa il motore vero della lega (abbinamenti svizzeri, buste) e risultati casuali ma sempre uguali.
//   npm run genera-prova -- --fino-a 3   si ferma al termine della serata 3, con il round
//                                        successivo già abbinato e i risultati da scrivere (null).
// Non sovrascrive giocatori o round già presenti, a meno di aggiungere "--forza".

import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { controllaDati, leggiCacheCarte } from '../src/lib/dati/carica.ts';
import { NUMERO_SERATE } from '../src/lib/dati/schema.ts';
import { busteDellaSerata } from '../src/lib/lega/buste.ts';
import { calcolaClassifica } from '../src/lib/lega/classifica.ts';
import { fermaAllaSerata, fileDellaSimulazione, opzioniDiProva, simulaLega } from '../src/lib/lega/simulazione.ts';

function cartellaPiena(percorso: string): boolean {
  return existsSync(percorso) && readdirSync(percorso).some((f) => f.endsWith('.yml'));
}

/** Legge "--fino-a N"; null se non c'è (lega completa). */
function finoAllaSerata(argomenti: string[]): number | null {
  const i = argomenti.indexOf('--fino-a');
  if (i === -1) return null;
  const serata = Number(argomenti[i + 1]);
  if (!(Number.isInteger(serata) && serata >= 1 && serata < NUMERO_SERATE)) {
    throw new Error(`dopo --fino-a scrivi il numero di una serata da 1 a ${NUMERO_SERATE - 1} (es. --fino-a 3)`);
  }
  return serata;
}

function principale() {
  const argomenti = process.argv.slice(2);
  let fino: number | null;
  try {
    fino = finoAllaSerata(argomenti);
  } catch (e) {
    console.error(`❌ ${(e as Error).message}`);
    process.exitCode = 1;
    return;
  }

  if (!argomenti.includes('--forza') && (cartellaPiena('data/players') || cartellaPiena('data/rounds'))) {
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

  const completa = simulaLega(opzioniDiProva(cache.carte));
  const sim = fino === null ? completa : fermaAllaSerata(completa, fino);

  rmSync('data/players', { recursive: true, force: true });
  rmSync('data/rounds', { recursive: true, force: true });
  mkdirSync('data/players', { recursive: true });
  mkdirSync('data/rounds', { recursive: true });
  const files = fileDellaSimulazione(sim);
  for (const f of files) writeFileSync(f.percorso, f.testo, 'utf8');

  const { dati } = sim;
  const nome = (id: string | null) => dati.giocatori.find((g) => g.id === id)?.nome ?? '—';
  const giocate = dati.round.filter((r) => r.partite.every((p) => p.risultato !== null)).length;
  console.log(`Creati ${dati.giocatori.length} giocatori e ${dati.round.length} round (${giocate} giocati).`);
  if (fino !== null) console.log(`Lega ferma al termine della serata ${fino}: il round successivo è da giocare.`);

  for (const s of dati.lega.serate.filter((s) => s.data !== null)) {
    const buste = busteDellaSerata(dati, s.numero);
    const assenti = s.assenti.length > 0 ? s.assenti.map(nome).join(', ') : 'nessuno';
    console.log(`  Serata ${s.numero} (${s.data}): assenti ${assenti}; busta extra a ${nome(buste.extra)}`);
  }
  const avvisi = sim.avvisi.flatMap((a, i) => a.map((testo) => `round ${i + 1}: ${testo}`));
  for (const a of avvisi) console.log(`  ⚠️  ${a}`);

  console.log('\nClassifica:');
  for (const r of calcolaClassifica(dati).righe) console.log(`  ${r.posizione}. ${r.nome} – ${r.punti} pt`);

  const esito = controllaDati();
  if (esito.ok) {
    console.log('\n✅ I dati generati superano il controllo.');
  } else {
    console.error('\n❌ I dati generati non superano il controllo:');
    for (const e of esito.errori) console.error(`  ❌ ${e}`);
    process.exitCode = 1;
  }
}

principale();
