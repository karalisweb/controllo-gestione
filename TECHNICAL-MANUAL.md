# Manuale Tecnico - KW Cashflow

**Versione:** 2.1.0
**Ultimo aggiornamento:** 22 febbraio 2026

---

## 1. Architettura

### Stack Tecnologico

| Livello | Tecnologia |
|---------|-----------|
| Framework | Next.js 16.1.1 (App Router) |
| Linguaggio | TypeScript 5.x |
| UI | Tailwind CSS v4 + shadcn/ui (Radix UI) |
| Font | Space Grotesk (testi) + JetBrains Mono (numeri) |
| Database | SQLite via better-sqlite3 |
| ORM | Drizzle ORM |
| Sessioni | iron-session (cookie cifrato) |
| Hashing password | bcryptjs (12 rounds) |
| 2FA | otplib (TOTP) + OTP via email |
| Email | nodemailer (SMTP) |
| Charts | Recharts |
| Animazioni | Framer Motion |
| Toast | Sonner |
| Deploy | PM2 su VPS Contabo |

### Architettura Generale

```
Browser ←→ Next.js App Router ←→ API Routes ←→ Drizzle ORM ←→ SQLite
                  ↓
            iron-session (cookie)
```

L'app e' un monolite Next.js con rendering server-side. Le API routes gestiscono la logica di business e accedono al database SQLite tramite Drizzle ORM. L'autenticazione usa sessioni cifrate nei cookie.

### Struttura Directory

```
kw-cashflow/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # Dashboard CEO
│   │   ├── layout.tsx            # Layout root (dark mode, fonts, toaster)
│   │   ├── login/page.tsx        # Pagina login
│   │   ├── forecast/page.tsx     # Previsionale
│   │   ├── transactions/page.tsx # Consuntivo
│   │   ├── payment-plans/page.tsx # Piani di Rientro
│   │   ├── sales/page.tsx        # Piano Commerciale
│   │   ├── settings/page.tsx     # Piano Annuale (centri costo/ricavo)
│   │   ├── profile/page.tsx      # Profilo utente + 2FA
│   │   ├── guida/                # Guida utente
│   │   │   ├── page.tsx          # Indice sezioni
│   │   │   └── [section]/page.tsx # Sotto-pagine dinamiche
│   │   └── api/                  # API Routes (vedi sezione 4)
│   ├── components/
│   │   ├── Sidebar.tsx           # Navigazione desktop
│   │   ├── MobileNav.tsx         # Navigazione mobile (bottom nav)
│   │   ├── AuthLayout.tsx        # Wrapper autenticazione
│   │   ├── dashboard/            # Componenti dashboard
│   │   │   ├── QuickEntry.tsx    # FAB inserimento rapido
│   │   │   └── DashboardSkeleton.tsx # Skeleton loading
│   │   ├── transactions/         # Import/lista movimenti
│   │   └── ui/                   # shadcn components + custom
│   │       └── animated-number.tsx # Contatore animato
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts         # Schema database (Drizzle)
│   │   │   └── index.ts          # Connessione database
│   │   ├── auth/
│   │   │   ├── session.ts        # Configurazione sessione
│   │   │   ├── userService.ts    # CRUD utenti + 2FA
│   │   │   └── otpService.ts     # Gestione OTP
│   │   ├── email/
│   │   │   └── emailService.ts   # Invio email SMTP
│   │   ├── utils/
│   │   │   ├── currency.ts       # Formattazione valuta
│   │   │   ├── dates.ts          # Utilita' date (locale IT)
│   │   │   └── splits.ts         # Calcolo split incassi
│   │   ├── forecast-sync.ts      # Sincronizzazione forecast
│   │   ├── utils.ts              # cn() helper (clsx + tailwind-merge)
│   │   └── version.ts            # Versione app centralizzata
│   └── middleware.ts             # Auth middleware
├── data/
│   └── finance.db                # Database SQLite
├── drizzle/                      # Migrations Drizzle
├── public/                       # Asset statici
├── deploy.sh                     # Script deploy automatizzato
├── CHANGELOG.md                  # Changelog
├── DESIGN-SYSTEM.md              # Design system Karalisweb
└── package.json
```

---

## 2. Schema Database

Database: **SQLite** in `data/finance.db`

**Convenzioni:**
- Tutti gli importi sono in **centesimi** (integer). Es: 10.000,00 EUR = 1000000
- Importi positivi = entrate, negativi = uscite (in `transactions` e `budget_items`)
- Soft delete tramite campo `deleted_at` (null = attivo)
- Date in formato `YYYY-MM-DD` (testo)
- Timestamp con `DEFAULT (unixepoch())`

### 2.1 Tabelle Principali

#### categories
Categorie per classificare i movimenti.

| Colonna | Tipo | Vincoli |
|---------|------|---------|
| id | INTEGER | PK, autoincrement |
| name | TEXT | NOT NULL |
| type | TEXT | `income` \| `expense` |
| color | TEXT | nullable |
| created_at | TIMESTAMP | default now |
| deleted_at | TIMESTAMP | nullable |

#### transactions
Movimenti reali (importati da CSV o inseriti manualmente).

| Colonna | Tipo | Vincoli |
|---------|------|---------|
| id | INTEGER | PK, autoincrement |
| external_id | TEXT | UNIQUE, nullable |
| date | TEXT | NOT NULL (YYYY-MM-DD) |
| description | TEXT | nullable |
| amount | INTEGER | NOT NULL (centesimi, +entrata/-uscita) |
| category_id | INTEGER | FK → categories |
| cost_center_id | INTEGER | FK → cost_centers |
| revenue_center_id | INTEGER | FK → revenue_centers |
| is_split | BOOLEAN | default false |
| is_transfer | BOOLEAN | default false |
| is_verified | BOOLEAN | default false |
| matched_budget_item_id | INTEGER | FK → budget_items |
| linked_transaction_id | INTEGER | nullable |
| notes | TEXT | nullable |
| raw_data | TEXT | nullable (JSON originale) |
| created_at | TIMESTAMP | default now |
| deleted_at | TIMESTAMP | nullable |

#### budget_items
Voci previsionali mensili.

| Colonna | Tipo | Vincoli |
|---------|------|---------|
| id | INTEGER | PK, autoincrement |
| category_id | INTEGER | FK → categories |
| cost_center_id | INTEGER | FK → cost_centers |
| revenue_center_id | INTEGER | FK → revenue_centers |
| description | TEXT | NOT NULL |
| amount | INTEGER | NOT NULL (centesimi) |
| due_date | TEXT | nullable (YYYY-MM-DD) |
| month | INTEGER | 1-12 |
| year | INTEGER | default 2026 |
| is_recurring | BOOLEAN | default false |
| client_name | TEXT | nullable |
| notes | TEXT | nullable |
| is_verified | BOOLEAN | default false |
| matched_transaction_id | INTEGER | nullable |
| created_at | TIMESTAMP | default now |
| deleted_at | TIMESTAMP | nullable |

#### forecast_items
Voci previsionali generate automaticamente da template o manuali.

| Colonna | Tipo | Vincoli |
|---------|------|---------|
| id | INTEGER | PK, autoincrement |
| date | TEXT | NOT NULL (YYYY-MM-DD) |
| description | TEXT | NOT NULL |
| type | TEXT | `income` \| `expense` |
| amount | INTEGER | NOT NULL (centesimi) |
| source_type | TEXT | `expected_expense` \| `expected_income` \| `manual` \| `pdr` |
| source_id | INTEGER | nullable (FK al template origine) |
| cost_center_id | INTEGER | FK → cost_centers |
| revenue_center_id | INTEGER | FK → revenue_centers |
| payment_plan_id | INTEGER | FK → payment_plans |
| reliability | TEXT | `high` \| `medium` \| `low`, default high |
| priority | TEXT | `essential` \| `important` \| `investment` \| `normal` |
| notes | TEXT | nullable |
| created_at | TIMESTAMP | default now |
| updated_at | TIMESTAMP | default now |
| deleted_at | TIMESTAMP | nullable |

### 2.2 Template Spese/Entrate

#### expected_expenses
Template spese ricorrenti (generano forecast_items).

| Colonna | Tipo | Vincoli |
|---------|------|---------|
| id | INTEGER | PK, autoincrement |
| name | TEXT | NOT NULL |
| cost_center_id | INTEGER | FK → cost_centers |
| amount | INTEGER | NOT NULL (centesimi) |
| frequency | TEXT | `monthly` \| `quarterly` \| `semiannual` \| `annual` \| `one_time` |
| expected_day | INTEGER | default 1 |
| start_date | TEXT | NOT NULL (YYYY-MM-DD) |
| end_date | TEXT | nullable |
| priority | TEXT | `essential` \| `important` \| `investment` \| `normal` |
| notes | TEXT | nullable |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMP | default now |
| deleted_at | TIMESTAMP | nullable |

#### expected_incomes
Template entrate ricorrenti (generano forecast_items).

| Colonna | Tipo | Vincoli |
|---------|------|---------|
| id | INTEGER | PK, autoincrement |
| client_name | TEXT | NOT NULL |
| revenue_center_id | INTEGER | FK → revenue_centers |
| amount | INTEGER | NOT NULL (centesimi) |
| frequency | TEXT | `monthly` \| `quarterly` \| `semiannual` \| `annual` \| `one_time` |
| expected_day | INTEGER | default 20 |
| start_date | TEXT | NOT NULL (YYYY-MM-DD) |
| end_date | TEXT | nullable |
| reliability | TEXT | `high` \| `medium` \| `low` |
| notes | TEXT | nullable |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMP | default now |
| deleted_at | TIMESTAMP | nullable |

### 2.3 Centri di Costo/Ricavo

#### cost_centers

| Colonna | Tipo | Vincoli |
|---------|------|---------|
| id | INTEGER | PK, autoincrement |
| name | TEXT | NOT NULL |
| description | TEXT | nullable |
| color | TEXT | nullable |
| sort_order | INTEGER | default 0 |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMP | default now |
| deleted_at | TIMESTAMP | nullable |

#### revenue_centers
Stessa struttura di cost_centers.

### 2.4 Piani di Rientro (PDR)

#### payment_plans

| Colonna | Tipo | Vincoli |
|---------|------|---------|
| id | INTEGER | PK, autoincrement |
| creditor_name | TEXT | NOT NULL |
| category_id | INTEGER | FK → payment_plan_categories |
| total_amount | INTEGER | NOT NULL (centesimi) |
| installment_amount | INTEGER | NOT NULL (centesimi) |
| total_installments | INTEGER | NOT NULL |
| paid_installments | INTEGER | default 0 |
| start_date | TEXT | NOT NULL (YYYY-MM-DD) |
| notes | TEXT | nullable |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMP | default now |
| deleted_at | TIMESTAMP | nullable |

#### payment_plan_installments

| Colonna | Tipo | Vincoli |
|---------|------|---------|
| id | INTEGER | PK, autoincrement |
| payment_plan_id | INTEGER | FK → payment_plans |
| due_date | TEXT | NOT NULL (YYYY-MM-DD) |
| amount | INTEGER | NOT NULL (centesimi) |
| is_paid | BOOLEAN | default false |
| paid_date | TEXT | nullable |
| transaction_id | INTEGER | FK → transactions |
| created_at | TIMESTAMP | default now |

#### payment_plan_categories

| Colonna | Tipo | Vincoli |
|---------|------|---------|
| id | INTEGER | PK, autoincrement |
| name | TEXT | NOT NULL |
| color | TEXT | nullable |
| sort_order | INTEGER | default 0 |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMP | default now |
| deleted_at | TIMESTAMP | nullable |

### 2.5 Piano Commerciale

#### sales_opportunities

| Colonna | Tipo | Vincoli |
|---------|------|---------|
| id | INTEGER | PK, autoincrement |
| client_name | TEXT | nullable |
| project_type | TEXT | `sito_web` \| `marketing` \| `msd` \| `licenza` \| `altro` |
| total_amount | INTEGER | NOT NULL (centesimi, lordo IVA) |
| commission_rate | INTEGER | default 20 (percentuale) |
| payment_type | TEXT | `sito_web_50_50` \| `msd_30_70` \| `marketing_4_trim` \| `immediato` \| `custom` |
| month | INTEGER | 1-12 |
| year | INTEGER | default 2026 |
| status | TEXT | `objective` \| `opportunity` \| `won` \| `lost` |
| closed_date | TEXT | nullable |
| notes | TEXT | nullable |
| created_at | TIMESTAMP | default now |
| deleted_at | TIMESTAMP | nullable |

#### sales_installments

| Colonna | Tipo | Vincoli |
|---------|------|---------|
| id | INTEGER | PK, autoincrement |
| sales_opportunity_id | INTEGER | FK → sales_opportunities |
| due_date | TEXT | NOT NULL |
| amount | INTEGER | NOT NULL (centesimi, lordo) |
| installment_number | INTEGER | NOT NULL |
| is_paid | BOOLEAN | default false |
| paid_date | TEXT | nullable |
| transaction_id | INTEGER | FK → transactions |
| created_at | TIMESTAMP | default now |

### 2.6 Split Incassi

#### income_splits

| Colonna | Tipo | Vincoli |
|---------|------|---------|
| id | INTEGER | PK, autoincrement |
| transaction_id | INTEGER | FK → transactions |
| gross_amount | INTEGER | NOT NULL (centesimi) |
| net_amount | INTEGER | NOT NULL (centesimi) |
| daniela_amount | INTEGER | NOT NULL (centesimi) |
| alessio_amount | INTEGER | NOT NULL (centesimi) |
| agency_amount | INTEGER | NOT NULL (centesimi) |
| vat_amount | INTEGER | NOT NULL (centesimi) |
| created_at | TIMESTAMP | default now |

### 2.7 Autenticazione

#### users

| Colonna | Tipo | Vincoli |
|---------|------|---------|
| id | INTEGER | PK, autoincrement |
| email | TEXT | NOT NULL, UNIQUE |
| password_hash | TEXT | NOT NULL |
| name | TEXT | nullable |
| role | TEXT | `admin` \| `user` \| `viewer`, default user |
| totp_secret | TEXT | nullable |
| totp_enabled | BOOLEAN | default false |
| is_active | BOOLEAN | default true |
| last_login_at | TIMESTAMP | nullable |
| failed_login_attempts | INTEGER | default 0 |
| locked_until | TIMESTAMP | nullable |
| created_at | TIMESTAMP | default now |
| updated_at | TIMESTAMP | default now |

#### backup_codes
Codici di backup per 2FA (10 codici generati al setup).

#### otp_codes
Codici OTP monouso per login 2FA e reset password.

#### otp_rate_limits
Rate limiting per richieste OTP (max 5 per minuto per email).

### 2.8 Impostazioni

#### settings

| Colonna | Tipo | Vincoli |
|---------|------|---------|
| id | INTEGER | PK, autoincrement |
| key | TEXT | NOT NULL, UNIQUE |
| value | TEXT | NOT NULL |
| type | TEXT | `number` \| `string` \| `boolean` \| `date` |
| description | TEXT | nullable |
| updated_at | TIMESTAMP | default now |

**Chiavi note:**
- `initial_balance` (number) - Saldo iniziale in centesimi
- `balance_date` (date) - Data del saldo iniziale (YYYY-MM-DD)

---

## 3. Autenticazione

### Flusso Login

```
1. POST /api/auth/login (email, password)
   ├─ 2FA disabilitato → sessione autenticata, redirect a /
   └─ 2FA abilitato → pending2FA in sessione
       └─ Invio OTP via email
           └─ POST /api/auth/verify-2fa (code)
               └─ Sessione autenticata, redirect a /
```

### Sessione

- **Libreria**: iron-session
- **Cookie**: `finance_session` (httpOnly, sameSite: lax, secure in produzione)
- **TTL**: 7 giorni
- **Segreto**: variabile d'ambiente `SESSION_SECRET` (min 32 caratteri)

```typescript
interface SessionData {
  authenticated: boolean;
  userId?: number;
  email?: string;
  name?: string;
  role?: string;
  pending2FA?: { userId: number; email: string };
}
```

### Middleware

Il middleware (`src/middleware.ts`) protegge tutte le route tranne:
- `/login`
- `/api/auth/login`
- `/api/auth/verify-2fa`
- `/api/auth/status`
- `/api/auth/init`
- `/api/auth/request-password-reset`
- `/api/auth/verify-reset-otp`
- `/api/auth/reset-password`

Le richieste API non autenticate ricevono 401 JSON. Le pagine vengono redirect a `/login?redirect=<path>`.

### Sicurezza

- **Password**: bcrypt con 12 rounds
- **Lockout**: 5 tentativi falliti → blocco 1 minuto
- **2FA**: TOTP (otplib) + OTP via email
- **Backup codes**: 10 codici generati al setup 2FA
- **OTP**: validita' 10 minuti, rate limit 5/minuto per email

---

## 4. API Routes

Tutte le API rispondono in JSON. Errori seguono il formato `{ success: false, error: "messaggio" }`.

### 4.1 Autenticazione

| Metodo | Path | Auth | Descrizione |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login con email/password |
| POST | `/api/auth/logout` | No | Distrugge la sessione |
| GET | `/api/auth/status` | No | Stato autenticazione corrente |
| GET | `/api/auth/init` | No | Verifica se esistono utenti |
| POST | `/api/auth/init` | No | Crea primo utente admin |
| POST | `/api/auth/verify-2fa` | No | Verifica OTP email per login |
| POST | `/api/auth/resend-otp` | No | Re-invia OTP |
| POST | `/api/auth/request-password-reset` | No | Richiede reset password |
| POST | `/api/auth/reset-password` | No | Resetta password con OTP |
| POST | `/api/auth/setup-2fa` | Si | Genera QR code TOTP |
| POST | `/api/auth/verify-2fa-setup` | Si | Conferma setup 2FA |
| POST | `/api/auth/enable-2fa` | Si | Abilita 2FA |
| POST | `/api/auth/disable-2fa` | Si | Disabilita 2FA (richiede password) |
| POST | `/api/auth/update-password` | Si | Cambia password |
| POST | `/api/auth/update-profile` | Si | Aggiorna nome profilo |

### 4.2 Transazioni

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/transactions` | Lista con filtri (startDate, endDate, categoryId, type) |
| POST | `/api/transactions` | Crea transazione (stile import CSV) |
| GET | `/api/transactions/[id]` | Dettaglio con join categoria |
| PUT | `/api/transactions/[id]` | Aggiorna campi |
| DELETE | `/api/transactions/[id]` | Soft delete |
| POST | `/api/transactions/manual` | Crea transazione manuale con tagging note |

**POST `/api/transactions/manual`** genera un `externalId = MANUAL-{timestamp}-{random}` e aggiunge tag automatici nelle note: `[STRAORDINARIO]`, `[REF:EXP-N]`, `[REF:INC-N]`.

### 4.3 Budget (Previsionale)

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/budget` | Lista per anno/mese |
| POST | `/api/budget` | Crea voce previsionale |
| GET | `/api/budget/[id]` | Dettaglio |
| PUT | `/api/budget/[id]` | Aggiorna |
| DELETE | `/api/budget/[id]` | Soft delete |

### 4.4 Categorie

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/categories` | Lista categorie attive |
| POST | `/api/categories` | Crea (name, type, color) |
| GET | `/api/categories/[id]` | Dettaglio |
| PUT | `/api/categories/[id]` | Aggiorna |
| DELETE | `/api/categories/[id]` | Soft delete |

### 4.5 Centri di Costo

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/cost-centers` | Lista con statistiche (totalExpected, spent, remaining) |
| POST | `/api/cost-centers` | Crea |
| GET | `/api/cost-centers/[id]` | Dettaglio |
| PUT | `/api/cost-centers/[id]` | Aggiorna |
| DELETE | `/api/cost-centers/[id]` | Soft delete + disattiva |
| GET | `/api/cost-centers/report` | Report mensile (budget vs consuntivo per centro) |

### 4.6 Centri di Ricavo

Stessa struttura dei centri di costo (`/api/revenue-centers`).

### 4.7 Spese Previste

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/expected-expenses` | Lista attive con occorrenze mensili |
| POST | `/api/expected-expenses` | Crea + auto-sync forecast |
| GET | `/api/expected-expenses/[id]` | Dettaglio |
| PUT | `/api/expected-expenses/[id]` | Aggiorna + sync forecast (rigenera se schedule cambiato) |
| DELETE | `/api/expected-expenses/[id]` | Soft delete o termina da data (`?terminateDate=YYYY-MM-DD`) |

### 4.8 Entrate Previste

Stessa struttura delle spese previste (`/api/expected-incomes`).

### 4.9 Piani di Rientro (PDR)

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/payment-plans` | Lista con rate e categorie |
| POST | `/api/payment-plans` | Crea + genera rate automaticamente |
| GET | `/api/payment-plans/[id]` | Dettaglio con rate |
| PUT | `/api/payment-plans/[id]` | Aggiorna; `regenerateInstallments: true` rigenera le rate |
| DELETE | `/api/payment-plans/[id]` | Soft delete |
| POST | `/api/payment-plans/[id]/installments` | Segna rata pagata (auto-disattiva piano quando completo) |
| PUT | `/api/payment-plans/[id]/installments` | Cambia data scadenza rata |
| DELETE | `/api/payment-plans/[id]/installments` | Annulla pagamento rata |

### 4.10 Forecast

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/forecast` | Lista con filtri (startDate, endDate, type) |
| POST | `/api/forecast` | Crea voce manuale |
| PUT | `/api/forecast` | Genera voci da template per un periodo |
| GET | `/api/forecast/[id]` | Dettaglio |
| PATCH | `/api/forecast/[id]` | Aggiornamento parziale |
| DELETE | `/api/forecast/[id]` | Soft delete |
| POST | `/api/forecast/[id]` | Sposta a PDR |

### 4.11 Piano Commerciale

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/sales` | Lista opportunita' con breakdown + rate |
| POST | `/api/sales` | Crea; se `status=won` genera rate |
| GET | `/api/sales/[id]` | Dettaglio con breakdown |
| PUT | `/api/sales/[id]` | Aggiorna; genera rate se transita a `won` |
| DELETE | `/api/sales/[id]` | Soft delete |
| GET | `/api/sales/gap` | Analisi gap mensile |

### 4.12 Split Incassi

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/splits` | Lista split (filtro `?transactionId=N`) |
| POST | `/api/splits` | Crea split + transazione di trasferimento |
| DELETE | `/api/splits?transactionId=N` | Elimina split |

### 4.13 Dashboard

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/dashboard` | Overview annuale (budget vs consuntivo mensile) |
| GET | `/api/dashboard-ceo` | Dashboard CEO con tutte le metriche |

**Risposta `/api/dashboard-ceo`:**
- `currentBalance` - calcolato da `initial_balance` + tutte le transazioni dal `balance_date`
- `runway` - mesi di liquidita' (target: 3 mesi), media burn mensile
- `quarterSales` - gap vendite trimestrale, progresso, giorni rimanenti
- `currentMonthSustainability` - entrate, uscite, PDR, margine, variazione vs mese precedente
- `next7Days` / `last7Days` - movimenti prossimi e recenti
- `actions` - rate scadute, fatture da emettere, incassi in ritardo
- `pdr` - piani attivi con progresso e data stimata chiusura
- `trend` - ultimi 3 mesi (entrate/uscite/margine)

### 4.14 Cashflow

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/cashflow` | 3 numeri chiave: giorni alla difficolta', saldo fine periodo, fatturato necessario |

**Parametri:** `horizon` (giorni, default 30)

**Logica stato:**
- `defense` - giorni alla difficolta' < 30
- `stabilization` - saldo fine periodo < 1.000 EUR
- `growth` - altrimenti

**Algoritmo giorno difficolta':** Simula il flusso di cassa giorno per giorno; conta solo entrate ad alta affidabilita' al 48% del lordo; il primo giorno in cui `saldo + spesa < 0`.

### 4.15 Controllo Annuale

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/annual-control` | Tabella 12 mesi: preventivato vs fatturato vs costi vs margine vs liquidita' |

### 4.16 Impostazioni

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/settings` | Tutte le impostazioni (o `?key=<key>` per specifica) |
| PUT | `/api/settings` | Crea/aggiorna impostazione |

---

## 5. Logica di Business

### 5.1 Split Incassi

Ogni incasso viene suddiviso automaticamente:

```
Lordo (es. 1.000,00 EUR)
├── Netto = Lordo / 1,22 = 819,67 EUR
├── IVA = Netto * 0,22 = 180,33 EUR (da versare allo Stato)
├── Daniela = Netto * 0,10 = 81,97 EUR (quota socia)
├── Alessio = Netto * 0,20 = 163,93 EUR (quota socio)
└── Agenzia = Netto * 0,70 = 573,77 EUR (disponibile)
```

Lo split crea una transazione di trasferimento collegata (`is_transfer = true`) per l'importo `alessio + daniela + IVA` (uscita dalla cassa operativa).

### 5.2 Breakdown Vendite

Per ogni opportunita' commerciale:

```
Netto = Lordo / 1,22
Commissione = Netto * (commissionRate / 100)
Post-commissione = Netto - Commissione
IVA = Netto * 0,22
Soci = Post-commissione * 0,30
Disponibile = Post-commissione - Soci
```

### 5.3 Piani di Pagamento Vendite

| Tipo | Schema Rate |
|------|-------------|
| `sito_web_50_50` | 50% subito, 50% a +60 giorni |
| `msd_30_70` | 30% subito, 70% a +21 giorni |
| `marketing_4_trim` | 4 rate trimestrali uguali |
| `immediato` | 100% subito |
| `custom` | 100% subito |

### 5.4 Affidabilita' Incassi

- **Alta**: conta al 100% nelle proiezioni (al 48% del lordo per il giorno difficolta')
- **Media**: conta dopo aver sommato tutti gli "alta"
- **Bassa**: conta ZERO (approccio pessimista)

### 5.5 Priorita' Spese

1. `essential` - Spese vitali (server, strumenti essenziali)
2. `important` - Importi rilevanti
3. `investment` - Investimenti
4. `normal` - Spese ordinarie

### 5.6 Sincronizzazione Forecast

Le voci forecast vengono generate automaticamente da:
1. **expected_expenses** - template spese ricorrenti
2. **expected_incomes** - template entrate ricorrenti
3. **payment_plan_installments** - rate PDR non pagate

Frequenze supportate: `monthly`, `quarterly` (ogni 3 mesi), `semiannual` (ogni 6 mesi), `annual`, `one_time`.

La sincronizzazione e' smart: quando si modifica un template, se cambiano solo importo/descrizione vengono aggiornate le voci future esistenti; se cambia la schedulazione vengono rigenerate.

---

## 6. Variabili d'Ambiente

| Variabile | Descrizione |
|-----------|-------------|
| `SESSION_SECRET` | Chiave cifratura sessione iron-session (min 32 caratteri) |
| `SMTP_HOST` | Hostname server SMTP |
| `SMTP_PORT` | Porta SMTP (default 587) |
| `SMTP_SECURE` | `"true"` per porta 465 |
| `SMTP_USER` | Username SMTP |
| `SMTP_PASSWORD` | Password SMTP |
| `SMTP_FROM` | Email mittente (default: noreply@karalisweb.net) |
| `NODE_ENV` | `production` abilita cookie secure |

---

## 7. Deploy

### Infrastruttura

- **VPS**: Contabo (185.192.97.108)
- **Process Manager**: PM2 (nome processo: `karalisweb-finance`)
- **Branch**: main
- **Porta**: 3002
- **URL**: https://finance.karalisdemo.it

### Procedura Deploy

Lo script `deploy.sh` automatizza il deploy:

```bash
./deploy.sh "messaggio commit"          # Deploy standard
./deploy.sh --bump "messaggio commit"   # Deploy con bump versione patch
```

**Fasi:**
1. Build locale (`npm run build`)
2. Bump versione (opzionale): aggiorna package.json, deploy.sh, DEPLOY.md, version.ts
3. Aggiorna CHANGELOG.md con data, versione e messaggio
4. Commit e push al repository
5. SSH al VPS: git pull, npm install, npm run build, pm2 restart

### Versioning

La versione e' centralizzata in `src/lib/version.ts`:
```typescript
export const APP_VERSION = "2.1.0";
```

Viene importata da Sidebar e pagina Guida. Lo script `deploy.sh` aggiorna automaticamente tutti i file durante il bump.

---

## 8. Convenzioni di Codice

### Valuta

```typescript
// Sempre in centesimi nel database e nelle API
const amount = 1000000; // = 10.000,00 EUR

// Conversione
centsToEuros(1000000) // → 10000
eurosToCents(10000)    // → 1000000

// Formattazione (locale italiana)
formatCurrency(1000000) // → "10.000,00 €"
formatAmount(1000000)   // → "10.000,00"
```

### Date

```typescript
// Database: YYYY-MM-DD (stringa)
// Formattazione
formatDate("2026-01-15")      // → "15/01/2026"
formatDateShort("2026-01-15") // → "15 Gen"
```

### Classi CSS

Usare sempre classi semantiche Tailwind (CSS variables) invece di colori hardcoded:
- `text-primary` invece di `text-[#d4a726]`
- `bg-card` invece di `bg-[#132032]`
- `border-border` invece di `border-[#2a2a35]`

Riferimento completo: `DESIGN-SYSTEM.md`

---

## 9. Manutenzione

### Backup Database

Il database SQLite si trova in `data/finance.db`. Per il backup:
```bash
cp data/finance.db data/finance-backup-$(date +%Y%m%d).db
```

### Migrations

Le migrations Drizzle sono in `drizzle/`. Per generare una nuova migration:
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

### Log

PM2 gestisce i log in produzione:
```bash
pm2 logs karalisweb-finance
pm2 logs karalisweb-finance --lines 100
```
