"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CostCenterForm } from "@/components/settings/CostCenterForm";
import { RevenueCenterForm } from "@/components/settings/RevenueCenterForm";
import { ExpectedIncomeForm } from "@/components/settings/ExpectedIncomeForm";
import { ExpectedExpenseForm } from "@/components/settings/ExpectedExpenseForm";
import { MobileHeader } from "@/components/MobileHeader";
import { formatCurrency } from "@/lib/utils/currency";
import type { CostCenter, RevenueCenter, ExpectedIncome, ExpectedExpense } from "@/types";
import { Plus, Edit2, Trash2, AlertTriangle, ChevronRight } from "lucide-react";

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Mensile",
  quarterly: "Trim.",
  semiannual: "Sem.",
  annual: "Annuale",
  one_time: "Una tantum",
};

const RELIABILITY_COLORS: Record<string, string> = {
  high: "bg-green-500/20 text-green-400 border-green-500/50",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  low: "bg-red-500/20 text-red-400 border-red-500/50",
};

const PRIORITY_LABELS: Record<string, string> = {
  essential: "Vitale",
  important: "Importante",
  investment: "Investimento",
  normal: "Normale",
};

const PRIORITY_COLORS: Record<string, string> = {
  essential: "bg-red-500/20 text-red-400 border-red-500/50",
  important: "bg-orange-500/20 text-orange-400 border-orange-500/50",
  investment: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  normal: "bg-gray-500/20 text-gray-400 border-gray-500/50",
};

// === COMPONENTI MOBILE ===

// Card per singola spesa (mobile)
function ExpenseCard({
  expense,
  onEdit,
  onDelete,
}: {
  expense: ExpectedExpense & { annualAmount: number };
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-3 border-b border-border last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{expense.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {expense.costCenter && (
              <div className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: expense.costCenter.color || "#6b7280" }}
                />
                <span className="text-xs text-muted-foreground">{expense.costCenter.name}</span>
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              {FREQUENCY_LABELS[expense.frequency]}
            </span>
            {expense.priority && expense.priority !== "normal" && (
              <Badge variant="outline" className={`text-xs px-1.5 py-0 ${PRIORITY_COLORS[expense.priority]}`}>
                {expense.priority === "essential" && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
                {PRIORITY_LABELS[expense.priority]}
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-sm font-bold text-red-500 dark:text-red-400">
            {formatCurrency(expense.annualAmount)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatCurrency(expense.amount)}/mese
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-1 mt-2">
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onEdit}>
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// Card per singolo incasso (mobile)
function IncomeCard({
  income,
  onEdit,
  onDelete,
}: {
  income: ExpectedIncome & { annualAmount: number };
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-3 border-b border-border last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{income.clientName}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {income.revenueCenter && (
              <div className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: income.revenueCenter.color || "#6b7280" }}
                />
                <span className="text-xs text-muted-foreground">{income.revenueCenter.name}</span>
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              {FREQUENCY_LABELS[income.frequency]}
            </span>
            <Badge variant="outline" className={`text-xs px-1.5 py-0 ${RELIABILITY_COLORS[income.reliability || "high"]}`}>
              {income.reliability === "high" ? "Alta" : income.reliability === "low" ? "Bassa" : "Media"}
            </Badge>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-sm font-bold text-green-500 dark:text-green-400">
            {formatCurrency(income.annualAmount)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatCurrency(income.amount)}/mese
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-1 mt-2">
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onEdit}>
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// Card per centro di costo/ricavo (mobile)
function CenterCard({
  name,
  color,
  count,
  countLabel,
  amount,
  isExpense,
  onEdit,
  onDelete,
}: {
  name: string;
  color: string;
  count: number;
  countLabel: string;
  amount: number;
  isExpense: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <div className="min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{name}</p>
          <p className="text-xs text-muted-foreground">
            {count} {countLabel}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`font-mono text-sm font-bold ${isExpense ? "text-red-500 dark:text-red-400" : "text-green-500 dark:text-green-400"}`}>
          {formatCurrency(amount)}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [expectedExpenses, setExpectedExpenses] = useState<ExpectedExpense[]>([]);
  const [revenueCenters, setRevenueCenters] = useState<RevenueCenter[]>([]);
  const [expectedIncomes, setExpectedIncomes] = useState<ExpectedIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("cost");
  const [expenseView, setExpenseView] = useState<"aggregate" | "monthly">("aggregate");
  const [incomeView, setIncomeView] = useState<"aggregate" | "monthly">("aggregate");

  // Form state
  const [costFormOpen, setCostFormOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [revenueFormOpen, setRevenueFormOpen] = useState(false);
  const [incomeFormOpen, setIncomeFormOpen] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpectedExpense | null>(null);
  const [editingRevenueCenter, setEditingRevenueCenter] = useState<RevenueCenter | null>(null);
  const [editingIncome, setEditingIncome] = useState<ExpectedIncome | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [costRes, expenseRes, revenueRes, incomesRes] = await Promise.all([
        fetch("/api/cost-centers?year=2026"),
        fetch("/api/expected-expenses?year=2026"),
        fetch("/api/revenue-centers?year=2026"),
        fetch("/api/expected-incomes?year=2026"),
      ]);

      if (costRes.ok) setCostCenters(await costRes.json());
      if (expenseRes.ok) setExpectedExpenses(await expenseRes.json());
      if (revenueRes.ok) setRevenueCenters(await revenueRes.json());
      if (incomesRes.ok) setExpectedIncomes(await incomesRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleCreateCostCenter = async (data: Partial<CostCenter>) => {
    const res = await fetch("/api/cost-centers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Errore nella creazione");
    await fetchData();
  };

  const handleUpdateCostCenter = async (data: Partial<CostCenter>) => {
    if (!editingCostCenter) return;
    const res = await fetch(`/api/cost-centers/${editingCostCenter.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Errore nell'aggiornamento");
    setEditingCostCenter(null);
    await fetchData();
  };

  const handleDeleteCostCenter = async (id: number) => {
    if (!confirm("Eliminare questo centro di costo?")) return;
    await fetch(`/api/cost-centers/${id}`, { method: "DELETE" });
    await fetchData();
  };

  const handleCreateExpense = async (data: Partial<ExpectedExpense>) => {
    const res = await fetch("/api/expected-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Errore nella creazione");
    await fetchData();
  };

  const handleUpdateExpense = async (data: Partial<ExpectedExpense>) => {
    if (!editingExpense) return;
    const res = await fetch(`/api/expected-expenses/${editingExpense.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Errore nell'aggiornamento");
    setEditingExpense(null);
    await fetchData();
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm("Eliminare questa spesa?")) return;
    await fetch(`/api/expected-expenses/${id}`, { method: "DELETE" });
    await fetchData();
  };

  const handleCreateRevenueCenter = async (data: Partial<RevenueCenter>) => {
    const res = await fetch("/api/revenue-centers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Errore nella creazione");
    await fetchData();
  };

  const handleUpdateRevenueCenter = async (data: Partial<RevenueCenter>) => {
    if (!editingRevenueCenter) return;
    const res = await fetch(`/api/revenue-centers/${editingRevenueCenter.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Errore nell'aggiornamento");
    setEditingRevenueCenter(null);
    await fetchData();
  };

  const handleDeleteRevenueCenter = async (id: number) => {
    if (!confirm("Eliminare questo centro di ricavo?")) return;
    await fetch(`/api/revenue-centers/${id}`, { method: "DELETE" });
    await fetchData();
  };

  const handleCreateIncome = async (data: Partial<ExpectedIncome>) => {
    const res = await fetch("/api/expected-incomes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Errore nella creazione");
    await fetchData();
  };

  const handleUpdateIncome = async (data: Partial<ExpectedIncome>) => {
    if (!editingIncome) return;
    const res = await fetch(`/api/expected-incomes/${editingIncome.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Errore nell'aggiornamento");
    setEditingIncome(null);
    await fetchData();
  };

  const handleDeleteIncome = async (id: number) => {
    if (!confirm("Eliminare questo incasso?")) return;
    await fetch(`/api/expected-incomes/${id}`, { method: "DELETE" });
    await fetchData();
  };

  // Calcoli
  const totalExpectedExpenses = costCenters.reduce((sum, c) => sum + (c.totalExpected || 0), 0);
  const totalSpent = costCenters.reduce((sum, c) => sum + (c.spent || 0), 0);
  const totalExpectedIncomes = revenueCenters.reduce((sum, c) => sum + (c.totalExpected || 0), 0);
  const totalCollected = revenueCenters.reduce((sum, c) => sum + (c.collected || 0), 0);

  // Spese con importo annuale
  const expensesWithAnnual = expectedExpenses
    .map((e) => ({ ...e, annualAmount: e.amount * (e.monthlyOccurrences?.length || 0) }))
    .sort((a, b) => b.annualAmount - a.annualAmount);

  // Incassi con importo annuale
  const incomesWithAnnual = expectedIncomes
    .map((i) => ({ ...i, annualAmount: i.amount * (i.monthlyOccurrences?.length || 0) }))
    .sort((a, b) => b.annualAmount - a.annualAmount);

  if (loading) {
    return (
      <div className="min-h-screen">
        <MobileHeader title="Piano Annuale" />
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Caricamento...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <MobileHeader title="Piano Annuale" />

      <div className="p-3 sm:p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">Piano Annuale</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gestisci spese, incassi e budget annuale
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="cost" className="text-xs sm:text-sm">
              Spese ({expectedExpenses.length})
            </TabsTrigger>
            <TabsTrigger value="revenue" className="text-xs sm:text-sm">
              Incassi ({expectedIncomes.length})
            </TabsTrigger>
          </TabsList>

          {/* === TAB SPESE === */}
          <TabsContent value="cost" className="space-y-4 mt-4">
            {/* Riepilogo Spese - 3 box */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <Card className="p-3 sm:p-4">
                <p className="text-xs text-muted-foreground mb-1">Totale Spese</p>
                <p className="text-base sm:text-xl font-bold font-mono text-red-500 dark:text-red-400">
                  {formatCurrency(totalExpectedExpenses)}
                </p>
              </Card>
              <Card className="p-3 sm:p-4">
                <p className="text-xs text-muted-foreground mb-1">Speso</p>
                <p className="text-base sm:text-xl font-bold font-mono text-foreground">
                  {formatCurrency(totalSpent)}
                </p>
              </Card>
              <Card className="p-3 sm:p-4">
                <p className="text-xs text-muted-foreground mb-1">Rimanente</p>
                <p className={`text-base sm:text-xl font-bold font-mono ${totalExpectedExpenses - totalSpent >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formatCurrency(totalExpectedExpenses - totalSpent)}
                </p>
              </Card>
            </div>

            {/* Centri di Costo */}
            <Card>
              <CardHeader className="p-3 sm:p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">Centri di Costo</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setCostFormOpen(true)} className="h-8 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Aggiungi
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-2">
                {costCenters.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nessun centro di costo
                  </p>
                ) : (
                  costCenters.map((center) => (
                    <CenterCard
                      key={center.id}
                      name={center.name}
                      color={center.color || "#6b7280"}
                      count={center.expectedExpensesCount || 0}
                      countLabel="voci"
                      amount={center.totalExpected || 0}
                      isExpense={true}
                      onEdit={() => {
                        setEditingCostCenter(center);
                        setCostFormOpen(true);
                      }}
                      onDelete={() => handleDeleteCostCenter(center.id)}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Controlli Vista + Aggiungi Spesa */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex gap-1">
                <Button
                  variant={expenseView === "aggregate" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExpenseView("aggregate")}
                  className="text-xs h-8 flex-1 sm:flex-none"
                >
                  Lista
                </Button>
                <Button
                  variant={expenseView === "monthly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExpenseView("monthly")}
                  className="text-xs h-8 flex-1 sm:flex-none"
                >
                  Mensile
                </Button>
              </div>
              <Button size="sm" onClick={() => setExpenseFormOpen(true)} className="h-8 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nuova Spesa
              </Button>
            </div>

            {/* Lista Spese */}
            {expenseView === "aggregate" ? (
              <Card className="overflow-hidden">
                {/* Mobile: Cards */}
                <div className="sm:hidden max-h-[400px] overflow-y-auto">
                  {expensesWithAnnual.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Nessuna spesa configurata
                    </p>
                  ) : (
                    expensesWithAnnual.map((expense) => (
                      <ExpenseCard
                        key={expense.id}
                        expense={expense}
                        onEdit={() => {
                          setEditingExpense(expense);
                          setExpenseFormOpen(true);
                        }}
                        onDelete={() => handleDeleteExpense(expense.id)}
                      />
                    ))
                  )}
                </div>

                {/* Desktop: Tabella */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Centro</TableHead>
                        <TableHead className="text-right">Importo</TableHead>
                        <TableHead className="text-right">Annuale</TableHead>
                        <TableHead>Freq.</TableHead>
                        <TableHead>Priorità</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expensesWithAnnual.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.name}</TableCell>
                          <TableCell>
                            {expense.costCenter ? (
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: expense.costCenter.color || "#6b7280" }}
                                />
                                <span className="text-sm">{expense.costCenter.name}</span>
                              </div>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-600">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-600 font-bold">
                            {formatCurrency(expense.annualAmount)}
                          </TableCell>
                          <TableCell>{FREQUENCY_LABELS[expense.frequency]}</TableCell>
                          <TableCell>
                            {expense.priority && expense.priority !== "normal" ? (
                              <Badge className={PRIORITY_COLORS[expense.priority]}>
                                {PRIORITY_LABELS[expense.priority]}
                              </Badge>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditingExpense(expense);
                                setExpenseFormOpen(true);
                              }}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteExpense(expense.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ) : (
              /* Vista Mensile */
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10 min-w-[120px]">Spesa</TableHead>
                        {MONTHS.map((month, idx) => (
                          <TableHead key={idx} className="text-center min-w-[70px] text-xs">
                            {month}
                          </TableHead>
                        ))}
                        <TableHead className="text-right font-bold min-w-[80px]">Tot.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expensesWithAnnual.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="sticky left-0 bg-background z-10">
                            <div className="text-xs font-medium truncate max-w-[100px]">{expense.name}</div>
                          </TableCell>
                          {MONTHS.map((_, monthIdx) => {
                            const hasExpense = expense.monthlyOccurrences?.includes(monthIdx + 1);
                            return (
                              <TableCell key={monthIdx} className="text-center text-xs p-1">
                                {hasExpense ? (
                                  <span className="font-mono text-red-600">{formatCurrency(expense.amount)}</span>
                                ) : "-"}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-mono text-red-600 font-bold text-xs">
                            {formatCurrency(expense.annualAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted font-bold">
                        <TableCell className="sticky left-0 bg-muted z-10 text-xs">TOTALE</TableCell>
                        {MONTHS.map((_, monthIdx) => {
                          const monthTotal = expectedExpenses.reduce((sum, exp) => {
                            if (exp.monthlyOccurrences?.includes(monthIdx + 1)) return sum + exp.amount;
                            return sum;
                          }, 0);
                          return (
                            <TableCell key={monthIdx} className="text-center font-mono text-red-600 text-xs p-1">
                              {formatCurrency(monthTotal)}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-mono text-red-600 text-xs">
                          {formatCurrency(totalExpectedExpenses)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* === TAB INCASSI === */}
          <TabsContent value="revenue" className="space-y-4 mt-4">
            {/* Riepilogo Incassi - 3 box */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <Card className="p-3 sm:p-4">
                <p className="text-xs text-muted-foreground mb-1">Totale Previsto</p>
                <p className="text-base sm:text-xl font-bold font-mono text-green-500 dark:text-green-400">
                  {formatCurrency(totalExpectedIncomes)}
                </p>
              </Card>
              <Card className="p-3 sm:p-4">
                <p className="text-xs text-muted-foreground mb-1">Incassato</p>
                <p className="text-base sm:text-xl font-bold font-mono text-foreground">
                  {formatCurrency(totalCollected)}
                </p>
              </Card>
              <Card className="p-3 sm:p-4">
                <p className="text-xs text-muted-foreground mb-1">Da Incassare</p>
                <p className="text-base sm:text-xl font-bold font-mono text-orange-500">
                  {formatCurrency(totalExpectedIncomes - totalCollected)}
                </p>
              </Card>
            </div>

            {/* Centri di Ricavo */}
            <Card>
              <CardHeader className="p-3 sm:p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">Centri di Ricavo</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setRevenueFormOpen(true)} className="h-8 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Aggiungi
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-2">
                {revenueCenters.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nessun centro di ricavo
                  </p>
                ) : (
                  revenueCenters.map((center) => (
                    <CenterCard
                      key={center.id}
                      name={center.name}
                      color={center.color || "#6b7280"}
                      count={center.expectedIncomesCount || 0}
                      countLabel="clienti"
                      amount={center.totalExpected || 0}
                      isExpense={false}
                      onEdit={() => {
                        setEditingRevenueCenter(center);
                        setRevenueFormOpen(true);
                      }}
                      onDelete={() => handleDeleteRevenueCenter(center.id)}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Controlli Vista + Aggiungi Incasso */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex gap-1">
                <Button
                  variant={incomeView === "aggregate" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIncomeView("aggregate")}
                  className="text-xs h-8 flex-1 sm:flex-none"
                >
                  Lista
                </Button>
                <Button
                  variant={incomeView === "monthly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIncomeView("monthly")}
                  className="text-xs h-8 flex-1 sm:flex-none"
                >
                  Mensile
                </Button>
              </div>
              <Button size="sm" onClick={() => setIncomeFormOpen(true)} className="h-8 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nuovo Incasso
              </Button>
            </div>

            {/* Lista Incassi */}
            {incomeView === "aggregate" ? (
              <Card className="overflow-hidden">
                {/* Mobile: Cards */}
                <div className="sm:hidden max-h-[400px] overflow-y-auto">
                  {incomesWithAnnual.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Nessun incasso configurato
                    </p>
                  ) : (
                    incomesWithAnnual.map((income) => (
                      <IncomeCard
                        key={income.id}
                        income={income}
                        onEdit={() => {
                          setEditingIncome(income);
                          setIncomeFormOpen(true);
                        }}
                        onDelete={() => handleDeleteIncome(income.id)}
                      />
                    ))
                  )}
                </div>

                {/* Desktop: Tabella */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Centro</TableHead>
                        <TableHead className="text-right">Importo</TableHead>
                        <TableHead className="text-right">Annuale</TableHead>
                        <TableHead>Freq.</TableHead>
                        <TableHead>Affidabilità</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incomesWithAnnual.map((income) => (
                        <TableRow key={income.id}>
                          <TableCell className="font-medium">{income.clientName}</TableCell>
                          <TableCell>
                            {income.revenueCenter ? (
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: income.revenueCenter.color || "#6b7280" }}
                                />
                                <span className="text-sm">{income.revenueCenter.name}</span>
                              </div>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            {formatCurrency(income.amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-600 font-bold">
                            {formatCurrency(income.annualAmount)}
                          </TableCell>
                          <TableCell>{FREQUENCY_LABELS[income.frequency]}</TableCell>
                          <TableCell>
                            <Badge className={RELIABILITY_COLORS[income.reliability || "high"]}>
                              {income.reliability === "high" ? "Alta" : income.reliability === "low" ? "Bassa" : "Media"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditingIncome(income);
                                setIncomeFormOpen(true);
                              }}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteIncome(income.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ) : (
              /* Vista Mensile */
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10 min-w-[120px]">Cliente</TableHead>
                        {MONTHS.map((month, idx) => (
                          <TableHead key={idx} className="text-center min-w-[70px] text-xs">
                            {month}
                          </TableHead>
                        ))}
                        <TableHead className="text-right font-bold min-w-[80px]">Tot.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incomesWithAnnual.map((income) => (
                        <TableRow key={income.id}>
                          <TableCell className="sticky left-0 bg-background z-10">
                            <div className="text-xs font-medium truncate max-w-[100px]">{income.clientName}</div>
                          </TableCell>
                          {MONTHS.map((_, monthIdx) => {
                            const hasIncome = income.monthlyOccurrences?.includes(monthIdx + 1);
                            return (
                              <TableCell key={monthIdx} className="text-center text-xs p-1">
                                {hasIncome ? (
                                  <span className="font-mono text-green-600">{formatCurrency(income.amount)}</span>
                                ) : "-"}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-mono text-green-600 font-bold text-xs">
                            {formatCurrency(income.annualAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted font-bold">
                        <TableCell className="sticky left-0 bg-muted z-10 text-xs">TOTALE</TableCell>
                        {MONTHS.map((_, monthIdx) => {
                          const monthTotal = expectedIncomes.reduce((sum, inc) => {
                            if (inc.monthlyOccurrences?.includes(monthIdx + 1)) return sum + inc.amount;
                            return sum;
                          }, 0);
                          return (
                            <TableCell key={monthIdx} className="text-center font-mono text-green-600 text-xs p-1">
                              {formatCurrency(monthTotal)}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-mono text-green-600 text-xs">
                          {formatCurrency(totalExpectedIncomes)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Form modali */}
      <CostCenterForm
        open={costFormOpen}
        onOpenChange={(open) => {
          setCostFormOpen(open);
          if (!open) setEditingCostCenter(null);
        }}
        onSubmit={editingCostCenter ? handleUpdateCostCenter : handleCreateCostCenter}
        editingCenter={editingCostCenter}
      />

      <ExpectedExpenseForm
        open={expenseFormOpen}
        onOpenChange={(open) => {
          setExpenseFormOpen(open);
          if (!open) setEditingExpense(null);
        }}
        onSubmit={editingExpense ? handleUpdateExpense : handleCreateExpense}
        editingExpense={editingExpense}
        costCenters={costCenters}
      />

      <RevenueCenterForm
        open={revenueFormOpen}
        onOpenChange={(open) => {
          setRevenueFormOpen(open);
          if (!open) setEditingRevenueCenter(null);
        }}
        onSubmit={editingRevenueCenter ? handleUpdateRevenueCenter : handleCreateRevenueCenter}
        editingCenter={editingRevenueCenter}
      />

      <ExpectedIncomeForm
        open={incomeFormOpen}
        onOpenChange={(open) => {
          setIncomeFormOpen(open);
          if (!open) setEditingIncome(null);
        }}
        onSubmit={editingIncome ? handleUpdateIncome : handleCreateIncome}
        editingIncome={editingIncome}
        revenueCenters={revenueCenters}
      />
    </div>
  );
}
