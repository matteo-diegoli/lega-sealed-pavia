// Immagine di anteprima della pagina Match (Open Graph), creata durante la build.
import type { APIRoute } from 'astro';
import { caricaDati } from '../../lib/dati/carica.ts';
import { anteprimaMatch } from '../../lib/sito/anteprime.ts';
import { pngAnteprima, svgAnteprima } from '../../lib/sito/immagine-anteprima.ts';

export const GET: APIRoute = () => {
	const dati = caricaDati();
	const png = pngAnteprima(svgAnteprima(anteprimaMatch(dati), dati.lega.nome));
	return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
