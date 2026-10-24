# Guida alla gestione della lega

Tutto quello che serve per far andare avanti la lega, serata dopo serata.
Il sito si aggiorna **da solo** circa 3 minuti dopo ogni modifica mandata su GitHub.

- Sito: https://matteo-diegoli.github.io/lega-sealed-pavia/
- Repository: https://github.com/matteo-diegoli/lega-sealed-pavia

---

## Prima di cominciare: il terminale

I comandi `npm.cmd …` e `git …` si scrivono in **PowerShell**, dentro la cartella del progetto:

```powershell
cd D:\lega-sealed-pavia
node --version      # deve rispondere v24.x
```

Se risponde `v20…`, scrivi `nvm use 24` (oppure chiudi e riapri il terminale).
Usa sempre `npm.cmd` e non `npm`: su questo PC `npm` può dare un errore di "execution policy".

### I file dei dati

| File | Cosa contiene |
|---|---|
| `data/league.yml` | Date e assenti di ogni serata |
| `data/players/<id>.yml` | Nome e pool di un giocatore (es. `data/players/matteo.yml`) |
| `data/rounds/serata-X-round-Y.yml` | Abbinamenti e risultati di un round |

Gli **identificativi** dei giocatori sono: `matteo`, `simone`, `massimo`, `salvatore`, `riccardo`,
`claudio`, `iacopo`, `diego`.

---

## 1. Prima della serata

1. Apri `data/league.yml` e scrivi la **data** della serata e gli eventuali **assenti**:

   ```yaml
     - numero: 2
       data: 2026-10-29
       assenti: [diego]        # nessun assente: assenti: []
   ```

   Le date vanno in ordine e nel formato `AAAA-MM-GG`. Le serate non ancora decise restano `data: null`.

2. Controlla quante buste dare a ognuno:

   ```powershell
   npm.cmd run buste
   ```

   Mostra le buste della prossima serata: 1 a testa, più la **busta extra** all'ultimo in classifica
   e le buste da recuperare per chi è stato assente. Per una serata precisa: `npm.cmd run buste -- 3`.

> Gli assenti si possono aggiungere anche all'ultimo momento, purché **prima** di creare gli abbinamenti.

---

## 2. Durante la serata

### Abbinamenti del round

```powershell
npm.cmd run pair -- --prova     # mostra soltanto gli abbinamenti, senza scrivere niente
npm.cmd run pair                # crea il file del round
```

`npm.cmd run pair` capisce da solo qual è il prossimo round, stampa i tavoli e crea
`data/rounds/serata-X-round-Y.yml` con `risultato: null` per ogni partita. Si rifiuta se:

- mancano dei risultati del round precedente;
- la serata non ha ancora la data in `data/league.yml`;
- il file del round esiste già (non sovrascrive mai niente: se vuoi rifarlo, cancellalo e rilancia).

Se vedi **⚠️ Attenzione**, le assenze hanno reso inevitabile una rivincita: è già stata scelta la meno grave.

### Risultati

A fine partite apri il file del round e sostituisci `null` con il risultato:

```yaml
partite:
  - giocatori: [matteo, riccardo]
    risultato: 2-1        # 2 game per matteo, 1 per riccardo
  - giocatori: [massimo, claudio]
    risultato: 0-2        # ha vinto claudio
  - giocatori: [simone, iacopo]
    risultato: 1-1-1      # pareggio: 1 game a testa e 1 pareggiato
bye: null
```

Il risultato si legge **dal punto di vista del primo giocatore** della riga. Il bye lo assegna
`pair` da solo e conta come vittoria 2-0.

### Secondo round

Quando tutti i risultati del primo round sono scritti, rilancia `npm.cmd run pair` per il round 2.

> **I pool non servono durante la serata.** Abbinamenti, buste e classifica non li usano:
> si inseriscono quando si ha tempo (vedi il punto 5).

---

## 3. Pubblicare dal PC

```powershell
npm.cmd run controlla                       # controlla i dati e spiega cosa correggere
git add -A                                  # prepara tutti i file modificati
git commit -m "Serata 2: risultati del round 1"
git push                                    # manda su GitHub: parte la pubblicazione
```

`npm.cmd run controlla` deve rispondere **✅ Dati a posto**. Le righe **⚠️ Pool della serata …
ancora da inserire** sono solo un promemoria e non bloccano niente.

Puoi pubblicare tutte le volte che vuoi: anche dopo ogni round, così gli altri vedono i risultati in diretta.

**Controllare la pubblicazione:** sul repository apri la scheda **Actions**. In cima c'è l'ultima
pubblicazione: pallino giallo = in corso, ✓ verde = sito aggiornato, ✗ rossa = fallita (vedi il punto 8).
Dal terminale: `& "C:\Program Files\GitHub CLI\gh.exe" run list -R matteo-diegoli/lega-sealed-pavia`.

> Nell'app installata sul telefono, la prima apertura può mostrare ancora la versione vecchia:
> chiudi e riapri l'app.

---

## 4. Pubblicare dal telefono

Senza PC si possono **scrivere risultati, date, assenti e pool**, modificando i file sul sito di GitHub:

1. Apri https://github.com/matteo-diegoli/lega-sealed-pavia (con l'accesso fatto).
2. Entra nella cartella `data`, poi nel file da cambiare (es. `rounds` → `serata-2-round-1.yml`).
3. Tocca la **matita** (✏️ "Edit this file"). Se non la vedi, attiva la "Versione desktop" del browser.
4. Modifica, poi tocca **Commit changes…** e di nuovo **Commit changes**.

La pubblicazione parte da sola. Se un dato è sbagliato fallisce e il sito resta quello di prima:
nella scheda **Actions** si legge il motivo (vedi il punto 8).

> **Gli abbinamenti dal telefono non si possono calcolare** (`npm.cmd run pair` gira solo sul PC).
> In emergenza si può creare il file del round a mano con **Add file → Create new file**, nome
> `data/rounds/serata-X-round-Y.yml`, copiando la forma di un round esistente: il controllo verifica
> che tutti i presenti siano abbinati, ma **non** che gli abbinamenti siano quelli svizzeri giusti.

---

## 5. Inserire i pool (anche giorni dopo)

Nel file del giocatore aggiungi una sezione per la serata, sotto quelle che ci sono già:

```yaml
nome: Diego Bolis
pool:
  serata-1:
    - 2 Konstrari Charm
    - Academic Ascent
  serata-2:
    - Sphinx's Approach
    - 2 Unsummon
```

- Nomi delle carte **in inglese**, come su Scryfall. Maiuscole e accenti non contano.
- Il numero davanti solo per le copie multiple. Le **terre base** non si scrivono.
- Per le carte doppie basta il nome della prima faccia (es. `Blossom-Blessed Angel`).
- Se il nome contiene `:`, mettilo tra virgolette: `- "Nome: con due punti"`.

Poi `npm.cmd run controlla`. Se una carta è scritta male risponde, ad esempio:
*la carta "Apex Wishstalker" non esiste. Forse intendevi "Apex Witchstalker"?*

**Carte di altri set** (es. le *Special Guests* che escono nelle buste): il controllo le segnala come
inesistenti. Lancia `npm.cmd run scryfall` (serve Internet): le cerca su tutta Scryfall e le aggiunge
a `data/scryfall/carte.json`, che va pubblicato insieme al resto.

Si può inserire un giocatore alla volta, pubblicando ogni volta o tutti insieme alla fine.
Finché mancano dei pool, `controlla` stampa il promemoria **⚠️ Pool della serata X ancora da inserire: …**
(gli assenti sono esclusi: quella sera non hanno aperto buste).

---

## 6. La finale (serata 5)

Non c'è niente di diverso da fare: `npm.cmd run pair` lo sa da solo e stampa **🏆 FINALE: punti ×2**.
I round 9 e 10 valgono doppio in classifica (ma non nei tie-breaker) e sul sito hanno il bordo dorato.
Quando sono scritti tutti i risultati del round 10, il sito mostra il vincitore.

Chi è assente alla finale non recupera buste (non ci sono serate dopo).

---

## 7. Aggiungere un giocatore

1. Scegli un identificativo corto, minuscolo, senza spazi né accenti (es. `luca`).
2. Crea `data/players/luca.yml`:

   ```yaml
   nome: Luca Rossi
   pool:
   ```

3. Se la lega è già iniziata, aggiungilo agli **assenti di tutte le serate già giocate** in
   `data/league.yml` (altrimenti il controllo dice che non compare nei round passati).
   Come ogni assente, alla prima serata riceverà tutte le buste perse (`npm.cmd run buste` le conta).
4. Il giocatore va aggiunto **prima** di creare gli abbinamenti della sua prima serata.

Con un numero dispari di giocatori, a ogni round uno riceve il **bye**.

---

## 8. Se la pubblicazione fallisce

Il sito online **resta quello di prima**: niente si rompe. GitHub manda anche un'email.

1. Apri la scheda **Actions**, tocca la pubblicazione con la ✗ rossa, poi il riquadro
   **Test, accessibilità e build**: il passo fallito ha la ✗ e spiega il motivo in italiano.
2. Correggi, poi pubblica di nuovo (punto 3 o 4).

| Messaggio | Cosa fare |
|---|---|
| `❌ … la carta "X" non esiste. Forse intendevi "Y"?` | Correggi il nome nel pool. Se è una carta di un altro set: `npm.cmd run scryfall` |
| `risultato "…" non valido` | Scrivi `2-0`, `2-1`, `0-2`, `1-2`, `1-1-1`… (al massimo 2 vittorie a testa) |
| `"x" non è un giocatore` | Identificativo scritto male: controlla il nome del file in `data/players/` |
| `"x" non compare nel round` | Manca nella lista delle partite: abbinalo o aggiungilo agli assenti |
| `manca il round precedente` / round fuori ordine | I file dei round vanno in sequenza, senza buchi |
| Errore YAML (rientri, `:`…) | Controlla gli spazi all'inizio delle righe (spazi, non tab) e le virgolette |
| `problema di accessibilità` | Un colore o un elemento del sito non è leggibile in qualche situazione nuova: è un problema del **sito**, non dei dati |
| Test falliti (`npm test`) | Problema del **codice**, non dei dati |

Per gli ultimi due casi (e per qualunque dubbio) conviene farsi aiutare da Claude:
apri il progetto e incolla il messaggio di errore.

Per riprodurre sul PC esattamente i controlli di GitHub:

```powershell
npm.cmd test                    # test automatici
npm.cmd run accessibilita       # build + controllo di accessibilità (qualche minuto)
```

---

## Riepilogo dei comandi

| Comando | Cosa fa |
|---|---|
| `npm.cmd run controlla` | Controlla tutti i dati (parte da solo anche nella build) |
| `npm.cmd run buste` | Buste della prossima serata (`-- 3` per la serata 3) |
| `npm.cmd run pair` | Crea il prossimo round (`-- --prova` per vederlo senza crearlo) |
| `npm.cmd run classifica` | Classifica attuale nel terminale (`-- 2` al termine della serata 2) |
| `npm.cmd run scryfall` | Aggiorna le carte da Scryfall, comprese quelle di altri set nei pool |
| `npx.cmd astro dev --background` | Sito sul PC: http://localhost:4321/lega-sealed-pavia/ (`npx.cmd astro dev stop` per spegnerlo) |
