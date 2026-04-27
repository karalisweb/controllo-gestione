import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Override mensili per spese previste.
// Permette di sovrascrivere l'importo della singola occorrenza in un mese specifico
// senza alterare il template (es. "Server Plan -50% per gennaio per pagamento anticipato").
// Se non esiste un override per (expectedExpenseId, year, month), si usa il default
// dell'expected_expense.
export const expectedExpenseOverrides = sqliteTable("expected_expense_overrides", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  expectedExpenseId: integer("expected_expense_id").notNull().references(() => expectedExpenses.id),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  amount: integer("amount").notNull(), // centesimi, valore effettivo per quel (year, month)
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Override mensili per incassi previsti (simmetrico a expense overrides).
// Esempio: "Orizzonte normalmente paga 366, ma a giugno 866 (366 base + 500 servizio extra)".
export const expectedIncomeOverrides = sqliteTable("expected_income_overrides", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  expectedIncomeId: integer("expected_income_id").notNull().references(() => expectedIncomes.id),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  amount: integer("amount").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Sottoscrizioni: cliente x servizio del catalogo.
// Ogni riga rappresenta un contratto: "Cliente X compra Servizio Y da data inizio
// a data fine, con eventuali override su importo/intervallo/percentuali rispetto
// ai default del servizio".
//
// Le occorrenze concrete (date + importi delle singole rate/incassi) vengono
// generate on-the-fly da una funzione pura `generateOccurrences()` quando servono
// (es. quando si renderizza la pagina Movimenti). Non sono salvate qui per
// evitare sync stantio: cambiando una sottoscrizione, le occorrenze future
// vengono ricalcolate automaticamente al rendering.
export const subscriptions = sqliteTable("subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  serviceId: integer("service_id").notNull().references(() => services.id),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date"), // YYYY-MM-DD, nullable (indefinito); utente preferisce sempre messa
  // Override dei default del servizio (nullable = usa il default del servizio)
  customAmount: integer("custom_amount"), // centesimi, lordo IVA
  customIntervalMonths: integer("custom_interval_months"), // per recurring
  customFirstPct: integer("custom_first_pct"), // per installments
  customOffsetDays: integer("custom_offset_days"), // per installments
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Catalogo Servizi: i "pacchetti" che l'agenzia vende.
// Definito una volta, riusato per generare le sottoscrizioni cliente x servizio.
// Esempi: MSD pacchetto (acconto+saldo), Sito Web 50/50, Marketing mensile,
// Dominio annuale, Pacchetto Assistenza.
//
// Pattern recurring: importo + intervallo mesi (es. ogni 1/3/6/12 mesi).
// Pattern installments: due rate (acconto + saldo) con percentuale e offset gg.
//
// I default sono indicativi; ogni sottoscrizione (Phase 1.4) puo' overrideare.
export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", { enum: ["recurring", "installments"] }).notNull(),
  revenueCenterId: integer("revenue_center_id").references(() => revenueCenters.id),
  description: text("description"),
  // Default per pattern recurring
  defaultAmount: integer("default_amount").default(0), // centesimi (0 = variabile per cliente)
  defaultIntervalMonths: integer("default_interval_months").default(1), // 1, 3, 6, 12, o custom
  // Default per pattern installments
  defaultFirstPct: integer("default_first_pct").default(50), // % acconto sul totale (es. 50 per 50/50, 30 per 30/70)
  defaultOffsetDays: integer("default_offset_days").default(60), // giorni tra acconto e saldo
  // Comune
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Anagrafica unica: clienti, fornitori, ex-fornitori (e altri contatti)
// Un soggetto che è sia cliente che fornitore non viene duplicato (campo type
// indica il ruolo prevalente; in futuro si puo' estendere a multi-ruolo).
export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["client", "supplier", "ex_supplier", "other"],
  }).notNull().default("other"),
  // Contatti opzionali
  email: text("email"),
  phone: text("phone"),
  // Per fornitori: collegamento al centro di costo predefinito (auto-assegna su movimenti)
  costCenterId: integer("cost_center_id").references(() => costCenters.id),
  // Per clienti: collegamento al centro di ricavo predefinito (auto-fill su nuovo incasso)
  revenueCenterId: integer("revenue_center_id").references(() => revenueCenters.id),
  // Per fornitori: se true, le date di pagamento sono negoziabili
  isMovable: integer("is_movable", { mode: "boolean" }).default(true),
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Categorie per entrate e uscite (mantenute per compatibilità)
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  color: text("color"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Centri di Costo - aggregatori per tipologia spese (Telefonia, Software, Collaboratori, ecc.)
export const costCenters = sqliteTable("cost_centers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // es. "Telefonia", "Software", "Collaboratori", "Server"
  description: text("description"),
  color: text("color"),
  sortOrder: integer("sort_order").default(0),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Spese Previste - singole voci di spesa con importi e date
export const expectedExpenses = sqliteTable("expected_expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // nome spesa (es. "Wind Telefonia", "Asana", "FastRent Ufficio")
  contactId: integer("contact_id").references(() => contacts.id), // fornitore in anagrafica (nullable per retrocompat)
  costCenterId: integer("cost_center_id").references(() => costCenters.id), // aggregatore
  amount: integer("amount").notNull(), // centesimi - importo singola spesa
  frequency: text("frequency", {
    enum: ["monthly", "quarterly", "semiannual", "annual", "one_time"]
  }).notNull().default("monthly"),
  expectedDay: integer("expected_day").default(1), // giorno del mese previsto pagamento
  startDate: text("start_date").notNull(), // formato YYYY-MM-DD - inizio contratto
  endDate: text("end_date"), // formato YYYY-MM-DD - fine contratto (null = indefinito)
  priority: text("priority", {
    enum: ["essential", "important", "investment", "normal"]
  }).default("normal"), // essential=vitale, important=importante, investment=investimento
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Centri di Ricavo - aggregatori per tipologia incassi (Siti Web, Marketing, Domini, Licenze)
export const revenueCenters = sqliteTable("revenue_centers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // es. "Siti Web", "Marketing", "Domini", "Licenze"
  description: text("description"),
  color: text("color"),
  sortOrder: integer("sort_order").default(0),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Incassi Previsti - singoli clienti con importi e date contratto
export const expectedIncomes = sqliteTable("expected_incomes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientName: text("client_name").notNull(), // nome cliente
  revenueCenterId: integer("revenue_center_id").references(() => revenueCenters.id), // aggregatore
  amount: integer("amount").notNull(), // centesimi - importo singolo incasso
  frequency: text("frequency", {
    enum: ["monthly", "quarterly", "semiannual", "annual", "one_time"]
  }).notNull().default("monthly"),
  expectedDay: integer("expected_day").default(20), // giorno del mese previsto incasso
  startDate: text("start_date").notNull(), // formato YYYY-MM-DD - inizio contratto
  endDate: text("end_date"), // formato YYYY-MM-DD - fine contratto (null = indefinito)
  reliability: text("reliability", {
    enum: ["high", "medium", "low"]
  }).default("high"), // affidabilità incasso
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Voci previsionali (budget) - importi in centesimi
export const budgetItems = sqliteTable("budget_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").references(() => categories.id),
  costCenterId: integer("cost_center_id").references(() => costCenters.id), // centro di costo
  revenueCenterId: integer("revenue_center_id").references(() => revenueCenters.id), // centro di ricavo
  description: text("description").notNull(),
  amount: integer("amount").notNull(), // centesimi, positivo = entrata, negativo = uscita
  dueDate: text("due_date"), // formato YYYY-MM-DD - data specifica (null = usa giorno 1 del mese)
  month: integer("month").notNull(), // 1-12 (derivato da dueDate per compatibilità)
  year: integer("year").notNull().default(2026),
  isRecurring: integer("is_recurring", { mode: "boolean" }).default(false),
  clientName: text("client_name"), // per entrate da clienti
  notes: text("notes"),
  isVerified: integer("is_verified", { mode: "boolean" }).default(false), // verificato con consuntivo
  matchedTransactionId: integer("matched_transaction_id"), // transazione corrispondente (FK non dichiarata per evitare ciclo)
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Movimenti reali (consuntivo) - importi in centesimi
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  externalId: text("external_id").unique(), // ID esterno per evitare duplicati
  date: text("date").notNull(), // formato YYYY-MM-DD
  description: text("description"),
  amount: integer("amount").notNull(), // centesimi, positivo = entrata, negativo = uscita
  categoryId: integer("category_id").references(() => categories.id),
  contactId: integer("contact_id").references(() => contacts.id), // contatto da anagrafica (cliente o fornitore)
  costCenterId: integer("cost_center_id").references(() => costCenters.id), // centro di costo
  revenueCenterId: integer("revenue_center_id").references(() => revenueCenters.id), // centro di ricavo
  isSplit: integer("is_split", { mode: "boolean" }).default(false),
  isTransfer: integer("is_transfer", { mode: "boolean" }).default(false), // true = giroconto/ripartizione, non è una spesa operativa
  isVerified: integer("is_verified", { mode: "boolean" }).default(false), // verificato con previsionale
  matchedBudgetItemId: integer("matched_budget_item_id").references(() => budgetItems.id), // voce previsionale corrispondente
  linkedTransactionId: integer("linked_transaction_id"), // collegamento a transazione originale (es. incasso per cui questo è il bonifico soci)
  notes: text("notes"),
  rawData: text("raw_data"), // JSON dati originali
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Ripartizioni degli incassi - importi in centesimi
export const incomeSplits = sqliteTable("income_splits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id").references(() => transactions.id),
  grossAmount: integer("gross_amount").notNull(), // centesimi
  netAmount: integer("net_amount").notNull(), // centesimi
  danielaAmount: integer("daniela_amount").notNull(), // centesimi
  alessioAmount: integer("alessio_amount").notNull(), // centesimi
  agencyAmount: integer("agency_amount").notNull(), // centesimi
  vatAmount: integer("vat_amount").notNull(), // centesimi
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Impostazioni globali dell'app
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(), // es. "initial_balance", "buffer_target"
  value: text("value").notNull(), // valore come stringa (parsato in base al tipo)
  type: text("type", { enum: ["number", "string", "boolean", "date"] }).notNull().default("string"),
  description: text("description"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Categorie piani di rientro (Finanziamento Qonto, Ex Fornitore, Fornitore Attuale)
export const paymentPlanCategories = sqliteTable("payment_plan_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color"), // colore per badge/visualizzazione
  sortOrder: integer("sort_order").default(0),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Piani di rientro - importi in centesimi
export const paymentPlans = sqliteTable("payment_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  creditorName: text("creditor_name").notNull(),
  contactId: integer("contact_id").references(() => contacts.id), // creditore in anagrafica (nullable per retrocompat)
  categoryId: integer("category_id").references(() => paymentPlanCategories.id), // categoria piano
  totalAmount: integer("total_amount").notNull(), // centesimi
  installmentAmount: integer("installment_amount").notNull(), // centesimi
  totalInstallments: integer("total_installments").notNull(),
  paidInstallments: integer("paid_installments").default(0),
  startDate: text("start_date").notNull(), // formato YYYY-MM-DD
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Rate dei piani di rientro - importi in centesimi
export const paymentPlanInstallments = sqliteTable("payment_plan_installments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  paymentPlanId: integer("payment_plan_id").references(() => paymentPlans.id),
  dueDate: text("due_date").notNull(), // formato YYYY-MM-DD
  amount: integer("amount").notNull(), // centesimi
  isPaid: integer("is_paid", { mode: "boolean" }).default(false),
  paidDate: text("paid_date"), // formato YYYY-MM-DD
  transactionId: integer("transaction_id").references(() => transactions.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Piano Commerciale - obiettivi, opportunità e vendite - importi in centesimi
export const salesOpportunities = sqliteTable("sales_opportunities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientName: text("client_name"), // null per obiettivi generici, valorizzato per opportunità/vendite
  projectType: text("project_type", {
    enum: ["sito_web", "marketing", "msd", "licenza", "altro"]
  }).notNull(),
  totalAmount: integer("total_amount").notNull(), // centesimi - lordo IVA
  commissionRate: integer("commission_rate").notNull().default(20), // percentuale commissione (es. 20 = 20%)
  paymentType: text("payment_type", {
    enum: ["sito_web_50_50", "msd_30_70", "marketing_4_trim", "immediato", "custom"]
  }).notNull(),
  month: integer("month").notNull(), // mese obiettivo (1-12)
  year: integer("year").notNull().default(2026),
  status: text("status", {
    enum: ["objective", "opportunity", "won", "lost"]
  }).notNull().default("objective"),
  // objective = ipotesi/piano (cliente opzionale, es. "1 sito web")
  // opportunity = trattativa in corso (preventivo fatto, cliente specifico)
  // won = vendita chiusa/vinta
  // lost = persa
  closedDate: text("closed_date"), // formato YYYY-MM-DD - data chiusura effettiva
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Rate delle vendite - generate automaticamente in base al paymentType
export const salesInstallments = sqliteTable("sales_installments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  salesOpportunityId: integer("sales_opportunity_id").references(() => salesOpportunities.id),
  dueDate: text("due_date").notNull(), // formato YYYY-MM-DD
  amount: integer("amount").notNull(), // centesimi - importo lordo rata
  installmentNumber: integer("installment_number").notNull(), // 1, 2, 3, 4...
  isPaid: integer("is_paid", { mode: "boolean" }).default(false),
  paidDate: text("paid_date"), // formato YYYY-MM-DD
  transactionId: integer("transaction_id").references(() => transactions.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Voci Previsionale - istanze concrete manipolabili (il cuore del sistema decisionale)
export const forecastItems = sqliteTable("forecast_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // formato YYYY-MM-DD - data prevista (manipolabile)
  description: text("description").notNull(), // "Affitto", "Cliente Rossi", ecc.
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  amount: integer("amount").notNull(), // centesimi - importo (manipolabile)

  // Origine della voce
  sourceType: text("source_type", {
    enum: ["expected_expense", "expected_income", "manual", "pdr"]
  }).notNull().default("manual"),
  sourceId: integer("source_id"), // ID del template originale (expectedExpense/expectedIncome/paymentPlanInstallment)

  // Riferimenti per categorizzazione
  costCenterId: integer("cost_center_id").references(() => costCenters.id),
  revenueCenterId: integer("revenue_center_id").references(() => revenueCenters.id),

  // Se spostata in piano di rientro
  paymentPlanId: integer("payment_plan_id").references(() => paymentPlans.id),

  // Riconciliazione con consuntivo
  matchedTransactionId: integer("matched_transaction_id"), // FK a transactions (non dichiarata per evitare ciclo)
  isRealized: integer("is_realized", { mode: "boolean" }).default(false), // true = confermato con transazione reale

  // Per incassi: affidabilità
  reliability: text("reliability", { enum: ["high", "medium", "low"] }).default("high"),

  // Per spese: priorità
  priority: text("priority", { enum: ["essential", "important", "investment", "normal"] }).default("normal"),

  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Utenti per autenticazione
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  role: text("role", { enum: ["admin", "user", "viewer"] }).default("user"),

  // 2FA
  totpSecret: text("totp_secret"),
  totpEnabled: integer("totp_enabled", { mode: "boolean" }).default(false),

  // Stato account
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: integer("locked_until", { mode: "timestamp" }),

  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Backup codes per 2FA (legacy - mantenuto per compatibilità)
export const backupCodes = sqliteTable("backup_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  codeHash: text("code_hash").notNull(),
  used: integer("used", { mode: "boolean" }).default(false),
  usedAt: integer("used_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// OTP codes per 2FA via email e recupero password
export const otpCodes = sqliteTable("otp_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  code: text("code").notNull(), // 6 cifre
  type: text("type", { enum: ["2fa_login", "password_reset"] }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  used: integer("used", { mode: "boolean" }).default(false),
  usedAt: integer("used_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Rate limiting per OTP requests
export const otpRateLimits = sqliteTable("otp_rate_limits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  requestCount: integer("request_count").notNull().default(1),
  windowStart: integer("window_start", { mode: "timestamp" }).notNull(),
});

// Types per le tabelle
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export type ExpectedExpenseOverride = typeof expectedExpenseOverrides.$inferSelect;
export type NewExpectedExpenseOverride = typeof expectedExpenseOverrides.$inferInsert;

export type ExpectedIncomeOverride = typeof expectedIncomeOverrides.$inferSelect;
export type NewExpectedIncomeOverride = typeof expectedIncomeOverrides.$inferInsert;

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type CostCenter = typeof costCenters.$inferSelect;
export type NewCostCenter = typeof costCenters.$inferInsert;

export type ExpectedExpense = typeof expectedExpenses.$inferSelect;
export type NewExpectedExpense = typeof expectedExpenses.$inferInsert;

export type RevenueCenter = typeof revenueCenters.$inferSelect;
export type NewRevenueCenter = typeof revenueCenters.$inferInsert;

export type ExpectedIncome = typeof expectedIncomes.$inferSelect;
export type NewExpectedIncome = typeof expectedIncomes.$inferInsert;

export type BudgetItem = typeof budgetItems.$inferSelect;
export type NewBudgetItem = typeof budgetItems.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type IncomeSplit = typeof incomeSplits.$inferSelect;
export type NewIncomeSplit = typeof incomeSplits.$inferInsert;

export type PaymentPlanCategory = typeof paymentPlanCategories.$inferSelect;
export type NewPaymentPlanCategory = typeof paymentPlanCategories.$inferInsert;

export type PaymentPlan = typeof paymentPlans.$inferSelect;
export type NewPaymentPlan = typeof paymentPlans.$inferInsert;

export type PaymentPlanInstallment = typeof paymentPlanInstallments.$inferSelect;
export type NewPaymentPlanInstallment = typeof paymentPlanInstallments.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export type SalesOpportunity = typeof salesOpportunities.$inferSelect;
export type NewSalesOpportunity = typeof salesOpportunities.$inferInsert;

export type SalesInstallment = typeof salesInstallments.$inferSelect;
export type NewSalesInstallment = typeof salesInstallments.$inferInsert;

export type ForecastItem = typeof forecastItems.$inferSelect;
export type NewForecastItem = typeof forecastItems.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type BackupCode = typeof backupCodes.$inferSelect;
export type NewBackupCode = typeof backupCodes.$inferInsert;

export type OtpCode = typeof otpCodes.$inferSelect;
export type NewOtpCode = typeof otpCodes.$inferInsert;

export type OtpRateLimit = typeof otpRateLimits.$inferSelect;
export type NewOtpRateLimit = typeof otpRateLimits.$inferInsert;
