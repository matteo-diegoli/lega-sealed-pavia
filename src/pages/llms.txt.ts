// llms.txt: presentazione della lega per gli agenti AI (vedi src/lib/sito/api.ts).
import type { APIRoute } from 'astro';
import { caricaDati } from '../lib/dati/carica.ts';
import { testoLlms } from '../lib/sito/api.ts';
import { percorso } from '../lib/sito/percorso.ts';

export const GET: APIRoute = ({ site }) => {
	const contesto = { sito: new URL(percorso(), site).href, aggiornato: new Date().toISOString() };
	return new Response(testoLlms(caricaDati(), contesto), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
