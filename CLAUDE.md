# App Cashflow Decisionale - Karalisweb Finance

## Obiettivo

App per decisioni rapide sul cashflow aziendale. Non contabilità, ma strumento decisionale.

**3 problemi da risolvere:**
1. Quanto devo vendere? (per coprire costi + pagare debiti)
2. Quali costi posso tagliare? (per migliorare il margine)
3. Come pago i debiti (PDR)? (piano sostenibile)

---

## Stack Tecnico

- **Frontend**: Next.js 14 (App Router) + React + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Database**: SQLite (locale, via better-sqlite3 + Drizzle ORM)
- **Deploy futuro**: Server Contabo (185.192.97.108) con PostgreSQL
- **Autenticazione**: Login semplice (username/password) - da implementare

---

## Struttura Dati Esistente

Il progetto usa già:
- `transactions` - movimenti reali importati da Qonto CSV
- `budgetItems` - voci previsionali (entrate/uscite)
- `costCenters` - centri di costo con budget annuale
- `revenueCenters` - centri di ricavo con target
- `paymentPlans` + `paymentPlanInstallments` - debiti PDR con rate
- `incomeSplits` - ripartizioni incassi (IVA 22%, soci 30%, disponibile 48%)

---

## I 3 Momenti di Utilizzo

| Frequenza | Azione | Tempo target |
|-----------|--------|--------------|
| **Giornaliero** | Registro incasso/spesa quando avviene | 30 secondi |
| **Settimanale** | Verifico se le previsioni sono rispettate | 5 minuti |
| **Mensile** | Analisi vendite, aggiusto target fatturato | 15 minuti |

---

## Dashboard Principale (da implementare)

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  CASHFLOW                              [30g] [90g] [180g]  👤   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⚠️ STATO: DIFESA | STABILIZZAZIONE | RICOSTRUZIONE            │
│  (colori: Rosso / Giallo / Verde)                               │
│                                                                 │
│  ████████████░░░░░░░░░░░░░░░░  X giorni rimasti                │
│  OGGI                          DIFFICOLTÀ                       │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  X GIORNI   │ │  € -X.XXX   │ │  € X.XXX    │               │
│  │  prima      │ │  saldo fine │ │  devi       │               │
│  │  difficoltà │ │  mese       │ │  fatturare  │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                 │
│  PROSSIME SCADENZE (7gg)                                        │
│  🔴 15 Gen  Server       €486    VITALE                        │
│  🟡 15 Gen  Rata VW      €343    PDR                           │
│  ...                                                            │
│                                                                 │
│  [+ INCASSO]  [- SPESA]  [✏️ MODIFICA]  [📊 ANALISI]           │
│                                                                 │
│  [Check Settimanale] [Check Mensile] [Debiti PDR]              │
└─────────────────────────────────────────────────────────────────┘
```

### I 3 Numeri Chiave

1. **Giorni alla difficoltà**: primo giorno in cui cassa < scadenza da pagare
2. **Saldo previsto fine periodo**: proiezione basata su incassi certi - uscite
3. **Target fatturato**: numero unico che include costi + rate debiti + eventuale buffer

### Stati Azienda (calcolati automaticamente)

- **DIFESA** (rosso): giorni alla difficoltà < 30
- **STABILIZZAZIONE** (giallo): riesco a pagare ma senza margine
- **RICOSTRUZIONE** (verde): ho buffer, posso investire

---

## Flusso Input Incassi/Spese

### Scenario A: Evento PREVISTO

Scadenza già in lista → click → form precompilato → conferma

```
CONFERMA INCASSO
Cliente:     Colombo Palace (precompilato)
Previsto:    € 317,20
Effettivo:   [€ 317,20] (modificabile)
Data:        [12/01/2026]

CALCOLO AUTOMATICO:
Lordo:       € 317,20
- IVA 22%:   €  69,78
- Soci 30%:  €  95,16
= Disponibile: € 152,26

[ANNULLA] [CONFERMA]
```

### Scenario B: Evento NON PREVISTO

Click [+ INCASSO] o [- SPESA] → form vuoto

```
NUOVO INCASSO
Cliente:    [🔍 Cerca o crea nuovo...]
Importo:    [€ ___]
Data:       [oggi]
Tipo:       ○ Una tantum  ○ Ricorrente

(stesso calcolo automatico split)

[ANNULLA] [REGISTRA]
```

### Modifica Previsione

Per spostare date, modificare importi, cambiare affidabilità incassi.

---

## Check Settimanale (da implementare)

- Confronto incassi previsti vs ricevuti
- Confronto uscite previste vs pagate
- Mini-grafico andamento cassa prossimi 30 giorni
- Alert se qualcosa è saltato con azione rapida (sposta/segna incerto)

---

## Check Mensile (da implementare)

- Riepilogo mese: previsto vs reale
- **Target fatturato prossimo mese** = costi + rate PDR + recupero deficit + buffer
- Analisi costi: quali tagliare (software poco usati, ecc.)
- Pipeline: incassi probabili già in lista

---

## Gestione Debiti PDR

- Lista debiti con rate già concordate (inserite manualmente)
- Per debiti senza piano: app suggerisce rate sostenibili
- Progresso: % completamento, mesi rimanenti
- Priorità: prima debiti piccoli (effetto snowball)

---

## Regole di Business

### Split Incassi
```
Incasso lordo
- 22% IVA (da versare allo Stato)
- 30% quota soci (non disponibile per spese)
= 48% disponibile per cassa
```

### Affidabilità Incassi
- **Alta**: conta 100% nelle proiezioni
- **Media**: conta solo dopo aver sommato tutti gli "alta"
- **Bassa**: conta ZERO (approccio pessimista)

### Priorità Pagamenti (quando non bastano i soldi)
1. Spese VITALI (server, strumenti essenziali)
2. Importi più grossi
3. Conseguenze legali (tasse)
4. Rapporti umani (fornitori storici)

### Giorno di Difficoltà
Primo giorno in cui: `cassa disponibile < importo scadenza`

---

## Categorizzazione Movimenti Qonto

Regole automatiche basate su controparte:

| Controparte | Categoria | Note |
|-------------|-----------|------|
| Qonto (552€/-552€) | Rate anticipo fatture | Debito, non giroconto |
| Alessio Loi | Quota socio + IVA | Uscita collegata a incassi |
| Server Plan | Server | Costo fisso |
| Apple, Asana, etc. | Software | Costi fissi |
| Wind, MyCentralino | Telefonia | Costi fissi |
| FastRent | Ufficio | Costo fisso |

---

## File Progetto

```
karalisweb-finance/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Dashboard (da ristrutturare)
│   │   ├── budget/           # Previsionale
│   │   ├── transactions/     # Movimenti Qonto
│   │   ├── payment-plans/    # PDR
│   │   ├── settings/         # Centri costo/ricavo
│   │   └── api/              # API routes
│   ├── components/
│   │   ├── dashboard/        # Componenti dashboard
│   │   ├── transactions/     # Import/lista movimenti
│   │   └── ui/               # shadcn components
│   ├── lib/
│   │   ├── db/               # Schema + connessione
│   │   └── utils/            # Helpers (currency, dates, splits)
│   └── types/                # TypeScript types
├── data/                     # SQLite database
└── drizzle/                  # Migrations
```

---

## Prossimi Step Sviluppo

1. ✅ Definito layout dashboard con mockup
2. 🔄 Aggiornare CLAUDE.md (questo file)
3. ⬜ Ristrutturare dashboard con 3 numeri chiave
4. ⬜ Implementare calcolo "giorni alla difficoltà"
5. ⬜ Implementare flusso input previsto/non previsto
6. ⬜ Aggiungere check settimanale con grafico
7. ⬜ Aggiungere check mensile con target
8. ⬜ Migliorare PDR con suggerimenti rate

---

## Metriche di Successo

1. Aggiorno tutto in < 60 secondi
2. Zero sorprese (scadenze saltate non previste)
3. Uso quotidiano (5+ giorni/settimana)

---

*Ultimo aggiornamento: 11 gennaio 2026*
