# Istruzioni per Claude

**All'inizio di ogni sessione leggi `PIANO.md`**: contiene la scaletta, le decisioni prese e la sezione
"Dove siamo". Riparti dalla "Prossima azione" indicata lì.

## Come lavorare con l'utente
- L'utente non è esperto di strumenti di sviluppo: guidalo **passo per passo**, in italiano.
- Per ogni comando, spiega in una riga cosa fa e cosa ci si deve aspettare.
- Dopo ogni step **fermati e chiedi conferma** prima di proseguire.
- Prima di scrivere codice proponi un piano breve e aspetta l'ok.
- Commenti nel codice e documentazione **in italiano**.
- Commit git alla fine di ogni fase, con messaggi chiari in italiano.
- **Alla fine di ogni step aggiorna `PIANO.md`** (caselle, "Dove siamo", nuove decisioni).

## Note tecniche
- Windows 11, PowerShell. Node 24 via nvm-windows in `C:\nvm4w\nodejs`: se una shell vede Node 20,
  anteponi quella cartella al `PATH`.
- Usa `npm.cmd` se `npm` dà errori di execution policy.
- In questo repository `http.proxy` è vuoto di proposito (il proxy globale aziendale non è raggiungibile).

@AGENTS.md
