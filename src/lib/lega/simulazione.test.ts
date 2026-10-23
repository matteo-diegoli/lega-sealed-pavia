// Prova di tutta la catena sulla lega di prova di "npm run genera-prova":
// abbinamenti → risultati → classifica → buste → file YAML → controllo dei dati.

import { describe, expect, it } from 'vitest';
import { leggiCacheCarte } from '../dati/carica.ts';
import { validaDati } from '../dati/valida.ts';
import { ROUND_TOTALI, calcolaAbbinamenti } from './abbinamenti.ts';
import { busteDellaSerata } from './buste.ts';
import { calcolaClassifica, moltiplicatore } from './classifica.ts';
import {
  ASSENTI_DI_PROVA,
  CARTE_PER_BUSTA,
  GIOCATORI_DI_PROVA,
  fermaAllaSerata,
  fileDellaSimulazione,
  opzioniDiProva,
  simulaLega,
} from './simulazione.ts';

const carte = leggiCacheCarte()!.carte;
const completa = simulaLega(opzioniDiProva(carte));
const ids = GIOCATORI_DI_PROVA.map((g) => g.id);

describe('lega di prova completa', () => {
  it('ha 10 round: ogni presente gioca o ha il bye, nessun assente', () => {
    expect(completa.dati.round.map((r) => r.numeroGlobale)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const r of completa.dati.round) {
      const assenti = ASSENTI_DI_PROVA[r.serata - 1]!;
      const inGioco = [...r.partite.flatMap((p) => p.giocatori), ...(r.bye ? [r.bye] : [])];
      expect([...inGioco].sort()).toEqual(ids.filter((id) => !assenti.includes(id)).sort());
      expect(r.partite.every((p) => p.risultato !== null)).toBe(true);
    }
  });

  it('non ha rivincite (il seme è scelto apposta)', () => {
    expect(completa.avvisi.flat().filter((a) => a.startsWith('Rivincita'))).toEqual([]);
  });

  it('nella classifica finale i punti della finale valgono doppio', () => {
    const punti = new Map(ids.map((id) => [id, 0]));
    for (const r of completa.dati.round) {
      const per = moltiplicatore(r.serata);
      for (const p of r.partite) {
        const [a, b] = p.giocatori;
        const [va, vb] = p.risultato!.vittorie;
        if (va > vb) punti.set(a, punti.get(a)! + 3 * per);
        else if (vb > va) punti.set(b, punti.get(b)! + 3 * per);
        else {
          punti.set(a, punti.get(a)! + per);
          punti.set(b, punti.get(b)! + per);
        }
      }
      if (r.bye) punti.set(r.bye, punti.get(r.bye)! + 3 * per);
    }
    for (const riga of calcolaClassifica(completa.dati).righe) expect(riga.punti).toBe(punti.get(riga.id));
  });

  it('il pool di ognuno ha 14 carte per ogni busta ricevuta, serata per serata', () => {
    for (let serata = 1; serata <= 5; serata++) {
      for (const g of busteDellaSerata(completa.dati, serata).giocatori) {
        expect(completa.pool.get(g.id)![serata - 1]!.length).toBe(g.totale * CARTE_PER_BUSTA);
      }
    }
  });

  it('in tutto: 10 buste a testa più le extra; chi è stato assente le recupera', () => {
    const extra = [2, 3, 4, 5].map((s) => busteDellaSerata(completa.dati, s).extra);
    expect(extra.every((id) => id !== null)).toBe(true);
    for (const id of ids) {
      const totale = [1, 2, 3, 4, 5].reduce((somma, s) => somma + busteDellaSerata(completa.dati, s).giocatori.find((g) => g.id === id)!.totale, 0);
      expect(totale).toBe(10 + extra.filter((e) => e === id).length);
    }
    // Marco salta la serata 2 e recupera alla 3; Elena salta la 4 e recupera alla finale.
    expect(busteDellaSerata(completa.dati, 3).giocatori.find((g) => g.id === 'marco')!.recuperate).toBe(1);
    expect(busteDellaSerata(completa.dati, 5).giocatori.find((g) => g.id === 'elena')!.recuperate).toBe(1);
  });

  it('i file generati superano il controllo dei dati, nomi delle carte compresi', () => {
    const esito = validaDati(fileDellaSimulazione(completa), carte);
    expect(esito.ok ? [] : esito.errori).toEqual([]);
  });

  it('genera sempre gli stessi dati', () => {
    expect(fileDellaSimulazione(simulaLega(opzioniDiProva(carte)))).toEqual(fileDellaSimulazione(completa));
  });
});

describe('lega di prova fermata a metà', () => {
  for (const serata of [1, 2, 3, 4]) {
    it(`al termine della serata ${serata}: round successivo da giocare, file validi`, () => {
      const sim = fermaAllaSerata(completa, serata);
      const ultimo = serata * 2;
      expect(sim.dati.round).toHaveLength(ultimo + 1);
      // I round giocati sono identici a quelli della lega completa.
      expect(sim.dati.round.slice(0, ultimo)).toEqual(completa.dati.round.slice(0, ultimo));
      expect(sim.dati.round[ultimo]!.partite.every((p) => p.risultato === null)).toBe(true);
      // Le date ci sono solo fino alla serata in corso.
      expect(sim.dati.lega.serate.map((s) => s.data !== null)).toEqual([1, 2, 3, 4, 5].map((s) => s <= serata + 1));
      expect(sim.pool.get('anna')).toHaveLength(serata + 1);

      const esito = validaDati(fileDellaSimulazione(sim), carte);
      expect(esito.ok ? [] : esito.errori).toEqual([]);
      if (!esito.ok) return;
      // Riletti dai file, i dati danno la stessa classifica e "npm run pair" si ferma per i risultati mancanti.
      expect(calcolaClassifica(esito.dati).righe).toEqual(calcolaClassifica(sim.dati).righe);
      expect(() => calcolaAbbinamenti(esito.dati)).toThrow(/mancano dei risultati/);
    });
  }

  it('non si può fermare alla finale', () => {
    expect(() => fermaAllaSerata(completa, 5)).toThrow();
    expect(completa.dati.round.at(-1)!.numeroGlobale).toBe(ROUND_TOTALI);
  });
});
