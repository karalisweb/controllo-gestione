import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentPlans, paymentPlanInstallments } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

// Segna una rata come pagata
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const planId = parseInt(id);
  const body = await request.json();

  const { installmentId, paidDate, transactionId } = body;

  if (!installmentId) {
    return NextResponse.json(
      { error: "ID rata obbligatorio" },
      { status: 400 }
    );
  }

  // Verifica che la rata appartenga al piano
  const installmentArr = await db
    .select()
    .from(paymentPlanInstallments)
    .where(eq(paymentPlanInstallments.id, installmentId));

  const installment = installmentArr[0];

  if (!installment || installment.paymentPlanId !== planId) {
    return NextResponse.json(
      { error: "Rata non trovata o non appartenente a questo piano" },
      { status: 404 }
    );
  }

  // Aggiorna la rata come pagata
  const updateResult = await db
    .update(paymentPlanInstallments)
    .set({
      isPaid: true,
      paidDate: paidDate || new Date().toISOString().split("T")[0],
      transactionId: transactionId || null,
    })
    .where(eq(paymentPlanInstallments.id, installmentId))
    .returning();

  const updated = Array.isArray(updateResult) ? updateResult[0] : null;

  // Aggiorna il contatore rate pagate nel piano
  await db
    .update(paymentPlans)
    .set({
      paidInstallments: sql`${paymentPlans.paidInstallments} + 1`,
    })
    .where(eq(paymentPlans.id, planId));

  // Verifica se tutte le rate sono pagate e disattiva il piano
  const planArr = await db
    .select()
    .from(paymentPlans)
    .where(eq(paymentPlans.id, planId));

  const plan = planArr[0];

  if (plan && (plan.paidInstallments || 0) >= plan.totalInstallments) {
    await db
      .update(paymentPlans)
      .set({ isActive: false })
      .where(eq(paymentPlans.id, planId));
  }

  return NextResponse.json(updated);
}

// Modifica data scadenza di una rata
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const planId = parseInt(id);
  const body = await request.json();

  const { installmentId, dueDate } = body;

  if (!installmentId || !dueDate) {
    return NextResponse.json(
      { error: "ID rata e nuova data obbligatori" },
      { status: 400 }
    );
  }

  // Verifica che la rata appartenga al piano
  const installmentArr = await db
    .select()
    .from(paymentPlanInstallments)
    .where(eq(paymentPlanInstallments.id, installmentId));

  const installment = installmentArr[0];

  if (!installment || installment.paymentPlanId !== planId) {
    return NextResponse.json(
      { error: "Rata non trovata o non appartenente a questo piano" },
      { status: 404 }
    );
  }

  // Aggiorna la data di scadenza
  const updateResult = await db
    .update(paymentPlanInstallments)
    .set({ dueDate })
    .where(eq(paymentPlanInstallments.id, installmentId))
    .returning();

  const updated = Array.isArray(updateResult) ? updateResult[0] : null;

  return NextResponse.json(updated);
}

// Annulla pagamento di una rata
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const planId = parseInt(id);
  const { searchParams } = new URL(request.url);
  const installmentId = parseInt(searchParams.get("installmentId") || "0");

  if (!installmentId) {
    return NextResponse.json(
      { error: "ID rata obbligatorio" },
      { status: 400 }
    );
  }

  // Verifica che la rata appartenga al piano
  const installmentArr2 = await db
    .select()
    .from(paymentPlanInstallments)
    .where(eq(paymentPlanInstallments.id, installmentId));

  const installment2 = installmentArr2[0];

  if (!installment2 || installment2.paymentPlanId !== planId) {
    return NextResponse.json(
      { error: "Rata non trovata o non appartenente a questo piano" },
      { status: 404 }
    );
  }

  if (!installment2.isPaid) {
    return NextResponse.json(
      { error: "La rata non è stata pagata" },
      { status: 400 }
    );
  }

  // Rimuovi il pagamento dalla rata
  const updateResult2 = await db
    .update(paymentPlanInstallments)
    .set({
      isPaid: false,
      paidDate: null,
      transactionId: null,
    })
    .where(eq(paymentPlanInstallments.id, installmentId))
    .returning();

  const updated2 = Array.isArray(updateResult2) ? updateResult2[0] : null;

  // Decrementa il contatore rate pagate
  await db
    .update(paymentPlans)
    .set({
      paidInstallments: sql`${paymentPlans.paidInstallments} - 1`,
      isActive: true, // Riattiva il piano se era stato disattivato
    })
    .where(eq(paymentPlans.id, planId));

  return NextResponse.json(updated2);
}
