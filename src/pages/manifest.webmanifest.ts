// Manifest dell'app: nome, icone e colori usati quando il sito si installa sul telefono.
import type { APIRoute } from 'astro';
import { COLORI } from '../lib/sito/emblema.ts';
import { percorso } from '../lib/sito/percorso.ts';

export const GET: APIRoute = () => {
	const manifest = {
		name: 'Lega Sealed Pavia',
		short_name: 'Lega Sealed',
		description: 'Classifica, abbinamenti e pool della Lega Sealed di Pavia.',
		lang: 'it',
		start_url: percorso(),
		scope: percorso(),
		display: 'standalone',
		background_color: COLORI.sfondo,
		theme_color: COLORI.superficie,
		icons: [
			{ src: percorso('icona-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
			{ src: percorso('icona-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
			{ src: percorso('icona-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
		],
	};
	return new Response(JSON.stringify(manifest, null, 2), {
		headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
	});
};
