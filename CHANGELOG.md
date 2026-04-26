# Changelog

Tutte le modifiche rilevanti al progetto KW Cashflow.

Formato basato su [Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/).
Versionamento: [Semantic Versioning](https://semver.org/lang/it/).

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
