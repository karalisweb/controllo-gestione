import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  expectedExpenses,
  expectedExpenseOverrides,
  expectedIncomes,
  expectedIncomeOverrides,
  paymentPlans,
  paymentPlanInstallments,
  transactions,
  costCenters,
  revenueCenters,
  contacts,
  settings,
} from "@/lib/db/schema";
import { and, eq, isNull, lte, gte, or, lt, sql, inArray } from "drizzle-orm";

/**
 * GET /api/movements?year=YYYY&month=M
 *
 * Restituisce il "ledger del mese": una lista cronologica unificata di:
 *   - movimenti programmati da expected_expenses (con override per quel mese)
 *   - movimenti programmati da expected_incomes (con override per quel mese)
 *   - rate dei piani di rientro scadute nel mese
 *   - transazioni reali (transactions) del mese
 *
 * + saldo iniziale del mese (calcolato da settings.initial_balance + transactions
 *   reali precedenti)
 * + saldo running riga per riga
 * + saldo finale previsto a fine mese.
 */

interface MovementRow {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // centesimi, segno: + entrata, - uscita
  runningBalance: number; // centesimi
  type: "expected_expense" | "expected_income" | "pdr_installment" | "transaction";
  status: "planned" | "realized";
  sourceId: number;
  categoryName?: string | null; // centro di costo o ricavo (display)
  isOverride?: boolean; // true se importo è override (per spese/incassi)
  // Campi extra per editing inline (popolati solo per transactions)
  contactId?: number | null;
  contactName?: string | null;
  costCenterId?: number | null;
  revenueCenterId?: number | null;
  isSplit?: boolean; // true se la transaction è già stata splittata
  isTransfer?: boolean; // true se è una riga figlia di split (IVA/Alessio/Daniela)
  linkedTransactionId?: number | null; // FK alla transaction "padre" se è una riga split
  // Per rate PDR: id del piano (per "Segna pagata")
  paymentPlanId?: number | null;
}

// Calcola se il mese (1-12) di un dato anno è "coperto" da una expected_expense/income
// in base a startDate, endDate, frequency.
function monthMatches(
  startDate: string,
  endDate: string | null,
  frequency: string,
  year: number,
  month: number,
): boolean {
  const [sy, sm] = startDate.split("-").map(Number);
  const startYM = sy * 12 + (sm - 1);
  const targetYM = year * 12 + (month - 1);
  if (targetYM < startYM) return false;
  if (endDate) {
    const [ey, em] = endDate.split("-").map(Number);
    const endYM = ey * 12 + (em - 1);
    if (targetYM > endYM) return false;
  }
  const monthsFromStart = targetYM - startYM;
  switch (frequency) {
    case "monthly":
      return true;
    case "quarterly":
      return monthsFromStart % 3 === 0;
    case "semiannual":
      return monthsFromStart % 6 === 0;
    case "annual":
    case "one_time":
      return monthsFromStart % 12 === 0;
    default:
      return monthsFromStart === 0;
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10);

    if (!Number.isInteger(year) || year < 2000 || year > 2100)
      return NextResponse.json({ error: "Anno non valido" }, { status: 400 });
    if (!Number.isInteger(month) || month < 1 || month > 12)
      return NextResponse.json({ error: "Mese non valido" }, { status: 400 });

    const firstOfMonth = `${year}-${pad2(month)}-01`;
    // Ultimo giorno del mese (calcolo via Date)
    const lastDayDate = new Date(Date.UTC(year, month, 0));
    const lastOfMonth = `${year}-${pad2(month)}-${pad2(lastDayDate.getUTCDate())}`;

    // "Oggi" — i previsti con data strettamente PRIMA di oggi vengono nascosti dal ledger
    // (saranno gestiti separatamente via scheda cliente / mesi passati = solo realtà).
    // Override con ?today=YYYY-MM-DD per test/debug.
    const todayParam = searchParams.get("today");
    const today = todayParam && /^\d{4}-\d{2}-\d{2}$/.test(todayParam)
      ? todayParam
      : new Date().toISOString().slice(0, 10);

    // ───── 1. Saldo iniziale: settings.initial_balance + transactions con date < firstOfMonth ─────
    const settingsRows = await db.select().from(settings);
    const initialBalanceSetting = settingsRows.find((r) => r.key === "initial_balance");
    const balanceDateSetting = settingsRows.find((r) => r.key === "balance_date");
    const initialBalanceBase = initialBalanceSetting ? parseInt(initialBalanceSetting.value, 10) : 0;
    const balanceDate = balanceDateSetting?.value || "2026-01-01";

    // Somma transactions reali tra balanceDate (inclusivo) e firstOfMonth (esclusivo).
    // ESCLUSE le righe figlie di split (isTransfer=true): vivono nel ledger come breakdown
    // informativo dell'incasso padre, ma non incidono sul saldo cassa (il bonifico bancario
    // reale arriverà come riga propria).
    const pastTxs = await db
      .select({ amount: transactions.amount, isTransfer: transactions.isTransfer })
      .from(transactions)
      .where(
        and(
          isNull(transactions.deletedAt),
          gte(transactions.date, balanceDate),
          lt(transactions.date, firstOfMonth),
        ),
      );
    const pastTxSum = pastTxs.reduce((s, t) => (t.isTransfer ? s : s + t.amount), 0);
    const initialBalance = initialBalanceBase + pastTxSum;

    // ───── 2. Programmati: expected_expenses attivi nel mese ─────
    const allExpenses = await db
      .select()
      .from(expectedExpenses)
      .where(
        and(
          isNull(expectedExpenses.deletedAt),
          eq(expectedExpenses.isActive, true),
          lte(expectedExpenses.startDate, lastOfMonth),
          or(isNull(expectedExpenses.endDate), gte(expectedExpenses.endDate, firstOfMonth)),
        ),
      );

    const expenseIds = allExpenses.map((e) => e.id);
    const expenseOverridesMap: Record<number, number> = {};
    if (expenseIds.length > 0) {
      const overrides = await db
        .select()
        .from(expectedExpenseOverrides)
        .where(
          and(
            inArray(expectedExpenseOverrides.expectedExpenseId, expenseIds),
            eq(expectedExpenseOverrides.year, year),
            eq(expectedExpenseOverrides.month, month),
          ),
        );
      for (const o of overrides) expenseOverridesMap[o.expectedExpenseId] = o.amount;
    }

    // Centri di costo per nome
    const costCentersList = await db
      .select({ id: costCenters.id, name: costCenters.name })
      .from(costCenters)
      .where(isNull(costCenters.deletedAt));
    const costCenterById = new Map(costCentersList.map((c) => [c.id, c.name]));

    const plannedExpenseRows: MovementRow[] = [];
    for (const e of allExpenses) {
      if (!monthMatches(e.startDate, e.endDate, e.frequency, year, month)) continue;
      const day = Math.min(Math.max(e.expectedDay || 1, 1), lastDayDate.getUTCDate());
      const date = `${year}-${pad2(month)}-${pad2(day)}`;
      // Skip previsti con data < oggi (passato già "successo" — vedi solo la realtà)
      if (date < today) continue;
      const overrideAmount = expenseOverridesMap[e.id];
      const amount = overrideAmount !== undefined ? overrideAmount : e.amount;
      // Skip override esplicitamente saltati (amount=0)
      if (amount === 0) continue;
      plannedExpenseRows.push({
        id: `ee-${e.id}`,
        date,
        description: e.name,
        amount: -amount, // spese sono negative
        runningBalance: 0, // calcolato dopo
        type: "expected_expense",
        status: "planned",
        sourceId: e.id,
        categoryName: e.costCenterId ? costCenterById.get(e.costCenterId) || null : null,
        isOverride: overrideAmount !== undefined,
      });
    }

    // ───── 3. Programmati: expected_incomes attivi nel mese ─────
    const allIncomes = await db
      .select()
      .from(expectedIncomes)
      .where(
        and(
          isNull(expectedIncomes.deletedAt),
          eq(expectedIncomes.isActive, true),
          lte(expectedIncomes.startDate, lastOfMonth),
          or(isNull(expectedIncomes.endDate), gte(expectedIncomes.endDate, firstOfMonth)),
        ),
      );

    const incomeIds = allIncomes.map((i) => i.id);
    const incomeOverridesMap: Record<number, number> = {};
    if (incomeIds.length > 0) {
      const overrides = await db
        .select()
        .from(expectedIncomeOverrides)
        .where(
          and(
            inArray(expectedIncomeOverrides.expectedIncomeId, incomeIds),
            eq(expectedIncomeOverrides.year, year),
            eq(expectedIncomeOverrides.month, month),
          ),
        );
      for (const o of overrides) incomeOverridesMap[o.expectedIncomeId] = o.amount;
    }

    const revenueCentersList = await db
      .select({ id: revenueCenters.id, name: revenueCenters.name })
      .from(revenueCenters)
      .where(isNull(revenueCenters.deletedAt));
    const revCenterById = new Map(revenueCentersList.map((r) => [r.id, r.name]));

    const plannedIncomeRows: MovementRow[] = [];
    for (const i of allIncomes) {
      if (!monthMatches(i.startDate, i.endDate, i.frequency, year, month)) continue;
      const day = Math.min(Math.max(i.expectedDay || 1, 1), lastDayDate.getUTCDate());
      const date = `${year}-${pad2(month)}-${pad2(day)}`;
      // Skip previsti con data < oggi (passato già "successo" — vedi solo la realtà)
      if (date < today) continue;
      const overrideAmount = incomeOverridesMap[i.id];
      const amount = overrideAmount !== undefined ? overrideAmount : i.amount;
      // Skip override esplicitamente saltati (amount=0)
      if (amount === 0) continue;
      plannedIncomeRows.push({
        id: `ei-${i.id}`,
        date,
        description: i.clientName,
        amount, // incassi positivi
        runningBalance: 0,
        type: "expected_income",
        status: "planned",
        sourceId: i.id,
        categoryName: i.revenueCenterId ? revCenterById.get(i.revenueCenterId) || null : null,
        isOverride: overrideAmount !== undefined,
      });
    }

    // ───── 4. Rate piani di rientro scadute nel mese ─────
    const installments = await db
      .select({
        id: paymentPlanInstallments.id,
        dueDate: paymentPlanInstallments.dueDate,
        amount: paymentPlanInstallments.amount,
        isPaid: paymentPlanInstallments.isPaid,
        creditorName: paymentPlans.creditorName,
        planId: paymentPlans.id,
      })
      .from(paymentPlanInstallments)
      .leftJoin(paymentPlans, eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id))
      .where(
        and(
          gte(paymentPlanInstallments.dueDate, firstOfMonth),
          lte(paymentPlanInstallments.dueDate, lastOfMonth),
          isNull(paymentPlans.deletedAt),
          eq(paymentPlans.isActive, true),
        ),
      );

    const pdrRows: MovementRow[] = installments.map((inst) => ({
      id: `pdr-${inst.id}`,
      date: inst.dueDate,
      description: `Rata ${inst.creditorName || "PDR"}`,
      amount: -inst.amount,
      runningBalance: 0,
      type: "pdr_installment",
      status: inst.isPaid ? "realized" : "planned",
      sourceId: inst.id,
      categoryName: "Debiti",
      paymentPlanId: inst.planId ?? null,
    }));

    // ───── 5. Transactions reali del mese ─────
    const monthTxs = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        description: transactions.description,
        amount: transactions.amount,
        contactId: transactions.contactId,
        costCenterId: transactions.costCenterId,
        revenueCenterId: transactions.revenueCenterId,
        isSplit: transactions.isSplit,
        isTransfer: transactions.isTransfer,
        linkedTransactionId: transactions.linkedTransactionId,
        contactName: contacts.name,
      })
      .from(transactions)
      .leftJoin(contacts, eq(transactions.contactId, contacts.id))
      .where(
        and(
          isNull(transactions.deletedAt),
          gte(transactions.date, firstOfMonth),
          lte(transactions.date, lastOfMonth),
        ),
      );

    const txRows: MovementRow[] = monthTxs.map((t) => {
      const center = t.amount >= 0
        ? (t.revenueCenterId ? revCenterById.get(t.revenueCenterId) : null)
        : (t.costCenterId ? costCenterById.get(t.costCenterId) : null);
      return {
        id: `tx-${t.id}`,
        date: t.date,
        description: t.description || "(senza descrizione)",
        amount: t.amount,
        runningBalance: 0,
        type: "transaction",
        status: "realized",
        sourceId: t.id,
        categoryName: center || null,
        contactId: t.contactId,
        contactName: t.contactName || null,
        costCenterId: t.costCenterId,
        revenueCenterId: t.revenueCenterId,
        isSplit: t.isSplit ?? false,
        isTransfer: t.isTransfer ?? false,
        linkedTransactionId: t.linkedTransactionId ?? null,
      };
    });

    // ───── 6. Unisci e ordina cronologicamente ─────
    // Ordine: data ASC, poi planned prima di realized (a parità data),
    // poi importo asc (così le uscite stesso giorno vengono prima degli incassi)
    const statusOrder: Record<string, number> = { planned: 0, realized: 1 };
    const all: MovementRow[] = [...plannedExpenseRows, ...plannedIncomeRows, ...pdrRows, ...txRows];
    all.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const so = statusOrder[a.status] - statusOrder[b.status];
      if (so !== 0) return so;
      return a.amount - b.amount;
    });

    // ───── 7. Calcola saldo running ─────
    // Le righe split (isTransfer=true) NON incidono sul saldo: sono breakdown informativo
    // dell'incasso padre (IVA/Alessio/Daniela), il vero impatto in cassa lo darà il
    // bonifico bancario reale quando arriverà.
    let running = initialBalance;
    for (const row of all) {
      if (!row.isTransfer) {
        running += row.amount;
      }
      row.runningBalance = running;
    }
    const finalBalance = running;

    return NextResponse.json({
      year,
      month,
      initialBalance,
      finalBalance,
      rowsCount: all.length,
      rows: all,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
