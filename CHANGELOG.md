# Changelog

Tutte le modifiche rilevanti al progetto KW Cashflow.

Formato basato su [Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/).
Versionamento: [Semantic Versioning](https://semver.org/lang/it/).

---

## [2.3.41] - 2026-04-28

### Modificato
- feat(movimenti): 3 box aggregati collassati di default (totale visibile, click per espandere)

---

## [2.3.40] - 2026-04-28

### Modificato
- feat(movimenti): icona matita su data PDR + 'Segna pagata' usa data rata (anticipi)

---

## [2.3.39] - 2026-04-28

### Modificato
- fix(movimenti): evita doppio conteggio rate PDR pagate e scadute nel saldo running

---

## [2.3.38] - 2026-04-28

### Modificato
- fix(movimenti): saldo iniziale coerente fra mesi (previsti residui) + sticky header + scroll a oggi + box disavanzo

---

## [2.3.37] - 2026-04-28

### Modificato
- feat(split): 1 riga totale 'Bonifico soci+IVA' + spaccato espandibile

---

## [2.3.36] - 2026-04-28

### Modificato
- feat(split): 1 riga totale 'Bonifico soci+IVA' che incide sul saldo + spaccato espandibile

---

## [2.3.35] - 2026-04-28

### Modificato
- feat(movimenti): match suggerito previsto durante inserimento (modalità B)

---

## [2.3.34] - 2026-04-28

### Modificato
- feat(movimenti): 3 box aggregati Excel-style nell'header (Ingressi/Uscite per centro + Valori split)

---

## [2.3.33] - 2026-04-28

### Modificato
- feat(movimenti): data rate PDR cliccabile per modifica scadenza (anticipi)

---

## [2.3.32] - 2026-04-28

### Modificato
- feat(movimenti): split escluso dal saldo + indentato come breakdown + auto-scadenza per data futura

---

## [2.3.31] - 2026-04-28

### Modificato
- feat(movimenti): elimina riga transaction + annulla split + salta previsto per mese

---

## [2.3.30] - 2026-04-28

### Modificato
- feat(split): righe split IVA/Alessio/Daniela ora con descrizione contestuale + contatto + centro auto

---

## [2.3.29] - 2026-04-28

### Modificato
- feat(movimenti): passo 4b - Conferma previsto (dialog) + Segna pagata rate PDR

---

## [2.3.28] - 2026-04-28

### Modificato
- feat(movimenti): bottone Split su incasso genera 3 righe (IVA/Alessio/Daniela)

---

## [2.3.27] - 2026-04-28

### Modificato
- feat(movimenti): editing inline celle delle transactions + colonna Contatto in tabella

---

## [2.3.26] - 2026-04-28

### Modificato
- feat(riconcilia): bottone 'Aggiorna match' per ricalcolare suggerimenti senza ricaricare la pagina

---

## [2.3.25] - 2026-04-28

### Modificato
- feat(riconcilia): contatto autocomplete + quick-add + Ignora persistente (isIgnored)

---

## [2.3.24] - 2026-04-28

### Modificato
- feat(riconcilia): pagina auto-match per associare contatto/centro a transazioni storiche

---

## [2.3.23] - 2026-04-27

### Modificato
- feat(movimenti): riga inserimento inline Excel-style con quick-add anagrafica/centri

---

## [2.3.22] - 2026-04-27

### Modificato
- feat(transactions): aggiungo contactId (FK contacts) per anagrafica nei movimenti

---

## [2.3.21] - 2026-04-27

### Modificato
- fix(movimenti): escludi rate dei piani sospesi dal ledger

---

## [2.3.20] - 2026-04-26

### Modificato
- movimenti: nascondi previsti con data < oggi (mostra solo realtà per il passato)

---

## [2.3.19] - 2026-04-26

### Modificato
- fase 1.5.A.1: scheda cliente da Piano Annuale, sezione 'Da chiarire' con bottone Saltato

---

## [2.3.18] - 2026-04-26

### Modificato
- fase 1.5.A: pagina /movimenti — ledger mensile sola lettura con saldo running

---

## [2.3.17] - 2026-04-26

### Modificato
- passo 2: celle Excel-style editabili nelle viste mensili (override per mese, schema + API + UI)

---

## [2.3.16] - 2026-04-26

### Modificato
- anagrafica clienti: campo centro di ricavo + auto-fill su nuovo incasso (datalist + match)

---

## [2.3.15] - 2026-04-26

### Modificato
- passo 1: rimossa vista Lista da Piano Annuale (resta solo Mensile)

---

## [2.3.14] - 2026-04-26

### Modificato
- passo 3c: rimuovo sezioni Centri di Costo/Ricavo da /settings (gestione solo nelle pagine dedicate)

---

## [2.3.13] - 2026-04-26

### Modificato
- passo 3b: pagina dedicata /centri-ricavo + sidebar

---

## [2.3.12] - 2026-04-26

### Modificato
- passo 3a: pagina dedicata /centri-costo + sezione CONFIGURAZIONE in sidebar

---

## [2.3.11] - 2026-04-26

### Modificato
- cleanup: rimuovo /sottoscrizioni dalla sidebar (resta come URL per backend)

---

## [2.3.10] - 2026-04-26

### Modificato
- fase 1.4: Marketing → 'Campagna Marketing' come default migrazione + bottone pulisci/re-importa sottoscrizioni

---

## [2.3.9] - 2026-04-26

### Modificato
- fase 1.4: aggiunto servizio 'Campagna Marketing' (contenitore generico per prezzi non standard)

---

## [2.3.8] - 2026-04-26

### Modificato
- fase 1.4: sottoscrizioni cliente x servizio + generator occorrenze + migrazione expected_incomes

---

## [2.3.7] - 2026-04-26

### Modificato
- fase 1.3: catalogo marketing 8 pacchetti + assistenza 4 tier + Elementor + Privacy + etichette IVA

---

## [2.3.6] - 2026-04-26

### Modificato
- fase 1.3: catalogo servizi + sidebar + seed iniziale (Marketing/MSD/Sito Web/Dominio/Assistenza)

---

## [2.3.5] - 2026-04-26

### Modificato
- fase 1.2: tabella anagrafica ordinabile + 6 centri di costo (Formazione, Attrezzature, Affitto, Commissioni, Viaggi, Privacy)

---

## [2.3.4] - 2026-04-26

### Modificato
- fase 1.2: bottone rapido sposta fornitore ↔ ex fornitore

---

## [2.3.3] - 2026-04-26

### Modificato
- fase 1.2 fix: import fornitori spese mensili + accorpa FIN→Qonto + bottone pulisci/re-importa

---

## [2.3.2] - 2026-04-26

### Modificato
- fase 1.2: anagrafica unica clienti/fornitori + import esistenti

---

## [2.3.1] - 2026-04-26

### Modificato
- fase 1.1: percentuali soci/IVA configurabili da Impostazioni

---

## [2.3.0] - 2026-03-17

### Aggiunto
- Suite di test automatizzati con Vitest (85 test)
- Test per: currency, splits, dates, business logic, CSV parser
- File `src/lib/utils/business.ts` con logica pura estratta dalle API routes
- Script `npm test`, `npm run test:watch`, `npm run test:coverage`
- Configurazione `vitest.config.ts`

### Modificato
- Aggiornato CLAUDE.md con sezione Test e struttura file aggiornata

---

## [2.2.1] - 2026-03-12

### Modificato
- feat: crea automaticamente voci forecast per transazioni senza match durante import CSV

---

## [2.2.0] - 2026-03-10

### Modificato
- aggiunto import CSV Qonto con riconciliazione previsionale e fix doppio conteggio dashboard

---

## [2.1.1] - 2026-02-23

### Modificato
- feat: migliorie UI/UX, documentazione, deploy script avanzato

---

## [2.1.0] - 2026-02-08

### Aggiunto
- Dashboard CEO con metriche chiave (cassa, runway, sostenibilita')
- Obiettivo vendite trimestrale con progress bar
- Sezione azioni richieste (rate scadute, fatture da emettere, incassi in ritardo)
- Riepilogo Piani di Rientro con progresso
- Trend ultimi 3 mesi
- Quick links navigazione rapida
- FAB Quick Entry per inserimento rapido transazioni
- Script deploy.sh con versioning automatico
- Navigazione mobile (bottom nav)
- Pagina guida con indice sezioni
- Autenticazione con 2FA (OTP)
- Design System Karalisweb (DESIGN-SYSTEM.md)

### Modificato
- Dashboard completamente ridisegnata in stile CEO
- Layout responsive desktop/mobile

---

## [2.0.0] - 2026-01-11

### Aggiunto
- Migrazione a Next.js 16 (App Router)
- Piano Commerciale con gestione opportunita'
- Piani di Rientro (PDR) con rate e progresso
- Previsionale con entrate/uscite future
- Consuntivo con import movimenti
- Piano Annuale (centri costo/ricavo)
- Sistema di split incassi (IVA 22%, soci 30%, disponibile 48%)
- Autenticazione sessione con iron-session

---
