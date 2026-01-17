import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  transactions,
  forecastItems,
  settings,
} from "@/lib/db/schema";
import { and, isNull, gte, lte, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // 1. Transazioni dell'anno (consuntivo)
  const txs = await db
    .select()
    .from(transactions)
    .where(
      and(
        isNull(transactions.deletedAt),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        // Escludiamo i giroconti
        eq(transactions.isTransfer, false)
      )
    );

  // 2. Previsionale dell'anno (forecast)
  const forecasts = await db
    .select()
    .from(forecastItems)
    .where(
      and(
        isNull(forecastItems.deletedAt),
        gte(forecastItems.date, startDate),
        lte(forecastItems.date, endDate)
      )
    );

  // 3. Saldo iniziale dalle impostazioni
  const settingsData = await db.select().from(settings);
  const initialBalanceSetting = settingsData.find(
    (s) => s.key === "initialBalance"
  );
  const initialBalance = initialBalanceSetting
    ? parseInt(initialBalanceSetting.value || "0")
    : 0;

  // Calcola dati mensili
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthStr = month.toString().padStart(2, "0");
    const monthStart = `${year}-${monthStr}-01`;
    const monthEnd = `${year}-${monthStr}-31`;

    // Transazioni del mese (consuntivo)
    const monthTxs = txs.filter((tx) => {
      const txDate = tx.date;
      return txDate >= monthStart && txDate <= monthEnd;
    });

    // Previsionale del mese
    const monthForecasts = forecasts.filter((f) => {
      const fDate = f.date;
      return fDate >= monthStart && fDate <= monthEnd;
    });

    // Preventivato (incassi previsti nel previsionale)
    const preventivato = monthForecasts
      .filter((f) => f.type === "income")
      .reduce((sum, f) => sum + f.amount, 0);

    // Fatturato (incassi effettivi dal consuntivo)
    const fatturato = monthTxs
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Costi (uscite effettive dal consuntivo - valore assoluto)
    const costi = Math.abs(
      monthTxs
        .filter((tx) => tx.amount < 0)
        .reduce((sum, tx) => sum + tx.amount, 0)
    );

    // Costi previsti
    const costiPrevisti = monthForecasts
      .filter((f) => f.type === "expense")
      .reduce((sum, f) => sum + f.amount, 0);

    // Margine
    const margine = fatturato - costi;

    return {
      month,
      preventivato,
      fatturato,
      costi,
      costiPrevisti,
      margine,
      // Delta fatturato vs preventivato
      deltaFatturato: fatturato - preventivato,
      deltaFatturatoPercent: preventivato > 0
        ? Math.round(((fatturato - preventivato) / preventivato) * 10000) / 100
        : 0,
    };
  });

  // Calcola liquidità cumulativa
  let runningBalance = initialBalance;
  const monthlyDataWithLiquidity = monthlyData.map((data) => {
    runningBalance += data.margine;
    return {
      ...data,
      liquidita: runningBalance,
    };
  });

  // Calcola fase attuale basata sull'ultima liquidità disponibile
  // Troviamo l'ultimo mese con dati
  const currentMonth = new Date().getMonth(); // 0-indexed
  const currentLiquidity = monthlyDataWithLiquidity[currentMonth]?.liquidita || initialBalance;

  let phase: "defense" | "attack" | "growth";
  if (currentLiquidity < 0) {
    phase = "defense";
  } else if (currentLiquidity < 500000) { // €5.000 in centesimi
    phase = "attack";
  } else if (currentLiquidity >= 700000) { // €7.000 in centesimi
    phase = "growth";
  } else {
    phase = "attack"; // tra 5000 e 7000
  }

  // Totali annuali
  const totals = {
    preventivato: monthlyData.reduce((s, m) => s + m.preventivato, 0),
    fatturato: monthlyData.reduce((s, m) => s + m.fatturato, 0),
    costi: monthlyData.reduce((s, m) => s + m.costi, 0),
    margine: monthlyData.reduce((s, m) => s + m.margine, 0),
    liquiditaFinale: runningBalance,
  };

  return NextResponse.json({
    year,
    initialBalance,
    monthlyData: monthlyDataWithLiquidity,
    totals,
    phase,
    currentMonth: currentMonth + 1, // 1-indexed per il frontend
  });
}
