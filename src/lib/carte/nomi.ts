// Ricerca delle carte per nome, tollerando maiuscole, accenti e apostrofi diversi,
// e suggerimento del nome giusto in caso di errori di battitura.

import type { Carta } from './carta.ts';

/** Forma "neutra" di un nome: minuscole, senza accenti, apostrofi uniformi, spazi singoli. */
export function normalizza(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[‘’`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export class IndiceCarte {
  private readonly perNome = new Map<string, Carta>();

  constructor(carte: Carta[]) {
    for (const carta of carte) {
      this.perNome.set(normalizza(carta.nome), carta);
    }
    // Per le carte a due facce vale anche il nome della sola prima faccia,
    // purché non coincida con il nome di un'altra carta.
    for (const carta of carte) {
      const primaFaccia = normalizza(carta.facce[0]?.nome ?? carta.nome);
      if (!this.perNome.has(primaFaccia)) this.perNome.set(primaFaccia, carta);
    }
  }

  trova(nome: string): Carta | undefined {
    return this.perNome.get(normalizza(nome));
  }

  /** Il nome di carta più simile, se abbastanza simile da essere un errore di battitura. */
  suggerisci(nome: string): string | undefined {
    const cercato = normalizza(nome);
    let migliore: { nome: string; distanza: number } | undefined;
    for (const [chiave, carta] of this.perNome) {
      const d = distanza(cercato, chiave);
      if (migliore === undefined || d < migliore.distanza) migliore = { nome: carta.nome, distanza: d };
    }
    const tolleranza = Math.max(2, Math.floor(cercato.length / 4));
    return migliore !== undefined && migliore.distanza <= tolleranza ? migliore.nome : undefined;
  }
}

/** Distanza di Levenshtein: quante lettere vanno aggiunte, tolte o cambiate per passare da a a b. */
export function distanza(a: string, b: string): number {
  let precedente = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const riga = [i];
    for (let j = 1; j <= b.length; j++) {
      riga[j] = Math.min(precedente[j] + 1, riga[j - 1] + 1, precedente[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    precedente = riga;
  }
  return precedente[b.length];
}
