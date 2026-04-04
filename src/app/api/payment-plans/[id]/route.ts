import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentPlans, paymentPlanInstallments, forecastItems } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

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
    regenerateInstallments, // Se true, rigenera TUTTE le rate (azzerando pagamenti)
    rimodulateRemaining,    // Se true, rigenera SOLO le rate non pagate (mantiene storico)
    remainingInstallments,  // Numero nuove rate rimanenti (per rimodulazione)
    newInstallmentAmount: remodulateInstallmentAmount,   // Importo nuova rata (per rimodulazione, in centesimi)
    nextDueDate,            // Data prossima rata (per rimodulazione)
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

  // Cascade previsionale: sospensione → soft-delete voci future, riattivazione → ricrea voci
  if (isActive !== undefined && isActive !== existing.isActive && updated) {
    if (isActive === false) {
      // SOSPENSIONE: soft-delete tutte le voci PDR non realizzate di questo piano
      await db
        .update(forecastItems)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(forecastItems.paymentPlanId, planId),
            eq(forecastItems.sourceType, "pdr"),
            eq(forecastItems.isRealized, false),
            isNull(forecastItems.deletedAt)
          )
        );
    } else {
      // RIATTIVAZIONE: ricrea voci previsionali per le rate non pagate
      const unpaidInstallments = await db
        .select()
        .from(paymentPlanInstallments)
        .where(
          and(
            eq(paymentPlanInstallments.paymentPlanId, planId),
            eq(paymentPlanInstallments.isPaid, false)
          )
        );

      for (const installment of unpaidInstallments) {
        // Controlla se esiste già (anche soft-deleted)
        const existingForecast = await db
          .select()
          .from(forecastItems)
          .where(
            and(
              eq(forecastItems.sourceType, "pdr"),
              eq(forecastItems.sourceId, installment.id)
            )
          );

        if (existingForecast.length === 0) {
          // Crea nuova voce
          await db.insert(forecastItems).values({
            date: installment.dueDate,
            description: `PDR: ${updated.creditorName}`,
            type: "expense",
            amount: installment.amount,
            sourceType: "pdr",
            sourceId: installment.id,
            paymentPlanId: planId,
            priority: "essential",
          });
        } else if (existingForecast[0].deletedAt) {
          // Ripristina la voce soft-deleted
          await db
            .update(forecastItems)
            .set({ deletedAt: null })
            .where(eq(forecastItems.id, existingForecast[0].id));
        }
      }
    }
  }

  // Se richiesto, rigenera le rate
  if (regenerateInstallments && updated) {
    // Soft-delete tutte le voci previsionale PDR esistenti (non realizzate)
    await db
      .update(forecastItems)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(forecastItems.paymentPlanId, planId),
          eq(forecastItems.sourceType, "pdr"),
          eq(forecastItems.isRealized, false),
          isNull(forecastItems.deletedAt)
        )
      );

    // Elimina le rate esistenti
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
        amount: updated.installmentAmount,
        dueDate: dueDate.toISOString().split("T")[0],
        isPaid: false,
      });
    }

    if (installments.length > 0) {
      await db.insert(paymentPlanInstallments).values(installments);
    }

    // Crea nuove voci previsionale per le rate appena generate
    const newInstallments = await db
      .select()
      .from(paymentPlanInstallments)
      .where(eq(paymentPlanInstallments.paymentPlanId, planId));

    for (const inst of newInstallments) {
      await db.insert(forecastItems).values({
        date: inst.dueDate,
        description: `PDR: ${updated.creditorName}`,
        type: "expense",
        amount: inst.amount,
        sourceType: "pdr",
        sourceId: inst.id,
        paymentPlanId: planId,
        priority: "essential",
      });
    }

    // Reset rate pagate
    await db
      .update(paymentPlans)
      .set({ paidInstallments: 0 })
      .where(eq(paymentPlans.id, planId));
  }

  // Rimodulazione parziale: mantiene rate pagate, rigenera solo le non pagate
  if (rimodulateRemaining && updated) {
    const paidCount = existing.paidInstallments || 0;
    const numNewRemaining = remainingInstallments ?? (existing.totalInstallments - paidCount);
    const newAmount = remodulateInstallmentAmount ?? existing.installmentAmount;
    const startFrom = nextDueDate ?? new Date().toISOString().split("T")[0];

    // Calcola quanto già pagato (dalle rate effettivamente pagate)
    const paidInstallmentsData = await db
      .select()
      .from(paymentPlanInstallments)
      .where(
        and(
          eq(paymentPlanInstallments.paymentPlanId, planId),
          eq(paymentPlanInstallments.isPaid, true)
        )
      );
    const alreadyPaid = paidInstallmentsData.reduce((sum, i) => sum + i.amount, 0);

    // Soft-delete voci previsionale delle rate non pagate che verranno eliminate
    await db
      .update(forecastItems)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(forecastItems.paymentPlanId, planId),
          eq(forecastItems.sourceType, "pdr"),
          eq(forecastItems.isRealized, false),
          isNull(forecastItems.deletedAt)
        )
      );

    // Cancella SOLO le rate non pagate
    await db
      .delete(paymentPlanInstallments)
      .where(
        and(
          eq(paymentPlanInstallments.paymentPlanId, planId),
          eq(paymentPlanInstallments.isPaid, false)
        )
      );

    // Genera nuove rate non pagate
    const start = new Date(startFrom);
    const newInstallments = [];

    for (let i = 0; i < numNewRemaining; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + i);

      newInstallments.push({
        paymentPlanId: planId,
        amount: newAmount,
        dueDate: dueDate.toISOString().split("T")[0],
        isPaid: false,
      });
    }

    if (newInstallments.length > 0) {
      await db.insert(paymentPlanInstallments).values(newInstallments);
    }

    // Crea nuove voci previsionale per le rate appena generate
    const createdInstallments = await db
      .select()
      .from(paymentPlanInstallments)
      .where(
        and(
          eq(paymentPlanInstallments.paymentPlanId, planId),
          eq(paymentPlanInstallments.isPaid, false)
        )
      );

    for (const inst of createdInstallments) {
      await db.insert(forecastItems).values({
        date: inst.dueDate,
        description: `PDR: ${updated.creditorName}`,
        type: "expense",
        amount: inst.amount,
        sourceType: "pdr",
        sourceId: inst.id,
        paymentPlanId: planId,
        priority: "essential",
      });
    }

    // Aggiorna il piano con i nuovi totali
    const newTotalInst = paidCount + numNewRemaining;
    const newTotal = alreadyPaid + (numNewRemaining * newAmount);

    await db
      .update(paymentPlans)
      .set({
        totalInstallments: newTotalInst,
        installmentAmount: newAmount,
        totalAmount: newTotal,
      })
      .where(eq(paymentPlans.id, planId));

    // Ri-leggi il piano aggiornato per restituirlo
    const refreshedArr = await db
      .select()
      .from(paymentPlans)
      .where(eq(paymentPlans.id, planId));

    return NextResponse.json(refreshedArr[0]);
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

  // Cascade: soft-delete anche le voci previsionali non realizzate
  await db
    .update(forecastItems)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(forecastItems.paymentPlanId, planId),
        eq(forecastItems.sourceType, "pdr"),
        eq(forecastItems.isRealized, false),
        isNull(forecastItems.deletedAt)
      )
    );

  return NextResponse.json({ message: "Piano eliminato" });
}
