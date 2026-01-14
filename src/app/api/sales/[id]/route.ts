import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesOpportunities, salesInstallments } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

// Calcola la ripartizione con commissioni
function calculateSalesBreakdown(
  totalAmountCents: number,
  commissionRate: number
) {
  const netAmount = Math.round(totalAmountCents / 1.22);
  const commissionAmount = Math.round(netAmount * (commissionRate / 100));
  const postCommissionAmount = netAmount - commissionAmount;
  const vatAmount = Math.round(netAmount * 0.22);
  const partnersAmount = Math.round(postCommissionAmount * 0.30);
  const availableAmount = postCommissionAmount - partnersAmount;

  return {
    grossAmount: totalAmountCents,
    netAmount,
    commissionAmount,
    postCommissionAmount,
    vatAmount,
    partnersAmount,
    availableAmount,
  };
}

// Genera le rate in base al tipo di pagamento
function generateInstallments(
  totalAmountCents: number,
  paymentType: string,
  startDate: string
): { dueDate: string; amount: number; installmentNumber: number }[] {
  const start = new Date(startDate);

  switch (paymentType) {
    case "sito_web_50_50":
      const secondDate = new Date(start);
      secondDate.setDate(secondDate.getDate() + 60);
      return [
        {
          dueDate: startDate,
          amount: Math.round(totalAmountCents / 2),
          installmentNumber: 1,
        },
        {
          dueDate: secondDate.toISOString().split("T")[0],
          amount: Math.round(totalAmountCents / 2),
          installmentNumber: 2,
        },
      ];

    case "msd_30_70":
      // 30% subito, 70% a 21 giorni
      const msdSecondDate = new Date(start);
      msdSecondDate.setDate(msdSecondDate.getDate() + 21);
      const firstAmount = Math.round(totalAmountCents * 0.30);
      return [
        {
          dueDate: startDate,
          amount: firstAmount,
          installmentNumber: 1,
        },
        {
          dueDate: msdSecondDate.toISOString().split("T")[0],
          amount: totalAmountCents - firstAmount,
          installmentNumber: 2,
        },
      ];

    case "marketing_4_trim":
      const installments = [];
      for (let i = 0; i < 4; i++) {
        const date = new Date(start);
        date.setMonth(date.getMonth() + i * 3);
        installments.push({
          dueDate: date.toISOString().split("T")[0],
          amount: Math.round(totalAmountCents / 4),
          installmentNumber: i + 1,
        });
      }
      return installments;

    case "immediato":
      return [
        {
          dueDate: startDate,
          amount: totalAmountCents,
          installmentNumber: 1,
        },
      ];

    default:
      return [
        {
          dueDate: startDate,
          amount: totalAmountCents,
          installmentNumber: 1,
        },
      ];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const opportunityId = parseInt(id);

  const result = await db
    .select()
    .from(salesOpportunities)
    .where(eq(salesOpportunities.id, opportunityId));

  if (result.length === 0) {
    return NextResponse.json(
      { error: "Opportunità non trovata" },
      { status: 404 }
    );
  }

  const opportunity = result[0];
  const breakdown = calculateSalesBreakdown(opportunity.totalAmount, opportunity.commissionRate);

  const installments = await db
    .select()
    .from(salesInstallments)
    .where(eq(salesInstallments.salesOpportunityId, opportunityId))
    .orderBy(salesInstallments.installmentNumber);

  return NextResponse.json({ ...opportunity, breakdown, installments });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const opportunityId = parseInt(id);
  const body = await request.json();

  const {
    clientName,
    projectType,
    totalAmount,
    commissionRate,
    paymentType,
    month,
    year,
    status,
    closedDate,
    notes,
  } = body;

  // Recupera l'opportunità esistente
  const existing = await db
    .select()
    .from(salesOpportunities)
    .where(eq(salesOpportunities.id, opportunityId));

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Opportunità non trovata" },
      { status: 404 }
    );
  }

  const oldOpportunity = existing[0];
  const wasNotWon = oldOpportunity.status !== "won";
  const isNowWon = status === "won";

  // Aggiorna l'opportunità
  await db
    .update(salesOpportunities)
    .set({
      clientName: clientName ?? oldOpportunity.clientName,
      projectType: projectType ?? oldOpportunity.projectType,
      totalAmount: totalAmount ?? oldOpportunity.totalAmount,
      commissionRate: commissionRate ?? oldOpportunity.commissionRate,
      paymentType: paymentType ?? oldOpportunity.paymentType,
      month: month ?? oldOpportunity.month,
      year: year ?? oldOpportunity.year,
      status: status ?? oldOpportunity.status,
      closedDate: closedDate ?? oldOpportunity.closedDate,
      notes: notes !== undefined ? notes : oldOpportunity.notes,
    })
    .where(eq(salesOpportunities.id, opportunityId));

  // Se passa a won (da qualsiasi stato diverso da won), genera le rate
  if (wasNotWon && isNowWon && closedDate) {
    const finalAmount = totalAmount ?? oldOpportunity.totalAmount;
    const finalPaymentType = paymentType ?? oldOpportunity.paymentType;

    const installmentsData = generateInstallments(finalAmount, finalPaymentType, closedDate);

    for (const inst of installmentsData) {
      await db.insert(salesInstallments).values({
        salesOpportunityId: opportunityId,
        dueDate: inst.dueDate,
        amount: inst.amount,
        installmentNumber: inst.installmentNumber,
      });
    }
  }

  // Ritorna l'opportunità aggiornata
  const updated = await db
    .select()
    .from(salesOpportunities)
    .where(eq(salesOpportunities.id, opportunityId));

  const opportunity = updated[0];
  const breakdown = calculateSalesBreakdown(opportunity.totalAmount, opportunity.commissionRate);

  const installments = await db
    .select()
    .from(salesInstallments)
    .where(eq(salesInstallments.salesOpportunityId, opportunityId))
    .orderBy(salesInstallments.installmentNumber);

  return NextResponse.json({ ...opportunity, breakdown, installments });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const opportunityId = parseInt(id);

  // Soft delete
  await db
    .update(salesOpportunities)
    .set({ deletedAt: sql`(unixepoch())` })
    .where(eq(salesOpportunities.id, opportunityId));

  return NextResponse.json({ success: true });
}
