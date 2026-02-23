# App Cashflow Decisionale - Karalisweb Finance

## Obiettivo

App per decisioni rapide sul cashflow aziendale. Non contabilita', ma strumento decisionale.

**3 problemi da risolvere:**
1. Quanto devo vendere? (per coprire costi + pagare debiti)
2. Quali costi posso tagliare? (per migliorare il margine)
3. Come pago i debiti (PDR)? (piano sostenibile)

---

## Stack Tecnico

- **Framework**: Next.js 16.1.1 (App Router) + React 19.2.3 + TypeScript 5.x
- **UI**: Tailwind CSS v4 + shadcn/ui (Radix UI)
- **Font**: Space Grotesk (testi) + JetBrains Mono (numeri mono)
- **Animazioni**: Framer Motion (fade-in, stagger, count-up)
- **Toast**: Sonner (notifiche dark-themed)
- **Charts**: Recharts
- **Database**: SQLite (locale, via better-sqlite3 + Drizzle ORM)
- **Autenticazione**: iron-session + bcryptjs + otplib (2FA TOTP) + OTP email
- **Email**: nodemailer (SMTP)
- **Deploy**: VPS Contabo (185.192.97.108) con PM2, porta 3002
- **URL**: https://finance.karalisdemo.it

---

## Struttura Dati

Il progetto usa:
- `transactions` - movimenti reali (import CSV o manuali)
- `budget_items` - voci previsionali mensili
- `forecast_items` - voci forecast generate da template (expected_expenses/incomes) o manuali
- `expected_expenses` / `expected_incomes` - template ricorrenti che generano forecast
- `cost_centers` / `revenue_centers` - centri di costo e ricavo
- `payment_plans` + `payment_plan_installments` - debiti PDR con rate
- `sales_opportunities` + `sales_installments` - piano commerciale con rate
- `income_splits` - ripartizioni incassi (IVA 22%, soci 30%, disponibile 48%)
- `categories` - categorie movimenti (income/expense)
- `settings` - configurazioni (saldo iniziale, data saldo)
- `users` + `backup_codes` + `otp_codes` - autenticazione e 2FA

**Importi**: sempre in centesimi (integer). Formattazione italiana via `formatCurrency()`.

Per dettagli completi: vedi `TECHNICAL-MANUAL.md`

---

## I 3 Momenti di Utilizzo

| Frequenza | Azione | Tempo target |
|-----------|--------|--------------|
| **Giornaliero** | Registro incasso/spesa quando avviene | 30 secondi |
| **Settimanale** | Verifico se le previsioni sono rispettate | 5 minuti |
| **Mensile** | Analisi vendite, aggiusto target fatturato | 15 minuti |

---

## Pagine dell'App

| Path | Pagina | Descrizione |
|------|--------|-------------|
| `/` | Dashboard CEO | Metriche chiave, trend, azioni richieste |
| `/forecast` | Previsionale | Entrate/uscite future con forecast |
| `/transactions` | Consuntivo | Movimenti reali, import CSV |
| `/payment-plans` | Piani di Rientro | Gestione debiti con rate |
| `/sales` | Piano Commerciale | Opportunita' vendita con breakdown |
| `/settings` | Piano Annuale | Centri di costo/ricavo, configurazioni |
| `/profile` | Profilo | Dati utente, 2FA, cambio password |
| `/guida` | Guida | Manuale utente con 6 sezioni |
| `/login` | Login | Autenticazione con 2FA |

---

## Dashboard CEO

La dashboard mostra in ordine:
1. **Obiettivo vendite** - Quanto devo vendere questo trimestre (con progress bar)
2. **Cassa attuale** - Saldo calcolato da saldo iniziale + transazioni
3. **Runway** - Mesi di liquidita' (target: 3 mesi)
4. **Sostenibilita' mese** - Entrate vs uscite vs PDR = margine
5. **Prossimi 7 giorni** - Scadenze imminenti
6. **Ultimi 7 giorni** - Movimenti recenti
7. **Trend 3 mesi** - Andamento entrate/uscite/margine
8. **Azioni richieste** - Rate scadute, fatture da emettere, incassi in ritardo
9. **Quick Links** - Navigazione rapida

**Quick Entry FAB**: bottone flottante per inserimento rapido transazioni (solo mobile).

---

## Regole di Business

### Split Incassi
```
Incasso lordo
├── Netto = Lordo / 1,22
├── IVA 22% (da versare)
├── Soci 30% del netto (Daniela 10% + Alessio 20%)
└── Disponibile 48% = Netto * 0,70
```

### Affidabilita' Incassi
- **Alta**: conta 100% (48% del lordo per giorno difficolta')
- **Media**: conta dopo tutti gli "alta"
- **Bassa**: conta ZERO (approccio pessimista)

### Priorita' Pagamenti
1. `essential` - Spese vitali (server, strumenti)
2. `important` - Importi rilevanti
3. `investment` - Investimenti
4. `normal` - Spese ordinarie

### Giorno di Difficolta'
Primo giorno in cui `cassa disponibile < importo scadenza da pagare`

### Stati Azienda
- **DIFESA** (rosso): giorni alla difficolta' < 30
- **STABILIZZAZIONE** (giallo): saldo fine periodo < 1.000 EUR
- **CRESCITA** (verde): liquidita' sufficiente

---

## File Progetto

```
kw-cashflow/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Dashboard CEO
│   │   ├── layout.tsx            # Layout root (dark mode, fonts, toaster)
│   │   ├── login/page.tsx        # Login
│   │   ├── forecast/page.tsx     # Previsionale
│   │   ├── transactions/page.tsx # Consuntivo
│   │   ├── payment-plans/page.tsx # PDR
│   │   ├── sales/page.tsx        # Piano Commerciale
│   │   ├── settings/page.tsx     # Piano Annuale
│   │   ├── profile/page.tsx      # Profilo utente
│   │   ├── guida/
│   │   │   ├── page.tsx          # Indice guida
│   │   │   └── [section]/page.tsx # 6 sotto-pagine dinamiche
│   │   └── api/                  # API routes (vedi TECHNICAL-MANUAL.md)
│   ├── components/
│   │   ├── Sidebar.tsx           # Nav desktop
│   │   ├── MobileNav.tsx         # Nav mobile (bottom nav)
│   │   ├── AuthLayout.tsx        # Wrapper autenticazione
│   │   ├── dashboard/
│   │   │   ├── QuickEntry.tsx    # FAB inserimento rapido
│   │   │   └── DashboardSkeleton.tsx # Skeleton loading
│   │   ├── transactions/         # Import/lista movimenti
│   │   └── ui/                   # shadcn + custom (animated-number)
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts         # Schema DB completo (Drizzle)
│   │   │   └── index.ts          # Connessione SQLite
│   │   ├── auth/                 # Sessione, userService, otpService
│   │   ├── email/                # emailService (nodemailer SMTP)
│   │   ├── utils/                # currency, dates, splits
│   │   ├── forecast-sync.ts      # Sync forecast da template
│   │   ├── utils.ts              # cn() helper
│   │   └── version.ts            # Versione app centralizzata
│   └── middleware.ts             # Auth middleware
├── data/finance.db               # Database SQLite
├── drizzle/                      # Migrations
├── deploy.sh                     # Deploy automatizzato + versioning + changelog
├── CHANGELOG.md                  # Changelog (Keep a Changelog)
├── DESIGN-SYSTEM.md              # Design system Karalisweb
├── TECHNICAL-MANUAL.md           # Manuale tecnico completo
└── package.json
```

---

## Design System

- **Tema**: sempre dark mode (classe `dark` su `<html>`)
- **Colori**: definiti come CSS custom properties in `globals.css`
  - Usare classi semantiche (`text-primary`, `bg-card`, `border-border`)
  - MAI colori hardcoded (`text-[#d4a726]`)
- **Brand**: oro `#d4a726` (primary), navy `#0d1521` (background), teal `#2d7d9a`
- Riferimento completo: `DESIGN-SYSTEM.md`

---

## Deploy

```bash
./deploy.sh "messaggio commit"          # Deploy standard
./deploy.sh --bump "messaggio commit"   # Con bump versione patch
```

Lo script: build locale → bump versione (opzionale) → changelog → commit/push → SSH VPS → pull → build → pm2 restart.

La versione e' centralizzata in `src/lib/version.ts` e viene aggiornata automaticamente.

---

## Convenzioni

- **Importi**: sempre in centesimi nel DB e API. Usare `formatCurrency()` per il display
- **Date**: `YYYY-MM-DD` nel DB. Usare `formatDate()` / `formatDateShort()` per il display
- **Soft delete**: campo `deleted_at` (null = attivo). Mai `DELETE` fisico
- **CSS**: classi semantiche Tailwind via CSS variables. Vedi `globals.css` + `DESIGN-SYSTEM.md`
- **Componenti UI**: shadcn/ui (Radix). Cartella `src/components/ui/`
- **Animazioni**: Framer Motion con varianti `fadeInUp` + `staggerContainer`
- **Toast**: `toast.success()` / `toast.error()` da sonner per feedback utente

---

## Metriche di Successo

1. Aggiorno tutto in < 60 secondi
2. Zero sorprese (scadenze saltate non previste)
3. Uso quotidiano (5+ giorni/settimana)

---

*Ultimo aggiornamento: 22 febbraio 2026*
