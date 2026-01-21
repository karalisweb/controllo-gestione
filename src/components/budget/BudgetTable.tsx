"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { MONTHS_SHORT } from "@/lib/utils/dates";
import { RefreshCw, Info } from "lucide-react";
import type { BudgetItem, Category, CostCenter, RevenueCenter, ExpectedExpense, ExpectedIncome } from "@/types";

// Tipo per le voci dettagliate (spese e incassi uniti)
interface DetailedEntry {
  id: string;
  date: Date;
  dateStr: string;
  type: "expense" | "income";
  typology: string; // Centro di costo o ricavo
  typologyColor?: string;
  description: string;
  amount: number; // Positivo per incassi, negativo per spese
}

// Tipo per i PDR
interface PaymentPlan {
  id: number;
  creditorName: string;
  totalAmount: number;
  installmentAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  startDate: string;
  isActive: boolean;
}

interface BudgetTableProps {
  items: BudgetItem[];
  categories: Category[];
  costCenters?: CostCenter[];
  revenueCenters?: RevenueCenter[];
  expectedExpenses?: ExpectedExpense[];
  expectedIncomes?: ExpectedIncome[];
  onRefresh: () => void;
  onDelete: (id: number) => Promise<void>;
  onAdd: (data: {
    categoryId?: number;
    costCenterId?: number;
    revenueCenterId?: number;
    description: string;
    amount: number;
    month: number;
    year: number;
    isRecurring: boolean;
    clientName?: string;
    notes?: string;
  }) => Promise<void>;
  onEdit: (id: number, data: {
    categoryId?: number;
    costCenterId?: number;
    revenueCenterId?: number;
    description: string;
    amount: number;
    month: number;
    year: number;
    isRecurring: boolean;
    clientName?: string;
    notes?: string;
  }) => Promise<void>;
}

export function BudgetTable({
  expectedExpenses = [],
  expectedIncomes = [],
  onRefresh,
}: BudgetTableProps) {
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  // Inizializza con il mese corrente
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(() => {
    const now = new Date();
    return now.getMonth() + 1; // getMonth() è 0-based
  });
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const todayRowRef = useRef<HTMLTableRowElement>(null);

  // Fetch PDR attivi
  useEffect(() => {
    const fetchPDR = async () => {
      try {
        const res = await fetch("/api/payment-plans");
        if (res.ok) {
          const data = await res.json();
          setPaymentPlans(data.filter((p: PaymentPlan) => p.isActive));
        }
      } catch (error) {
        console.error("Errore caricamento PDR:", error);
      }
    };
    fetchPDR();
  }, []);

  // Genera tutte le voci dettagliate per l'anno 2026
  const detailedEntries = useMemo(() => {
    const entries: DetailedEntry[] = [];
    const year = 2026;

    // Aggiungi spese previste
    expectedExpenses.forEach((expense) => {
      expense.monthlyOccurrences?.forEach((month) => {
        const day = expense.expectedDay || 1;
        const date = new Date(year, month - 1, day);
        entries.push({
          id: `expense-${expense.id}-${month}`,
          date,
          dateStr: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${String(year).slice(2)}`,
          type: "expense",
          typology: expense.costCenter?.name || "-",
          typologyColor: expense.costCenter?.color || undefined,
          description: expense.name,
          amount: -expense.amount, // Negativo per spese
        });
      });
    });

    // Aggiungi incassi previsti
    expectedIncomes.forEach((income) => {
      income.monthlyOccurrences?.forEach((month) => {
        const day = income.expectedDay || 1;
        const date = new Date(year, month - 1, day);
        entries.push({
          id: `income-${income.id}-${month}`,
          date,
          dateStr: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${String(year).slice(2)}`,
          type: "income",
          typology: income.revenueCenter?.name || "-",
          typologyColor: income.revenueCenter?.color || undefined,
          description: income.clientName,
          amount: income.amount, // Positivo per incassi
        });
      });
    });

    // Ordina per data
    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    return entries;
  }, [expectedExpenses, expectedIncomes]);

  // Filtra in base al filtro tipo (spese/incassi) e mese
  const filteredEntries = useMemo(() => {
    let entries = detailedEntries;

    // Filtra per tipo
    if (filter !== "all") {
      entries = entries.filter((e) => e.type === filter);
    }

    // Filtra per mese
    if (selectedMonth !== "all") {
      entries = entries.filter((e) => e.date.getMonth() + 1 === selectedMonth);
    }

    return entries;
  }, [detailedEntries, filter, selectedMonth]);

  // Calcola saldo iniziale (somma di tutti i movimenti dei mesi precedenti)
  const initialBalance = useMemo(() => {
    if (selectedMonth === "all") return 0;

    // Somma tutti i movimenti dei mesi precedenti
    return detailedEntries
      .filter((e) => e.date.getMonth() + 1 < selectedMonth)
      .filter((e) => filter === "all" || e.type === filter)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [detailedEntries, selectedMonth, filter]);

  // Calcola saldo progressivo partendo dal saldo iniziale
  const entriesWithBalance = useMemo(() => {
    let runningBalance = initialBalance;
    return filteredEntries.map((entry) => {
      runningBalance += entry.amount;
      return { ...entry, balance: runningBalance };
    });
  }, [filteredEntries, initialBalance]);

  // Trova l'indice della riga del giorno corrente o la prima successiva
  const todayEntryIndex = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Trova la prima entry che ha data >= oggi
    const index = entriesWithBalance.findIndex((entry) => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate >= today;
    });

    // Se non troviamo nessuna entry futura, mostra l'ultima
    return index >= 0 ? index : entriesWithBalance.length - 1;
  }, [entriesWithBalance]);

  // Scroll alla riga del giorno corrente quando cambia mese o si caricano i dati
  useEffect(() => {
    // Piccolo delay per assicurarsi che il DOM sia renderizzato
    const timer = setTimeout(() => {
      if (todayRowRef.current && tableContainerRef.current) {
        todayRowRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedMonth, entriesWithBalance.length]);

  // Calcola totali per mese con la NUOVA LOGICA
  const monthlyTotals = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;

      // Incassi lordi per questo mese
      const incassiLordi = expectedIncomes.reduce((sum, inc) => {
        if (inc.monthlyOccurrences?.includes(month)) {
          return sum + inc.amount;
        }
        return sum;
      }, 0);

      // Incassi netti = lordi / 1.22
      const incassiNetti = Math.round(incassiLordi / 1.22);

      // IVA da versare = 22% del netto
      const ivaDaVersare = Math.round(incassiNetti * 0.22);

      // Quota soci = 30% del netto
      const quotaSoci = Math.round(incassiNetti * 0.30);

      // Spese operative (già negative nel sistema, le rendiamo positive per visualizzazione)
      const speseOperative = expectedExpenses.reduce((sum, exp) => {
        if (exp.monthlyOccurrences?.includes(month)) {
          return sum + exp.amount; // Già in valore assoluto positivo
        }
        return sum;
      }, 0);

      // Rate PDR per questo mese (stima basata su PDR attivi)
      const ratePDR = paymentPlans.reduce((sum, plan) => {
        if (plan.installmentAmount > 0 && plan.totalInstallments > plan.paidInstallments) {
          // Assumiamo che le rate partano dalla data di inizio
          const startMonth = new Date(plan.startDate).getMonth() + 1;
          const rateRemaining = plan.totalInstallments - plan.paidInstallments;
          // Se siamo nel range delle rate rimanenti
          if (month >= startMonth && month < startMonth + rateRemaining) {
            return sum + plan.installmentAmount;
          }
        }
        return sum;
      }, 0);

      // Differenza = Incassi netti - IVA - Quota soci - Spese
      const differenza = incassiNetti - ivaDaVersare - quotaSoci - speseOperative;

      // Quota disponibile PDR = 30% della differenza (se positiva)
      const quotaDisponibilePDR = differenza > 0 ? Math.round(differenza * 0.30) : 0;

      // Disponibile dopo PDR = Differenza - Rate PDR effettive
      const disponibileFinale = differenza - ratePDR;

      return {
        month,
        incassiLordi,
        incassiNetti,
        ivaDaVersare,
        quotaSoci,
        speseOperative,
        ratePDR,
        differenza,
        quotaDisponibilePDR,
        disponibileFinale,
      };
    });
  }, [expectedExpenses, expectedIncomes, paymentPlans]);

  // Calcola totali annuali
  const yearlyTotals = useMemo(() => ({
    incassiLordi: monthlyTotals.reduce((sum, mt) => sum + mt.incassiLordi, 0),
    incassiNetti: monthlyTotals.reduce((sum, mt) => sum + mt.incassiNetti, 0),
    ivaDaVersare: monthlyTotals.reduce((sum, mt) => sum + mt.ivaDaVersare, 0),
    quotaSoci: monthlyTotals.reduce((sum, mt) => sum + mt.quotaSoci, 0),
    speseOperative: monthlyTotals.reduce((sum, mt) => sum + mt.speseOperative, 0),
    ratePDR: monthlyTotals.reduce((sum, mt) => sum + mt.ratePDR, 0),
    differenza: monthlyTotals.reduce((sum, mt) => sum + mt.differenza, 0),
    quotaDisponibilePDR: monthlyTotals.reduce((sum, mt) => sum + mt.quotaDisponibilePDR, 0),
    disponibileFinale: monthlyTotals.reduce((sum, mt) => sum + mt.disponibileFinale, 0),
  }), [monthlyTotals]);

  // Calcola andamento cassa cumulativo
  const cumulativeCash = monthlyTotals.reduce<number[]>((acc, mt) => {
    const previousTotal = acc.length > 0 ? acc[acc.length - 1] : 0;
    acc.push(previousTotal + mt.disponibileFinale);
    return acc;
  }, []);

  // Totale debito PDR residuo
  const totalDebitoPDR = paymentPlans.reduce((sum, plan) => {
    const remaining = (plan.totalInstallments - plan.paidInstallments) * plan.installmentAmount;
    return sum + remaining;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Piano Annuale - Tabella riepilogo NUOVA */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Piano Annuale 2026</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cashflow reale: incassi netti, IVA, quote soci, spese e PDR
            </p>
          </div>
          <div className="flex items-center gap-4">
            {totalDebitoPDR > 0 && (
              <Badge variant="destructive" className="text-sm px-3 py-1">
                Debito PDR: {formatCurrency(totalDebitoPDR)}
              </Badge>
            )}
            <Badge
              variant={yearlyTotals.disponibileFinale >= 0 ? "default" : "destructive"}
              className={`text-base px-4 py-2 ${yearlyTotals.disponibileFinale >= 0 ? "bg-green-600" : ""}`}
            >
              {yearlyTotals.disponibileFinale >= 0 ? "+" : ""}{formatCurrency(yearlyTotals.disponibileFinale)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Voce</TableHead>
                  {MONTHS_SHORT.map((month) => (
                    <TableHead key={month} className="text-right text-xs w-[75px]">
                      {month}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-bold w-[100px]">Totale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Incassi Netti */}
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      Incassi Netti
                      <span title="Lordo / 1.22">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </span>
                    </div>
                  </TableCell>
                  {monthlyTotals.map((mt) => (
                    <TableCell key={`netti-${mt.month}`} className="text-right text-sm font-mono text-green-600">
                      {mt.incassiNetti > 0 ? formatCurrency(mt.incassiNetti) : "-"}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold font-mono text-green-600">
                    {formatCurrency(yearlyTotals.incassiNetti)}
                  </TableCell>
                </TableRow>

                {/* IVA da versare */}
                <TableRow className="bg-orange-50/50">
                  <TableCell className="font-medium text-orange-700">
                    <div className="flex items-center gap-1">
                      IVA da versare
                      <span className="text-xs text-muted-foreground">(22%)</span>
                    </div>
                  </TableCell>
                  {monthlyTotals.map((mt) => (
                    <TableCell key={`iva-${mt.month}`} className="text-right text-sm font-mono text-orange-600">
                      {mt.ivaDaVersare > 0 ? `-${formatCurrency(mt.ivaDaVersare)}` : "-"}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold font-mono text-orange-600">
                    -{formatCurrency(yearlyTotals.ivaDaVersare)}
                  </TableCell>
                </TableRow>

                {/* Quota Soci */}
                <TableRow className="bg-purple-50/50">
                  <TableCell className="font-medium text-purple-700">
                    <div className="flex items-center gap-1">
                      Quota Soci
                      <span className="text-xs text-muted-foreground">(30%)</span>
                    </div>
                  </TableCell>
                  {monthlyTotals.map((mt) => (
                    <TableCell key={`soci-${mt.month}`} className="text-right text-sm font-mono text-purple-600">
                      {mt.quotaSoci > 0 ? `-${formatCurrency(mt.quotaSoci)}` : "-"}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold font-mono text-purple-600">
                    -{formatCurrency(yearlyTotals.quotaSoci)}
                  </TableCell>
                </TableRow>

                {/* Spese Operative */}
                <TableRow>
                  <TableCell className="font-medium">Spese Operative</TableCell>
                  {monthlyTotals.map((mt) => (
                    <TableCell key={`spese-${mt.month}`} className="text-right text-sm font-mono text-red-600">
                      {mt.speseOperative > 0 ? `-${formatCurrency(mt.speseOperative)}` : "-"}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold font-mono text-red-600">
                    -{formatCurrency(yearlyTotals.speseOperative)}
                  </TableCell>
                </TableRow>

                {/* Differenza */}
                <TableRow className="bg-muted/50 border-t-2">
                  <TableCell className="font-bold">Differenza</TableCell>
                  {monthlyTotals.map((mt) => (
                    <TableCell
                      key={`diff-${mt.month}`}
                      className={`text-right text-sm font-mono font-semibold ${
                        mt.differenza >= 0 ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {mt.differenza !== 0 ? formatCurrency(mt.differenza) : "-"}
                    </TableCell>
                  ))}
                  <TableCell
                    className={`text-right font-bold font-mono ${
                      yearlyTotals.differenza >= 0 ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {formatCurrency(yearlyTotals.differenza)}
                  </TableCell>
                </TableRow>

                {/* Quota disponibile PDR */}
                <TableRow className="bg-blue-50/50">
                  <TableCell className="font-medium text-blue-700">
                    <div className="flex items-center gap-1">
                      Disponibile PDR
                      <span className="text-xs text-muted-foreground">(30% diff.)</span>
                    </div>
                  </TableCell>
                  {monthlyTotals.map((mt) => (
                    <TableCell key={`pdr-disp-${mt.month}`} className="text-right text-sm font-mono text-blue-600">
                      {mt.quotaDisponibilePDR > 0 ? formatCurrency(mt.quotaDisponibilePDR) : "-"}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold font-mono text-blue-600">
                    {formatCurrency(yearlyTotals.quotaDisponibilePDR)}
                  </TableCell>
                </TableRow>

                {/* Rate PDR previste */}
                {yearlyTotals.ratePDR > 0 && (
                  <TableRow className="bg-amber-50/50">
                    <TableCell className="font-medium text-amber-700">
                      Rate PDR previste
                    </TableCell>
                    {monthlyTotals.map((mt) => (
                      <TableCell key={`pdr-rate-${mt.month}`} className="text-right text-sm font-mono text-amber-600">
                        {mt.ratePDR > 0 ? `-${formatCurrency(mt.ratePDR)}` : "-"}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-bold font-mono text-amber-600">
                      -{formatCurrency(yearlyTotals.ratePDR)}
                    </TableCell>
                  </TableRow>
                )}

                {/* Andamento Cassa */}
                <TableRow className="bg-primary/10 font-bold border-t-2">
                  <TableCell className="font-bold">Andamento Cassa</TableCell>
                  {cumulativeCash.map((cash, index) => (
                    <TableCell
                      key={`cumulative-${index}`}
                      className={`text-right text-sm font-mono font-bold ${
                        cash >= 0 ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {formatCurrency(cash)}
                    </TableCell>
                  ))}
                  <TableCell
                    className={`text-right font-bold font-mono ${
                      yearlyTotals.disponibileFinale >= 0 ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {formatCurrency(yearlyTotals.disponibileFinale)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Legenda */}
          <div className="mt-4 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
            <strong>Logica:</strong> Incasso Lordo → Netto (÷1.22) → -IVA (22%) → -Soci (30%) → -Spese = Differenza →
            30% disponibile per PDR → Cassa finale
          </div>
        </CardContent>
      </Card>

      {/* Tabella dettagliata movimenti */}
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between mb-4">
            <CardTitle>Dettaglio Movimenti Previsionali</CardTitle>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Aggiorna
            </Button>
          </div>

          {/* Tabs mensili */}
          <div className="flex flex-wrap gap-1 mb-4">
            <Button
              variant={selectedMonth === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedMonth("all")}
              className="text-xs"
            >
              Anno
            </Button>
            {MONTHS_SHORT.map((month, idx) => (
              <Button
                key={month}
                variant={selectedMonth === idx + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMonth(idx + 1)}
                className="text-xs px-3"
              >
                {month}
              </Button>
            ))}
          </div>

          {/* Filtri tipo */}
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              Entrambe ({filteredEntries.length})
            </Button>
            <Button
              variant={filter === "expense" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("expense")}
            >
              Spese
            </Button>
            <Button
              variant={filter === "income" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("income")}
            >
              Incassi
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Saldo iniziale se filtrato per mese */}
          {selectedMonth !== "all" && initialBalance !== 0 && (
            <div className={`mb-4 p-3 rounded-lg ${initialBalance >= 0 ? "bg-green-50" : "bg-red-50"}`}>
              <span className="text-sm text-muted-foreground">Saldo iniziale {MONTHS_SHORT[selectedMonth - 1]}:</span>
              <span className={`ml-2 font-mono font-bold ${initialBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
                {formatCurrency(initialBalance)}
              </span>
            </div>
          )}

          <div ref={tableContainerRef} className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[100px]">DATA</TableHead>
                  <TableHead className="w-[140px]">TIPOLOGIA</TableHead>
                  <TableHead>DESCRIZIONE</TableHead>
                  <TableHead className="text-right w-[120px]">IMPORTO</TableHead>
                  <TableHead className="text-right w-[120px]">SALDO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entriesWithBalance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nessun movimento previsto {selectedMonth !== "all" ? `per ${MONTHS_SHORT[selectedMonth - 1]}` : ""}
                    </TableCell>
                  </TableRow>
                ) : (
                  entriesWithBalance.map((entry, index) => {
                    const isToday = index === todayEntryIndex;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const entryDate = new Date(entry.date);
                    entryDate.setHours(0, 0, 0, 0);
                    const isPast = entryDate < today;

                    return (
                    <TableRow
                      key={entry.id}
                      ref={isToday ? todayRowRef : undefined}
                      className={isToday ? "bg-primary/10 border-l-4 border-l-primary" : isPast ? "opacity-50" : ""}
                    >
                      <TableCell className="font-mono text-sm">
                        {entry.dateStr}
                      </TableCell>
                      <TableCell>
                        {entry.typologyColor ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: entry.typologyColor }}
                            />
                            <span className="text-sm">{entry.typology}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">{entry.typology}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.description}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${
                        entry.amount >= 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-bold ${
                        entry.balance >= 0 ? "text-green-700" : "text-red-700"
                      }`}>
                        {formatCurrency(entry.balance)}
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Riepilogo mese */}
          {selectedMonth !== "all" && entriesWithBalance.length > 0 && (
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Saldo finale {MONTHS_SHORT[selectedMonth - 1]}:
              </span>
              <span className={`font-mono font-bold text-lg ${
                entriesWithBalance[entriesWithBalance.length - 1].balance >= 0 ? "text-green-700" : "text-red-700"
              }`}>
                {formatCurrency(entriesWithBalance[entriesWithBalance.length - 1].balance)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
