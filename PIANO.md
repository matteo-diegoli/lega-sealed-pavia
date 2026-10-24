# Piano del progetto – Lega Sealed Pavia

Questo file è la scaletta di tutto il progetto. Si aggiorna **alla fine di ogni step**,
così si può interrompere la sessione e ripartire da qui in qualsiasi momento.

---

## 📍 Dove siamo

- **Fase attuale:** Fase 8 in corso. Piano approvato il 2026-10-24: 1) preparazione ✅ 2) repository pubblico + primo push ✅
  3) Action (test + `npm run accessibilita` + deploy su Pages) 4) verifica online 5) dominio (facoltativo).
  Si pubblica **con i dati fittizi**: in Fase 9 il passaggio ai dati veri servirà anche a provare l'aggiornamento del sito.
- **Prossima azione:** Step 3 – proporre la GitHub Action (`.github/workflows/pubblica.yml`) e aspettare l'ok.
- `data/photo-from-whatsapp/` (esclusa in `.gitignore`, una sottocartella per giocatore) contiene le foto dei **pool veri**
  della serata 1. Non serve leggerle: quando si sostituiscono i dati fittizi (Fase 9) l'utente fornirà una **lista scritta**.
- **Ultimo aggiornamento:** 2026-10-24 (Fase 8, step 2)

---

## Decisioni prese

### Formato della lega
- 8 giocatori, 5 serate, set **Reality Fracture**: codice Scryfall **`fra`** (verificato: espansione, uscita 2026-10-02, 461 carte).
- Serata 1 giocata il **2026-10-22**. Le date successive si decidono settimana per settimana.
- **Buste:** 6 alla serata 1, poi 1 a ogni serata successiva.
- **Busta extra:** 1 busta in più all'**ultimo in classifica** al termine della serata precedente (dalla serata 2 in poi; parità → decidono i tie-breaker).
  **Non spetta** a chi ha saltato la serata precedente: va all'**ultimo in classifica tra i presenti** alla serata precedente.
  Se l'ultimo **è assente alla serata in cui la riceverebbe**, passa al penultimo (e così via) (deciso il 2026-10-23).
  La busta extra non si recupera.
- **Assenti:** chi salta una o più serate **riceve tutte le buste normali saltate** alla prima serata in cui si presenta
  (es. assente alla 2 → alla 3 riceve 2 buste; assente alla 1 → alla 2 riceve 6 + 1 = 7 buste).
  Chi è assente alla finale non recupera niente (non ci sono serate dopo).
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
- **Parità su tutto** (deciso il 2026-10-23): stessa posizione in classifica ("pari merito"). Quando bisogna
  sceglierne uno (es. busta extra): scontro diretto (se sono più di due: punti negli scontri tra loro),
  poi sorteggio fisso (hash dell'identificativo: sempre lo stesso risultato).
- Dettagli del calcolo: il bye conta come vittoria 2-0 (3 punti, ×2 in finale) e vale per MW% e GW%, ma non è
  un avversario in OMW%/OGW%; l'assenza non conta niente; le partite con risultato `null` si ignorano.
  Il minimo del 33% vale solo per gli avversari (il proprio MW%/GW% resta quello vero).
- **Abbinamenti** (deciso il 2026-10-23): ordine della classifica dopo l'ultimo round; dall'alto in basso, ognuno
  contro il più alto libero e mai incontrato nel ciclo. Backtracking: un abbinamento si accetta solo se i round
  rimasti nel ciclo restano abbinabili senza rivincite, supponendo tutti presenti (al massimo n − 1 round per ciclo).
  Bye: al più basso in classifica tra chi ne ha avuti meno; se serve a evitare rivincite passa al candidato successivo.
  Se le assenze rendono le rivincite inevitabili: il minor numero possibile, le più vecchie, con un **avviso**.
- **`npm run pair`**: trova da solo il prossimo round, si rifiuta se mancano risultati o la data della serata,
  crea `data/rounds/serata-X-round-Y.yml` con `risultato: null` (mai sovrascrivere). `-- --prova` mostra soltanto.

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

### Indirizzo del sito e app (deciso il 2026-10-23 in Fase 6)
- Indirizzo: **`https://matteo-diegoli.github.io/lega-sealed-pavia/`**, scritto in `data/league.yml` (`indirizzo:`).
  Per cambiarlo basta quella riga; al momento della build lo si può scavalcare con la variabile `SITO_URL`
  (es. `$env:SITO_URL='https://lega.example.it/'; npm.cmd run build`). `astro.config.mjs` ne ricava `site` e `base`.
- Ogni link interno passa da `percorso()` / `linkGiocatore()` in `src/lib/sito/percorso.ts` (mai scrivere `href="/..."`).
- **Niente `@vite-pwa/astro`**: dichiara compatibilità solo fino ad Astro 5. Service worker scritto a mano
  (`src/lib/sito/service-worker.ts`, pubblicato come `sw.js`).
- **Niente sitemap**: con il `noindex` non serve.

### Stile (deciso il 2026-10-23 in Fase 3)
- Scelto lo **stile B – "Arena"** (scartato A – "Pavia storica": chiaro, serif, rosso mattone).
- Fondo scuro (`#0e1117`), superfici a schede con angoli arrotondati (12px), testo `#e9edf4`, testo tenue `#9aa4b5`.
- Accenti: viola `#8b7cff` → turchese `#3ad6c5` (sfumatura); oro `#f2c14e` per la finale ×2 e il primo posto;
  medaglie oro/argento/bronzo per il podio; verde/rosso per vittorie, sconfitte e frecce in classifica.
- Caratteri di sistema (`system-ui`), titoli molto marcati; titoli di sezione piccoli, maiuscoli e spaziati.
- Testata con barra dei 10 round (le ultime 2, la finale, in oro); classifica con barre dei punti;
  carte rare e mitiche con cornice colorata; colori del mana come pallini.
- La pagina di esempio è nel commit "Fase 3: pagine di prova dei due stili": per rivederla,
  `git show 826446a:src/pages/prova-stile-b.astro`.

### Ambiente (PC Windows 11 dell'utente)
- Node **24.22.1** gestito da **nvm-windows 1.2.2** (link attivo in `C:\nvm4w\nodejs`).
- Esiste ancora un vecchio link `C:\Program Files\nodejs` → Node 20: se un terminale mostra v20, usare `nvm use 24` o riaprire il terminale.
- git 2.55, GitHub CLI 2.103 (in `C:\Program Files\GitHub CLI\gh.exe`), accesso come **matteo-diegoli** (email noreply di GitHub).
- Il PC ha un vecchio proxy aziendale (Ariadne) in git globale: in **questo** repository è disattivato con `git config http.proxy ""`.
  Proxy rimosso anche da nvm, npm e WinHTTP (comandi per rimetterlo: vedi sotto).
- **Sito dal telefono:** `npx.cmd astro dev --host --background`, poi sul telefono `http://<IP del PC>:4321/lega-sealed-pavia/`
  (dalla Fase 6 il sito vive nella sottocartella dell'indirizzo: vedi "Indirizzo del sito")
  (rete Wi-Fi di casa "Privata"). L'IP **cambia** ogni tanto (era 192.168.1.90, il 2026-10-23 è diventato
  192.168.1.18): se il telefono dà `ERR_ADDRESS_UNREACHABLE`, ritrovarlo con
  `Get-NetIPAddress -InterfaceAlias Wi-Fi -AddressFamily IPv4` (non fidarsi dell'indirizzo stampato da
  `astro dev status`: è quello di quando il server è partito). Scrivere sempre `http://` a mano: con `https://`
  compare `ERR_SSL_PROTOCOL_ERROR`. Spegnere il server con `npx.cmd astro dev stop`.
- **Foto delle pagine per i controlli:** Edge senza finestra (`msedge.exe --headless=new --screenshot=… --window-size=496,700 <url>`).
  Non scende sotto i **496 px** di larghezza: con valori più piccoli la foto è ritagliata e sembra che la pagina esca dallo schermo.

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
- [x] 8 giocatori fittizi con pool realistici: `npm run genera-prova` (seme fisso, non sovrascrive senza `-- --forza`).
      Buste semplificate: 1 rara (1/8 mitica), 3 non comuni, 10 comuni, niente terre base.
      (In Fase 2 è stato rifatto per simulare tutte e 5 le serate con abbinamenti svizzeri.)

### Fase 2 – Motore della lega
- [x] Classifica "al termine della serata X", tie-breaker: `src/lib/lega/classifica.ts` (12 test, 59 in tutto),
      `npm run classifica` (attuale) o `npm run classifica -- 2` (al termine della serata 2)
- [x] Abbinamenti svizzeri con backtracking, cicli 1 e 2, bye, moltiplicatore ×2: `src/lib/lega/abbinamenti.ts`
      (15 test, tra cui 400 leghe simulate con e senza assenze; 74 test in tutto). Aiuti per i test in `src/lib/lega/prova.ts`
- [x] Busta extra all'ultimo tra i presenti + recupero delle buste per chi è stato assente: `src/lib/lega/buste.ts`
      (9 test, 83 in tutto), `npm run buste` (prossima serata) o `npm run buste -- 3`. La busta extra si decide solo
      quando la serata precedente ha tutti i risultati. Anche `genera-prova` usa questo modulo.
- [x] `npm run pair` (e `npm run pair -- --prova`)
- [x] Test automatici + dati di prova che simulano tutte e 5 le serate: `src/lib/lega/simulazione.ts` gioca la lega
      con il motore vero (abbinamenti svizzeri, buste) e risultati casuali ripetibili (seme 2026, senza rivincite).
      Assenze fittizie: Marco alla serata 2, Elena alla 4. `npm run genera-prova -- --forza` crea la lega completa;
      `npm run genera-prova -- --fino-a 3 --forza` la ferma al termine della serata 3 con il round successivo da giocare
      (utile in Fase 4 per vedere il sito a metà lega). 13 test della catena intera (95 in tutto); ai test delle
      200 leghe simulate dato un limite di 30 secondi (ne servono circa 8, il limite di Vitest era 5).

### Fase 3 – Design
- [x] 2 direzioni di stile con una pagina di esempio ciascuna → scelto **B – Arena** (vedi "Stile")
- [x] Illustrazioni SVG originali di Pavia, variabili CSS, tema scuro/chiaro:
      `src/styles/tema.css` (variabili: scuro di base, chiaro con gli stessi nomi; segue il dispositivo o il pulsante),
      `src/styles/base.css` (scheda, badge, mana, pulsanti, `.solo-lettori`, focus), `src/layouts/Base.astro`
      (noindex, barra con emblema e pulsante sole/luna ricordato in `localStorage`, piè di pagina con avviso legale),
      `src/components/SkylinePavia.astro` (Castello Visconteo, torri, San Michele, Duomo, Ponte Coperto, Ticino),
      `src/components/Emblema.astro` (carta con torre: base per l'icona dell'app in Fase 6).
      `src/pages/index.astro` è una vetrina provvisoria dello stile, da sostituire con la classifica in Fase 4.

### Fase 4 – Pagine
- [x] Home / Classifica (tabella + card su mobile, evoluzione per serata, ×2 della finale)
      — `src/pages/index.astro`, componenti `BarraRound.astro` e `Classifica.astro` (tabella da 44rem in su,
      schede sotto), `src/lib/lega/riepilogo.ts` (stato della lega, frecce ↑↓, evoluzione, punti in finale, date in
      italiano; 7 test, 102 in tutto). Nuovo colore `--testo-oro` (oro più scuro nel tema chiaro, per il contrasto).
      La classifica è la prima cosa dopo la testata (richiesta utente): i riquadri ×2, busta extra e vincitore
      stanno sotto. Evoluzione con `<details>` senza JavaScript, mostrata da 2 serate concluse in su. I nomi portano a
      `/giocatori/<id>/` (pagina ancora da fare: per ora 404).
- [x] Prossimi match (round corrente, storico richiudibile, stile speciale della finale)
      — `src/pages/match.astro` (indirizzo `/match/`), componenti `Round.astro` e `Partita.astro`,
      `src/lib/lega/match.ts` (round in corso, storico per serata dalla più recente, vincitore e risultato; 4 test, 106 in tutto).
      In cima il round abbinato ancora senza tutti i risultati (o "non ancora abbinato"); a lega finita niente
      riquadro "Lega conclusa" (basta il sottotitolo + il menu: richiesta utente). Sotto i round giocati in pannelli
      per serata (l'ultima aperta), con gli assenti. Finale: bordo dorato ed etichetta "Finale · punti ×2".
      Menu "Classifica / Match" nella barra in alto (`Base.astro`); sotto i 30rem si vede solo l'emblema.
- [x] Pagina giocatore — `src/pages/giocatori/[id].astro` (indirizzo `/giocatori/<id>/`, una per file in `data/players/`),
      `src/lib/lega/giocatore.ts` (pool unito tra le serate e diviso per colore, storico visto dal giocatore; 6 test, 112 in tutto).
      Ordine deciso dall'utente: **nome e posizione in classifica → pool → partite**. **Statistiche e andamento omessi**
      (non servono per ora). Pool: un riquadro per colore (W U B R G, multicolore, incolore), carte per valore di mana,
      copie sommate, sigla di rarità (rare con bordo oro, mitiche con il nuovo colore `--mitica`), nome che porta a Scryfall,
      carte per serata in cima. Partite dalla più recente: esito V/P/S colorato, avversario cliccabile, risultato dal punto
      di vista del giocatore, bye, assenze, finale con bordo dorato e "×2".

### Fase 5 – Pool interattivo
- [x] Filtri a tag, ordinamento, ricerca, contatore, stato nell'URL, bottom sheet su mobile
      — `src/components/Pool.astro` (markup + script senza librerie), `src/lib/pool/filtri.ts` (logica pura, 8 test,
      120 in tutto). Richieste dell'utente: **niente gruppi per colore** (un elenco unico, si capisce meglio cosa fanno
      filtri e ordinamenti), **serata di sbustata** su ogni carta ("S1 ×2 · S3"), **due viste**: lista (predefinita) e
      immagini (griglia scorrevole). La vista scelta si salva in `localStorage` (`pool-vista`); `?vista=` nell'indirizzo
      ha la precedenza. Ordine predefinito: colore → costo → nome. Niente totali per serata sotto il titolo (richiesta utente: bastano i filtri).
      Ricerca in nome, tipo e testo. Filtri: colore (W U B R G, multi, incolore), tipo, costo (0-1…6+), rarità, serata
      (con il filtro serata si contano solo le copie di quelle serate); nello stesso gruppo basta un valore, tra gruppi
      servono tutti. Stato nell'indirizzo, es. `?q=goblin&colore=R,G&serata=2&ordine=costo&vista=immagini`.
      Sotto i 44rem i filtri sono in un pannello dal basso (Esc chiude, il focus torna al pulsante "Filtri").
      Senza JavaScript: elenco completo in vista lista. Le immagini ricevono l'indirizzo (`data-src` → `src`) solo
      in vista immagini: in vista lista non si scarica nessuna immagine.
      Prove dei clic fatte con uno script temporaneo che pilota Edge (DevTools); in Fase 7 arriverà Playwright.

### Fase 6 – PWA, SEO e agenti AI
- [x] Manifest, icone, service worker, offline
      — Icone da `npm run icone` (`scripts/icone.ts` + `@resvg/resvg-js`, disegno in `src/lib/sito/emblema.ts`, lo stesso
      di `Emblema.astro`): `favicon.svg`, `icona-192/512.png`, `icona-maskable-512.png`, `apple-touch-icon.png` in `public/`,
      salvate in git (eliminata la vecchia `favicon.ico` di Astro). Manifest da `src/pages/manifest.webmanifest.ts`.
      Service worker da `src/pages/sw.js.ts`: alla prima visita salva tutte le pagine (`src/lib/sito/pagine.ts`) e i loro
      file `_astro/`; pagine prima dalla rete poi dalla copia (ignorando `?q=…`), poi `offline/`; immagini Scryfall salvate
      quando si vedono (richiesta CORS, massimo 600); versione = ora della build. Si registra **solo nel sito pubblicato**
      (non con `astro dev`) e solo su `https://` o `localhost`: dal telefono via IP di casa non parte, si proverà online
      in Fase 8. Provato su PC con Edge + `astro preview` spegnendo il server: pagine salvate, stile e pagina offline ok.
      Con `astro dev` chi apre `/` o la cartella senza `/` finale viene rimandato dentro
      (plugin in `astro.config.mjs`, solo per le pagine HTML). Colore della barra del telefono (`theme-color`) che segue anche il tema scelto a mano. 5 test nuovi (125 in tutto).
- [x] Meta, Open Graph con immagini generate, JSON-LD, robots, noindex (sitemap esclusa: vedi decisioni)
      — Testi in `src/lib/sito/anteprime.ts` (titolo, descrizione e righe dell'immagine per Home, Match e giocatori),
      disegno 1200×630 in `src/lib/sito/immagine-anteprima.ts` (emblema, skyline, righe con medaglie o pallini dei colori)
      convertito in PNG con `@resvg/resvg-js` e il carattere **Inter** salvato in `assets/font/` (licenza OFL in
      `assets/font/LICENSE.txt`; i caratteri di sistema cambiano tra PC e server). Immagini create a ogni build in
      `anteprime/classifica.png`, `anteprime/match.png`, `anteprime/giocatori/<id>.png` (circa 110 kB l'una).
      Skyline spostato in `src/lib/sito/skyline.ts` (stessa forma per sito e immagini). `Base.astro` ha le nuove proprietà
      `titoloAnteprima`, `immagine`, `jsonLd`; `meta description` = descrizione dell'anteprima.
      JSON-LD `EventSeries` con una serata per data decisa, solo nella Home (`src/lib/sito/dati-strutturati.ts`).
      `robots.txt` che lascia entrare tutti (conta solo con un dominio personale: su github.io si legge quello della radice).
      8 test nuovi (133 in tutto).
- [x] `llms.txt` e `/api/*.json`
      — Contenuti in `src/lib/sito/api.ts` (riusa classifica, match, giocatore e riepilogo: stessi numeri delle pagine),
      file da `src/pages/llms.txt.ts` e `src/pages/api/{classifica,match,giocatori}.json.ts`. Chiavi in italiano, nomi delle
      carte in inglese; in ogni JSON `versione` (1), `lega`, `aggiornato` (ora della build), `sito`; link sempre completi.
      `classifica.json`: stato della lega + righe con punti, V/P/S, game e tie-breaker in percentuale 0–100 (un decimale).
      Come la pagina, conta anche i risultati già scritti del round in corso (`dopoIlRound`).
      `match.json`: tutte le serate (data, finale, moltiplicatore, assenti) con round, partite (risultato dal punto di vista
      del primo giocatore, vincitore, esito) e bye. `giocatori.json` (circa 210 kB): posizione, partite dalla prima e
      **pool completo** (copie, serate, colori, costo, tipo, rarità, link Scryfall). `llms.txt`: regole, situazione,
      classifica in breve, link a pagine e JSON. I 4 file sono salvati anche dal service worker. 5 test nuovi (138 in tutto).

### Fase 7 – Qualità
- [x] axe (la build fallisce con errori AA) — `npm run accessibilita` = build + `scripts/accessibilita.ts`:
      avvia `astro preview` (porta 4329), apre con **Playwright** (Chromium, scaricato con `npx.cmd playwright install chromium`)
      tutte le pagine di `pagineDelSito()` in tema scuro/chiaro × telefono (390 px)/PC (1280 px); per i giocatori anche
      vista immagini e (telefono) pannello filtri aperto: 92 controlli. Regole WCAG 2.0/2.1/2.2 A e AA, messaggi di axe
      in italiano, service worker bloccato, immagini Scryfall bloccate (niente rete). Esce con errore se trova problemi.
      **Da collegare alla GitHub Action in Fase 8** (lì servirà `npx playwright install --with-deps chromium`).
      Unico problema trovato e corretto: righe delle serate saltate nella pagina giocatore con `opacity: 0.7` → contrasto
      insufficiente; ora bordo tratteggiato e sfondo trasparente, senza trasparenza del testo.
- [x] Lighthouse ≥ 90 su mobile — misurato il 2026-10-23 con `npx lighthouse@12` (telefono simulato, Chromium di
      Playwright via `CHROME_PATH`) su `astro preview`: Home, Match e giocatore → **100** velocità, accessibilità e buone
      pratiche (LCP 1,1–1,4 s, TBT ≈ 0, CLS 0, 25–46 kB). SEO 60 solo per il `noindex` voluto: va bene così.
      **Deciso dall'utente: controllo una tantum**, niente comando fisso. **Da ripetere online in Fase 8.**
- [x] Guida al test manuale con TalkBack / VoiceOver — `docs/TEST-LETTORE-SCHERMO.md`: accendere/spegnere (con le
      scorciatoie: tasti del volume su Android, triplo clic del tasto laterale su iPhone), gesti di base, lista di controlli
      per barra in alto, Home, Match, pagina giocatore e pool, ognuno con cosa si deve sentire. La pagina offline è esclusa
      (il service worker salva tutte le pagine alla prima visita: non si vede quasi mai). **Prova vera in Fase 8.**

### Fase 8 – Rilascio
- [x] Preparazione: `data/photo-from-whatsapp/` esclusa in `.gitignore`; repository **pubblico** (Pages gratuito), sito con dati fittizi
- [x] Repository su GitHub e primo push — https://github.com/matteo-diegoli/lega-sealed-pavia (pubblico, ramo `main`).
      I comandi verso GitHub (`gh`, `git push`) li lancia **l'utente** con `!` (a Claude vengono bloccati). In questa shell
      `gh` non è nel `PATH`: usare `"/c/Program Files/GitHub CLI/gh.exe"`.
- [ ] GitHub Action per build e deploy su Pages (con `npm run accessibilita`: `npx playwright install --with-deps chromium`)
- [ ] Verifica online + installazione su iPhone e Android (+ rimisurare Lighthouse sul sito online, + prova con TalkBack/VoiceOver seguendo `docs/TEST-LETTORE-SCHERMO.md`)
- [ ] (facoltativo) dominio personalizzato

### Fase 9 – Documentazione
- [ ] `GUIDA.md`: checklist di ogni serata, finale, aggiunta giocatori, pubblicazione anche da telefono, cosa fare se la build fallisce
- [ ] Come sostituire i dati fittizi con quelli veri (inclusa la serata 1 del 22/10).
      Ricordarsi: in `data/league.yml` date e assenti delle serate 2–5 sono **fittizi** (segnati con `# FITTIZIA`):
      con i dati veri rimettere `data: null` e `assenti: []` e cancellare i file fittizi in `data/players/` e `data/rounds/`.

---

## Appendice: rimettere il proxy aziendale (solo se si torna nella rete Ariadne)

```powershell
nvm proxy http://proxy.ariadne.it:3128
npm config set proxy http://proxy.ariadne.it:3128; npm config set https-proxy http://proxy.ariadne.it:3128
netsh winhttp set proxy proxy-laptop.ariadne.it:3128 "<local>"   # come amministratore
```
