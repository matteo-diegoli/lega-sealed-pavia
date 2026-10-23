// npm run accessibilita: costruisce il sito, apre ogni pagina in un browser senza finestra (Playwright)
// e la fa controllare da axe. Si ferma con un errore se trova problemi di livello WCAG A o AA.
// Ogni pagina si prova in tema scuro e chiaro, a larghezza telefono e PC; le pagine dei giocatori
// anche con la vista a immagini e (sul telefono) con il pannello dei filtri aperto.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { preview } from 'astro';
import { chromium, type Page } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import type { Result } from 'axe-core';
import { caricaDati } from '../src/lib/dati/carica.ts';
import { scegliIndirizzo } from '../src/lib/sito/indirizzo.ts';
import { pagineDelSito } from '../src/lib/sito/pagine.ts';

/** Regole di axe da applicare: WCAG 2.0, 2.1 e 2.2, livelli A e AA. */
const LIVELLI = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

const SCHERMI = [
  { nome: 'telefono', width: 390, height: 844 },
  { nome: 'PC', width: 1280, height: 800 },
] as const;

const TEMI = [
  { nome: 'scuro', colorScheme: 'dark' },
  { nome: 'chiaro', colorScheme: 'light' },
] as const;

// axe con i messaggi in italiano: si aggiunge la traduzione in coda al programma che viene iniettato nella pagina.
const richiedi = createRequire(import.meta.url);
const traduzione = readFileSync(richiedi.resolve('axe-core/locales/it.json'), 'utf8');
const sorgenteAxe = `${readFileSync(richiedi.resolve('axe-core/axe.min.js'), 'utf8')}\naxe.configure({ locale: ${traduzione} });`;

/** Un problema trovato, con dove è comparso. */
interface Problema {
  regola: Result;
  dove: Set<string>;
  elementi: Set<string>;
}
const problemi = new Map<string, Problema>();

function registra(risultati: Result[], dove: string) {
  for (const r of risultati) {
    const p = problemi.get(r.id) ?? { regola: r, dove: new Set(), elementi: new Set() };
    p.dove.add(dove);
    for (const n of r.nodes) p.elementi.add(n.target.join(' '));
    problemi.set(r.id, p);
  }
}

async function controlla(pagina: Page, dove: string) {
  const esito = await new AxeBuilder({ page: pagina, axeSource: sorgenteAxe }).withTags(LIVELLI).analyze();
  registra(esito.violations, dove);
}

const dati = caricaDati();
const { base } = scegliIndirizzo(process.env.SITO_URL, dati.lega.indirizzo);
const pagine = pagineDelSito(dati);

const server = await preview({ root: process.cwd(), logLevel: 'error', server: { port: 4329 } });
const browser = await chromium.launch();
let controlli = 0;

try {
  const radice = `http://localhost:${server.port}${base}`;
  for (const schermo of SCHERMI) {
    for (const tema of TEMI) {
      const contesto = await browser.newContext({
        viewport: { width: schermo.width, height: schermo.height },
        colorScheme: tema.colorScheme,
        // Niente service worker (salverebbe le pagine tra una prova e l'altra).
        serviceWorkers: 'block',
      });
      // Niente immagini delle carte da Scryfall: non servono al controllo e lo renderebbero lento e dipendente dalla rete.
      await contesto.route(/scryfall/, (r) => r.abort());
      const pagina = await contesto.newPage();
      const situazione = `${schermo.nome}, tema ${tema.nome}`;

      for (const percorso of pagine) {
        const nome = `/${percorso}`;
        await pagina.goto(radice + percorso);
        await controlla(pagina, `${nome} (${situazione})`);
        controlli++;

        if (!percorso.startsWith('giocatori/')) continue;
        // Pool: vista a immagini.
        await pagina.click('[data-vista="immagini"]');
        await controlla(pagina, `${nome} vista immagini (${situazione})`);
        controlli++;
        await pagina.click('[data-vista="lista"]');
        // Sul telefono i filtri stanno in un pannello che si apre dal basso.
        if (schermo.nome === 'telefono') {
          await pagina.click('[data-apri-filtri]');
          await pagina.waitForSelector('[data-pannello].aperto');
          await controlla(pagina, `${nome} filtri aperti (${situazione})`);
          controlli++;
        }
      }
      await contesto.close();
    }
  }
} finally {
  await browser.close();
  await server.stop();
}

if (problemi.size === 0) {
  console.log(`✅ Accessibilità a posto: ${controlli} controlli, nessun problema di livello A o AA.`);
} else {
  const quanti = problemi.size === 1 ? '1 tipo di problema' : `${problemi.size} tipi di problema`;
  console.error(`\nHo trovato ${quanti} di accessibilità (${controlli} controlli):\n`);
  for (const { regola, dove, elementi } of problemi.values()) {
    console.error(`❌ ${regola.help} [${regola.id}, gravità: ${regola.impact ?? '?'}]`);
    console.error(`   Spiegazione: ${regola.helpUrl}`);
    console.error(`   Elementi: ${[...elementi].slice(0, 5).join('  |  ')}${elementi.size > 5 ? `  (e altri ${elementi.size - 5})` : ''}`);
    const elenco = [...dove];
    console.error(`   Dove: ${elenco.slice(0, 4).join('; ')}${elenco.length > 4 ? `; e altre ${elenco.length - 4} situazioni` : ''}\n`);
  }
  process.exitCode = 1;
}
