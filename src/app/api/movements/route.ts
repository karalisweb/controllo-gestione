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
  incomeSplits,
  settings,
} from "@/lib/db/schema";
import { and, eq, isNull, lte, gte, or, lt, sql, inArray } from "drizzle-orm";
import { calculateSplit } from "@/lib/utils/splits";
import { getSplitConfig } from "@/lib/utils/settings-server";

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

interface SplitDetail {
  iva: number; alessio: number; daniela: number; agency: number;
}

interface MovementRow {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // centesimi, segno: + entrata, - uscita
  runningBalance: number; // centesimi
  type: "expected_expense" | "expected_income" | "expected_split" | "pdr_installment" | "transaction";
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
  isTransfer?: boolean; // true = vecchia riga figlia di split (modello v2.3.28-32, 3 righe)
  linkedTransactionId?: number | null; // FK alla transaction "padre" se è una riga split
  notes?: string | null;
  // Spaccato espandibile per la riga "[SPLIT-TOTAL]" (modello attuale, 1 sola riga)
  splitDetail?: SplitDetail | null;
  // Per rate PDR: id del piano (per "Segna pagata")
  paymentPlanId?: number | null;
  // Per expected_income: stato del flag autoSplit (per UI bottone Split)
  autoSplit?: boolean;
  // Per expected_income: variante "split no-IVA" per fatture estere/reverse charge
  autoSplitNoVat?: boolean;
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
    let initialBalance = initialBalanceBase + pastTxSum;

    // ───── 1b. Aggiusta saldo iniziale per previsti residui (today ≤ data < firstOfMonth) ─────
    // Caso: aprile aveva previsti per 28-30 che incidevano sul saldo finale aprile.
    // Il saldo iniziale di maggio (oggi calcolato come base + transactions reali) NON li include
    // → discrepanza. Rimedio: somma anche i previsti residui per coerenza fra mesi.
    if (today < firstOfMonth) {
      const [todayY, todayM] = today.split("-").map(Number);
      const startYm = todayY * 12 + (todayM - 1);
      const targetYm = year * 12 + (month - 1);

      // Range esteso: previsti attivi tra today e firstOfMonth-1
      // Per ridurre il dataset, usiamo un'unica query con filtro startDate<=lastDayBeforeMonth
      // e endDate>=today (o nullo).
      const lastDayBeforeFirst = new Date(Date.UTC(year, month - 1, 0));
      const lastDateBeforeFirstStr = `${lastDayBeforeFirst.getUTCFullYear()}-${pad2(lastDayBeforeFirst.getUTCMonth() + 1)}-${pad2(lastDayBeforeFirst.getUTCDate())}`;

      const residualExpenses = await db
        .select()
        .from(expectedExpenses)
        .where(
          and(
            isNull(expectedExpenses.deletedAt),
            eq(expectedExpenses.isActive, true),
            lte(expectedExpenses.startDate, lastDateBeforeFirstStr),
            or(isNull(expectedExpenses.endDate), gte(expectedExpenses.endDate, today)),
          ),
        );
      const residualIncomes = await db
        .select()
        .from(expectedIncomes)
        .where(
          and(
            isNull(expectedIncomes.deletedAt),
            eq(expectedIncomes.isActive, true),
            lte(expectedIncomes.startDate, lastDateBeforeFirstStr),
            or(isNull(expectedIncomes.endDate), gte(expectedIncomes.endDate, today)),
          ),
        );

      // Carica overrides per gli expectedIds nel range mensile [startYm, targetYm)
      const expIds = residualExpenses.map((e) => e.id);
      const incIds = residualIncomes.map((i) => i.id);
      const expOverridesRange = expIds.length > 0
        ? await db.select().from(expectedExpenseOverrides).where(
            inArray(expectedExpenseOverrides.expectedExpenseId, expIds),
          )
        : [];
      const incOverridesRange = incIds.length > 0
        ? await db.select().from(expectedIncomeOverrides).where(
            inArray(expectedIncomeOverrides.expectedIncomeId, incIds),
          )
        : [];
      const expOvMap = new Map<string, number>();
      for (const o of expOverridesRange) {
        const ym = o.year * 12 + (o.month - 1);
        if (ym >= startYm && ym < targetYm) {
          expOvMap.set(`${o.expectedExpenseId}-${o.year}-${o.month}`, o.amount);
        }
      }
      const incOvMap = new Map<string, number>();
      for (const o of incOverridesRange) {
        const ym = o.year * 12 + (o.month - 1);
        if (ym >= startYm && ym < targetYm) {
          incOvMap.set(`${o.expectedIncomeId}-${o.year}-${o.month}`, o.amount);
        }
      }

      // Itera sui mesi tra today e firstOfMonth (esclusivo)
      let curY = todayY, curM = todayM;
      while (curY * 12 + (curM - 1) < targetYm) {
        const lastDayOfCur = new Date(Date.UTC(curY, curM, 0)).getUTCDate();
        for (const e of residualExpenses) {
          if (!monthMatches(e.startDate, e.endDate, e.frequency, curY, curM)) continue;
          const day = Math.min(Math.max(e.expectedDay || 1, 1), lastDayOfCur);
          const date = `${curY}-${pad2(curM)}-${pad2(day)}`;
          if (date < today || date >= firstOfMonth) continue;
          const ovAmount = expOvMap.get(`${e.id}-${curY}-${curM}`);
          const amount = ovAmount !== undefined ? ovAmount : e.amount;
          if (amount === 0) continue;
          initialBalance -= amount;
        }
        for (const i of residualIncomes) {
          if (!monthMatches(i.startDate, i.endDate, i.frequency, curY, curM)) continue;
          const day = Math.min(Math.max(i.expectedDay || 1, 1), lastDayOfCur);
          const date = `${curY}-${pad2(curM)}-${pad2(day)}`;
          if (date < today || date >= firstOfMonth) continue;
          const ovAmount = incOvMap.get(`${i.id}-${curY}-${curM}`);
          const amount = ovAmount !== undefined ? ovAmount : i.amount;
          if (amount === 0) continue;
          initialBalance += amount;
        }
        curM++;
        if (curM > 12) { curM = 1; curY++; }
      }

      // Rate PDR non pagate nel range [today, firstOfMonth)
      const residualInstallments = await db
        .select({
          amount: paymentPlanInstallments.amount,
          isPaid: paymentPlanInstallments.isPaid,
        })
        .from(paymentPlanInstallments)
        .leftJoin(paymentPlans, eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id))
        .where(
          and(
            gte(paymentPlanInstallments.dueDate, today),
            lt(paymentPlanInstallments.dueDate, firstOfMonth),
            isNull(paymentPlans.deletedAt),
            eq(paymentPlans.isActive, true),
          ),
        );
      for (const r of residualInstallments) {
        if (r.isPaid) continue; // se pagata c'è già la transaction in pastTxSum
        initialBalance -= r.amount;
      }
    }

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

    // Carica config split (per riga split virtuale e per aggregati Valori previsti)
    const splitConfig = await getSplitConfig();

    const plannedIncomeRows: MovementRow[] = [];
    let plannedValuesIva = 0;
    let plannedValuesAlessio = 0;
    let plannedValuesDaniela = 0;
    let plannedValuesAgency = 0;
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
        autoSplit: i.autoSplit ?? false,
        autoSplitNoVat: i.autoSplitNoVat ?? false,
      });

      // Se autoSplit=true: genera riga split virtuale + aggrega Valori previsti.
      // autoSplitNoVat=true: variante per fatture estere — vatPct=0, soci sul lordo.
      if (i.autoSplit) {
        const effectiveConfig = i.autoSplitNoVat ? { ...splitConfig, vatPct: 0 } : splitConfig;
        const split = calculateSplit(amount, effectiveConfig);
        const transferAmount = split.vatAmount + split.alessioAmount + split.danielaAmount;
        const sociLabel = i.autoSplitNoVat ? "Bonifico soci" : "Bonifico soci+IVA";
        if (transferAmount > 0) {
          plannedIncomeRows.push({
            id: `ei-split-${i.id}`,
            date,
            description: `${sociLabel} ${i.clientName}`,
            amount: -transferAmount,
            runningBalance: 0,
            type: "expected_split",
            status: "planned",
            sourceId: i.id,
            categoryName: "Soci",
            splitDetail: {
              iva: split.vatAmount,
              alessio: split.alessioAmount,
              daniela: split.danielaAmount,
              agency: split.agencyAmount,
            },
          });
        }
        plannedValuesIva += split.vatAmount;
        plannedValuesAlessio += split.alessioAmount;
        plannedValuesDaniela += split.danielaAmount;
        plannedValuesAgency += split.agencyAmount;
      }
    }

    // ───── 4. Rate piani di rientro scadute nel mese ─────
    const installments = await db
      .select({
        id: paymentPlanInstallments.id,
        dueDate: paymentPlanInstallments.dueDate,
        amount: paymentPlanInstallments.amount,
        isPaid: paymentPlanInstallments.isPaid,
        transactionId: paymentPlanInstallments.transactionId,
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
      linkedTransactionId: inst.transactionId ?? null,
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
        notes: transactions.notes,
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

    // Carica incomeSplits del mese mappati per transactionId padre (per popolare splitDetail
    // sulle righe "[SPLIT-TOTAL]" e per il box Valori).
    const monthSplitsRaw = await db
      .select({
        transactionId: incomeSplits.transactionId,
        vatAmount: incomeSplits.vatAmount,
        alessioAmount: incomeSplits.alessioAmount,
        danielaAmount: incomeSplits.danielaAmount,
        agencyAmount: incomeSplits.agencyAmount,
      })
      .from(incomeSplits)
      .innerJoin(transactions, eq(incomeSplits.transactionId, transactions.id))
      .where(
        and(
          gte(transactions.date, firstOfMonth),
          lte(transactions.date, lastOfMonth),
          isNull(transactions.deletedAt),
        ),
      );
    const splitByParentId = new Map<number, SplitDetail>();
    for (const s of monthSplitsRaw) {
      if (s.transactionId == null) continue;
      splitByParentId.set(s.transactionId, {
        iva: s.vatAmount,
        alessio: s.alessioAmount,
        daniela: s.danielaAmount,
        agency: s.agencyAmount,
      });
    }

    const txRows: MovementRow[] = monthTxs.map((t) => {
      const center = t.amount >= 0
        ? (t.revenueCenterId ? revCenterById.get(t.revenueCenterId) : null)
        : (t.costCenterId ? costCenterById.get(t.costCenterId) : null);
      // splitDetail popolato per le righe "[SPLIT-TOTAL]" e "[SPLIT-TOTAL-NOVAT]" (modello attuale, 1 riga)
      const isSplitTotal = !!(t.linkedTransactionId && t.notes?.startsWith("[SPLIT-TOTAL"));
      const splitDetail = isSplitTotal && t.linkedTransactionId
        ? splitByParentId.get(t.linkedTransactionId) ?? null
        : null;
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
        notes: t.notes ?? null,
        splitDetail,
      };
    });

    // ───── 6. Unisci e ordina cronologicamente ─────
    // Ordine: data ASC, poi planned prima di realized (a parità data),
    // poi expected_income prima di expected_split (subito dopo l'incasso),
    // poi importo asc (uscite stesso giorno prima degli incassi).
    const statusOrder: Record<string, number> = { planned: 0, realized: 1 };
    const typeOrder: Record<string, number> = {
      expected_income: 0,
      expected_split: 1,
      expected_expense: 2,
      pdr_installment: 3,
      transaction: 4,
    };
    const all: MovementRow[] = [...plannedExpenseRows, ...plannedIncomeRows, ...pdrRows, ...txRows];
    all.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const so = statusOrder[a.status] - statusOrder[b.status];
      if (so !== 0) return so;
      // Per le righe planned con stessa data: incasso → split previsto
      if (a.status === "planned" && b.status === "planned") {
        const to = (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
        if (to !== 0) return to;
      }
      return a.amount - b.amount;
    });

    // ───── 7. Calcola saldo running ─────
    // Le righe ESCLUSE dal saldo:
    //   - isTransfer=true (vecchie figlie split, breakdown informativo)
    //   - rate PDR pagate (la realtà è già nelle transactions linkate, evita doppio conteggio)
    //   - rate PDR scadute non pagate (date < today: coerenza con la regola "passato=solo realtà"
    //     applicata ai previsti expected_*; il saldo iniziale del mese successivo non le include)
    // Le righe expected_split (split virtuale di un previsto) INCIDONO sul saldo:
    // mostrano la cassa "agenzia reale" prevista invece di quella lorda.
    let running = initialBalance;
    for (const row of all) {
      const isPdrPaid = row.type === "pdr_installment" && row.status === "realized";
      const isPdrPastUnpaid = row.type === "pdr_installment" && row.status === "planned" && row.date < today;
      const skipFromBalance = row.isTransfer || isPdrPaid || isPdrPastUnpaid;
      if (!skipFromBalance) {
        running += row.amount;
      }
      row.runningBalance = running;
    }
    const finalBalance = running;

    // Le righe restano in ordine ASC (1 del mese in alto → ultimo in basso): coerente con
    // il running balance calcolato al passo 7 e leggibile come un estratto conto Excel.

    // ───── 8. Aggregati del mese (per i 3 box header) ─────
    // Esclusi dalla parte operativa (Uscite/Ingressi per centro):
    //   - isTransfer=true (vecchie 3 righe split modello v2.3.28-32)
    //   - linkedTransactionId NOT NULL (riga "[SPLIT-TOTAL]" nuova: è giroconto soci+IVA,
    //     non spesa operativa; lo spaccato vive nel box "Valori da split")
    // Le righe expected_split virtuali NON entrano (sono solo nel ledger, non in monthTxs).
    const incomeByCenterMap = new Map<string, number>();
    const expenseByCenterMap = new Map<string, number>();
    for (const t of monthTxs) {
      if (t.isTransfer) continue;
      if (t.linkedTransactionId) continue;
      if (t.amount > 0) {
        const name = t.revenueCenterId ? (revCenterById.get(t.revenueCenterId) || "Senza centro") : "Senza centro";
        incomeByCenterMap.set(name, (incomeByCenterMap.get(name) || 0) + t.amount);
      } else if (t.amount < 0) {
        const name = t.costCenterId ? (costCenterById.get(t.costCenterId) || "Senza centro") : "Senza centro";
        expenseByCenterMap.set(name, (expenseByCenterMap.get(name) || 0) + Math.abs(t.amount));
      }
    }
    const incomeByCenter = Array.from(incomeByCenterMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
    const expenseByCenter = Array.from(expenseByCenterMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Valori dagli incomeSplits del mese (Guadagno = agency, IVA, Alessio, Daniela)
    // = somma split realizzati + somma split previsti (autoSplit su expected_incomes)
    const values = monthSplitsRaw.reduce(
      (acc, s) => {
        acc.iva += s.vatAmount;
        acc.alessio += s.alessioAmount;
        acc.daniela += s.danielaAmount;
        acc.guadagno += s.agencyAmount;
        return acc;
      },
      { iva: 0, alessio: 0, daniela: 0, guadagno: 0 },
    );
    values.iva += plannedValuesIva;
    values.alessio += plannedValuesAlessio;
    values.daniela += plannedValuesDaniela;
    values.guadagno += plannedValuesAgency;

    return NextResponse.json({
      year,
      month,
      initialBalance,
      finalBalance,
      rowsCount: all.length,
      rows: all,
      totals: {
        incomeByCenter,
        expenseByCenter,
        values,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
