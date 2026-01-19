import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  expectedExpenses,
  expectedIncomes,
  paymentPlanInstallments,
  paymentPlans,
  salesOpportunities,
  salesInstallments,
} from "@/lib/db/schema";
import { eq, and, isNull, or, lte, gte } from "drizzle-orm";

// Helper per ottenere le scadenze di un mese specifico
function getMonthDateRange(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Ultimo giorno del mese
  return {
    start: startDate.toISOString().split("T")[0],
    end: endDate.toISOString().split("T")[0],
  };
}

// Calcola il target vendite lordo per generare un certo disponibile
function calculateSalesTarget(
  requiredAvailable: number,
  commissionRate: number = 0
): number {
  if (requiredAvailable <= 0) return 0;

  // Lavoriamo a ritroso:
  // disponibile = post_commissione * 0.70 (dopo soci 30%)
  // post_commissione = netto - commissione = netto * (1 - comm/100)
  // netto = lordo / 1.22

  // Quindi:
  // disponibile = (lordo / 1.22) * (1 - comm/100) * 0.70
  // lordo = disponibile / ((1 - comm/100) * 0.70 / 1.22)
  // lordo = disponibile * 1.22 / ((1 - comm/100) * 0.70)

  const commissionFactor = 1 - commissionRate / 100;
  const partnersFactor = 0.70; // 70% rimane dopo 30% soci

  const grossAmount = Math.round(
    (requiredAvailable * 1.22) / (commissionFactor * partnersFactor)
  );

  return grossAmount;
}

// Calcola il disponibile generato da un lordo
function calculateAvailableFromGross(
  grossAmount: number,
  commissionRate: number = 0
): number {
  const netAmount = Math.round(grossAmount / 1.22);
  const commissionAmount = Math.round(netAmount * (commissionRate / 100));
  const postCommission = netAmount - commissionAmount;
  const partnersAmount = Math.round(postCommission * 0.30);
  const available = postCommission - partnersAmount;
  return available;
}

// Calcola la commissione da un lordo
function calculateCommissionFromGross(
  grossAmount: number,
  commissionRate: number = 0
): number {
  const netAmount = Math.round(grossAmount / 1.22);
  const commissionAmount = Math.round(netAmount * (commissionRate / 100));
  return commissionAmount;
}

// Genera le rate virtuali per una vendita in base al tipo di pagamento
// Ritorna un array di { month, year, grossAmount }
function generateVirtualInstallments(
  totalAmount: number,
  paymentType: string,
  startMonth: number,
  startYear: number
): { month: number; year: number; grossAmount: number }[] {
  switch (paymentType) {
    case "sito_web_50_50":
      // 50% subito, 50% a 60 giorni (circa 2 mesi dopo)
      const firstInstallment = Math.round(totalAmount / 2);
      const secondInstallment = totalAmount - firstInstallment;

      // Calcola il mese della seconda rata (2 mesi dopo)
      let secondMonth = startMonth + 2;
      let secondYear = startYear;
      if (secondMonth > 12) {
        secondMonth -= 12;
        secondYear += 1;
      }

      return [
        { month: startMonth, year: startYear, grossAmount: firstInstallment },
        { month: secondMonth, year: secondYear, grossAmount: secondInstallment },
      ];

    case "msd_30_70":
      // 30% subito, 70% a 21 giorni (stesso mese, considerando che 21gg è meno di 1 mese)
      const msdFirst = Math.round(totalAmount * 0.30);
      const msdSecond = totalAmount - msdFirst;
      // 21 giorni = stesso mese nella maggior parte dei casi
      return [
        { month: startMonth, year: startYear, grossAmount: msdFirst },
        { month: startMonth, year: startYear, grossAmount: msdSecond },
      ];

    case "marketing_4_trim":
      // 4 rate trimestrali anticipate
      const quarterlyAmount = Math.round(totalAmount / 4);
      const installments = [];

      for (let i = 0; i < 4; i++) {
        let instMonth = startMonth + (i * 3);
        let instYear = startYear;

        while (instMonth > 12) {
          instMonth -= 12;
          instYear += 1;
        }

        // L'ultima rata prende il resto per evitare errori di arrotondamento
        const amount = i === 3 ? totalAmount - (quarterlyAmount * 3) : quarterlyAmount;

        installments.push({
          month: instMonth,
          year: instYear,
          grossAmount: amount,
        });
      }

      return installments;

    case "immediato":
    case "custom":
    default:
      // 100% subito
      return [
        { month: startMonth, year: startYear, grossAmount: totalAmount },
      ];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const year = parseInt(searchParams.get("year") || "2026");
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;
  const commissionRate = parseInt(searchParams.get("commission") || "0");

  // Calcola sempre tutti i 12 mesi per distribuire correttamente le rate
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // PRIMA: Recupera tutte le vendite dell'anno e calcola la distribuzione delle rate
  const allSales = await db
    .select()
    .from(salesOpportunities)
    .where(
      and(
        eq(salesOpportunities.year, year),
        isNull(salesOpportunities.deletedAt)
      )
    );

  // Mappa per accumulare le rate per mese
  const salesByInstallmentMonth: Map<number, {
    grossAmount: number;
    availableAmount: number;
    commissionAmount: number;
    wonGross: number;
    wonAvailable: number;
    salesInMonth: typeof allSales;
  }> = new Map();

  // Inizializza tutti i mesi
  for (let m = 1; m <= 12; m++) {
    salesByInstallmentMonth.set(m, {
      grossAmount: 0,
      availableAmount: 0,
      commissionAmount: 0,
      wonGross: 0,
      wonAvailable: 0,
      salesInMonth: [],
    });
  }

  // Per ogni vendita, genera le rate virtuali e distribuiscile nei mesi corretti
  for (const sale of allSales) {
    // Aggiungi la vendita al mese obiettivo (per il conteggio)
    const monthData = salesByInstallmentMonth.get(sale.month);
    if (monthData) {
      monthData.salesInMonth.push(sale);
    }

    // Genera le rate virtuali partendo dal mese obiettivo
    const installments = generateVirtualInstallments(
      sale.totalAmount,
      sale.paymentType,
      sale.month,
      sale.year
    );

    // Distribuisci ogni rata nel mese corretto
    for (const inst of installments) {
      // Solo le rate dell'anno corrente
      if (inst.year === year && inst.month >= 1 && inst.month <= 12) {
        const instMonthData = salesByInstallmentMonth.get(inst.month);
        if (instMonthData) {
          const available = calculateAvailableFromGross(inst.grossAmount, sale.commissionRate);
          const commission = calculateCommissionFromGross(inst.grossAmount, sale.commissionRate);
          instMonthData.grossAmount += inst.grossAmount;
          instMonthData.availableAmount += available;
          instMonthData.commissionAmount += commission;

          if (sale.status === "won") {
            instMonthData.wonGross += inst.grossAmount;
            instMonthData.wonAvailable += available;
          }
        }
      }
    }
  }

  const monthlyGaps = [];

  for (const m of months) {
    const { start: monthStart, end: monthEnd } = getMonthDateRange(m, year);

    // 1. ENTRATE PREVISTE (solo alta affidabilità per essere conservativi)
    const incomes = await db
      .select()
      .from(expectedIncomes)
      .where(
        and(
          eq(expectedIncomes.isActive, true),
          isNull(expectedIncomes.deletedAt),
          lte(expectedIncomes.startDate, monthEnd),
          or(isNull(expectedIncomes.endDate), gte(expectedIncomes.endDate, monthStart))
        )
      );

    // Calcola entrate per questo mese
    let totalIncome = 0;
    for (const income of incomes) {
      const startDate = new Date(income.startDate);
      const startMonth = startDate.getMonth() + 1;
      const startYear = startDate.getFullYear();

      if (income.frequency === "monthly") {
        if (year > startYear || (year === startYear && m >= startMonth)) {
          totalIncome += income.amount;
        }
      } else if (income.frequency === "quarterly") {
        const monthsDiff = (year - startYear) * 12 + (m - startMonth);
        if (monthsDiff >= 0 && monthsDiff % 3 === 0) {
          totalIncome += income.amount;
        }
      } else if (income.frequency === "semiannual") {
        const monthsDiff = (year - startYear) * 12 + (m - startMonth);
        if (monthsDiff >= 0 && monthsDiff % 6 === 0) {
          totalIncome += income.amount;
        }
      } else if (income.frequency === "annual" || income.frequency === "one_time") {
        if (startMonth === m && startYear === year) {
          totalIncome += income.amount;
        }
      }
    }

    // Applica la ripartizione: solo il 48% è disponibile
    const availableFromIncome = Math.round(totalIncome * 0.48);

    // 2. USCITE PREVISTE (costi fissi)
    const expenses = await db
      .select()
      .from(expectedExpenses)
      .where(
        and(
          eq(expectedExpenses.isActive, true),
          isNull(expectedExpenses.deletedAt),
          lte(expectedExpenses.startDate, monthEnd),
          or(isNull(expectedExpenses.endDate), gte(expectedExpenses.endDate, monthStart))
        )
      );

    // Calcola uscite per questo mese
    let totalExpenses = 0;
    for (const expense of expenses) {
      const startDate = new Date(expense.startDate);
      const startMonth = startDate.getMonth() + 1;
      const startYear = startDate.getFullYear();

      if (expense.frequency === "monthly") {
        if (year > startYear || (year === startYear && m >= startMonth)) {
          totalExpenses += expense.amount;
        }
      } else if (expense.frequency === "quarterly") {
        const monthsDiff = (year - startYear) * 12 + (m - startMonth);
        if (monthsDiff >= 0 && monthsDiff % 3 === 0) {
          totalExpenses += expense.amount;
        }
      } else if (expense.frequency === "semiannual") {
        const monthsDiff = (year - startYear) * 12 + (m - startMonth);
        if (monthsDiff >= 0 && monthsDiff % 6 === 0) {
          totalExpenses += expense.amount;
        }
      } else if (expense.frequency === "annual" || expense.frequency === "one_time") {
        if (startMonth === m && startYear === year) {
          totalExpenses += expense.amount;
        }
      }
    }

    // 3. RATE PDR del mese
    const pdrInstallments = await db
      .select({
        amount: paymentPlanInstallments.amount,
        isPaid: paymentPlanInstallments.isPaid,
      })
      .from(paymentPlanInstallments)
      .innerJoin(
        paymentPlans,
        eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id)
      )
      .where(
        and(
          gte(paymentPlanInstallments.dueDate, monthStart),
          lte(paymentPlanInstallments.dueDate, monthEnd),
          eq(paymentPlans.isActive, true)
        )
      );

    const totalPDR = pdrInstallments.reduce((sum, inst) => sum + inst.amount, 0);

    // 4. VENDITE - usa le rate distribuite precedentemente
    const salesData = salesByInstallmentMonth.get(m)!;
    const totalSalesGross = salesData.grossAmount;
    const totalSalesAvailable = salesData.availableAmount;
    const totalSalesCommission = salesData.commissionAmount;
    const closedSalesGross = salesData.wonGross;
    const closedSalesAvailable = salesData.wonAvailable;

    // 5. CALCOLA IL GAP
    // Gap = Uscite totali - Entrate disponibili
    const totalOutflows = totalExpenses + totalPDR;
    const gap = totalOutflows - availableFromIncome;

    // 6. CALCOLA TARGET VENDITE
    // Target = gap che rimane da coprire con le vendite
    const remainingGap = Math.max(0, gap - totalSalesAvailable);
    const salesTarget = calculateSalesTarget(gap > 0 ? gap : 0, commissionRate);

    // 7. CALCOLA PROGRESSO
    const progress = gap > 0 ? Math.min(100, Math.round((totalSalesAvailable / gap) * 100)) : 100;

    monthlyGaps.push({
      month: m,
      year,

      // Entrate previste
      expectedIncomeGross: totalIncome,
      expectedIncomeAvailable: availableFromIncome,

      // Uscite previste
      expectedExpenses: totalExpenses,
      pdrInstallments: totalPDR,
      totalOutflows,

      // Gap
      gap: gap > 0 ? gap : 0,

      // Target vendite (per coprire il gap)
      salesTargetGross: salesTarget,
      salesTargetAvailable: gap > 0 ? gap : 0,

      // Vendite inserite (rate che cadono in questo mese)
      sales: {
        count: salesData.salesInMonth.length, // vendite che hanno questo mese come obiettivo
        totalGross: totalSalesGross,
        totalCommission: totalSalesCommission,
        totalAvailable: totalSalesAvailable,
        closedGross: closedSalesGross,
        closedAvailable: closedSalesAvailable,
      },

      // Progresso
      remainingGap,
      remainingTargetGross: calculateSalesTarget(remainingGap, commissionRate),
      progress,
    });
  }

  // Se richiesto un mese specifico, filtra
  const filteredGaps = month ? monthlyGaps.filter(g => g.month === month) : monthlyGaps;

  // Calcola totali anno
  const yearTotals = {
    expectedIncomeGross: monthlyGaps.reduce((s, m) => s + m.expectedIncomeGross, 0),
    expectedIncomeAvailable: monthlyGaps.reduce((s, m) => s + m.expectedIncomeAvailable, 0),
    expectedExpenses: monthlyGaps.reduce((s, m) => s + m.expectedExpenses, 0),
    pdrInstallments: monthlyGaps.reduce((s, m) => s + m.pdrInstallments, 0),
    totalOutflows: monthlyGaps.reduce((s, m) => s + m.totalOutflows, 0),
    gap: monthlyGaps.reduce((s, m) => s + m.gap, 0),
    salesTargetGross: monthlyGaps.reduce((s, m) => s + m.salesTargetGross, 0),
    salesTotalGross: monthlyGaps.reduce((s, m) => s + m.sales.totalGross, 0),
    salesTotalCommission: monthlyGaps.reduce((s, m) => s + m.sales.totalCommission, 0),
    salesTotalAvailable: monthlyGaps.reduce((s, m) => s + m.sales.totalAvailable, 0),
    salesClosedGross: monthlyGaps.reduce((s, m) => s + m.sales.closedGross, 0),
    salesClosedAvailable: monthlyGaps.reduce((s, m) => s + m.sales.closedAvailable, 0),
    remainingGap: monthlyGaps.reduce((s, m) => s + m.remainingGap, 0),
  };

  const yearProgress =
    yearTotals.gap > 0
      ? Math.min(100, Math.round((yearTotals.salesTotalAvailable / yearTotals.gap) * 100))
      : 100;

  return NextResponse.json({
    months: month ? filteredGaps[0] : monthlyGaps,
    year: yearTotals,
    yearProgress,
    commissionRate,
  });
}
