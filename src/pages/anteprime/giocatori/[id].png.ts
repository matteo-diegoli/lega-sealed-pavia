// Immagine di anteprima della pagina di un giocatore (Open Graph), una per file in data/players/.
import type { APIRoute, GetStaticPaths } from 'astro';
import { caricaDati, leggiCacheCarte } from '../../../lib/dati/carica.ts';
import { anteprimaGiocatore } from '../../../lib/sito/anteprime.ts';
import { pngAnteprima, svgAnteprima } from '../../../lib/sito/immagine-anteprima.ts';

export const getStaticPaths = (() => caricaDati().giocatori.map((g) => ({ params: { id: g.id } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
	const dati = caricaDati();
	const giocatore = dati.giocatori.find((g) => g.id === params.id)!;
	const anteprima = anteprimaGiocatore(dati, giocatore, leggiCacheCarte()?.carte ?? []);
	return new Response(pngAnteprima(svgAnteprima(anteprima, dati.lega.nome)), { headers: { 'Content-Type': 'image/png' } });
};
