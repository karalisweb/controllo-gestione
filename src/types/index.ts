export interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string | null;
}

// Frequenze di pagamento
export type PaymentFrequency = "monthly" | "quarterly" | "semiannual" | "annual" | "one_time";
export type ExpectedFrequency = "monthly" | "quarterly" | "semiannual" | "annual" | "one_time" | "variable";
export type Reliability = "high" | "medium" | "low";
export type CostPriority = "essential" | "important" | "investment" | "normal";

// Centro di Costo - aggregatori per tipologia spese (Telefonia, Software, Collaboratori, ecc.)
export interface CostCenter {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  sortOrder: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
  // Campi calcolati
  totalExpected?: number; // totale spese previste
  spent?: number; // speso finora
  remaining?: number; // rimanente
  expectedExpensesCount?: number; // numero di spese
}

// Spesa Prevista - singola voce di spesa con importo e date
export interface ExpectedExpense {
  id: number;
  name: string;
  costCenterId: number | null;
  amount: number; // centesimi - importo singola spesa
  frequency: PaymentFrequency;
  expectedDay: number | null; // giorno del mese
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD (null = indefinito)
  priority: CostPriority | null;
  notes: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
  // Campi calcolati
  costCenter?: CostCenter | null;
  monthlyOccurrences?: number[]; // mesi in cui è prevista la spesa
}

// Centro di Ricavo - aggregatori per tipologia (Siti Web, Marketing, Domini, Licenze)
export interface RevenueCenter {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  sortOrder: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
  // Campi calcolati
  totalExpected?: number; // totale incassi previsti
  collected?: number; // incassato finora
  remaining?: number; // rimanente
  expectedIncomesCount?: number; // numero di clienti
}

// Incasso Previsto - singolo cliente con importo e date contratto
export interface ExpectedIncome {
  id: number;
  clientName: string;
  revenueCenterId: number | null;
  amount: number; // centesimi - importo singolo incasso
  frequency: PaymentFrequency;
  expectedDay: number | null; // giorno del mese
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD (null = indefinito)
  reliability: Reliability | null;
  notes: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
  // Campi calcolati
  revenueCenter?: RevenueCenter | null;
  monthlyOccurrences?: number[]; // mesi in cui è previsto l'incasso
}

export interface BudgetItem {
  id: number;
  categoryId: number | null;
  costCenterId: number | null;
  revenueCenterId: number | null;
  description: string;
  amount: number; // centesimi
  dueDate: string; // YYYY-MM-DD
  month: number;
  year: number;
  isRecurring: boolean | null;
  clientName: string | null;
  notes: string | null;
  isVerified: boolean | null;
  matchedTransactionId: number | null;
  createdAt: Date | null;
  // Relazioni
  category?: Category | null;
  costCenter?: CostCenter | null;
  revenueCenter?: RevenueCenter | null;
}

export interface BudgetItemsByMonth {
  [month: number]: {
    income: BudgetItem[];
    expense: BudgetItem[];
  };
}

export interface MonthlySummary {
  month: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface PaymentPlanInstallment {
  id: number;
  paymentPlanId: number;
  dueDate: string;
  amount: number; // centesimi
  isPaid: boolean | null;
  paidDate: string | null;
  transactionId: number | null;
  createdAt: Date | null;
  // Campi calcolati
  isSustainable?: boolean; // verificato se sostenibile
  projectedBalance?: number; // saldo previsto alla data
}

export interface PaymentPlan {
  id: number;
  creditorName: string;
  totalAmount: number; // centesimi
  installmentAmount: number; // centesimi
  totalInstallments: number;
  paidInstallments: number | null;
  startDate: string;
  notes: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
  installments?: PaymentPlanInstallment[];
  // Campi calcolati
  remainingAmount?: number;
  priority?: number; // ordine di priorità (1 = più piccolo)
}

export interface Transaction {
  id: number;
  externalId: string | null;
  date: string;
  description: string | null;
  amount: number; // centesimi
  categoryId: number | null;
  costCenterId: number | null;
  revenueCenterId: number | null;
  isSplit: boolean | null;
  isVerified: boolean | null;
  matchedBudgetItemId: number | null;
  notes: string | null;
  rawData: string | null;
  createdAt: Date | null;
  // Relazioni
  category?: Category | null;
  costCenter?: CostCenter | null;
  revenueCenter?: RevenueCenter | null;
  matchedBudgetItem?: BudgetItem | null;
}

export interface IncomeSplit {
  id: number;
  transactionId: number | null;
  grossAmount: number; // centesimi
  netAmount: number; // centesimi
  danielaAmount: number; // centesimi
  alessioAmount: number; // centesimi
  agencyAmount: number; // centesimi
  vatAmount: number; // centesimi
  createdAt: Date | null;
}

// Helper per calcolare il budget mensile da quello annuale
export function calculateMonthlyBudget(annualBudget: number, frequency: PaymentFrequency): number {
  switch (frequency) {
    case "monthly":
      return Math.round(annualBudget / 12);
    case "quarterly":
      return Math.round(annualBudget / 4);
    case "semiannual":
      return Math.round(annualBudget / 2);
    case "annual":
    case "one_time":
      return annualBudget;
    default:
      return Math.round(annualBudget / 12);
  }
}

// Helper per calcolare il numero di pagamenti all'anno
export function getPaymentsPerYear(frequency: PaymentFrequency): number {
  switch (frequency) {
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "semiannual":
      return 2;
    case "annual":
    case "one_time":
      return 1;
    default:
      return 12;
  }
}

// ============ PIANO COMMERCIALE ============

export type ProjectType = "sito_web" | "marketing" | "msd" | "licenza" | "altro";
export type PaymentPlanType = "sito_web_50_50" | "msd_30_70" | "marketing_4_trim" | "immediato" | "custom";
// objective = ipotesi/piano (es. "1 sito web a gennaio")
// opportunity = trattativa in corso (preventivo fatto, cliente specifico)
// won = vendita chiusa/vinta
// lost = persa
export type SalesStatus = "objective" | "opportunity" | "won" | "lost";

export interface SalesBreakdown {
  grossAmount: number; // centesimi - lordo IVA
  netAmount: number; // centesimi - netto (senza IVA)
  commissionAmount: number; // centesimi - commissione commerciale
  postCommissionAmount: number; // centesimi - dopo commissione
  vatAmount: number; // centesimi - IVA da versare
  partnersAmount: number; // centesimi - quota soci (30%)
  availableAmount: number; // centesimi - disponibile cassa (70% post-commissione)
}

export interface SalesInstallment {
  id: number;
  salesOpportunityId: number | null;
  dueDate: string;
  amount: number; // centesimi - importo lordo rata
  installmentNumber: number;
  isPaid: boolean | null;
  paidDate: string | null;
  transactionId: number | null;
  createdAt: Date | null;
}

export interface SalesOpportunity {
  id: number;
  clientName: string | null; // null per obiettivi generici
  projectType: ProjectType;
  totalAmount: number; // centesimi - lordo IVA
  commissionRate: number; // percentuale (es. 20)
  paymentType: PaymentPlanType;
  month: number; // mese obiettivo (1-12)
  year: number;
  status: SalesStatus;
  closedDate: string | null; // YYYY-MM-DD
  notes: string | null;
  createdAt: Date | null;
  deletedAt: Date | null;
  // Campi calcolati
  breakdown?: SalesBreakdown;
  installments?: SalesInstallment[];
}

export interface MonthlyGap {
  month: number;
  year: number;
  // Entrate previste
  expectedIncomeGross: number;
  expectedIncomeAvailable: number;
  // Uscite previste
  expectedExpenses: number;
  pdrInstallments: number;
  totalOutflows: number;
  // Gap
  gap: number;
  // Target vendite
  salesTargetGross: number;
  salesTargetAvailable: number;
  // Vendite inserite
  sales: {
    count: number;
    totalGross: number;
    totalCommission: number;
    totalAvailable: number;
    closedGross: number;
    closedAvailable: number;
  };
  // Progresso
  remainingGap: number;
  remainingTargetGross: number;
  progress: number;
}

export interface YearGapSummary {
  expectedIncomeGross: number;
  expectedIncomeAvailable: number;
  expectedExpenses: number;
  pdrInstallments: number;
  totalOutflows: number;
  gap: number;
  salesTargetGross: number;
  salesTotalGross: number;
  salesTotalCommission: number;
  salesTotalAvailable: number;
  salesClosedGross: number;
  salesClosedAvailable: number;
  remainingGap: number;
}
