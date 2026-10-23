// api/giocatori.json: giocatori con partite e pool completo (vedi src/lib/sito/api.ts).
import type { APIRoute } from 'astro';
import { caricaDati, leggiCacheCarte } from '../../lib/dati/carica.ts';
import { apiGiocatori } from '../../lib/sito/api.ts';
import { percorso } from '../../lib/sito/percorso.ts';

export const GET: APIRoute = ({ site }) => {
	const contesto = { sito: new URL(percorso(), site).href, aggiornato: new Date().toISOString() };
	return Response.json(apiGiocatori(caricaDati(), leggiCacheCarte()?.carte ?? [], contesto));
};
