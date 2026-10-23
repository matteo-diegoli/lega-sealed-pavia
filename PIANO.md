# Piano del progetto – Lega Sealed Pavia

Questo file è la scaletta di tutto il progetto. Si aggiorna **alla fine di ogni step**,
così si può interrompere la sessione e ripartire da qui in qualsiasi momento.

---

## 📍 Dove siamo

- **Fase attuale:** Fase 1 completata ✅ → inizio Fase 2 (motore della lega)
- **Prossima azione:** proporre il piano della Fase 2 (classifica e tie-breaker per primi) e aspettare l'ok.
- **Ultimo aggiornamento:** 2026-10-23

---

## Decisioni prese

### Formato della lega
- 8 giocatori, 5 serate, set **Reality Fracture**: codice Scryfall **`fra`** (verificato: espansione, uscita 2026-10-02, 461 carte).
- Serata 1 giocata il **2026-10-22**. Le date successive si decidono settimana per settimana.
- **Buste:** 6 alla serata 1, poi 1 a ogni serata successiva.
- **Busta extra:** 1 busta in più all'**ultimo in classifica** al termine della serata precedente (dalla serata 2 in poi; parità → decidono i tie-breaker).
  **Non spetta** a chi ha saltato la serata precedente: va all'**ultimo in classifica tra i presenti** alla serata precedente.
- **Assenti:** chi salta una serata **recupera la busta normale** di quella serata alla serata successiva in cui è presente
  (es. assente alla 2 → alla 3 riceve 2 buste).
- **2 round a serata = 10 round in totale.**

| Serata | Round | Tipo | Punti |
|---|---|---|---|
| 1 | R1, R2 | Svizzera – ciclo 1 | ×1 |
| 2 | R3, R4 | Svizzera – ciclo 1 | ×1 |
| 3 | R5, R6 | Svizzera – ciclo 1 | ×1 |
| 4 | R7 | Svizzera – ciclo 1 (ultimo: tutti si sono affrontati) | ×1 |
| 4 | R8 | Svizzera – **ciclo 2** | ×1 |
| 5 | R9, R10 | Svizzera – ciclo 2, **finale** | **×2** |

- **Ciclo 1 (R1–R7):** nessuna rivincita; backtracking per garantire che R7 sia sempre abbinabile.
- **Ciclo 2 (R8–R10):** abbinamenti per classifica, nessuna rivincita *dentro* il ciclo 2; riaffrontare chi si è incontrato in R1–R7 è ammesso.
- **Punti:** BO3, vittoria 3, pareggio 1, sconfitta 0. Bye = vittoria 2-0, al giocatore con meno punti che non l'ha ancora avuto.
- **Tie-breaker:** OMW% (minimo 33%), GW%, OGW%. La finale **conta normalmente** nei tie-breaker (il ×2 vale solo per i punti).

### Dati (formato YAML, deciso in Fase 1)
- `data/league.yml`: nome, `set: fra`, elenco serate con `numero`, `data` (o `null`), `assenti`.
- Giocatori indicati da un **identificativo** corto senza spazi/accenti (= nome del file).
- `data/players/<id>.yml`: `nome` + `pool` diviso per serata (`serata-1`, `serata-2`, …).
  Le carte si scrivono **per nome** (non per numero di collezione): così la ricerca nel pool funziona
  senza chiamare l'API. Da Scryfall si prendono comunque immagini, colori, rarità (con cache).
  Nomi **in inglese** (quelli di Scryfall). Copie multiple con il **numero davanti**: `- 2 Grizzly Bears`.
- **Mazzi giocati: non si registrano.**
- `data/rounds/serata-X-round-Y.yml`: `serata`, `round`, `partite` (`giocatori: [a, b]`,
  `risultato: 2-1` / `1-1-1` / `null` se da giocare), `bye`. In ogni serata i round sono 1 e 2
  (round globale = (serata − 1) × 2 + round).
- Regole del controllo: ogni presente è abbinato o ha il bye; nessun assente abbinato; round in sequenza
  senza buchi; un round può esistere solo se il precedente ha tutti i risultati; un round richiede la data
  della sua serata; date delle serate crescenti, quelle non decise solo in fondo.

### Sito
- **noindex** (non indicizzato), ma `llms.txt` e gli endpoint `/api/*.json` restano.
- Stack: **Astro 7 + TypeScript strict**, CSS con variabili, JavaScript vanilla per i filtri.
- Dati in YAML (`js-yaml`) validati con Zod, errori in italiano.
- PWA con `@vite-pwa/astro`. Test con Vitest; accessibilità con Playwright + axe.
- Deploy: GitHub Actions → GitHub Pages.

### Ambiente (PC Windows 11 dell'utente)
- Node **24.22.1** gestito da **nvm-windows 1.2.2** (link attivo in `C:\nvm4w\nodejs`).
- Esiste ancora un vecchio link `C:\Program Files\nodejs` → Node 20: se un terminale mostra v20, usare `nvm use 24` o riaprire il terminale.
- git 2.55, GitHub CLI 2.103, accesso come **matteo-diegoli** (email noreply di GitHub).
- Il PC ha un vecchio proxy aziendale (Ariadne) in git globale: in **questo** repository è disattivato con `git config http.proxy ""`.
  Proxy rimosso anche da nvm, npm e WinHTTP (comandi per rimetterlo: vedi sotto).
- **Sito dal telefono:** `npx.cmd astro dev --host --background`, poi sul telefono `http://192.168.1.90:4321`
  (IP del PC sul Wi-Fi di casa, rete "Privata"). Scrivere sempre `http://` a mano: con `https://`
  compare `ERR_SSL_PROTOCOL_ERROR`. Spegnere il server con `npx.cmd astro dev stop`.

### ❓ Domande aperte
- Nessuna (le due sulle assenze sono state risolte il 2026-10-23: vedi "Busta extra" e "Assenti").

---

## Scaletta

### Fase 0 – Setup guidato
- [x] 1. Controllo strumenti: Node 24 LTS (via nvm), git aggiornato, GitHub CLI
- [x] 2. Configurazione git (nome ed email già presenti)
- [x] 3. Accesso a GitHub dal terminale (`gh auth login`)
- [x] 4. Creazione progetto Astro, `npm install`, `git init`, primo avvio, primo commit
- [x] 5. Vedere il sito dal telefono sulla stessa rete Wi-Fi

### Fase 1 – Dati e Scryfall
- [x] Verifica del codice set di Reality Fracture su Scryfall (`fra`)
- [x] Formato di `data/league.yml`, `data/players/<nome>.yml`, `data/rounds/serata-X-round-Y.yml`
- [x] Validazione dei dati con messaggi in italiano: `src/lib/dati/` (schema, controlli incrociati, 34 test),
      `npm run controlla` (parte da solo prima di `npm run build`), `npm test`, `npx.cmd astro check` per i tipi.
      Creato il vero `data/league.yml` (serata 1 il 2026-10-22, altre date `null`). Il controllo dei nomi
      delle carte arriva con lo script Scryfall.
- [x] Script Scryfall: `npm run scryfall` scarica tutte le stampe del set (`/cards/search`, 461 stampe →
      285 carte, tiene la versione normale da busta), cerca con `/cards/collection` le carte dei pool di
      altri set, User-Agent, pausa 150 ms. Cache in `data/scryfall/carte.json` (**salvata in git**, così la
      build non va su Internet). Immagini: solo link a Scryfall. `npm run controlla` verifica i nomi senza
      Internet (maiuscole/accenti ignorati, basta la prima faccia delle carte doppie, suggerisce il nome giusto).
      Codice in `src/lib/carte/`, 47 test in tutto.
- [x] 8 giocatori fittizi con pool realistici e 2 serate giocate: `npm run genera-prova` (seme fisso,
      non sovrascrive senza `-- --forza`). Buste semplificate: 1 rara (1/8 mitica), 3 non comuni, 10 comuni,
      niente terre base. Serata 2 fittizia il 2026-10-29 con Marco assente (bye a chi doveva giocare con lui),
      busta extra a Carla (ultima dopo la serata 1). Abbinamenti a girone, **non** svizzeri.

### Fase 2 – Motore della lega
- [ ] Classifica "al termine della serata X", tie-breaker
- [ ] Abbinamenti svizzeri con backtracking, cicli 1 e 2, bye, moltiplicatore ×2
- [ ] Busta extra all'ultimo tra i presenti + recupero della busta per chi è stato assente
- [ ] `npm run pair`
- [ ] Test automatici + dati di prova che simulano tutte e 5 le serate

### Fase 3 – Design
- [ ] 2 direzioni di stile con una pagina di esempio ciascuna → scelta dell'utente
- [ ] Illustrazioni SVG originali di Pavia, variabili CSS, tema scuro/chiaro

### Fase 4 – Pagine
- [ ] Home / Classifica (tabella + card su mobile, evoluzione per serata, ×2 della finale)
- [ ] Prossimi match (round corrente, storico richiudibile, stile speciale della finale)
- [ ] Pagina giocatore (pool, statistiche, storico partite) — niente mazzi, deciso in Fase 1

### Fase 5 – Pool interattivo
- [ ] Filtri a tag, ordinamento, ricerca, contatore, stato nell'URL, bottom sheet su mobile

### Fase 6 – PWA, SEO e agenti AI
- [ ] Manifest, icone, service worker, offline
- [ ] Meta, Open Graph con immagini generate, JSON-LD, sitemap, robots, noindex
- [ ] `llms.txt` e `/api/*.json`

### Fase 7 – Qualità
- [ ] axe nella GitHub Action (la build fallisce con errori AA)
- [ ] Lighthouse ≥ 90 su mobile
- [ ] Guida al test manuale con TalkBack / VoiceOver

### Fase 8 – Rilascio
- [ ] Repository su GitHub e primo push
- [ ] GitHub Action per build e deploy su Pages
- [ ] Verifica online + installazione su iPhone e Android
- [ ] (facoltativo) dominio personalizzato

### Fase 9 – Documentazione
- [ ] `GUIDA.md`: checklist di ogni serata, finale, aggiunta giocatori, pubblicazione anche da telefono, cosa fare se la build fallisce
- [ ] Come sostituire i dati fittizi con quelli veri (inclusa la serata 1 del 22/10).
      Ricordarsi: in `data/league.yml` la data della serata 2 e `assenti: [marco]` sono **fittizi**.

---

## Appendice: rimettere il proxy aziendale (solo se si torna nella rete Ariadne)

```powershell
nvm proxy http://proxy.ariadne.it:3128
npm config set proxy http://proxy.ariadne.it:3128; npm config set https-proxy http://proxy.ariadne.it:3128
netsh winhttp set proxy proxy-laptop.ariadne.it:3128 "<local>"   # come amministratore
```
