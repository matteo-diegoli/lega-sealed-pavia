// Anteprime delle pagine: i testi per Open Graph (titolo e descrizione che compaiono quando si
// incolla un link su WhatsApp e simili) e il contenuto dell'immagine 1200×630 che le accompagna.
// Qui solo i contenuti; il disegno è in immagine-anteprima.ts.

import type { Carta } from '../carte/carta.ts';
import { NUMERO_SERATE } from '../dati/schema.ts';
import type { DatiLega, Giocatore } from '../dati/valida.ts';
import { poolDelGiocatore } from '../lega/giocatore.ts';
import { roundCorrente, testoRisultato } from '../lega/match.ts';
import { NUMERO_ROUND, classificaAttuale, formattaData, statoLega } from '../lega/riepilogo.ts';

/** Una riga dell'immagine: testo a sinistra, eventuale testo a destra, medaglia o pallini dei colori. */
export interface RigaAnteprima {
  testo: string;
  destra?: string;
  /** Posizione in classifica da 1 a 3: medaglia d'oro, d'argento o di bronzo. */
  medaglia?: 1 | 2 | 3;
  /** Colori del pool, con il numero di carte di ciascuno. */
  colori?: { colore: string; carte: number }[];
}

export interface Anteprima {
  /** Titolo per Open Graph (senza il nome del sito). */
  titolo: string;
  descrizione: string;
  /** Riga piccola sopra il titolo dell'immagine, es. "Dopo il round 6 di 10". */
  etichetta: string;
  /** Titolo grande dell'immagine. */
  intestazione: string;
  /** Al massimo 4 righe. */
  righe: RigaAnteprima[];
  /** Vero per la finale (×2) e la lega conclusa: etichetta in oro. */
  oro: boolean;
}

const MASSIMO_RIGHE = 4;
const COLORI = ['W', 'U', 'B', 'R', 'G'];
const NOMI_COLORI: Record<string, string> = { W: 'bianco', U: 'blu', B: 'nero', R: 'rosso', G: 'verde' };

const punti = (n: number) => (n === 1 ? '1 punto' : `${n} punti`);
const pt = (n: number) => `${n} pt`;
/** "Anna, Bruno e Carla". */
function elenco(parole: string[]): string {
  return parole.length <= 1 ? (parole[0] ?? '') : `${parole.slice(0, -1).join(', ')} e ${parole.at(-1)}`;
}
/** "6 vittorie · 1 pareggio · 4 sconfitte" (i pareggi solo se ce ne sono). */
function bilancio(vittorie: number, pareggi: number, sconfitte: number): string {
  const conta = (n: number, uno: string, tanti: string) => `${n} ${n === 1 ? uno : tanti}`;
  return [
    conta(vittorie, 'vittoria', 'vittorie'),
    ...(pareggi > 0 ? [conta(pareggi, 'pareggio', 'pareggi')] : []),
    conta(sconfitte, 'sconfitta', 'sconfitte'),
  ].join(' · ');
}
const medaglia = (posizione: number) => (posizione <= 3 ? (posizione as 1 | 2 | 3) : undefined);
const primaData = (dati: DatiLega, serata: number) => dati.lega.serate.find((s) => s.numero === serata)?.data ?? null;

/** Home: a che punto siamo e i primi tre. */
export function anteprimaClassifica(dati: DatiLega): Anteprima {
  const stato = statoLega(dati);
  const { classifica } = classificaAttuale(dati);
  const nome = dati.lega.nome;

  if (classifica.finoAlRound === 0) {
    const data = primaData(dati, 1);
    return {
      titolo: nome,
      descrizione:
        `${dati.giocatori.length} giocatori, ${NUMERO_SERATE} serate, set Reality Fracture.` +
        (data ? ` Si comincia ${formattaData(data)}.` : ''),
      etichetta: data ? `Si parte ${formattaData(data)}` : 'Si parte presto',
      intestazione: 'Classifica',
      righe: [{ testo: `${dati.giocatori.length} giocatori · ${NUMERO_SERATE} serate · Reality Fracture` }],
      oro: false,
    };
  }

  const primi = classifica.righe.slice(0, 3);
  const righe = primi.map((r) => ({ testo: r.nome, destra: pt(r.punti), medaglia: medaglia(r.posizione) }));
  if (stato.finita) {
    const vincitore = primi[0]!;
    return {
      titolo: `${nome}: classifica finale`,
      descrizione: `Ha vinto ${vincitore.nome} con ${punti(vincitore.punti)}. Sul podio anche ${elenco(primi.slice(1).map((r) => r.nome))}.`,
      etichetta: 'Lega conclusa',
      intestazione: 'Classifica finale',
      righe,
      oro: true,
    };
  }
  const [primo, ...altri] = primi;
  return {
    titolo: `${nome}: classifica`,
    descrizione:
      `Dopo il round ${classifica.finoAlRound} di ${NUMERO_ROUND}: in testa ${primo!.nome} con ${punti(primo!.punti)}` +
      (altri.length > 0 ? `, poi ${elenco(altri.map((r) => r.nome))}.` : '.'),
    etichetta: `Dopo il round ${classifica.finoAlRound} di ${NUMERO_ROUND}`,
    intestazione: 'Classifica',
    righe,
    oro: false,
  };
}

/** Match: gli abbinamenti del round da giocare. */
export function anteprimaMatch(dati: DatiLega): Anteprima {
  const stato = statoLega(dati);
  const nomi = new Map(dati.giocatori.map((g) => [g.id, g.nome]));
  const nomeDi = (id: string) => nomi.get(id) ?? id;

  if (stato.finita) {
    const vincitore = classificaAttuale(dati).classifica.righe[0]!;
    return {
      titolo: 'Match',
      descrizione: `Tutti i ${NUMERO_ROUND} round sono stati giocati: ha vinto ${vincitore.nome}. Qui i risultati di ogni round.`,
      etichetta: 'Lega conclusa',
      intestazione: 'Match',
      righe: [{ testo: vincitore.nome, destra: pt(vincitore.punti), medaglia: 1 }],
      oro: true,
    };
  }

  const finale = stato.serata === NUMERO_SERATE;
  const data = primaData(dati, stato.serata);
  const quando = `Serata ${stato.serata}` + (data ? ` · ${formattaData(data)}` : '');
  const corrente = roundCorrente(dati);
  if (!corrente) {
    return {
      titolo: 'Match',
      descrizione: `${quando}: il round ${stato.roundGiocati + 1} non è ancora stato abbinato. Qui i risultati dei round giocati.`,
      etichetta: quando,
      intestazione: `Round ${stato.roundGiocati + 1}`,
      righe: [{ testo: 'Abbinamenti in arrivo' }],
      oro: finale,
    };
  }

  const partite = corrente.partite.map((p) => ({
    testo: `${nomeDi(p.giocatori[0])} – ${nomeDi(p.giocatori[1])}`,
    destra: testoRisultato(p) ?? undefined,
  }));
  const righe: RigaAnteprima[] = [...partite, ...(corrente.bye ? [{ testo: `Bye: ${nomeDi(corrente.bye)}` }] : [])];
  return {
    titolo: `Match: round ${corrente.numeroGlobale}`,
    descrizione: `${quando}, round ${corrente.numeroGlobale} di ${NUMERO_ROUND}${finale ? ' (finale, punti ×2)' : ''}: ${partite.map((p) => p.testo).join(', ')}.`,
    etichetta: `${quando}${finale ? ' · finale ×2' : ''}`,
    intestazione: `Round ${corrente.numeroGlobale}`,
    righe: righe.slice(0, MASSIMO_RIGHE),
    oro: finale,
  };
}

/** Pagina di un giocatore: posizione, punti, carte e colori del pool. */
export function anteprimaGiocatore(dati: DatiLega, giocatore: Giocatore, carte: Carta[]): Anteprima {
  const { classifica } = classificaAttuale(dati);
  const riga = classifica.righe.find((r) => r.id === giocatore.id);
  const pool = poolDelGiocatore(giocatore, carte);

  // Carte di ogni colore (una carta multicolore conta per tutti i suoi colori).
  const perColore = new Map<string, number>();
  for (const voce of pool.carte) {
    for (const colore of voce.carta?.colori ?? []) perColore.set(colore, (perColore.get(colore) ?? 0) + voce.copie);
  }
  const colori = COLORI.filter((c) => perColore.has(c)).map((colore) => ({ colore, carte: perColore.get(colore)! }));
  const principali = [...colori].sort((a, b) => b.carte - a.carte).slice(0, 2).map((c) => NOMI_COLORI[c.colore]!);

  const iniziata = classifica.finoAlRound > 0 && riga !== undefined;
  const posizione = iniziata ? `${riga.posizione}° posto${riga.pariMerito ? ' (pari merito)' : ''}` : null;
  const testoPool = pool.totale === 1 ? '1 carta nel pool' : `${pool.totale} carte nel pool`;

  const righe: RigaAnteprima[] = [{ testo: testoPool, colori }];
  if (iniziata) {
    righe.unshift({
      testo: bilancio(riga.vittorie, riga.pareggi, riga.sconfitte),
      destra: pt(riga.punti),
      medaglia: medaglia(riga.posizione),
    });
  }
  return {
    titolo: giocatore.nome,
    descrizione:
      (iniziata ? `${giocatore.nome}: ${posizione} con ${punti(riga.punti)}. ` : `${giocatore.nome}. `) +
      `Pool di ${pool.totale} carte` +
      (principali.length > 0 ? ` (soprattutto ${elenco(principali)}).` : '.'),
    etichetta: posizione ? `${posizione} · ${pt(riga!.punti)}` : 'Classifica non ancora iniziata',
    intestazione: giocatore.nome,
    righe,
    oro: iniziata && riga.posizione === 1,
  };
}
