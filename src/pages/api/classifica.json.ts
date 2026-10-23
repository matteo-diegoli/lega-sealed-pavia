// api/classifica.json: classifica attuale con i tie-breaker (vedi src/lib/sito/api.ts).
import type { APIRoute } from 'astro';
import { caricaDati } from '../../lib/dati/carica.ts';
import { apiClassifica } from '../../lib/sito/api.ts';
import { percorso } from '../../lib/sito/percorso.ts';

export const GET: APIRoute = ({ site }) => {
	const contesto = { sito: new URL(percorso(), site).href, aggiornato: new Date().toISOString() };
	return Response.json(apiClassifica(caricaDati(), contesto));
};
