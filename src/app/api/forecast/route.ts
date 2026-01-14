import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  forecastItems,
  costCenters,
  revenueCenters,
  expectedExpenses,
  expectedIncomes,
  paymentPlanInstallments,
  paymentPlans,
} from "@/lib/db/schema";
import { eq, isNull, and, gte, lte, or, SQL } from "drizzle-orm";

// GET - Recupera tutte le voci previsionale per un periodo
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const type = searchParams.get("type"); // income | expense | null (entrambi)

  const conditions: SQL[] = [isNull(forecastItems.deletedAt)];

  if (startDate) {
    conditions.push(gte(forecastItems.date, startDate));
  }
  if (endDate) {
    conditions.push(lte(forecastItems.date, endDate));
  }
  if (type === "income" || type === "expense") {
    conditions.push(eq(forecastItems.type, type));
  }

  const items = await db
    .select()
    .from(forecastItems)
    .where(and(...conditions))
    .orderBy(forecastItems.date);

  // Arricchisci con i dati dei centri costo/ricavo
  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      let costCenter = null;
      let revenueCenter = null;

      if (item.costCenterId) {
        const cc = await db
          .select()
          .from(costCenters)
          .where(eq(costCenters.id, item.costCenterId));
        costCenter = cc[0] || null;
      }

      if (item.revenueCenterId) {
        const rc = await db
          .select()
          .from(revenueCenters)
          .where(eq(revenueCenters.id, item.revenueCenterId));
        revenueCenter = rc[0] || null;
      }

      return {
        ...item,
        costCenter,
        revenueCenter,
      };
    })
  );

  return NextResponse.json(enrichedItems);
}

// POST - Crea una nuova voce manuale
export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    date,
    description,
    type,
    amount,
    costCenterId,
    revenueCenterId,
    reliability,
    priority,
    notes,
  } = body;

  if (!date || !description || !type || amount === undefined) {
    return NextResponse.json(
      { error: "Data, descrizione, tipo e importo sono obbligatori" },
      { status: 400 }
    );
  }

  const insertResult = await db
    .insert(forecastItems)
    .values({
      date,
      description,
      type,
      amount,
      sourceType: "manual",
      costCenterId: costCenterId || null,
      revenueCenterId: revenueCenterId || null,
      reliability: type === "income" ? reliability || "high" : null,
      priority: type === "expense" ? priority || "normal" : null,
      notes: notes || null,
    })
    .returning();

  return NextResponse.json(insertResult[0], { status: 201 });
}

// PUT - Genera voci dal piano annuale per un periodo
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { startDate, endDate, regenerate = false } = body;

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate e endDate sono obbligatori" },
      { status: 400 }
    );
  }

  // Se regenerate=true, elimina le voci generate (non manuali) nel periodo
  if (regenerate) {
    await db
      .update(forecastItems)
      .set({ deletedAt: new Date() })
      .where(
        and(
          gte(forecastItems.date, startDate),
          lte(forecastItems.date, endDate),
          or(
            eq(forecastItems.sourceType, "expected_expense"),
            eq(forecastItems.sourceType, "expected_income"),
            eq(forecastItems.sourceType, "pdr")
          ),
          isNull(forecastItems.deletedAt)
        )
      );
  }

  const generated: { expenses: number; incomes: number; pdr: number } = {
    expenses: 0,
    incomes: 0,
    pdr: 0,
  };

  // 1. Genera da expectedExpenses
  const expenses = await db
    .select()
    .from(expectedExpenses)
    .where(
      and(
        isNull(expectedExpenses.deletedAt),
        eq(expectedExpenses.isActive, true),
        lte(expectedExpenses.startDate, endDate),
        or(
          isNull(expectedExpenses.endDate),
          gte(expectedExpenses.endDate, startDate)
        )
      )
    );

  for (const expense of expenses) {
    const occurrences = generateOccurrences(
      expense.startDate,
      expense.endDate,
      expense.frequency,
      expense.expectedDay || 1,
      startDate,
      endDate
    );

    for (const date of occurrences) {
      // Controlla se esiste già
      const existing = await db
        .select()
        .from(forecastItems)
        .where(
          and(
            eq(forecastItems.sourceType, "expected_expense"),
            eq(forecastItems.sourceId, expense.id),
            eq(forecastItems.date, date),
            isNull(forecastItems.deletedAt)
          )
        );

      if (existing.length === 0) {
        await db.insert(forecastItems).values({
          date,
          description: expense.name,
          type: "expense",
          amount: expense.amount,
          sourceType: "expected_expense",
          sourceId: expense.id,
          costCenterId: expense.costCenterId,
          priority: expense.priority,
          notes: expense.notes,
        });
        generated.expenses++;
      }
    }
  }

  // 2. Genera da expectedIncomes
  const incomes = await db
    .select()
    .from(expectedIncomes)
    .where(
      and(
        isNull(expectedIncomes.deletedAt),
        eq(expectedIncomes.isActive, true),
        lte(expectedIncomes.startDate, endDate),
        or(
          isNull(expectedIncomes.endDate),
          gte(expectedIncomes.endDate, startDate)
        )
      )
    );

  for (const income of incomes) {
    const occurrences = generateOccurrences(
      income.startDate,
      income.endDate,
      income.frequency,
      income.expectedDay || 20,
      startDate,
      endDate
    );

    for (const date of occurrences) {
      // Controlla se esiste già
      const existing = await db
        .select()
        .from(forecastItems)
        .where(
          and(
            eq(forecastItems.sourceType, "expected_income"),
            eq(forecastItems.sourceId, income.id),
            eq(forecastItems.date, date),
            isNull(forecastItems.deletedAt)
          )
        );

      if (existing.length === 0) {
        await db.insert(forecastItems).values({
          date,
          description: income.clientName,
          type: "income",
          amount: income.amount,
          sourceType: "expected_income",
          sourceId: income.id,
          revenueCenterId: income.revenueCenterId,
          reliability: income.reliability,
          notes: income.notes,
        });
        generated.incomes++;
      }
    }
  }

  // 3. Genera da rate PDR non pagate
  const pdrInstallments = await db
    .select({
      installment: paymentPlanInstallments,
      plan: paymentPlans,
    })
    .from(paymentPlanInstallments)
    .innerJoin(
      paymentPlans,
      eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id)
    )
    .where(
      and(
        eq(paymentPlanInstallments.isPaid, false),
        gte(paymentPlanInstallments.dueDate, startDate),
        lte(paymentPlanInstallments.dueDate, endDate),
        eq(paymentPlans.isActive, true),
        isNull(paymentPlans.deletedAt)
      )
    );

  for (const { installment, plan } of pdrInstallments) {
    // Controlla se esiste già
    const existing = await db
      .select()
      .from(forecastItems)
      .where(
        and(
          eq(forecastItems.sourceType, "pdr"),
          eq(forecastItems.sourceId, installment.id),
          isNull(forecastItems.deletedAt)
        )
      );

    if (existing.length === 0) {
      await db.insert(forecastItems).values({
        date: installment.dueDate,
        description: `PDR: ${plan.creditorName}`,
        type: "expense",
        amount: installment.amount,
        sourceType: "pdr",
        sourceId: installment.id,
        paymentPlanId: plan.id,
        priority: "essential",
      });
      generated.pdr++;
    }
  }

  return NextResponse.json({
    message: "Generazione completata",
    generated,
  });
}

// Helper: genera le date di occorrenza per una voce ricorrente
function generateOccurrences(
  startDate: string,
  endDate: string | null,
  frequency: string,
  expectedDay: number,
  rangeStart: string,
  rangeEnd: string
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(rangeEnd);
  const rStart = new Date(rangeStart);
  const rEnd = new Date(rangeEnd);

  // Parti dal primo mese nel range
  let current = new Date(Math.max(start.getTime(), rStart.getTime()));
  current.setDate(1); // Inizia dal primo del mese

  while (current <= rEnd && current <= end) {
    // Calcola se questo mese è una occorrenza basata sulla frequenza
    const monthsDiff = monthDifference(start, current);
    let isOccurrence = false;

    switch (frequency) {
      case "monthly":
        isOccurrence = true;
        break;
      case "quarterly":
        isOccurrence = monthsDiff % 3 === 0;
        break;
      case "semiannual":
        isOccurrence = monthsDiff % 6 === 0;
        break;
      case "annual":
      case "one_time":
        isOccurrence = monthsDiff % 12 === 0;
        break;
    }

    if (isOccurrence) {
      // Imposta il giorno del mese (gestendo fine mese)
      const year = current.getFullYear();
      const month = current.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const day = Math.min(expectedDay, lastDay);

      const occurrenceDate = new Date(year, month, day);

      // Verifica che sia nel range effettivo
      if (occurrenceDate >= rStart && occurrenceDate <= rEnd && occurrenceDate >= start && occurrenceDate <= end) {
        dates.push(formatDate(occurrenceDate));
      }
    }

    // Avanza al mese successivo
    current.setMonth(current.getMonth() + 1);
  }

  return dates;
}

function monthDifference(d1: Date, d2: Date): number {
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
