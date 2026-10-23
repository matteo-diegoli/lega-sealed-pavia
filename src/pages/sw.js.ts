// Service worker del sito (indirizzo /sw.js nella cartella del sito): vedi src/lib/sito/service-worker.ts.
import type { APIRoute } from 'astro';
import { caricaDati } from '../lib/dati/carica.ts';
import { FILE_API } from '../lib/sito/api.ts';
import { FILE_APP, PAGINA_OFFLINE, pagineDelSito } from '../lib/sito/pagine.ts';
import { testoServiceWorker } from '../lib/sito/service-worker.ts';

export const GET: APIRoute = () => {
	const testo = testoServiceWorker({
		// Data e ora della build: cambia ogni volta, così i telefoni scaricano la versione nuova.
		versione: new Date().toISOString(),
		daSalvare: [...pagineDelSito(caricaDati()), ...FILE_APP, ...FILE_API],
		paginaOffline: PAGINA_OFFLINE,
	});
	return new Response(testo, { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
};
