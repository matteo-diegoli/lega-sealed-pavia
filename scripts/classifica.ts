// npm run classifica: stampa la classifica con tutti i round registrati.
// npm run classifica -- 2: la classifica al termine della serata 2.

import { ErroreDati, caricaDati } from '../src/lib/dati/carica.ts';
import { NUMERO_SERATE } from '../src/lib/dati/schema.ts';
import { calcolaClassifica, classificaDellaSerata, formattaPercentuale } from '../src/lib/lega/classifica.ts';

const argomento = process.argv[2];
const serata = argomento === undefined ? null : Number(argomento);

if (serata !== null && !(Number.isInteger(serata) && serata >= 1 && serata <= NUMERO_SERATE)) {
  console.error(`❌ "${argomento}" non è una serata: scrivi un numero da 1 a ${NUMERO_SERATE} (es. npm run classifica -- 2).`);
  process.exit(1);
}

try {
  const dati = caricaDati();
  const classifica = serata === null ? calcolaClassifica(dati) : classificaDellaSerata(dati, serata);

  const titolo = serata === null ? 'Classifica attuale' : `Classifica al termine della serata ${serata}`;
  console.log(`\n${titolo} (round giocati: ${classifica.finoAlRound})\n`);

  const intestazione = ['Pos', 'Giocatore', 'Punti', 'V-P-S', 'Game', 'Bye', 'Serate', 'OMW%', 'GW%', 'OGW%'];
  const righe = classifica.righe.map((r) => [
    `${r.posizione}${r.pariMerito ? '=' : ''}`,
    r.nome,
    String(r.punti),
    `${r.vittorie}-${r.pareggi}-${r.sconfitte}`,
    `${r.gameVinti}-${r.gamePersi}${r.gamePareggiati ? `-${r.gamePareggiati}` : ''}`,
    String(r.bye),
    String(r.serateGiocate),
    formattaPercentuale(r.omw),
    formattaPercentuale(r.gw),
    formattaPercentuale(r.ogw),
  ]);

  // Colonne allineate: testo a sinistra, numeri a destra.
  const larghezze = intestazione.map((t, i) => Math.max(t.length, ...righe.map((r) => r[i]!.length)));
  const stampa = (celle: string[]) =>
    console.log('  ' + celle.map((c, i) => (i === 1 ? c.padEnd(larghezze[i]!) : c.padStart(larghezze[i]!))).join('  '));
  stampa(intestazione);
  console.log('  ' + larghezze.map((l) => '-'.repeat(l)).join('  '));
  righe.forEach(stampa);

  if (classifica.righe.some((r) => r.pariMerito)) {
    console.log('\n  "=" vuol dire pari merito: l\'ordine tra loro è deciso da scontro diretto e sorteggio.');
  }
  console.log('');
} catch (errore) {
  if (!(errore instanceof ErroreDati)) throw errore;
  console.error(`\n${errore.message}\n\nCorreggi i file indicati e rilancia.\n`);
  process.exitCode = 1;
}
