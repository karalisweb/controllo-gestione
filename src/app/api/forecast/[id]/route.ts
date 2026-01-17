import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  forecastItems,
  paymentPlans,
  paymentPlanInstallments,
} from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

// GET - Recupera singola voce
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = parseInt(id);

  const items = await db
    .select()
    .from(forecastItems)
    .where(and(eq(forecastItems.id, itemId), isNull(forecastItems.deletedAt)));

  if (items.length === 0) {
    return NextResponse.json({ error: "Voce non trovata" }, { status: 404 });
  }

  return NextResponse.json(items[0]);
}

// PATCH - Modifica voce (data, importo, note)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = parseInt(id);
  const body = await request.json();

  const { date, amount, description, notes, reliability, priority, costCenterId, revenueCenterId } = body;

  // Verifica che la voce esista
  const existing = await db
    .select()
    .from(forecastItems)
    .where(and(eq(forecastItems.id, itemId), isNull(forecastItems.deletedAt)));

  if (existing.length === 0) {
    return NextResponse.json({ error: "Voce non trovata" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (date !== undefined) updateData.date = date;
  if (amount !== undefined) updateData.amount = amount;
  if (description !== undefined) updateData.description = description;
  if (notes !== undefined) updateData.notes = notes;
  if (reliability !== undefined) updateData.reliability = reliability;
  if (priority !== undefined) updateData.priority = priority;
  if (costCenterId !== undefined) updateData.costCenterId = costCenterId;
  if (revenueCenterId !== undefined) updateData.revenueCenterId = revenueCenterId;

  const updated = await db
    .update(forecastItems)
    .set(updateData)
    .where(eq(forecastItems.id, itemId))
    .returning();

  return NextResponse.json(updated[0]);
}

// DELETE - Elimina voce (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = parseInt(id);

  const existing = await db
    .select()
    .from(forecastItems)
    .where(and(eq(forecastItems.id, itemId), isNull(forecastItems.deletedAt)));

  if (existing.length === 0) {
    return NextResponse.json({ error: "Voce non trovata" }, { status: 404 });
  }

  await db
    .update(forecastItems)
    .set({ deletedAt: new Date() })
    .where(eq(forecastItems.id, itemId));

  return NextResponse.json({ message: "Voce eliminata" });
}

// POST - Sposta in Piano di Rientro
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = parseInt(id);
  const body = await request.json();

  const { paymentPlanId, newPlanData } = body;
  // paymentPlanId: ID piano esistente
  // newPlanData: { creditorName, installmentAmount, totalInstallments, startDate, notes }

  // Recupera la voce
  const items = await db
    .select()
    .from(forecastItems)
    .where(and(eq(forecastItems.id, itemId), isNull(forecastItems.deletedAt)));

  if (items.length === 0) {
    return NextResponse.json({ error: "Voce non trovata" }, { status: 404 });
  }

  const item = items[0];

  if (item.type !== "expense") {
    return NextResponse.json(
      { error: "Solo le spese possono essere spostate in PDR" },
      { status: 400 }
    );
  }

  let planId = paymentPlanId;

  // Se non c'è un piano esistente, creane uno nuovo
  if (!planId && newPlanData) {
    const {
      creditorName,
      installmentAmount,
      totalInstallments,
      startDate,
      notes,
    } = newPlanData;

    if (!creditorName || !installmentAmount || !totalInstallments || !startDate) {
      return NextResponse.json(
        { error: "Dati piano incompleti" },
        { status: 400 }
      );
    }

    const newPlan = await db
      .insert(paymentPlans)
      .values({
        creditorName,
        totalAmount: item.amount,
        installmentAmount,
        totalInstallments,
        paidInstallments: 0,
        startDate,
        notes: notes || null,
        isActive: true,
      })
      .returning();

    planId = newPlan[0].id;

    // Genera le rate del nuovo piano
    const planStartDate = new Date(startDate);
    for (let i = 0; i < totalInstallments; i++) {
      const dueDate = new Date(planStartDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      await db.insert(paymentPlanInstallments).values({
        paymentPlanId: planId,
        dueDate: formatDate(dueDate),
        amount: installmentAmount,
        isPaid: false,
      });
    }
  }

  if (!planId) {
    return NextResponse.json(
      { error: "Specificare paymentPlanId o newPlanData" },
      { status: 400 }
    );
  }

  // Se aggiunta a piano esistente, aggiungi una rata
  if (paymentPlanId && !newPlanData) {
    // Trova la prossima data disponibile nel piano
    const existingInstallments = await db
      .select()
      .from(paymentPlanInstallments)
      .where(eq(paymentPlanInstallments.paymentPlanId, paymentPlanId))
      .orderBy(paymentPlanInstallments.dueDate);

    let nextDueDate: Date;
    if (existingInstallments.length > 0) {
      const lastDate = new Date(
        existingInstallments[existingInstallments.length - 1].dueDate
      );
      nextDueDate = new Date(lastDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    } else {
      nextDueDate = new Date();
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }

    // Aggiungi la rata
    await db.insert(paymentPlanInstallments).values({
      paymentPlanId,
      dueDate: formatDate(nextDueDate),
      amount: item.amount,
      isPaid: false,
    });

    // Aggiorna il totale del piano
    const plan = await db
      .select()
      .from(paymentPlans)
      .where(eq(paymentPlans.id, paymentPlanId));

    if (plan.length > 0) {
      await db
        .update(paymentPlans)
        .set({
          totalAmount: plan[0].totalAmount + item.amount,
          totalInstallments: plan[0].totalInstallments + 1,
        })
        .where(eq(paymentPlans.id, paymentPlanId));
    }
  }

  // Elimina la voce originale dal previsionale (soft delete)
  await db
    .update(forecastItems)
    .set({ deletedAt: new Date() })
    .where(eq(forecastItems.id, itemId));

  return NextResponse.json({
    message: "Voce spostata in Piano di Rientro",
    paymentPlanId: planId,
  });
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
