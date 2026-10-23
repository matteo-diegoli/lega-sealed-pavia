// Dati della lega in forma leggibile da programmi e agenti AI: i file /api/*.json e /llms.txt.
// Si creano durante la build dagli stessi calcoli delle pagine, così i numeri coincidono sempre.
// Chiavi in italiano (come nei file YAML); nomi delle carte in inglese (come su Scryfall).

import type { Carta } from '../carte/carta.ts';
import type { DatiLega } from '../dati/valida.ts';
import { moltiplicatore } from '../lega/classifica.ts';
import { partiteDelGiocatore, poolDelGiocatore } from '../lega/giocatore.ts';
import { testoRisultato, vincitore } from '../lega/match.ts';
import { NUMERO_ROUND, classificaAttuale, statoLega } from '../lega/riepilogo.ts';
import { unisciPercorso } from './indirizzo.ts';

/** Cambia solo se la forma dei file cambia in modo non compatibile. */
export const VERSIONE_API = 1;

/** File creati dal sito (percorsi relativi alla sottocartella). */
export const FILE_API = ['llms.txt', 'api/classifica.json', 'api/match.json', 'api/giocatori.json'];

/** Indirizzo completo del sito (con la barra finale) e data della build. */
export interface Contesto {
  sito: string;
  aggiornato: string;
}

/** Indirizzo completo di una pagina o di un file del sito. */
function link(contesto: Contesto, pagina = ''): string {
  return unisciPercorso(contesto.sito, pagina);
}

/** Percentuale da 0 a 100 con un decimale (es. 0.6667 → 66.7). */
function percento(valore: number): number {
  return Math.round(valore * 1000) / 10;
}

function intestazione(dati: DatiLega, contesto: Contesto) {
  return { versione: VERSIONE_API, lega: dati.lega.nome, aggiornato: contesto.aggiornato, sito: link(contesto) };
}

/** Stato della lega: round giocati, round in corso, serata in corso o prossima. */
function stato(dati: DatiLega) {
  const s = statoLega(dati);
  const serata = dati.lega.serate.find((x) => x.numero === s.serata);
  return {
    roundGiocati: s.roundGiocati,
    roundTotali: NUMERO_ROUND,
    roundInCorso: s.roundInCorso,
    finita: s.finita,
    prossimaSerata: s.finita ? null : { numero: s.serata, data: serata?.data ?? null },
  };
}

// --- api/classifica.json ---------------------------------------------------------

export function apiClassifica(dati: DatiLega, contesto: Contesto) {
  const { classifica } = classificaAttuale(dati);
  return {
    ...intestazione(dati, contesto),
    stato: stato(dati),
    dopoIlRound: classifica.finoAlRound,
    classifica: classifica.righe.map((r) => ({
      posizione: r.posizione,
      pariMerito: r.pariMerito,
      id: r.id,
      nome: r.nome,
      punti: r.punti,
      vittorie: r.vittorie,
      pareggi: r.pareggi,
      sconfitte: r.sconfitte,
      bye: r.bye,
      game: { vinti: r.gameVinti, persi: r.gamePersi, pareggiati: r.gamePareggiati },
      percentuali: { mw: percento(r.mw), omw: percento(r.omw), gw: percento(r.gw), ogw: percento(r.ogw) },
      pagina: link(contesto, `giocatori/${r.id}/`),
    })),
  };
}

// --- api/match.json ----------------------------------------------------------------

export function apiMatch(dati: DatiLega, contesto: Contesto) {
  return {
    ...intestazione(dati, contesto),
    stato: stato(dati),
    serate: dati.lega.serate.map((serata) => ({
      numero: serata.numero,
      data: serata.data,
      finale: moltiplicatore(serata.numero) > 1,
      moltiplicatorePunti: moltiplicatore(serata.numero),
      assenti: serata.assenti,
      round: dati.round
        .filter((r) => r.serata === serata.numero)
        .map((r) => ({
          numero: r.numeroGlobale,
          roundDellaSerata: r.round,
          partite: r.partite.map((p) => {
            const v = vincitore(p);
            return {
              giocatori: p.giocatori,
              // Scritto dal punto di vista del primo giocatore, es. "2-1" o "1-1-1".
              risultato: testoRisultato(p),
              vincitore: v === null || v === 'pareggio' ? null : p.giocatori[v],
              esito: v === null ? 'da-giocare' : v === 'pareggio' ? 'pareggio' : 'vittoria',
            };
          }),
          bye: r.bye,
        })),
    })),
  };
}

// --- api/giocatori.json ----------------------------------------------------------

export function apiGiocatori(dati: DatiLega, carte: Carta[], contesto: Contesto) {
  const righe = new Map(classificaAttuale(dati).classifica.righe.map((r) => [r.id, r]));
  return {
    ...intestazione(dati, contesto),
    giocatori: dati.giocatori.map((g) => {
      const riga = righe.get(g.id);
      const pool = poolDelGiocatore(g, carte);
      return {
        id: g.id,
        nome: g.nome,
        posizione: riga?.posizione ?? null,
        punti: riga?.punti ?? 0,
        pagina: link(contesto, `giocatori/${g.id}/`),
        partite: partiteDelGiocatore(dati, g.id)
          .reverse()
          .map((p) => ({ round: p.numeroGlobale, serata: p.serata, esito: p.esito, avversario: p.avversario, risultato: p.risultato })),
        pool: {
          totale: pool.totale,
          perSerata: pool.perSerata,
          carte: pool.carte.map((c) => ({
            nome: c.nome,
            copie: c.copie,
            perSerata: c.perSerata,
            ...(c.carta
              ? {
                  colori: c.carta.colori,
                  valore: c.carta.valore,
                  rarita: c.carta.rarita,
                  tipo: c.carta.facce.map((f) => f.tipo).join(' // '),
                  costo: c.carta.facce.map((f) => f.costo).filter(Boolean).join(' // '),
                  scryfall: c.carta.scryfall,
                }
              : {}),
          })),
        },
      };
    }),
  };
}

// --- llms.txt --------------------------------------------------------------------

/** Testo per agenti AI (formato https://llmstxt.org): cos'è la lega, regole, situazione e link. */
export function testoLlms(dati: DatiLega, contesto: Contesto): string {
  const s = stato(dati);
  const { classifica } = classificaAttuale(dati);
  const situazione = s.finita
    ? 'La lega è conclusa.'
    : s.roundGiocati === 0
      ? `La lega non è ancora iniziata${s.prossimaSerata?.data ? `: si comincia il ${s.prossimaSerata.data}` : ''}.`
      : `Giocati ${s.roundGiocati} round su ${NUMERO_ROUND}. Prossima serata: la ${s.prossimaSerata!.numero}` +
        `${s.prossimaSerata!.data ? ` (${s.prossimaSerata!.data})` : ' (data da decidere)'}.`;
  const righe =
    classifica.finoAlRound === 0
      ? ['Nessun risultato ancora.']
      : classifica.righe.map((r) => `${r.posizione}.${r.pariMerito ? ' (pari merito)' : ''} ${r.nome}: ${r.punti} punti`);

  return [
    `# ${dati.lega.nome}`,
    '',
    `> Lega Sealed di Magic: The Gathering a Pavia: ${dati.giocatori.length} giocatori, ${dati.lega.serate.length} serate, ` +
      `${NUMERO_ROUND} round, set Reality Fracture (codice Scryfall "${dati.lega.set}"). Sito in italiano, ` +
      `aggiornato il ${contesto.aggiornato.slice(0, 10)}.`,
    '',
    '## Regole',
    '',
    '- Ogni giocatore apre 6 buste alla serata 1 e 1 busta a ogni serata successiva; dalla serata 2 l\'ultimo in classifica ' +
      'tra i presenti alla serata precedente riceve 1 busta in più. Chi salta una serata recupera le buste alla successiva.',
    '- 2 round a serata, partite al meglio di 3 (BO3). Vittoria 3 punti, pareggio 1, sconfitta 0; il bye vale come vittoria 2-0.',
    '- Abbinamenti svizzeri: R1–R7 senza rivincite, R8–R10 per classifica.',
    `- La serata ${dati.lega.serate.length} è la finale: i punti valgono doppio (×2).`,
    '- Tie-breaker: OMW% (minimo 33%), GW%, OGW%.',
    '',
    '## Situazione',
    '',
    situazione,
    '',
    ...righe,
    '',
    '## Pagine',
    '',
    `- [Classifica](${link(contesto)}): classifica attuale ed evoluzione serata per serata`,
    `- [Match](${link(contesto, 'match/')}): round in corso e storico delle partite`,
    ...dati.giocatori.map((g) => `- [${g.nome}](${link(contesto, `giocatori/${g.id}/`)}): pool di carte e partite`),
    '',
    '## Dati (JSON)',
    '',
    `- [Classifica](${link(contesto, 'api/classifica.json')}): posizioni, punti, partite vinte/pareggiate/perse, ` +
      'tie-breaker in percentuale (0–100)',
    `- [Match](${link(contesto, 'api/match.json')}): tutte le serate con date, assenti, round, partite e bye; ` +
      'il risultato è scritto dal punto di vista del primo giocatore ("2-1", "1-1-1" con i game pari), null = da giocare',
    `- [Giocatori](${link(contesto, 'api/giocatori.json')}): per ogni giocatore posizione, partite e pool completo ` +
      '(nomi delle carte in inglese, copie, serata in cui sono state aperte)',
    '',
  ].join('\n');
}
