// robots.txt: lascia entrare tutti, così i motori di ricerca leggono il "noindex" delle pagine
// (se li bloccassimo qui non lo vedrebbero e potrebbero mostrare il link lo stesso).
// Nota: i motori lo cercano solo nella radice del dominio, quindi conta solo con un dominio personale.
import type { APIRoute } from 'astro';

export const GET: APIRoute = () =>
	new Response(
		[
			'# Lega Sealed Pavia: le pagine hanno "noindex" e non compaiono nelle ricerche.',
			'# Qui si lascia entrare tutti, così quel noindex si può leggere.',
			'User-agent: *',
			'Allow: /',
			'',
		].join('\n'),
		{ headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
	);
