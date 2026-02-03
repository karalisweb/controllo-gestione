# KW CASHFLOW - Documentazione Tecnica

> **Versione:** 2.1
> **Ultimo aggiornamento:** 3 Febbraio 2026
> **Target:** Sviluppatori che devono integrare/modificare l'applicazione

---

## Indice

1. [Panoramica](#1-panoramica)
2. [Stack Tecnologico](#2-stack-tecnologico)
3. [Struttura Progetto](#3-struttura-progetto)
4. [Database - Schema Completo](#4-database---schema-completo)
5. [Autenticazione e Sicurezza](#5-autenticazione-e-sicurezza)
6. [API Reference](#6-api-reference)
7. [Componenti](#7-componenti)
8. [Utilities](#8-utilities)
9. [Tipi TypeScript](#9-tipi-typescript)
10. [Setup Sviluppo](#10-setup-sviluppo)
11. [Convenzioni e Pattern](#11-convenzioni-e-pattern)

---

## 1. Panoramica

### Scopo
App per decisioni rapide sul cashflow aziendale. Non è un software di contabilità, ma uno strumento decisionale.

### 3 Problemi Risolti
1. **Quanto devo vendere?** (per coprire costi + pagare debiti)
2. **Quali costi posso tagliare?** (per migliorare il margine)
3. **Come pago i debiti PDR?** (piano sostenibile)

### URL Produzione
`https://finance.karalisdemo.it`

---

## 2. Stack Tecnologico

| Categoria | Tecnologia | Versione |
|-----------|------------|----------|
| **Framework** | Next.js (App Router) | 16.1.1 |
| **Frontend** | React | 19.2.3 |
| **Linguaggio** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 4.x |
| **UI Components** | shadcn/ui | - |
| **Database** | SQLite + better-sqlite3 | 12.6.0 |
| **ORM** | Drizzle | 0.45.1 |
| **Auth Session** | iron-session | 8.0.4 |
| **Password Hash** | bcryptjs | 3.0.3 |
| **2FA TOTP** | otplib + qrcode | 13.1.0 / 1.5.4 |
| **Email** | nodemailer | 7.0.12 |
| **Charts** | recharts | 3.6.0 |
| **Form Validation** | react-hook-form + zod | 7.69.0 / 4.3.4 |

---

## 3. Struttura Progetto

```
karalisweb-finance/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Dashboard principale
│   │   ├── layout.tsx                # Root layout
│   │   ├── login/page.tsx            # Login
│   │   ├── profile/page.tsx          # Profilo utente
│   │   ├── forecast/page.tsx         # Previsionale
│   │   ├── transactions/page.tsx     # Consuntivo
│   │   ├── payment-plans/page.tsx    # Piani di rientro
│   │   ├── settings/page.tsx         # Piano annuale
│   │   ├── budget/page.tsx           # Budget
│   │   ├── sales/page.tsx            # Piano commerciale
│   │   ├── reports/page.tsx          # Report
│   │   └── api/                      # API Routes
│   │       ├── auth/                 # 12 endpoint autenticazione
│   │       ├── cashflow/             # Proiezioni cashflow
│   │       ├── dashboard/            # Dati dashboard
│   │       ├── transactions/         # CRUD transazioni
│   │       ├── cost-centers/         # Centri di costo
│   │       ├── expected-expenses/    # Spese previste
│   │       ├── revenue-centers/      # Centri di ricavo
│   │       ├── expected-incomes/     # Incassi previsti
│   │       ├── payment-plans/        # PDR
│   │       ├── forecast/             # Voci previsionale
│   │       ├── budget/               # Budget
│   │       ├── categories/           # Categorie
│   │       ├── settings/             # Impostazioni
│   │       ├── sales/                # Piano commerciale
│   │       └── splits/               # Ripartizioni
│   ├── components/
│   │   ├── AuthLayout.tsx            # Wrapper autenticazione
│   │   ├── Sidebar.tsx               # Menu laterale desktop
│   │   ├── MobileHeader.tsx          # Header mobile
│   │   ├── MobileNav.tsx             # Bottom nav mobile
│   │   ├── dashboard/                # Componenti dashboard
│   │   ├── transactions/             # Componenti transazioni
│   │   ├── forecast/                 # Componenti previsionale
│   │   ├── payment-plans/            # Componenti PDR
│   │   ├── settings/                 # Componenti impostazioni
│   │   ├── budget/                   # Componenti budget
│   │   ├── sales/                    # Componenti vendite
│   │   └── ui/                       # shadcn/ui components
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts              # Connessione database
│   │   │   └── schema.ts             # Schema Drizzle (18 tabelle)
│   │   ├── auth/
│   │   │   ├── session.ts            # Gestione sessioni
│   │   │   ├── userService.ts        # Operazioni utente + 2FA
│   │   │   └── otpService.ts         # OTP email + rate limiting
│   │   ├── email/
│   │   │   └── emailService.ts       # Invio email
│   │   └── utils/
│   │       ├── currency.ts           # Conversioni €/centesimi
│   │       ├── dates.ts              # Formatazione date
│   │       └── splits.ts             # Calcolo ripartizioni
│   ├── types/
│   │   └── index.ts                  # Interfacce TypeScript
│   └── middleware.ts                 # Protezione route
├── data/
│   └── finance.db                    # Database SQLite
├── drizzle/                          # Migrations
├── public/
│   └── logo-kw.png                   # Logo
└── package.json
```

---

## 4. Database - Schema Completo

### Nota Importante
**Tutti gli importi sono salvati in CENTESIMI** (integer). Per convertire:
- DB → Display: `amount / 100`
- Input → DB: `amount * 100`

### Tabelle Principali

#### `users` - Utenti
```sql
id              INTEGER PRIMARY KEY
email           TEXT UNIQUE (lowercase)
passwordHash    TEXT (bcrypt, 12 rounds)
name            TEXT
role            TEXT ['admin', 'user', 'viewer']
totpSecret      TEXT (2FA secret)
totpEnabled     INTEGER (boolean)
isActive        INTEGER (boolean)
lastLoginAt     INTEGER (timestamp)
failedLoginAttempts INTEGER
lockedUntil     INTEGER (timestamp)
createdAt       INTEGER (timestamp)
updatedAt       INTEGER (timestamp)
```

#### `transactions` - Movimenti Reali (Consuntivo)
```sql
id                    INTEGER PRIMARY KEY
externalId            TEXT UNIQUE (ID esterno)
date                  TEXT (YYYY-MM-DD)
description           TEXT
amount                INTEGER (centesimi, +entrata, -uscita)
categoryId            INTEGER FK → categories
costCenterId          INTEGER FK → cost_centers
revenueCenterId       INTEGER FK → revenue_centers
isSplit               INTEGER (boolean)
isTransfer            INTEGER (boolean, giroconto)
isVerified            INTEGER (boolean)
matchedBudgetItemId   INTEGER FK → budget_items
linkedTransactionId   INTEGER (transazione collegata)
notes                 TEXT
rawData               TEXT (JSON originale)
createdAt             INTEGER (timestamp)
deletedAt             INTEGER (timestamp, soft delete)
```

#### `cost_centers` - Centri di Costo
```sql
id          INTEGER PRIMARY KEY
name        TEXT (es. "Telefonia", "Software", "Server")
description TEXT
color       TEXT (hex color)
sortOrder   INTEGER
isActive    INTEGER (boolean)
createdAt   INTEGER (timestamp)
deletedAt   INTEGER (timestamp)
```

#### `expected_expenses` - Spese Previste
```sql
id            INTEGER PRIMARY KEY
name          TEXT (es. "Wind Telefonica", "FastRent")
costCenterId  INTEGER FK → cost_centers
amount        INTEGER (centesimi)
frequency     TEXT ['monthly', 'quarterly', 'semiannual', 'annual', 'one_time']
expectedDay   INTEGER (giorno mese, 1-31)
startDate     TEXT (YYYY-MM-DD)
endDate       TEXT (YYYY-MM-DD, null=indefinito)
priority      TEXT ['essential', 'important', 'investment', 'normal']
notes         TEXT
isActive      INTEGER (boolean)
createdAt     INTEGER (timestamp)
deletedAt     INTEGER (timestamp)
```

#### `revenue_centers` - Centri di Ricavo
```sql
id          INTEGER PRIMARY KEY
name        TEXT (es. "Siti Web", "Marketing", "Licenze")
description TEXT
color       TEXT
sortOrder   INTEGER
isActive    INTEGER (boolean)
createdAt   INTEGER (timestamp)
deletedAt   INTEGER (timestamp)
```

#### `expected_incomes` - Incassi Previsti
```sql
id              INTEGER PRIMARY KEY
clientName      TEXT
revenueCenterId INTEGER FK → revenue_centers
amount          INTEGER (centesimi)
frequency       TEXT ['monthly', 'quarterly', 'semiannual', 'annual', 'one_time']
expectedDay     INTEGER (giorno mese)
startDate       TEXT (YYYY-MM-DD)
endDate         TEXT (YYYY-MM-DD)
reliability     TEXT ['high', 'medium', 'low']
notes           TEXT
isActive        INTEGER (boolean)
createdAt       INTEGER (timestamp)
deletedAt       INTEGER (timestamp)
```

#### `income_splits` - Ripartizioni Incassi
```sql
id              INTEGER PRIMARY KEY
transactionId   INTEGER FK → transactions
grossAmount     INTEGER (centesimi - lordo IVA)
netAmount       INTEGER (centesimi - imponibile)
danielaAmount   INTEGER (10% netto)
alessioAmount   INTEGER (20% netto)
agencyAmount    INTEGER (70% netto = DISPONIBILE)
vatAmount       INTEGER (22% netto = IVA)
createdAt       INTEGER (timestamp)
```

**Formula Split Standard:**
```
netto = lordo / 1.22
IVA = netto × 0.22
daniela = netto × 0.10
alessio = netto × 0.20
agenzia = netto × 0.70

DISPONIBILE CASSA = agenzia = 48% del lordo
QUOTE SOCI = daniela + alessio = 30% del lordo
```

#### `payment_plans` - Piani di Rientro
```sql
id                INTEGER PRIMARY KEY
creditorName      TEXT
totalAmount       INTEGER (centesimi)
installmentAmount INTEGER (centesimi)
totalInstallments INTEGER
paidInstallments  INTEGER
startDate         TEXT (YYYY-MM-DD)
notes             TEXT
isActive          INTEGER (boolean)
createdAt         INTEGER (timestamp)
deletedAt         INTEGER (timestamp)
```

#### `payment_plan_installments` - Rate PDR
```sql
id              INTEGER PRIMARY KEY
paymentPlanId   INTEGER FK → payment_plans
dueDate         TEXT (YYYY-MM-DD)
amount          INTEGER (centesimi)
isPaid          INTEGER (boolean)
paidDate        TEXT (YYYY-MM-DD)
transactionId   INTEGER FK → transactions
createdAt       INTEGER (timestamp)
```

#### `forecast_items` - Voci Previsionale (Manipolabili)
```sql
id              INTEGER PRIMARY KEY
date            TEXT (YYYY-MM-DD - manipolabile)
description     TEXT
type            TEXT ['income', 'expense']
amount          INTEGER (centesimi - manipolabile)
sourceType      TEXT ['expected_expense', 'expected_income', 'manual', 'pdr']
sourceId        INTEGER (ID template originale)
costCenterId    INTEGER FK
revenueCenterId INTEGER FK
paymentPlanId   INTEGER FK
reliability     TEXT ['high', 'medium', 'low']
priority        TEXT ['essential', 'important', 'investment', 'normal']
notes           TEXT
createdAt       INTEGER (timestamp)
updatedAt       INTEGER (timestamp)
deletedAt       INTEGER (timestamp)
```

#### `sales_opportunities` - Piano Commerciale
```sql
id              INTEGER PRIMARY KEY
clientName      TEXT (null = obiettivo generico)
projectType     TEXT ['sito_web', 'marketing', 'msd', 'licenza', 'altro']
totalAmount     INTEGER (centesimi - lordo IVA)
commissionRate  INTEGER (es. 20 = 20%)
paymentType     TEXT ['sito_web_50_50', 'msd_30_70', 'marketing_4_trim', 'immediato', 'custom']
month           INTEGER (1-12)
year            INTEGER
status          TEXT ['objective', 'opportunity', 'won', 'lost']
closedDate      TEXT (YYYY-MM-DD)
notes           TEXT
createdAt       INTEGER (timestamp)
deletedAt       INTEGER (timestamp)
```

#### `sales_installments` - Rate Vendite
```sql
id                  INTEGER PRIMARY KEY
salesOpportunityId  INTEGER FK
dueDate             TEXT (YYYY-MM-DD)
amount              INTEGER (centesimi)
installmentNumber   INTEGER
isPaid              INTEGER (boolean)
paidDate            TEXT (YYYY-MM-DD)
transactionId       INTEGER FK
createdAt           INTEGER (timestamp)
```

#### Tabelle Supporto Auth
- `otp_codes` - Codici OTP email
- `otp_rate_limits` - Rate limiting OTP
- `backup_codes` - Codici backup 2FA (legacy)

#### Tabelle Legacy
- `categories` - Categorie movimenti
- `budget_items` - Budget voci
- `settings` - Impostazioni globali

---

## 5. Autenticazione e Sicurezza

### Flow Login

```
1. GET /login
   ↓
2. Verifica se sistema inizializzato (GET /api/auth/init)
   ↓
3a. NON inizializzato → Form creazione admin
   ↓
3b. Inizializzato → Form login email/password
   ↓
4. POST /api/auth/login
   ↓
5a. 2FA disabilitato → Redirect dashboard
   ↓
5b. 2FA abilitato → Invia OTP email → Form verifica
   ↓
6. POST /api/auth/verify-2fa → Redirect dashboard
```

### Configurazione Sessione

```typescript
// src/lib/auth/session.ts
const sessionOptions = {
  cookieName: "finance_session",
  password: process.env.SESSION_SECRET,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 giorni
  },
};

interface SessionData {
  authenticated: boolean;
  userId?: number;
  email?: string;
  name?: string;
  role?: string;
  pending2FA?: { userId: number; email: string };
}
```

### Sicurezza Password
- **Algoritmo:** bcrypt
- **Salt rounds:** 12
- **Lunghezza minima:** 6 caratteri (login), 8 (init admin)

### 2FA
- **TOTP:** SHA1, 6 cifre, 30 secondi (Google Authenticator compatibile)
- **OTP Email:** 6 cifre, scadenza 10 minuti
- **Backup codes:** 10 codici, uso singolo

### Rate Limiting
| Evento | Limite | Finestra |
|--------|--------|----------|
| Login fallito | 5 tentativi | Lock 1 minuto |
| Richiesta OTP | 5 richieste | 1 minuto |

### Middleware Protezione

```typescript
// src/middleware.ts
const publicPaths = [
  "/login",
  "/api/auth/login",
  "/api/auth/verify-2fa",
  "/api/auth/status",
  "/api/auth/init",
  "/api/auth/request-password-reset",
  "/api/auth/verify-reset-otp",
  "/api/auth/reset-password",
];

// Tutte le altre route richiedono autenticazione
```

---

## 6. API Reference

### Autenticazione

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| GET | `/api/auth/init` | Verifica inizializzazione | No |
| POST | `/api/auth/init` | Crea primo admin | No |
| POST | `/api/auth/login` | Login | No |
| POST | `/api/auth/logout` | Logout | Sì |
| POST | `/api/auth/verify-2fa` | Verifica OTP | No* |
| POST | `/api/auth/resend-otp` | Reinvia OTP | No* |
| GET | `/api/auth/status` | Dati utente corrente | Sì |
| PUT | `/api/auth/update-profile` | Aggiorna profilo | Sì |
| PUT | `/api/auth/update-password` | Cambia password | Sì |
| POST | `/api/auth/setup-2fa` | Setup 2FA TOTP | Sì |
| POST | `/api/auth/verify-2fa-setup` | Conferma setup 2FA | Sì |
| POST | `/api/auth/disable-2fa` | Disabilita 2FA | Sì |
| POST | `/api/auth/request-password-reset` | Richiedi reset | No |
| POST | `/api/auth/reset-password` | Reset password | No |

*Richiede sessione pending2FA

### Dashboard & Cashflow

#### `GET /api/cashflow`
Calcola proiezioni cashflow con 3 numeri chiave.

**Query params:**
- `horizon` - Giorni orizzonte (30/90/180, default 30)

**Response:**
```json
{
  "daysUntilDifficulty": 15,
  "difficultyDate": "2026-02-18",
  "endPeriodBalance": 125000,
  "requiredRevenue": 50000,
  "status": "defense|stabilization|growth",
  "currentBalance": 80000,
  "horizonDays": 30,
  "upcomingExpenses": [...],
  "upcomingIncomes": [...],
  "totalExpensesInPeriod": 45000,
  "totalCertainIncomeInPeriod": 30000,
  "debt": {
    "total": 150000,
    "remaining": 120000,
    "plansCount": 3
  }
}
```

### CRUD Pattern Standard

Tutte le risorse seguono questo pattern:

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/{resource}` | Lista tutti |
| GET | `/api/{resource}/[id]` | Dettaglio singolo |
| POST | `/api/{resource}` | Crea nuovo |
| PUT | `/api/{resource}/[id]` | Aggiorna |
| DELETE | `/api/{resource}/[id]` | Soft delete |

Risorse disponibili:
- `transactions`
- `cost-centers`
- `expected-expenses`
- `revenue-centers`
- `expected-incomes`
- `payment-plans`
- `forecast`
- `budget`
- `categories`
- `sales`

### Endpoint Speciali

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/cost-centers/report` | Report costi per centro |
| `GET /api/revenue-centers/report` | Report incassi per centro |
| `GET /api/sales/gap?month=1&year=2026` | Gap mensile vendite |
| `GET /api/splits` | Lista ripartizioni |
| `GET /api/annual-control` | Controllo gestione annuale |
| `POST /api/transactions/manual` | Crea transazione manuale |
| `POST /api/payment-plans/[id]/installments` | Aggiungi rata PDR |

---

## 7. Componenti

### Layout

| Componente | File | Descrizione |
|------------|------|-------------|
| `AuthLayout` | `AuthLayout.tsx` | Wrapper con protezione auth |
| `Sidebar` | `Sidebar.tsx` | Menu laterale desktop |
| `MobileHeader` | `MobileHeader.tsx` | Header con breadcrumb mobile |
| `MobileNav` | `MobileNav.tsx` | Bottom navigation mobile |

### Dashboard

| Componente | Props | Descrizione |
|------------|-------|-------------|
| `KeyMetrics` | `daysUntilDifficulty, endPeriodBalance, requiredRevenue` | 3 numeri chiave |
| `CashFlowChart` | `data[]` | Grafico proiezione |
| `UpcomingExpenses` | `expenses[], onPaymentMarked` | Scadenze 7 giorni |
| `DebtSummary` | `debt{}` | Riepilogo debiti |
| `SplitsSummary` | `splits[]` | Riepilogo ripartizioni |
| `AnnualControlTable` | - | Tabella controllo annuale |
| `CumulativeChart` | - | Grafico cumulativo |

### Transazioni

| Componente | Props | Descrizione |
|------------|-------|-------------|
| `TransactionList` | `transactions[], categories[], onDelete, onUpdateCategory, onSplit` | Lista movimenti |
| `QuickTransactionInput` | `onTransactionAdded, onClose` | Form rapido |
| `SplitCalculator` | `grossAmount` | Calcolo split |

### Settings

| Componente | Props | Descrizione |
|------------|-------|-------------|
| `CostCenterForm` | `center?, onSubmit, onCancel` | Form centro costo |
| `ExpectedExpenseForm` | `expense?, costCenters[], onSubmit, onCancel` | Form spesa prevista |
| `RevenueCenterForm` | `center?, onSubmit, onCancel` | Form centro ricavo |
| `ExpectedIncomeForm` | `income?, revenueCenters[], onSubmit, onCancel` | Form incasso previsto |

### Payment Plans

| Componente | Props | Descrizione |
|------------|-------|-------------|
| `PaymentPlanList` | `plans[], onEdit, onDelete` | Lista PDR |
| `PaymentPlanForm` | `plan?, onSubmit, onCancel` | Form PDR |

### UI (shadcn/ui)

Componenti disponibili in `src/components/ui/`:
- Button, Card, Input, Label, Badge
- Tabs, Dialog, Table, Select, Form

---

## 8. Utilities

### Currency (`src/lib/utils/currency.ts`)

```typescript
// Conversioni
centsToEuros(cents: number): number
eurosToCents(euros: number): number

// Formattazione
formatCurrency(cents: number): string  // "10.000,00 €"
formatAmount(cents: number): string    // "10.000,00"

// Parsing
parseItalianCurrency(value: string): number  // "1.234,56" → centesimi
```

### Dates (`src/lib/utils/dates.ts`)

```typescript
// Costanti
MONTHS: string[]       // ["Gennaio", "Febbraio", ...]
MONTHS_SHORT: string[] // ["Gen", "Feb", ...]

// Funzioni
getMonthName(month: number): string
getMonthShortName(month: number): string
formatDate(dateStr: string): string       // "04/02/2026"
formatDateShort(dateStr: string): string  // "4 Feb"
getMonthYear(dateStr: string): { month, year }
getFirstDayOfMonth(month: number, year: number): string
getLastDayOfMonth(month: number, year: number): string
```

### Splits (`src/lib/utils/splits.ts`)

```typescript
interface SplitResult {
  grossAmount: number;   // lordo IVA
  netAmount: number;     // netto (senza IVA)
  danielaAmount: number; // 10% netto
  alessioAmount: number; // 20% netto
  agencyAmount: number;  // 70% netto (DISPONIBILE)
  vatAmount: number;     // 22% netto
}

calculateSplit(grossAmountCents: number): SplitResult
calculateSplitFromEuros(grossEuros: number): SplitResult
verifySplit(split: SplitResult): boolean
```

---

## 9. Tipi TypeScript

### Enums

```typescript
type PaymentFrequency = "monthly" | "quarterly" | "semiannual" | "annual" | "one_time";
type Reliability = "high" | "medium" | "low";
type CostPriority = "essential" | "important" | "investment" | "normal";
type ProjectType = "sito_web" | "marketing" | "msd" | "licenza" | "altro";
type SalesStatus = "objective" | "opportunity" | "won" | "lost";
type PaymentPlanType = "sito_web_50_50" | "msd_30_70" | "marketing_4_trim" | "immediato" | "custom";
```

### Interfacce Principali

```typescript
interface Transaction {
  id: number;
  externalId: string | null;
  date: string;
  description: string | null;
  amount: number; // centesimi
  categoryId: number | null;
  costCenterId: number | null;
  revenueCenterId: number | null;
  isSplit: boolean | null;
  isTransfer: boolean | null;
  isVerified: boolean | null;
  notes: string | null;
  createdAt: Date | null;
}

interface CostCenter {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  sortOrder: number | null;
  isActive: boolean | null;
}

interface ExpectedExpense {
  id: number;
  name: string;
  costCenterId: number | null;
  amount: number; // centesimi
  frequency: PaymentFrequency;
  expectedDay: number | null;
  startDate: string;
  endDate: string | null;
  priority: CostPriority | null;
  notes: string | null;
  isActive: boolean | null;
}

interface PaymentPlan {
  id: number;
  creditorName: string;
  totalAmount: number;
  installmentAmount: number;
  totalInstallments: number;
  paidInstallments: number | null;
  startDate: string;
  notes: string | null;
  isActive: boolean | null;
  installments?: PaymentPlanInstallment[];
}

interface IncomeSplit {
  id: number;
  transactionId: number | null;
  grossAmount: number;
  netAmount: number;
  danielaAmount: number;
  alessioAmount: number;
  agencyAmount: number;
  vatAmount: number;
}
```

Tutti i tipi sono definiti in `src/types/index.ts`.

---

## 10. Setup Sviluppo

### Prerequisiti
- Node.js 18+
- npm o pnpm

### Installazione

```bash
# Clone repository
git clone [repo-url]
cd karalisweb-finance

# Installa dipendenze
npm install

# Crea file .env
cp .env.example .env
```

### Variabili Ambiente

```env
# Database (SQLite locale, path: ./data/finance.db)

# Session
SESSION_SECRET=<stringa-minimo-32-caratteri>

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<user>
SMTP_PASSWORD=<password>
SMTP_FROM=noreply@karalisweb.net

# Environment
NODE_ENV=development
```

### Comandi

```bash
# Sviluppo (porta 3002)
npm run dev

# Build produzione
npm run build

# Start produzione
npm run start

# Database
npm run db:push      # Push schema
npm run db:studio    # Drizzle Studio
npm run db:migrate   # Genera migrations
```

### Primo Accesso

1. Avvia l'app con `npm run dev`
2. Vai a `http://localhost:3002/login`
3. Il sistema rileva che non ci sono utenti
4. Compila il form per creare il primo admin
5. Login automatico

---

## 11. Convenzioni e Pattern

### Naming

| Tipo | Convenzione | Esempio |
|------|-------------|---------|
| Componenti | PascalCase | `TransactionList` |
| File componenti | PascalCase.tsx | `TransactionList.tsx` |
| API routes | kebab-case | `cost-centers/route.ts` |
| Utilities | camelCase | `formatCurrency` |
| Tipi/Interfacce | PascalCase | `PaymentPlan` |
| Costanti | UPPER_SNAKE | `MAX_LOGIN_ATTEMPTS` |

### Pattern API Response

```typescript
// Successo
{ success: true, data: ... }

// Errore
{ error: "Messaggio errore" }

// Lista
[{ id: 1, ... }, { id: 2, ... }]
```

### Soft Delete

Tutte le entità principali usano soft delete:
```typescript
deletedAt: integer("deleted_at", { mode: "timestamp" })
```

Per filtrare i record attivi:
```typescript
.where(isNull(table.deletedAt))
```

### Import Ordine

```typescript
// 1. React/Next
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. Componenti esterni
import { Button } from "@/components/ui/button";

// 3. Componenti interni
import { TransactionList } from "@/components/transactions/TransactionList";

// 4. Utilities
import { formatCurrency } from "@/lib/utils/currency";

// 5. Tipi
import type { Transaction } from "@/types";
```

### Date

- **Formato DB:** `YYYY-MM-DD` (string)
- **Formato Display IT:** `DD/MM/YYYY`
- **Timestamp:** Unix epoch (integer)

### Importi

- **DB:** Sempre in centesimi (integer)
- **Display:** Formattato italiano (`10.000,00 €`)
- **Conversione:** Usa `centsToEuros()` / `eurosToCents()`

---

## Note Finali

### Calcolo "Giorni alla Difficoltà"

Primo giorno in cui `cassa_disponibile < importo_scadenza_giorno`

Algoritmo:
1. Parti dal saldo attuale
2. Considera solo incassi "high" reliability (× 0.48 split)
3. Considera tutte le spese non pagate
4. Simula giorno per giorno fino all'orizzonte
5. Ritorna primo giorno con saldo insufficiente

### Stati Azienda

| Stato | Condizione | Colore |
|-------|------------|--------|
| DEFENSE | giorni difficoltà < 30 | Rosso |
| STABILIZATION | pago tutto ma senza margine | Giallo |
| GROWTH | ho buffer, posso investire | Verde |

### Priorità Pagamenti

Quando i soldi non bastano:
1. Spese VITALI (essential)
2. Importi più grossi
3. Conseguenze legali (tasse)
4. Rapporti umani (fornitori storici)

---

*Documentazione generata il 3 Febbraio 2026*
