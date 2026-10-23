// Dati strutturati (JSON-LD, vocabolario schema.org) per la Home: descrivono la lega come
// una serie di serate a Pavia, così programmi e agenti AI capiscono di cosa parla la pagina.

import type { DatiLega } from '../dati/valida.ts';

const PAVIA = {
  '@type': 'Place',
  name: 'Pavia',
  address: { '@type': 'PostalAddress', addressLocality: 'Pavia', addressCountry: 'IT' },
};

/** Serie di eventi con una "subEvent" per ogni serata che ha già una data. */
export function datiStrutturatiLega(dati: DatiLega, indirizzo: string): Record<string, unknown> {
  const date = dati.lega.serate.filter((s) => s.data !== null);
  const tutteDecise = date.length === dati.lega.serate.length;
  return {
    '@context': 'https://schema.org',
    '@type': 'EventSeries',
    name: dati.lega.nome,
    description: `Lega Sealed di Magic: The Gathering a Pavia: ${dati.giocatori.length} giocatori, ${dati.lega.serate.length} serate, set Reality Fracture.`,
    url: indirizzo,
    inLanguage: 'it',
    location: PAVIA,
    ...(date[0] ? { startDate: date[0].data } : {}),
    ...(tutteDecise && date.length > 0 ? { endDate: date.at(-1)!.data } : {}),
    subEvent: date.map((s) => ({
      '@type': 'Event',
      name: `${dati.lega.nome} – serata ${s.numero}`,
      startDate: s.data,
      location: PAVIA,
    })),
  };
}

/** Testo da mettere dentro <script type="application/ld+json"> senza rischi ("<" non chiude lo script). */
export function testoJsonLd(oggetto: unknown): string {
  return JSON.stringify(oggetto).replace(/</g, '\\u003c');
}
