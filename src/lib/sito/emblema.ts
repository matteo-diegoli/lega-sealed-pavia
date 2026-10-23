// Disegno dell'emblema della lega (una carta inclinata con dentro una torre), in un riquadro 64×64.
// Lo usano il componente Emblema.astro e lo script delle icone (npm run icone).

/** La carta, leggermente inclinata. */
export const CARTA = { x: 14, y: 5, larghezza: 36, altezza: 54, raggio: 5 };

/** La torre merlata con finestra e porta (riempimento "evenodd"). */
export const TORRE =
  'M24 50 V19 h3 v4 h3 v-4 h3 v4 h3 v-4 h3 V50 Z M30 29 v7 h3 v-7 Z M29 50 v-6 a2.5 2.5 0 0 1 5 0 v6 Z';

/** Rotazione comune a carta e torre. */
export const ROTAZIONE = 'rotate(-8 32 32)';

/** Colori fissi del tema scuro (per icone e favicon, dove le variabili CSS non esistono). */
export const COLORI = {
  sfondo: '#0e1117',
  superficie: '#171b24',
  accento: '#8b7cff',
  accento2: '#3ad6c5',
};

export type SfondoIcona = 'nessuno' | 'arrotondato' | 'pieno';

/**
 * Emblema come file SVG a sé, con i colori fissi.
 * @param sfondo nessuno (favicon), arrotondato (icona normale) o pieno (maskable e Apple, che ritagliano da soli)
 * @param scala quanto spazio occupa l'emblema nel quadrato (1 = tutto)
 */
export function svgEmblema(sfondo: SfondoIcona, scala = 1): string {
  const spostamento = (64 - 64 * scala) / 2;
  const fondo =
    sfondo === 'pieno'
      ? `<rect width="64" height="64" fill="${COLORI.sfondo}"/>`
      : sfondo === 'arrotondato'
        ? `<rect width="64" height="64" rx="14" fill="${COLORI.sfondo}"/>`
        : '';
  const { x, y, larghezza, altezza, raggio } = CARTA;
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    '<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1">',
    `<stop offset="0" stop-color="${COLORI.accento}"/><stop offset="1" stop-color="${COLORI.accento2}"/>`,
    '</linearGradient></defs>',
    fondo,
    `<g transform="translate(${spostamento} ${spostamento}) scale(${scala})">`,
    `<rect x="${x}" y="${y}" width="${larghezza}" height="${altezza}" rx="${raggio}" transform="${ROTAZIONE}" fill="${COLORI.superficie}" stroke="url(#g)" stroke-width="3"/>`,
    `<path d="${TORRE}" fill="url(#g)" fill-rule="evenodd" transform="${ROTAZIONE}"/>`,
    '</g></svg>',
  ].join('');
}
