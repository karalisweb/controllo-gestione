import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesOpportunities, salesInstallments } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// Calcola la ripartizione con commissioni
function calculateSalesBreakdown(
  totalAmountCents: number,
  commissionRate: number
) {
  // 1. Calcola il netto (senza IVA)
  const netAmount = Math.round(totalAmountCents / 1.22);

  // 2. Calcola la commissione sul netto
  const commissionAmount = Math.round(netAmount * (commissionRate / 100));

  // 3. Importo post-commissione
  const postCommissionAmount = netAmount - commissionAmount;

  // 4. IVA (22% del netto originale, da versare allo Stato)
  const vatAmount = Math.round(netAmount * 0.22);

  // 5. Ripartizione soci (30% del post-commissione)
  const partnersAmount = Math.round(postCommissionAmount * 0.30);

  // 6. Disponibile (48% del post-commissione, ma calcolato come residuo)
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
      // 50% subito, 50% a 60 giorni
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
      // 4 rate trimestrali anticipate
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
      // 100% subito
      return [
        {
          dueDate: startDate,
          amount: totalAmountCents,
          installmentNumber: 1,
        },
      ];

    default:
      // Custom - una sola rata
      return [
        {
          dueDate: startDate,
          amount: totalAmountCents,
          installmentNumber: 1,
        },
      ];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const year = parseInt(searchParams.get("year") || "2026");
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;
  const status = searchParams.get("status");

  let whereClause = and(
    isNull(salesOpportunities.deletedAt),
    eq(salesOpportunities.year, year)
  );

  if (month) {
    whereClause = and(whereClause, eq(salesOpportunities.month, month));
  }

  if (status) {
    whereClause = and(
      whereClause,
      eq(salesOpportunities.status, status as "objective" | "opportunity" | "won" | "lost")
    );
  }

  const opportunities = await db
    .select()
    .from(salesOpportunities)
    .where(whereClause)
    .orderBy(salesOpportunities.month, salesOpportunities.clientName);

  // Aggiungi breakdown e rate per ogni opportunità
  const opportunitiesWithDetails = await Promise.all(
    opportunities.map(async (opp) => {
      const breakdown = calculateSalesBreakdown(opp.totalAmount, opp.commissionRate);

      const installments = await db
        .select()
        .from(salesInstallments)
        .where(eq(salesInstallments.salesOpportunityId, opp.id))
        .orderBy(salesInstallments.installmentNumber);

      return {
        ...opp,
        breakdown,
        installments,
      };
    })
  );

  return NextResponse.json(opportunitiesWithDetails);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    clientName,
    projectType,
    totalAmount,
    commissionRate = 20,
    paymentType,
    month,
    year = 2026,
    closedDate,
    status = "objective",
    notes,
  } = body;

  // clientName può essere null per obiettivi generici
  if (!projectType || totalAmount === undefined || !paymentType || !month) {
    return NextResponse.json(
      { error: "Tipo progetto, importo, tipo pagamento e mese sono obbligatori" },
      { status: 400 }
    );
  }

  // Inserisci l'opportunità
  const insertResult = await db
    .insert(salesOpportunities)
    .values({
      clientName,
      projectType,
      totalAmount,
      commissionRate,
      paymentType,
      month,
      year,
      status,
      closedDate: closedDate || null,
      notes: notes || null,
    })
    .returning();

  const opportunity = Array.isArray(insertResult) ? insertResult[0] : null;

  if (!opportunity) {
    return NextResponse.json(
      { error: "Errore durante l'inserimento" },
      { status: 500 }
    );
  }

  // Se è vinta (won), genera le rate
  if (status === "won" && closedDate) {
    const installmentsData = generateInstallments(totalAmount, paymentType, closedDate);

    for (const inst of installmentsData) {
      await db.insert(salesInstallments).values({
        salesOpportunityId: opportunity.id,
        dueDate: inst.dueDate,
        amount: inst.amount,
        installmentNumber: inst.installmentNumber,
      });
    }
  }

  // Ritorna l'opportunità con breakdown
  const breakdown = calculateSalesBreakdown(totalAmount, commissionRate);

  const installments = await db
    .select()
    .from(salesInstallments)
    .where(eq(salesInstallments.salesOpportunityId, opportunity.id))
    .orderBy(salesInstallments.installmentNumber);

  return NextResponse.json(
    { ...opportunity, breakdown, installments },
    { status: 201 }
  );
}
