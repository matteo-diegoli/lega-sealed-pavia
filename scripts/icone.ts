// npm run icone: crea in public/ la favicon e le icone dell'app partendo dall'emblema
// (src/lib/sito/emblema.ts). I file vanno salvati in git: la build non li ricrea.
// Da rilanciare solo se cambia il disegno dell'emblema.

import { writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { svgEmblema, type SfondoIcona } from '../src/lib/sito/emblema.ts';

interface Icona {
  file: string;
  lato: number;
  sfondo: SfondoIcona;
  scala: number;
}

const ICONE: Icona[] = [
  // Icona normale: quadrato arrotondato scuro.
  { file: 'icona-192.png', lato: 192, sfondo: 'arrotondato', scala: 0.9 },
  { file: 'icona-512.png', lato: 512, sfondo: 'arrotondato', scala: 0.9 },
  // Maskable (Android la ritaglia a cerchio o goccia): l'emblema sta nella zona sicura centrale.
  { file: 'icona-maskable-512.png', lato: 512, sfondo: 'pieno', scala: 0.66 },
  // iPhone: niente trasparenze, gli angoli li arrotonda iOS.
  { file: 'apple-touch-icon.png', lato: 180, sfondo: 'pieno', scala: 0.8 },
];

writeFileSync('public/favicon.svg', `${svgEmblema('nessuno')}\n`, 'utf8');
console.log('  public/favicon.svg');

for (const icona of ICONE) {
  const png = new Resvg(svgEmblema(icona.sfondo, icona.scala), { fitTo: { mode: 'width', value: icona.lato } })
    .render()
    .asPng();
  writeFileSync(`public/${icona.file}`, png);
  console.log(`  public/${icona.file} (${icona.lato}×${icona.lato})`);
}
console.log('✅ Icone create.');
