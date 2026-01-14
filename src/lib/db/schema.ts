import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

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

// Movimenti reali (consuntivo) - importati da Qonto - importi in centesimi
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  externalId: text("external_id").unique(), // ID Qonto per evitare duplicati
  date: text("date").notNull(), // formato YYYY-MM-DD
  description: text("description"),
  amount: integer("amount").notNull(), // centesimi, positivo = entrata, negativo = uscita
  categoryId: integer("category_id").references(() => categories.id),
  costCenterId: integer("cost_center_id").references(() => costCenters.id), // centro di costo
  revenueCenterId: integer("revenue_center_id").references(() => revenueCenters.id), // centro di ricavo
  isSplit: integer("is_split", { mode: "boolean" }).default(false),
  isTransfer: integer("is_transfer", { mode: "boolean" }).default(false), // true = giroconto/ripartizione, non è una spesa operativa
  isVerified: integer("is_verified", { mode: "boolean" }).default(false), // verificato con previsionale
  matchedBudgetItemId: integer("matched_budget_item_id").references(() => budgetItems.id), // voce previsionale corrispondente
  linkedTransactionId: integer("linked_transaction_id"), // collegamento a transazione originale (es. incasso per cui questo è il bonifico soci)
  notes: text("notes"),
  rawData: text("raw_data"), // JSON dati originali Qonto
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

// Piani di rientro - importi in centesimi
export const paymentPlans = sqliteTable("payment_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  creditorName: text("creditor_name").notNull(),
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

  // Per incassi: affidabilità
  reliability: text("reliability", { enum: ["high", "medium", "low"] }).default("high"),

  // Per spese: priorità
  priority: text("priority", { enum: ["essential", "important", "investment", "normal"] }).default("normal"),

  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Types per le tabelle
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
