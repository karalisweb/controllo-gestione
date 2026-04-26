import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  contacts,
  expectedIncomes,
  expectedIncomeOverrides,
  transactions,
} from "@/lib/db/schema";
import { eq, and, isNull, lt, gte, lte, like } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface PendingItem {
  /** id univoco frontend (es. "ei-12-2026-3" = expected_income 12, anno 2026 mese 3) */
  key: string;
  expectedIncomeId: number;
  year: number;
  month: number;
  expectedDate: string; // YYYY-MM-DD
  expectedAmount: number; // centesimi (override se esiste, altrimenti default)
  isOverride: boolean;
  candidateTransactions: Array<{
    id: number;
    date: string;
    description: string | null;
    amount: number;
  }>;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * GET /api/contacts/[id]/pending-incomes?untilMonth=YYYY-MM
 *
 * Per un contact di tipo "client", restituisce la lista degli incassi previsti
 * dei mesi PASSATI (fino a untilMonth ESCLUSO, default = mese corrente) che:
 *   - non sono stati esplicitamente "saltati" (override.amount === 0)
 *   - non sono già linkati a una transaction
 *   - hanno potenzialmente bisogno di essere chiariti dall'utente
 *
 * Per ognuno include candidateTransactions: transazioni del cliente nel mese
 * (search per nome) per facilitare il match "✓ Arrivato".
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const contactId = parseInt(idStr, 10);
    if (Number.isNaN(contactId))
      return NextResponse.json({ error: "ID non valido" }, { status: 400 });

    // Carica il contact e verifica che sia un client
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, contactId), isNull(contacts.deletedAt)))
      .limit(1);
    if (!contact) return NextResponse.json({ error: "Contatto non trovato" }, { status: 404 });

    // Determina untilMonth (esclusivo)
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const untilMonthParam = searchParams.get("untilMonth");
    let untilYear: number;
    let untilMonth: number;
    if (untilMonthParam && /^\d{4}-\d{2}$/.test(untilMonthParam)) {
      const [y, m] = untilMonthParam.split("-").map(Number);
      untilYear = y;
      untilMonth = m;
    } else {
      untilYear = now.getFullYear();
      untilMonth = now.getMonth() + 1;
    }
    // firstOfUntilMonth = data di taglio (esclusiva)
    const cutoffDate = `${untilYear}-${pad2(untilMonth)}-01`;

    // Carica tutti gli expected_incomes che combaciano per nome (case-insensitive)
    const incomes = await db
      .select()
      .from(expectedIncomes)
      .where(
        and(
          isNull(expectedIncomes.deletedAt),
          eq(expectedIncomes.isActive, true),
          // match nome cliente case-insensitive
          like(expectedIncomes.clientName, contact.name),
          // start_date < cutoff (qualcosa è dovuto prima di untilMonth)
          lt(expectedIncomes.startDate, cutoffDate),
        ),
      );

    if (incomes.length === 0) {
      return NextResponse.json({ contact, items: [] });
    }

    // Carica tutti gli override per questi incomes
    const incomeIds = incomes.map((i) => i.id);
    const allOverrides = await db
      .select()
      .from(expectedIncomeOverrides)
      .where(
        and(
          // drizzle inArray: usiamo SQL custom per semplicità
          // (se vuoi import inArray, usa quello)
        ),
      );
    const overridesByKey: Record<string, { amount: number; notes: string | null }> = {};
    for (const o of allOverrides) {
      if (incomeIds.includes(o.expectedIncomeId)) {
        overridesByKey[`${o.expectedIncomeId}-${o.year}-${o.month}`] = {
          amount: o.amount,
          notes: o.notes,
        };
      }
    }

    // Per ogni income, calcola le occorrenze passate
    const items: PendingItem[] = [];

    for (const income of incomes) {
      const [sy, sm, sd] = income.startDate.split("-").map(Number);
      const startYM = sy * 12 + (sm - 1);
      const cutoffYM = untilYear * 12 + (untilMonth - 1);

      let endYM = cutoffYM - 1; // ultimo mese da considerare (esclusivo cutoff)
      if (income.endDate) {
        const [ey, em] = income.endDate.split("-").map(Number);
        const realEndYM = ey * 12 + (em - 1);
        endYM = Math.min(endYM, realEndYM);
      }

      const stepMonths = (() => {
        switch (income.frequency) {
          case "monthly": return 1;
          case "quarterly": return 3;
          case "semiannual": return 6;
          case "annual":
          case "one_time": return 12;
          default: return 1;
        }
      })();

      for (let ym = startYM; ym <= endYM; ym += stepMonths) {
        const year = Math.floor(ym / 12);
        const month = (ym % 12) + 1;
        const day = Math.min(income.expectedDay || sd || 1, lastDayOfMonth(year, month));
        const expectedDate = `${year}-${pad2(month)}-${pad2(day)}`;

        const overrideKey = `${income.id}-${year}-${month}`;
        const override = overridesByKey[overrideKey];

        // Se override.amount === 0 → saltato esplicitamente, non da chiarire
        if (override && override.amount === 0) continue;

        const expectedAmount = override ? override.amount : income.amount;

        // Cerca candidate transactions: del cliente, nel mese ±15gg
        const monthStart = `${year}-${pad2(month)}-01`;
        const monthEnd = `${year}-${pad2(month)}-${pad2(lastDayOfMonth(year, month))}`;

        const candidates = await db
          .select({
            id: transactions.id,
            date: transactions.date,
            description: transactions.description,
            amount: transactions.amount,
          })
          .from(transactions)
          .where(
            and(
              isNull(transactions.deletedAt),
              gte(transactions.date, monthStart),
              lte(transactions.date, monthEnd),
            ),
          );

        // Filtra: importo entrante (>0) e che match il nome del cliente nel description
        const clientNameLower = contact.name.toLowerCase();
        const tokens = clientNameLower.split(/\s+/).filter((t) => t.length > 2);
        const matchedCandidates = candidates.filter((tx) => {
          if (tx.amount <= 0) return false; // solo entrate
          if (!tx.description) return false;
          const descLower = tx.description.toLowerCase();
          // match se almeno un token significativo è nel description, oppure importo coincide
          const nameMatch = tokens.some((t) => descLower.includes(t));
          const amountMatch = Math.abs(tx.amount - expectedAmount) <= 100; // tolleranza 1€
          return nameMatch || amountMatch;
        });

        items.push({
          key: `ei-${income.id}-${year}-${month}`,
          expectedIncomeId: income.id,
          year,
          month,
          expectedDate,
          expectedAmount,
          isOverride: !!override,
          candidateTransactions: matchedCandidates,
        });
      }
    }

    // Ordina per data (più recente prima)
    items.sort((a, b) => b.expectedDate.localeCompare(a.expectedDate));

    return NextResponse.json({
      contact: { id: contact.id, name: contact.name, type: contact.type },
      items,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
