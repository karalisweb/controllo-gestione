import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentPlans, paymentPlanInstallments } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const activeOnly = searchParams.get("active") === "true";

  const conditions = [isNull(paymentPlans.deletedAt)];
  if (activeOnly) {
    conditions.push(eq(paymentPlans.isActive, true));
  }

  const plans = await db
    .select()
    .from(paymentPlans)
    .where(and(...conditions))
    .orderBy(paymentPlans.startDate);

  // Per ogni piano, recupera le rate
  const plansWithInstallments = await Promise.all(
    plans.map(async (plan) => {
      const installments = await db
        .select()
        .from(paymentPlanInstallments)
        .where(eq(paymentPlanInstallments.paymentPlanId, plan.id))
        .orderBy(paymentPlanInstallments.dueDate);

      return {
        ...plan,
        installments,
      };
    })
  );

  return NextResponse.json(plansWithInstallments);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    creditorName,
    totalAmount,
    installmentAmount,
    totalInstallments,
    startDate,
    notes,
  } = body;

  // Validazione
  if (!creditorName || !totalAmount || !totalInstallments || !startDate) {
    return NextResponse.json(
      { error: "Nome creditore, importo totale, numero rate e data inizio sono obbligatori" },
      { status: 400 }
    );
  }

  // Calcola importo rata se non fornito
  const calculatedInstallmentAmount = installmentAmount || Math.ceil(totalAmount / totalInstallments);

  // Crea il piano di rientro
  const insertResult = await db.insert(paymentPlans).values({
    creditorName,
    totalAmount, // centesimi
    installmentAmount: calculatedInstallmentAmount, // centesimi
    totalInstallments,
    paidInstallments: 0,
    startDate,
    notes: notes || null,
    isActive: true,
  }).returning();
  const plan = Array.isArray(insertResult) ? insertResult[0] : null;
  if (!plan) {
    return NextResponse.json({ error: "Errore nella creazione del piano" }, { status: 500 });
  }

  // Genera automaticamente le rate
  const installmentsToCreate = [];
  const startDateObj = new Date(startDate);

  for (let i = 0; i < totalInstallments; i++) {
    const dueDate = new Date(startDateObj);
    dueDate.setMonth(dueDate.getMonth() + i);

    // Se è l'ultima rata, aggiusta l'importo per coprire eventuali differenze di arrotondamento
    let amount = calculatedInstallmentAmount;
    if (i === totalInstallments - 1) {
      const paidSoFar = calculatedInstallmentAmount * (totalInstallments - 1);
      amount = totalAmount - paidSoFar;
    }

    installmentsToCreate.push({
      paymentPlanId: plan.id,
      dueDate: dueDate.toISOString().split("T")[0],
      amount,
      isPaid: false,
    });
  }

  await db.insert(paymentPlanInstallments).values(installmentsToCreate);

  // Recupera il piano con le rate create
  const installments = await db
    .select()
    .from(paymentPlanInstallments)
    .where(eq(paymentPlanInstallments.paymentPlanId, plan.id))
    .orderBy(paymentPlanInstallments.dueDate);

  return NextResponse.json({ ...plan, installments }, { status: 201 });
}
