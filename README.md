# KW Cashflow

Strumento decisionale per la gestione del cashflow aziendale di Karalisweb.

Non è un software di contabilità, ma un'app per prendere **decisioni rapide** su:
- **Quanto devo vendere** per coprire costi e debiti
- **Quali costi posso tagliare** per migliorare il margine
- **Come pago i debiti (PDR)** con un piano sostenibile

---

## Stack Tecnico

| Tecnologia | Utilizzo |
|-----------|----------|
| Next.js 16 (App Router) | Framework frontend + API routes |
| React 19 + TypeScript | UI e logica |
| Tailwind CSS v4 + shadcn/ui | Stili e componenti |
| SQLite (better-sqlite3) | Database locale |
| Drizzle ORM | Query e migrazioni |
| Recharts | Grafici |
| iron-session | Autenticazione sessioni |

---

## Requisiti

- Node.js 18+
- npm

---

## Installazione

```bash
git clone git@github.com:AlessioKarworx/karalisweb-finance.git
cd karalisweb-finance
npm install
```

---

## Sviluppo

```bash
npm run dev
```

L'app gira su [http://localhost:3002](http://localhost:3002).

---

## Build

```bash
npm run build
npm start
```

---

## Database

Il progetto usa SQLite con Drizzle ORM.

```bash
# Genera migrazioni
npm run db:migrate

# Applica schema al database
npm run db:push

# Apri Drizzle Studio (GUI)
npm run db:studio
```

Il file database SQLite si trova in `data/`.

---

## Deploy

Il deploy avviene tramite `deploy.sh` che esegue:

1. Verifica stato Git
2. Commit automatico delle modifiche
3. Push su GitHub (`main`)
4. Pull sul server VPS (Contabo)
5. Build Next.js sul server
6. Restart processo PM2

```bash
# Deploy standard
./deploy.sh

# Deploy con bump versione
./deploy.sh --bump patch   # 2.1.0 → 2.1.1
./deploy.sh --bump minor   # 2.1.0 → 2.2.0
./deploy.sh --bump major   # 2.1.0 → 3.0.0
```

Per dettagli completi: `DEPLOY.md`

---

## Struttura Progetto

```
kw-cashflow/
├── src/
│   ├── app/               # Pages (App Router)
│   │   ├── page.tsx        # Dashboard
│   │   ├── forecast/       # Previsionale
│   │   ├── transactions/   # Consuntivo
│   │   ├── sales/          # Piano Commerciale
│   │   ├── payment-plans/  # Piani di Rientro (PDR)
│   │   ├── settings/       # Piano Annuale
│   │   ├── guida/          # Guida utente
│   │   ├── login/          # Autenticazione
│   │   └── api/            # API routes
│   ├── components/
│   │   ├── Sidebar.tsx     # Navigazione desktop
│   │   ├── MobileNav.tsx   # Navigazione mobile
│   │   ├── dashboard/      # Componenti dashboard
│   │   ├── transactions/   # Import/lista movimenti
│   │   └── ui/             # shadcn components
│   ├── lib/
│   │   ├── db/             # Schema + connessione Drizzle
│   │   └── utils/          # Helpers (currency, dates, splits)
│   └── types/              # TypeScript types
├── data/                   # SQLite database
├── drizzle/                # Migrazioni
├── deploy.sh               # Script deploy automatico
├── DEPLOY.md               # Guida deploy completa
├── DESIGN-SYSTEM.md        # Design system Karalisweb
├── SERVER-CONFIG.md         # Configurazione server
└── CLAUDE.md               # Istruzioni per Claude Code
```

---

## Documentazione

| File | Contenuto |
|------|-----------|
| `CLAUDE.md` | Specifiche funzionali e regole di business |
| `DEPLOY.md` | Procedura deploy e troubleshooting |
| `DESIGN-SYSTEM.md` | Design system grafico (palette, font, componenti) |
| `SERVER-CONFIG.md` | Configurazione VPS, porte, PM2, Nginx |

---

## Informazioni Server

| Parametro | Valore |
|-----------|--------|
| VPS | Contabo (185.192.97.108) |
| Porta | 3002 |
| PM2 | `karalisweb-finance` |
| URL | https://finance.karalisdemo.it |
| Path server | `/root/karalisweb-finance` |
| Repository | `AlessioKarworx/karalisweb-finance` |

---

## Versione

**v2.1.0**

---

*Karalisweb - KW Cashflow*
