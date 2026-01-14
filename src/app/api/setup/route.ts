import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings, costCenters, expectedExpenses, paymentPlans, paymentPlanInstallments, revenueCenters, expectedIncomes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Centri di costo (aggregatori)
const COST_CENTERS_DATA = [
  { name: "Server", description: "Server e hosting", color: "#ef4444" },
  { name: "Software", description: "Abbonamenti software", color: "#f97316" },
  { name: "Telefonia", description: "Telefonia e comunicazioni", color: "#eab308" },
  { name: "ADS", description: "Pubblicità", color: "#22c55e" },
  { name: "Ufficio", description: "Affitto e utilities", color: "#3b82f6" },
  { name: "Auto", description: "Costi auto aziendale", color: "#8b5cf6" },
  { name: "Consulenti", description: "Consulenze professionali", color: "#ec4899" },
  { name: "Collaboratori", description: "Stipendi collaboratori", color: "#06b6d4" },
  { name: "Tasse", description: "Imposte e tasse", color: "#64748b" },
  { name: "Debiti", description: "Rate finanziamenti", color: "#dc2626" },
];

// Spese previste (singole voci)
const EXPECTED_EXPENSES_DATA = [
  // Server & Hosting
  { name: "Server Contabo", category: "Server", amount: 486.78, frequency: "monthly", day: 6, priority: "essential" },
  { name: "Fatture in Cloud", category: "Software", amount: 424.56, frequency: "annual", day: 1, priority: "normal", startMonth: 2 },

  // Software
  { name: "iCloud", category: "Software", amount: 2.99, frequency: "monthly", day: 6, priority: "normal" },
  { name: "Miro", category: "Software", amount: 11.00, frequency: "monthly", day: 1, priority: "normal" },
  { name: "Tella", category: "Software", amount: 15.00, frequency: "monthly", day: 1, priority: "normal" },
  { name: "ChatGPT", category: "Software", amount: 18.85, frequency: "monthly", day: 7, priority: "normal" },
  { name: "Asana", category: "Software", amount: 26.00, frequency: "monthly", day: 1, priority: "normal" },
  { name: "Claude Max", category: "Software", amount: 100.00, frequency: "monthly", day: 16, priority: "essential" },
  { name: "Adobe Apps", category: "Software", amount: 29.99, frequency: "monthly", day: 1, priority: "normal" },
  { name: "ISF", category: "Software", amount: 97.48, frequency: "monthly", day: 1, priority: "normal" },
  { name: "PhantomBuster", category: "Software", amount: 159.00, frequency: "monthly", day: 1, priority: "normal" },
  { name: "Apple (App Store)", category: "Software", amount: 10.99, frequency: "monthly", day: 11, priority: "normal" },
  { name: "Envato", category: "Software", amount: 8.70, frequency: "monthly", day: 10, priority: "normal" },

  // Telefonia
  { name: "Wind", category: "Telefonia", amount: 70.78, frequency: "monthly", day: 2, priority: "essential" },
  { name: "MyCentralino", category: "Telefonia", amount: 24.99, frequency: "monthly", day: 5, priority: "normal" },
  { name: "TeamSystem", category: "Telefonia", amount: 122.00, frequency: "monthly", day: 1, priority: "normal" },

  // ADS
  { name: "LinkedIn", category: "ADS", amount: 52.12, frequency: "monthly", day: 2, priority: "normal" },

  // Ufficio
  { name: "FastRent", category: "Ufficio", amount: 86.62, frequency: "monthly", day: 2, priority: "normal" },

  // Auto
  { name: "Auto NLT", category: "Auto", amount: 343.11, frequency: "monthly", day: 1, priority: "normal" },

  // Consulenti
  { name: "Commercialista", category: "Consulenti", amount: 150.00, frequency: "monthly", day: 1, priority: "essential" },

  // Collaboratori (stipendi)
  { name: "Stipendio Matteo", category: "Collaboratori", amount: 400.00, frequency: "monthly", day: 20, priority: "essential" },
  { name: "Stipendio Stefano", category: "Collaboratori", amount: 600.00, frequency: "monthly", day: 20, priority: "essential" },
  { name: "Stipendio Davide", category: "Collaboratori", amount: 400.00, frequency: "monthly", day: 20, priority: "essential" },

  // Tasse
  { name: "Tasse trimestrali", category: "Tasse", amount: 550.00, frequency: "monthly", day: 16, priority: "essential" },

  // Debiti
  { name: "Rata Anticipo Fatture Qonto", category: "Debiti", amount: 552.00, frequency: "monthly", day: 3, priority: "essential" },
];

// Debiti PDR (Piani di Rientro)
const PAYMENT_PLANS_DATA = [
  { creditor: "Result Consulting", total: 2854.30, installment: 407.76, startDate: "2026-01-01", notes: "Formazione" },
  { creditor: "Volkswagen", total: 1720.22, installment: 343.22, startDate: "2026-01-01", notes: "Debito auto" },
  { creditor: "TeamSystem PDR", total: 2100.00, installment: 366.00, startDate: "2026-01-01", notes: "Telefonia arretrata" },
  { creditor: "Minelli", total: 1592.00, installment: 400.00, startDate: "2026-01-01", notes: "Collaboratore" },
  { creditor: "Fiorella", total: 10000.00, installment: 0, startDate: "2026-01-01", notes: "Collaboratore - DA NEGOZIARE" },
  { creditor: "Daniele Novello", total: 520.00, installment: 0, startDate: "2026-01-01", notes: "Consulente - DA NEGOZIARE" },
  { creditor: "Google ADS", total: 550.00, installment: 0, startDate: "2026-01-01", notes: "ADV arretrato - DA NEGOZIARE" },
  { creditor: "Debito Regus", total: 1700.00, installment: 0, startDate: "2026-01-01", notes: "Ufficio - DA NEGOZIARE" },
  { creditor: "Tasse arretrate", total: 3192.00, installment: 533.00, startDate: "2026-01-01", notes: "AdE" },
];

// Centri di ricavo (aggregatori)
const REVENUE_CENTERS_DATA = [
  { name: "Siti Web", description: "Sviluppo e manutenzione siti web", color: "#3b82f6" },
  { name: "Marketing", description: "Servizi marketing e SEO", color: "#22c55e" },
  { name: "Domini", description: "Registrazione e rinnovo domini", color: "#f97316" },
  { name: "Licenze", description: "Licenze software", color: "#8b5cf6" },
];

// Clienti ricorrenti (incassi previsti)
const EXPECTED_INCOMES_DATA = [
  { client: "Anime Artigianali", amount: 137.86, frequency: "monthly", reliability: "high", startDate: "2026-01-01" },
  { client: "Biores", amount: 1738.50, frequency: "annual", reliability: "high", startDate: "2026-01-01" },
  { client: "Orizzonte", amount: 366.00, frequency: "monthly", reliability: "high", startDate: "2026-01-01" },
  { client: "Gianfelice Piras", amount: 869.25, frequency: "quarterly", reliability: "medium", startDate: "2026-01-01" },
  { client: "Arredi 2000", amount: 225.70, frequency: "monthly", reliability: "high", startDate: "2026-01-01" },
  { client: "CUPF", amount: 250.00, frequency: "monthly", reliability: "high", startDate: "2026-01-01" },
  { client: "Colombo Palace", amount: 317.20, frequency: "monthly", reliability: "high", startDate: "2026-01-01" },
  { client: "BelClima", amount: 234.34, frequency: "monthly", reliability: "high", startDate: "2026-01-01" },
];

export async function POST() {
  try {
    // 1. Inserisci saldo iniziale
    await db.insert(settings).values({
      key: "initial_balance",
      value: "2000", // 20€ in centesimi
      type: "number",
      description: "Saldo cassa iniziale al 01/01/2026 (centesimi)",
    }).onConflictDoUpdate({
      target: settings.key,
      set: { value: "2000" },
    });

    await db.insert(settings).values({
      key: "balance_date",
      value: "2026-01-01",
      type: "date",
      description: "Data del saldo iniziale",
    }).onConflictDoUpdate({
      target: settings.key,
      set: { value: "2026-01-01" },
    });

    // 2. Inserisci centri di costo (aggregatori)
    const costCenterIds: Record<string, number> = {};
    for (const center of COST_CENTERS_DATA) {
      const existing = await db.select().from(costCenters).where(eq(costCenters.name, center.name)).limit(1);

      if (existing.length === 0) {
        const result = await db.insert(costCenters).values({
          name: center.name,
          description: center.description,
          color: center.color,
          isActive: true,
        }).returning();
        if (result[0]) {
          costCenterIds[center.name] = result[0].id;
        }
      } else {
        costCenterIds[center.name] = existing[0].id;
      }
    }

    // 3. Inserisci spese previste
    for (const expense of EXPECTED_EXPENSES_DATA) {
      const existing = await db.select().from(expectedExpenses).where(eq(expectedExpenses.name, expense.name)).limit(1);

      if (existing.length === 0) {
        const startMonth = expense.startMonth || 1;
        await db.insert(expectedExpenses).values({
          name: expense.name,
          costCenterId: costCenterIds[expense.category] || null,
          amount: Math.round(expense.amount * 100), // centesimi
          frequency: expense.frequency as "monthly" | "quarterly" | "semiannual" | "annual" | "one_time",
          expectedDay: expense.day,
          startDate: `2026-${String(startMonth).padStart(2, "0")}-01`,
          priority: expense.priority as "essential" | "important" | "investment" | "normal",
          isActive: true,
        });
      }
    }

    // 4. Inserisci piani di rientro PDR
    for (const plan of PAYMENT_PLANS_DATA) {
      const existing = await db.select().from(paymentPlans).where(eq(paymentPlans.creditorName, plan.creditor)).limit(1);

      if (existing.length === 0) {
        const totalInstallments = plan.installment > 0
          ? Math.ceil(plan.total / plan.installment)
          : 0;

        const [newPlan] = await db.insert(paymentPlans).values({
          creditorName: plan.creditor,
          totalAmount: Math.round(plan.total * 100), // centesimi
          installmentAmount: Math.round(plan.installment * 100), // centesimi
          totalInstallments: totalInstallments,
          paidInstallments: 0,
          startDate: plan.startDate,
          notes: plan.notes,
          isActive: true,
        }).returning();

        // Genera le rate se c'è un importo rata definito
        if (plan.installment > 0 && newPlan) {
          for (let i = 0; i < totalInstallments; i++) {
            const dueDate = new Date(plan.startDate);
            dueDate.setMonth(dueDate.getMonth() + i);

            await db.insert(paymentPlanInstallments).values({
              paymentPlanId: newPlan.id,
              dueDate: dueDate.toISOString().split('T')[0],
              amount: Math.round(plan.installment * 100),
              isPaid: false,
            });
          }
        }
      }
    }

    // 5. Inserisci centri di ricavo (aggregatori)
    let sitiWebId: number | null = null;
    for (const revenue of REVENUE_CENTERS_DATA) {
      const existing = await db.select().from(revenueCenters).where(eq(revenueCenters.name, revenue.name)).limit(1);

      if (existing.length === 0) {
        const result = await db.insert(revenueCenters).values({
          name: revenue.name,
          description: revenue.description,
          color: revenue.color,
          isActive: true,
        }).returning();
        if (revenue.name === "Siti Web" && result[0]) {
          sitiWebId = result[0].id;
        }
      } else if (revenue.name === "Siti Web") {
        sitiWebId = existing[0].id;
      }
    }

    // 6. Inserisci incassi previsti (clienti)
    for (const income of EXPECTED_INCOMES_DATA) {
      const existing = await db.select().from(expectedIncomes).where(eq(expectedIncomes.clientName, income.client)).limit(1);

      if (existing.length === 0) {
        await db.insert(expectedIncomes).values({
          clientName: income.client,
          revenueCenterId: sitiWebId,
          amount: Math.round(income.amount * 100), // centesimi
          frequency: income.frequency as "monthly" | "quarterly" | "semiannual" | "annual" | "one_time",
          expectedDay: 20,
          startDate: income.startDate,
          reliability: income.reliability as "high" | "medium" | "low",
          isActive: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Setup completato",
      data: {
        costCentersInserted: COST_CENTERS_DATA.length,
        expensesInserted: EXPECTED_EXPENSES_DATA.length,
        plansInserted: PAYMENT_PLANS_DATA.length,
        revenuesInserted: REVENUE_CENTERS_DATA.length,
        incomesInserted: EXPECTED_INCOMES_DATA.length,
      }
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}

// GET per verificare lo stato del setup
export async function GET() {
  try {
    const initialBalance = await db.select().from(settings).where(eq(settings.key, "initial_balance")).limit(1);
    const centers = await db.select().from(costCenters).where(eq(costCenters.isActive, true));
    const expenses = await db.select().from(expectedExpenses).where(eq(expectedExpenses.isActive, true));
    const plans = await db.select().from(paymentPlans).where(eq(paymentPlans.isActive, true));
    const revenues = await db.select().from(revenueCenters).where(eq(revenueCenters.isActive, true));

    return NextResponse.json({
      isSetupComplete: initialBalance.length > 0,
      initialBalance: initialBalance[0]?.value || "0",
      costCentersCount: centers.length,
      expensesCount: expenses.length,
      plansCount: plans.length,
      revenuesCount: revenues.length,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
