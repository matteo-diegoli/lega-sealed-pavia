// Immagine di anteprima della Home (Open Graph), creata durante la build.
import type { APIRoute } from 'astro';
import { caricaDati } from '../../lib/dati/carica.ts';
import { anteprimaClassifica } from '../../lib/sito/anteprime.ts';
import { pngAnteprima, svgAnteprima } from '../../lib/sito/immagine-anteprima.ts';

export const GET: APIRoute = () => {
	const dati = caricaDati();
	const png = pngAnteprima(svgAnteprima(anteprimaClassifica(dati), dati.lega.nome));
	return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
