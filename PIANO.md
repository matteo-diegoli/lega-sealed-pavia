# Piano del progetto – Lega Sealed Pavia

Questo file è la scaletta di tutto il progetto. Si aggiorna **alla fine di ogni step**,
così si può interrompere la sessione e ripartire da qui in qualsiasi momento.

---

## 📍 Dove siamo

- **Fase attuale:** Fase 0 completata ✅ → inizio Fase 1 (dati e Scryfall)
- **Prossima azione:** verificare su Scryfall il codice del set Reality Fracture
- **Ultimo aggiornamento:** 2026-10-23

---

## Decisioni prese

### Formato della lega
- 8 giocatori, 5 serate, set **Reality Fracture** (codice set Scryfall da verificare nella Fase 1).
- Serata 1 giocata il **2026-10-22**. Le date successive si decidono settimana per settimana.
- **Buste:** 6 alla serata 1, poi 1 a ogni serata successiva.
- **Busta extra:** 1 busta in più all'**ultimo in classifica** al termine della serata precedente (dalla serata 2 in poi; parità → decidono i tie-breaker).
  **Non spetta** se quel giocatore ha saltato la serata precedente.
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

### ❓ Domande aperte (servono dalla Fase 2)
- Se l'ultimo in classifica era assente, la busta extra va all'ultimo tra i presenti o a nessuno?
- Chi salta una serata riceve comunque la busta normale di quella serata?

---

## Scaletta

### Fase 0 – Setup guidato
- [x] 1. Controllo strumenti: Node 24 LTS (via nvm), git aggiornato, GitHub CLI
- [x] 2. Configurazione git (nome ed email già presenti)
- [x] 3. Accesso a GitHub dal terminale (`gh auth login`)
- [x] 4. Creazione progetto Astro, `npm install`, `git init`, primo avvio, primo commit
- [x] 5. Vedere il sito dal telefono sulla stessa rete Wi-Fi

### Fase 1 – Dati e Scryfall
- [ ] Verifica del codice set di Reality Fracture su Scryfall
- [ ] Formato di `data/league.yml`, `data/players/<nome>.yml`, `data/rounds/serata-X-round-Y.yml`
- [ ] Validazione dei dati con messaggi in italiano
- [ ] Script Scryfall: `/cards/collection`, User-Agent, pausa tra le richieste, cache locale
- [ ] 8 giocatori fittizi con pool realistici e 2 serate giocate

### Fase 2 – Motore della lega
- [ ] Classifica "al termine della serata X", tie-breaker
- [ ] Abbinamenti svizzeri con backtracking, cicli 1 e 2, bye, moltiplicatore ×2
- [ ] Busta extra all'ultimo (con le regole sulle assenze)
- [ ] `npm run pair`
- [ ] Test automatici + dati di prova che simulano tutte e 5 le serate

### Fase 3 – Design
- [ ] 2 direzioni di stile con una pagina di esempio ciascuna → scelta dell'utente
- [ ] Illustrazioni SVG originali di Pavia, variabili CSS, tema scuro/chiaro

### Fase 4 – Pagine
- [ ] Home / Classifica (tabella + card su mobile, evoluzione per serata, ×2 della finale)
- [ ] Prossimi match (round corrente, storico richiudibile, stile speciale della finale)
- [ ] Pagina giocatore (pool, statistiche, mazzi per serata, storico partite)

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
- [ ] Come sostituire i dati fittizi con quelli veri (inclusa la serata 1 del 22/10)

---

## Appendice: rimettere il proxy aziendale (solo se si torna nella rete Ariadne)

```powershell
nvm proxy http://proxy.ariadne.it:3128
npm config set proxy http://proxy.ariadne.it:3128; npm config set https-proxy http://proxy.ariadne.it:3128
netsh winhttp set proxy proxy-laptop.ariadne.it:3128 "<local>"   # come amministratore
```
