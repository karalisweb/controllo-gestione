import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentPlans, paymentPlanInstallments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const planId = parseInt(id);

  const planArr = await db
    .select()
    .from(paymentPlans)
    .where(eq(paymentPlans.id, planId));

  const plan = planArr[0];

  if (!plan) {
    return NextResponse.json({ error: "Piano non trovato" }, { status: 404 });
  }

  const installments = await db
    .select()
    .from(paymentPlanInstallments)
    .where(eq(paymentPlanInstallments.paymentPlanId, planId))
    .orderBy(paymentPlanInstallments.dueDate);

  return NextResponse.json({ ...plan, installments });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const planId = parseInt(id);
  const body = await request.json();

  const {
    creditorName,
    categoryId,
    totalAmount,
    totalInstallments,
    installmentAmount,
    startDate,
    notes,
    isActive,
    regenerateInstallments // Se true, rigenera le rate
  } = body;

  const existingArr = await db
    .select()
    .from(paymentPlans)
    .where(eq(paymentPlans.id, planId));

  const existing = existingArr[0];

  if (!existing) {
    return NextResponse.json({ error: "Piano non trovato" }, { status: 404 });
  }

  // Calcola importo rata se non fornito
  const newTotalAmount = totalAmount ?? existing.totalAmount;
  const newTotalInstallments = totalInstallments ?? existing.totalInstallments;
  let newInstallmentAmount = installmentAmount;

  if (newInstallmentAmount === undefined) {
    if (totalAmount !== undefined || totalInstallments !== undefined) {
      // Ricalcola se sono cambiati totale o numero rate
      newInstallmentAmount = Math.round(newTotalAmount / newTotalInstallments);
    } else {
      newInstallmentAmount = existing.installmentAmount;
    }
  }

  const updateResult = await db
    .update(paymentPlans)
    .set({
      creditorName: creditorName ?? existing.creditorName,
      categoryId: categoryId !== undefined ? (categoryId || null) : existing.categoryId,
      totalAmount: newTotalAmount,
      totalInstallments: newTotalInstallments,
      installmentAmount: newInstallmentAmount,
      startDate: startDate ?? existing.startDate,
      notes: notes !== undefined ? notes : existing.notes,
      isActive: isActive !== undefined ? isActive : existing.isActive,
    })
    .where(eq(paymentPlans.id, planId))
    .returning();

  const updated = Array.isArray(updateResult) ? updateResult[0] : null;

  // Se richiesto, rigenera le rate
  if (regenerateInstallments && updated) {
    // Elimina le rate esistenti non pagate
    await db
      .delete(paymentPlanInstallments)
      .where(eq(paymentPlanInstallments.paymentPlanId, planId));

    // Genera nuove rate
    const start = new Date(updated.startDate);
    const installments = [];

    for (let i = 0; i < updated.totalInstallments; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + i);

      installments.push({
        paymentPlanId: planId,
        installmentNumber: i + 1,
        amount: updated.installmentAmount,
        dueDate: dueDate.toISOString().split("T")[0],
        isPaid: false,
      });
    }

    if (installments.length > 0) {
      await db.insert(paymentPlanInstallments).values(installments);
    }

    // Reset rate pagate
    await db
      .update(paymentPlans)
      .set({ paidInstallments: 0 })
      .where(eq(paymentPlans.id, planId));
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const planId = parseInt(id);

  // Soft delete
  const deleteResult = await db
    .update(paymentPlans)
    .set({ deletedAt: new Date(), isActive: false })
    .where(eq(paymentPlans.id, planId))
    .returning();

  const deleted = Array.isArray(deleteResult) ? deleteResult[0] : null;

  if (!deleted) {
    return NextResponse.json({ error: "Piano non trovato" }, { status: 404 });
  }

  return NextResponse.json({ message: "Piano eliminato" });
}
