// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import { load } from 'js-yaml';
import { scegliIndirizzo } from './src/lib/sito/indirizzo.ts';

// Indirizzo del sito: variabile SITO_URL, altrimenti "indirizzo:" in data/league.yml.
// Gli errori di league.yml li segnala "npm run controlla": qui basta non bloccarsi.
let daLega;
try {
	const lega = /** @type {{ indirizzo?: string } | null} */ (load(readFileSync('data/league.yml', 'utf8')));
	daLega = lega?.indirizzo;
} catch {}
const { site, base } = scegliIndirizzo(process.env.SITO_URL, daLega);

/**
 * Solo per "astro dev" (il server di prova): chi apre un indirizzo fuori dalla sottocartella
 * (es. il vecchio http://<IP>:4321/ o la cartella senza "/" finale) viene mandato dentro.
 * Online lo fa già GitHub Pages.
 * @returns {import('vite').Plugin}
 */
function mandaNellaCartella() {
	/** @type {import('vite').Connect.NextHandleFunction} */
	const rimanda = (richiesta, risposta, avanti) => {
		// originalUrl: l'indirizzo com'era prima che Astro togliesse la sottocartella.
		const url = /** @type {{ originalUrl?: string }} */ (richiesta).originalUrl ?? richiesta.url ?? '/';
		// Solo le pagine (richieste di HTML): CSS e script del server di prova stanno fuori dalla cartella.
		const pagina = String(richiesta.headers.accept ?? '').includes('text/html');
		if (base === '/' || !pagina || url.startsWith(base)) return avanti();
		const resto = url === base.slice(0, -1) ? '' : url.replace(/^\/+/, '');
		risposta.writeHead(302, { Location: base + resto });
		risposta.end();
	};
	// In testa alla fila: altrimenti Astro risponde 404 su "/" prima di arrivare qui.
	/** @param {import('vite').Connect.Server} server */
	const aggiungi = (server) => {
		server.stack.unshift({ route: '', handle: rimanda });
	};
	return {
		name: 'manda-nella-cartella',
		// Restituire una funzione = eseguirla a server pronto, dopo che Astro ha messo in testa i suoi controlli.
		configureServer: (server) => () => aggiungi(server.middlewares),
	};
}

// https://astro.build/config
export default defineConfig({ site, base, vite: { plugins: [mandaNellaCartella()] } });
