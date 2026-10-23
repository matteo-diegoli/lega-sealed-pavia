// npm run scryfall: scarica da Scryfall le carte del set della lega e quelle di altri set
// che compaiono nei pool, e le salva in data/scryfall/carte.json (da salvare in git).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { convertiCarta, FILE_CACHE_CARTE, scegliStampe, type CacheCarte, type Carta } from '../src/lib/carte/carta.ts';
import { IndiceCarte, normalizza } from '../src/lib/carte/nomi.ts';
import { cercaPerNome, scaricaSet } from '../src/lib/carte/scryfall.ts';
import { leggiFileDati } from '../src/lib/dati/carica.ts';
import { validaDati } from '../src/lib/dati/valida.ts';

async function principale() {
  // Controllo i dati senza i nomi delle carte (la cache la stiamo creando adesso).
  const esito = validaDati(leggiFileDati());
  if (!esito.ok) {
    console.error('\nPrima di scaricare le carte vanno corretti questi problemi nei dati:\n');
    for (const e of esito.errori) console.error(`  ❌ ${e}`);
    process.exitCode = 1;
    return;
  }
  const { lega, giocatori } = esito.dati;

  console.log(`Scarico da Scryfall le carte del set "${lega.set}"…`);
  const stampe = await scaricaSet(lega.set);
  const carte: Carta[] = scegliStampe(stampe).map(convertiCarta);
  console.log(`  ${stampe.length} stampe, ${carte.length} carte diverse.`);

  // Nomi dei pool che non sono nel set: li cerco su tutta Scryfall.
  const indice = new IndiceCarte(carte);
  const mancanti = new Map<string, string>(); // nome normalizzato → nome come è scritto
  for (const giocatore of giocatori) {
    for (const parte of giocatore.pool) {
      for (const { nome } of parte.carte) {
        if (indice.trova(nome) === undefined) mancanti.set(normalizza(nome), nome);
      }
    }
  }

  let nonTrovate: string[] = [];
  if (mancanti.size > 0) {
    console.log(`Cerco ${mancanti.size} carte dei pool che non sono nel set…`);
    const risultato = await cercaPerNome([...mancanti.values()]);
    const altre = risultato.trovate.map(convertiCarta).filter((c) => !carte.some((g) => g.nome === c.nome));
    carte.push(...altre);
    nonTrovate = risultato.nonTrovate;
    for (const c of altre) console.log(`  + ${c.nome} (set ${c.set.toUpperCase()})`);
  }

  carte.sort((a, b) => a.nome.localeCompare(b.nome, 'en'));
  const cache: CacheCarte = { set: lega.set, aggiornato: new Date().toISOString(), carte };
  mkdirSync(dirname(FILE_CACHE_CARTE), { recursive: true });
  writeFileSync(FILE_CACHE_CARTE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
  console.log(`✅ Salvate ${carte.length} carte in ${FILE_CACHE_CARTE}.`);

  if (nonTrovate.length > 0) {
    console.error('\n⚠️  Queste carte non esistono su Scryfall: controlla come sono scritte (con "npm run controlla" vedi i suggerimenti):');
    for (const nome of nonTrovate) console.error(`  - ${nome}`);
    process.exitCode = 1;
  }
}

principale().catch((e: unknown) => {
  console.error(`\n❌ ${(e as Error).message}\n`);
  process.exitCode = 1;
});
