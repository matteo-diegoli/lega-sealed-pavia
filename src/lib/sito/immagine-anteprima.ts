// Disegno delle immagini di anteprima (1200×630, stile Arena scuro) e conversione in PNG.
// Il testo usa il carattere Inter salvato in assets/font/: i caratteri di sistema cambiano
// da un computer all'altro (sul server di GitHub i testi verrebbero diversi).

import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import type { Anteprima, RigaAnteprima } from './anteprime.ts';
import { CARTA, COLORI, ROTAZIONE, TORRE } from './emblema.ts';
import { SKYLINE } from './skyline.ts';

export const LARGHEZZA = 1200;
export const ALTEZZA = 630;

const MARGINE = 64;
const TESTO = '#e9edf4';
const TESTO_TENUE = '#9aa4b5';
const BORDO = '#2a3140';
const ORO = '#f2c14e';
const MEDAGLIE = { 1: ORO, 2: '#c3cbd8', 3: '#d4895a' };
const MANA: Record<string, string> = { W: '#f6eecb', U: '#4a9be8', B: '#a48fb3', R: '#ef5a3c', G: '#3fb46a' };

const RIGA_ALTEZZA = 62;
const RIGA_PASSO = 74;
const RIGHE_DA = 312;
/** Spazio di ogni pallino con il suo numero. */
const PALLINO_PASSO = 110;

/** Toglie i caratteri che in SVG hanno un significato speciale. */
export function xml(testo: string): string {
  return testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Accorcia un testo troppo lungo con "…". */
export function accorcia(testo: string, massimo: number): string {
  return testo.length <= massimo ? testo : `${testo.slice(0, massimo - 1).trimEnd()}…`;
}

function riga(r: RigaAnteprima, indice: number): string {
  const y = RIGHE_DA + indice * RIGA_PASSO;
  const centro = y + RIGA_ALTEZZA / 2;
  const base = centro + 11; // linea di base del testo da 30px, centrato
  const parti = [
    `<rect x="${MARGINE}" y="${y}" width="${LARGHEZZA - 2 * MARGINE}" height="${RIGA_ALTEZZA}" rx="12" fill="${COLORI.superficie}" fill-opacity="0.92" stroke="${BORDO}" stroke-width="2"/>`,
  ];
  let x = MARGINE + 28;
  if (r.medaglia) {
    const cx = MARGINE + 40;
    parti.push(
      `<circle cx="${cx}" cy="${centro}" r="19" fill="${MEDAGLIE[r.medaglia]}"/>`,
      `<text x="${cx}" y="${centro + 7}" font-size="20" font-weight="900" fill="${COLORI.sfondo}" text-anchor="middle">${r.medaglia}</text>`,
    );
    x = MARGINE + 76;
  }
  // Spazio a destra: punti/risultato o i pallini dei colori.
  const destra = LARGHEZZA - MARGINE - 28;
  const colori = r.colori ?? [];
  const spazioDestra = r.destra ? 140 : colori.length * PALLINO_PASSO;
  const caratteri = Math.floor((destra - spazioDestra - x) / 17);
  parti.push(`<text x="${x}" y="${base}" font-size="30" font-weight="700" fill="${TESTO}">${xml(accorcia(r.testo, caratteri))}</text>`);
  if (r.destra) {
    parti.push(
      `<text x="${destra}" y="${base}" font-size="30" font-weight="900" fill="${TESTO}" text-anchor="end">${xml(r.destra)}</text>`,
    );
  }
  // Pallini: "● 12" da destra a sinistra, nell'ordine W U B R G.
  colori.forEach(({ colore, carte }, i) => {
    const fine = destra - (colori.length - 1 - i) * PALLINO_PASSO;
    parti.push(
      `<circle cx="${fine - 56}" cy="${centro}" r="13" fill="${MANA[colore] ?? TESTO_TENUE}"/>`,
      `<text x="${fine}" y="${centro + 9}" font-size="26" font-weight="700" fill="${TESTO_TENUE}" text-anchor="end">${carte}</text>`,
    );
  });
  return parti.join('');
}

/** SVG dell'immagine di anteprima. */
export function svgAnteprima(anteprima: Anteprima, nomeSito: string): string {
  const intestazione = accorcia(anteprima.intestazione, 30);
  // Titoli lunghi: carattere più piccolo per stare nella larghezza.
  const grandezza = Math.min(78, Math.floor((LARGHEZZA - 2 * MARGINE) / (intestazione.length * 0.6)));
  const coloreEtichetta = anteprima.oro ? ORO : COLORI.accento2;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGHEZZA}" height="${ALTEZZA}" viewBox="0 0 ${LARGHEZZA} ${ALTEZZA}" font-family="Inter">`,
    '<defs>',
    `<linearGradient id="sfumatura" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${COLORI.accento}"/><stop offset="1" stop-color="${COLORI.accento2}"/></linearGradient>`,
    `<linearGradient id="emblema" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${COLORI.accento}"/><stop offset="1" stop-color="${COLORI.accento2}"/></linearGradient>`,
    `<radialGradient id="alone"><stop offset="0" stop-color="${COLORI.accento}" stop-opacity="0.28"/><stop offset="1" stop-color="${COLORI.accento}" stop-opacity="0"/></radialGradient>`,
    '</defs>',
    `<rect width="${LARGHEZZA}" height="${ALTEZZA}" fill="${COLORI.sfondo}"/>`,
    `<circle cx="1060" cy="60" r="460" fill="url(#alone)"/>`,
    // Skyline di Pavia sul fondo, attenuato: le righe ci passano sopra.
    `<g transform="translate(0 ${ALTEZZA - 240})" opacity="0.5" fill="none" stroke="url(#sfumatura)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">`,
    `<path d="${SKYLINE.edifici}" fill="${COLORI.superficie}" fill-opacity="0.6"/>`,
    `<path d="${SKYLINE.terreno}"/>`,
    `<path d="${SKYLINE.ponte}" fill="${COLORI.superficie}" fill-opacity="0.6"/>`,
    `<path d="${SKYLINE.colonnine}" stroke-width="1.5"/>`,
    `<path d="${SKYLINE.fiume}" stroke-width="1.5" opacity="0.6"/>`,
    '</g>',
    // Emblema e nome del sito.
    `<g transform="translate(${MARGINE - 6} 44) scale(1.1)">`,
    `<rect x="${CARTA.x}" y="${CARTA.y}" width="${CARTA.larghezza}" height="${CARTA.altezza}" rx="${CARTA.raggio}" transform="${ROTAZIONE}" fill="${COLORI.superficie}" stroke="url(#emblema)" stroke-width="3"/>`,
    `<path d="${TORRE}" fill="url(#emblema)" fill-rule="evenodd" transform="${ROTAZIONE}"/>`,
    '</g>',
    `<text x="${MARGINE + 76}" y="92" font-size="26" font-weight="700" fill="${TESTO_TENUE}" letter-spacing="4">${xml(nomeSito.toUpperCase())}</text>`,
    // Etichetta, titolo grande e righe.
    `<text x="${MARGINE}" y="186" font-size="28" font-weight="700" fill="${coloreEtichetta}" letter-spacing="2">${xml(accorcia(anteprima.etichetta.toUpperCase(), 56))}</text>`,
    `<text x="${MARGINE}" y="270" font-size="${grandezza}" font-weight="900" fill="${TESTO}">${xml(intestazione)}</text>`,
    ...anteprima.righe.slice(0, 4).map(riga),
    `<rect y="${ALTEZZA - 8}" width="${LARGHEZZA}" height="8" fill="url(#sfumatura)"/>`,
    '</svg>',
  ].join('');
}

/** Converte l'SVG in PNG con il carattere Inter. */
export function pngAnteprima(svg: string, radice = process.cwd()): Uint8Array<ArrayBuffer> {
  const fontFiles = ['inter-400.ttf', 'inter-700.ttf', 'inter-900.ttf'].map((f) => join(radice, 'assets', 'font', f));
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: LARGHEZZA },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Inter' },
  })
    .render()
    .asPng();
  // Copia in un Uint8Array semplice, il tipo che Response accetta.
  return Uint8Array.from(png);
}
