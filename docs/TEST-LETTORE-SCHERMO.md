# Prova del sito con il lettore di schermo (TalkBack e VoiceOver)

Il lettore di schermo legge ad alta voce quello che c'è sulla pagina: lo usano le persone cieche o ipovedenti.
Il controllo automatico (`npm.cmd run accessibilita`) trova molti errori, ma non tutti: questa prova a mano
serve a sentire se il sito **si capisce davvero** ascoltandolo.

Quando farla: dopo la pubblicazione (Fase 8) e ogni volta che si cambia molto l'aspetto di una pagina.
Ci vogliono circa 20 minuti per telefono. Indirizzo: <https://matteo-diegoli.github.io/lega-sealed-pavia/>

> **Prima di iniziare:** con il lettore acceso il telefono si usa in modo diverso (vedi i gesti sotto).
> Leggi prima come **spegnerlo**, così non resti bloccato.

---

## Android: TalkBack

### Accendere e spegnere
1. **Impostazioni → Accessibilità → TalkBack** → attiva l'interruttore → conferma.
2. Scorciatoia comoda (consigliata): nella stessa schermata attiva **Scorciatoia TalkBack**.
   Da quel momento si accende e spegne **tenendo premuti insieme i due tasti del volume per 3 secondi**.
3. Per spegnerlo senza scorciatoia: torna nella stessa voce, **tocca una volta** l'interruttore (lo legge),
   poi **tocca due volte** per spegnerlo.

### Gesti di base
| Gesto | Cosa fa |
|---|---|
| Tocco singolo | Legge l'elemento sotto il dito (senza attivarlo) |
| **Doppio tocco** (ovunque) | Attiva l'elemento appena letto (link, pulsante, casella) |
| Scorri a destra / a sinistra con un dito | Elemento successivo / precedente |
| Scorri con **due dita** | Scorre la pagina |
| Scorri in alto poi in basso con un dito (o viceversa) | Cambia il modo di spostarsi: **Titoli**, Link, Controlli… |
| Scorri in basso poi a sinistra (a "L") | Indietro |

Per saltare da un titolo all'altro: scegli **Titoli** con il gesto su-giù, poi scorri a destra.

---

## iPhone: VoiceOver

### Accendere e spegnere
1. **Impostazioni → Accessibilità → VoiceOver** → attiva l'interruttore.
2. Scorciatoia comoda (consigliata): **Impostazioni → Accessibilità → Abbreviazione accessibilità** → scegli **VoiceOver**.
   Da quel momento si accende e spegne **premendo 3 volte di seguito il tasto laterale** (o il tasto Home).
3. Si può anche chiedere a Siri: "Spegni VoiceOver".

### Gesti di base
| Gesto | Cosa fa |
|---|---|
| Tocco singolo | Legge l'elemento sotto il dito |
| **Doppio tocco** (ovunque) | Attiva l'elemento appena letto |
| Scorri a destra / a sinistra con un dito | Elemento successivo / precedente |
| Scorri con **tre dita** | Scorre la pagina |
| Ruota due dita sullo schermo (come una manopola) | **Rotore**: scegli **Titoli**, Link, Controlli modulo… |
| Scorri in basso / in alto con un dito (dopo il rotore) | Titolo (o link…) successivo / precedente |
| Tocco con **due dita** | Ferma / riprende la lettura |

---

## Cosa controllare

Per ogni punto: fai l'azione e confronta con quello che **dovresti sentire**. Le parole esatte cambiano un po'
tra Android e iPhone (es. "pulsante" o "bottone", "intestazione" o "titolo"): conta che il senso sia quello.
Segna ✅ o ❌; per ogni ❌ annota pagina, cosa hai fatto e cosa hai sentito.

### 1. Su ogni pagina (barra in alto)
- [ ] Il primo elemento è il link **"Vai al contenuto"**: con doppio tocco la lettura salta al contenuto della pagina.
- [ ] Il menu viene letto come **"Pagine del sito"**, con i link "Classifica" e "Match"; quello della pagina in cui sei
      viene annunciato come **pagina attuale**.
- [ ] Il pulsante del tema dice **"Cambia tema: chiaro o scuro, pulsante"**. Doppio tocco → i colori cambiano.
- [ ] Spostandoti per **Titoli** trovi un solo titolo principale (il nome della pagina) e poi le sezioni.

### 2. Home (classifica)
- [ ] La barra dei round viene letta come frase, es. **"Round giocati: 4 di 10, round 5 in corso. Gli ultimi 2 sono la finale."**
- [ ] Titoli che si incontrano: nome della lega → "Classifica" → (più sotto) "Serata per serata".
- [ ] Ogni giocatore in classifica si capisce da solo: **posizione, nome, punti**; se è in parità si sente
      **"pari merito"**; se è salito o sceso si sente di quante posizioni (non solo "freccia").
- [ ] Il nome del giocatore è un **link**: doppio tocco → apre la sua pagina.
- [ ] **"Come si legge la classifica"** viene annunciato come elemento che si apre/chiude (compresso/espanso):
      doppio tocco → si apre e si sente la spiegazione.
- [ ] In "Serata per serata" ogni serata si apre e si chiude allo stesso modo.

### 3. Match
- [ ] Titoli: "Match" → "Adesso" → "Round giocati".
- [ ] Una partita si capisce ascoltandola: **tavolo, i due giocatori, il risultato e chi vince**
      (es. "Tavolo 2, Anna Bianchi (vince) 2-1 Bruno Ferrari"); se non è ancora giocata si sente **"da giocare"**,
      se è finita in parità **"pareggio"**.
- [ ] Il bye si capisce: si sente **"Bye:"** con il nome del giocatore (link) e la spiegazione di quanto vale.
- [ ] Le serate in "Round giocati" si aprono e chiudono (compresso/espanso); si sentono gli assenti.
- [ ] I round della finale si riconoscono (si sente "Finale" e "punti ×2").

### 4. Pagina giocatore — parte alta e partite
- [ ] Titoli: nome del giocatore → "Pool" → "Partite".
- [ ] Si sente la **posizione in classifica**.
- [ ] Ogni partita in "Partite": **round e serata, esito a parole** (vittoria / sconfitta / pareggio / assente),
      avversario (link) e risultato. Le lettere V, P, S colorate **non** devono essere lette da sole.

### 5. Pagina giocatore — pool
- [ ] Il campo di ricerca si chiama **"Cerca nel pool"**. Doppio tocco → compare la tastiera; scrivi per esempio
      "goblin" → poco dopo si sente il nuovo numero, es. **"3 carte"** (senza dover cercare il contatore).
- [ ] **Filtri** viene letto come pulsante **compresso**. Doppio tocco → si apre il pannello e si sente "espanso".
- [ ] Nel pannello ogni gruppo ha un nome (Colore, Tipo, Costo, Rarità, Serata) e ogni scelta è una **casella**
      con il suo nome (es. "Rosso, casella, non selezionata"). Doppio tocco → "selezionata" e il numero di carte cambia.
- [ ] "Chiudi i filtri" e "Mostra le carte" chiudono il pannello; la lettura torna sul pulsante **Filtri**.
- [ ] "Ordina" è un elenco a scelta: doppio tocco → si scelgono le voci.
- [ ] **Lista** e **Immagini** sono pulsanti; quello attivo viene annunciato come **selezionato/premuto**.
      Doppio tocco su "Immagini" → la vista cambia e il nuovo stato viene letto.
- [ ] Ogni carta si capisce: **numero di copie, nome** (link a Scryfall), **serate di sbustata**
      (es. "sbustata alla serata 1 e alla serata 3") e **rarità a parole** (es. "rara"), non solo la sigla.
- [ ] Nella vista Immagini le figure **non** vengono lette una per una con nomi di file: si sente il nome della carta.
- [ ] Con un filtro attivo compare **"Azzera filtri"**: doppio tocco → tornano tutte le carte e si sente il totale.

---

## Se qualcosa non va
Annota per ogni ❌: telefono (Android o iPhone), pagina, cosa hai fatto, cosa hai sentito, cosa ti aspettavi.
Poi riapri il lavoro con Claude incollando le note: si corregge e si rilancia `npm.cmd run accessibilita`.
