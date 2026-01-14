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
import { formatCurrency } from "@/lib/utils/currency";
import type { CostCenter, RevenueCenter, ExpectedIncome, ExpectedExpense } from "@/types";
import { Plus, Edit2, Trash2, AlertTriangle } from "lucide-react";

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Mensile",
  quarterly: "Trimestrale",
  semiannual: "Semestrale",
  annual: "Annuale",
  one_time: "Una tantum",
};

const RELIABILITY_COLORS: Record<string, string> = {
  high: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
};

const PRIORITY_LABELS: Record<string, string> = {
  essential: "Vitale",
  important: "Importante",
  investment: "Investimento",
  normal: "Normale",
};

const PRIORITY_COLORS: Record<string, string> = {
  essential: "bg-red-100 text-red-800",
  important: "bg-orange-100 text-orange-800",
  investment: "bg-blue-100 text-blue-800",
  normal: "bg-gray-100 text-gray-800",
};

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

      if (costRes.ok) {
        setCostCenters(await costRes.json());
      }
      if (expenseRes.ok) {
        setExpectedExpenses(await expenseRes.json());
      }
      if (revenueRes.ok) {
        setRevenueCenters(await revenueRes.json());
      }
      if (incomesRes.ok) {
        setExpectedIncomes(await incomesRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cost Center handlers
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
    if (!confirm("Sei sicuro di voler eliminare questo centro di costo?")) return;
    const res = await fetch(`/api/cost-centers/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Errore nell'eliminazione");
    await fetchData();
  };

  // Expected Expense handlers
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
    if (!confirm("Sei sicuro di voler eliminare questa spesa prevista?")) return;
    const res = await fetch(`/api/expected-expenses/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Errore nell'eliminazione");
    await fetchData();
  };

  // Revenue Center handlers
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
    if (!confirm("Sei sicuro di voler eliminare questo centro di ricavo?")) return;
    const res = await fetch(`/api/revenue-centers/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Errore nell'eliminazione");
    await fetchData();
  };

  // Expected Income handlers
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
    if (!confirm("Sei sicuro di voler eliminare questo incasso previsto?")) return;
    const res = await fetch(`/api/expected-incomes/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Errore nell'eliminazione");
    await fetchData();
  };

  // Calcola totali
  const totalExpectedExpenses = costCenters.reduce((sum, c) => sum + (c.totalExpected || 0), 0);
  const totalSpent = costCenters.reduce((sum, c) => sum + (c.spent || 0), 0);
  const totalExpectedIncomes = revenueCenters.reduce((sum, c) => sum + (c.totalExpected || 0), 0);
  const totalCollected = revenueCenters.reduce((sum, c) => sum + (c.collected || 0), 0);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Caricamento...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Piano Annuale</h1>
        <p className="text-muted-foreground">
          Gestisci spese, incassi e budget annuale
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="cost">
            Spese ({expectedExpenses.length})
          </TabsTrigger>
          <TabsTrigger value="revenue">
            Incassi ({expectedIncomes.length})
          </TabsTrigger>
        </TabsList>

        {/* SPESE PREVISTE */}
        <TabsContent value="cost">
          {/* Riepilogo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Totale Spese Previste</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalExpectedExpenses)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Speso Finora</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalSpent)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Rimanente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalExpectedExpenses - totalSpent >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(totalExpectedExpenses - totalSpent)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Centri di Costo (Aggregatori) */}
          <Card className="mb-6">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Centri di Costo</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setCostFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {costCenters.map((center) => (
                  <div
                    key={center.id}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: center.color || "#6b7280" }}
                    />
                    <span className="font-medium">{center.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({center.expectedExpensesCount || 0} voci)
                    </span>
                    <span className="text-sm font-mono text-red-600">
                      {formatCurrency(center.totalExpected || 0)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setEditingCostCenter(center);
                        setCostFormOpen(true);
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteCostCenter(center.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {costCenters.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nessun centro di costo. Crea Telefonia, Software, Collaboratori, ecc...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sotto-tab Vista Aggregata / Vista Mensile */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <Button
                variant={expenseView === "aggregate" ? "default" : "outline"}
                size="sm"
                onClick={() => setExpenseView("aggregate")}
              >
                Vista Aggregata
              </Button>
              <Button
                variant={expenseView === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setExpenseView("monthly")}
              >
                Vista Mensile
              </Button>
            </div>
            <Button onClick={() => setExpenseFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuova Spesa Prevista
            </Button>
          </div>

          {expenseView === "aggregate" ? (
            /* Vista Aggregata - Tabella spese */
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Centro</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead className="text-right">Importo Annuale</TableHead>
                    <TableHead>Frequenza</TableHead>
                    <TableHead className="text-center">Giorno</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Priorità</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...expectedExpenses]
                    .map((expense) => ({
                      ...expense,
                      annualAmount: expense.amount * (expense.monthlyOccurrences?.length || 0),
                    }))
                    .sort((a, b) => b.annualAmount - a.annualAmount)
                    .map((expense) => {
                    const annualAmount = expense.annualAmount;

                    return (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <div className="font-medium">{expense.name}</div>
                        {expense.notes && (
                          <p className="text-xs text-muted-foreground">{expense.notes}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {expense.costCenter ? (
                          <div className="flex items-center gap-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: expense.costCenter.color || "#6b7280" }}
                            />
                            <span className="text-sm">{expense.costCenter.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-600 font-bold">
                        {formatCurrency(annualAmount)}
                      </TableCell>
                      <TableCell>
                        {FREQUENCY_LABELS[expense.frequency] || expense.frequency}
                      </TableCell>
                      <TableCell className="text-center">{expense.expectedDay}</TableCell>
                      <TableCell>
                        {(() => {
                          const formatDate = (d: string) => {
                            const [y, m] = d.split("-");
                            return `${MONTHS[parseInt(m) - 1]} ${y.slice(2)}`;
                          };
                          const start = formatDate(expense.startDate);
                          const end = expense.endDate ? formatDate(expense.endDate) : null;
                          if (!end) return <span className="text-xs">Da {start}</span>;
                          return <span className="text-xs">{start} → {end}</span>;
                        })()}
                      </TableCell>
                      <TableCell>
                        {expense.priority && expense.priority !== "normal" ? (
                          <Badge className={PRIORITY_COLORS[expense.priority]}>
                            {expense.priority === "essential" && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {PRIORITY_LABELS[expense.priority]}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingExpense(expense);
                              setExpenseFormOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteExpense(expense.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {expectedExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Nessuna spesa prevista configurata
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          ) : (
            /* Vista Mensile - Tabella con mesi come colonne */
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-white z-10">Spesa</TableHead>
                      {MONTHS.map((month, idx) => (
                        <TableHead key={idx} className="text-center min-w-[80px]">
                          {month}
                        </TableHead>
                      ))}
                      <TableHead className="text-right font-bold">Totale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...expectedExpenses]
                      .map((expense) => ({
                        ...expense,
                        annualAmount: expense.amount * (expense.monthlyOccurrences?.length || 0),
                      }))
                      .sort((a, b) => b.annualAmount - a.annualAmount)
                      .map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="sticky left-0 bg-white z-10">
                          <div className="font-medium text-sm">{expense.name}</div>
                          {expense.costCenter && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: expense.costCenter.color || "#6b7280" }}
                              />
                              <span className="text-xs text-muted-foreground">{expense.costCenter.name}</span>
                            </div>
                          )}
                        </TableCell>
                        {MONTHS.map((_, monthIdx) => {
                          const month = monthIdx + 1;
                          const hasExpense = expense.monthlyOccurrences?.includes(month);
                          return (
                            <TableCell key={monthIdx} className="text-center">
                              {hasExpense ? (
                                <span className="text-sm font-mono text-red-600">
                                  {formatCurrency(expense.amount)}
                                </span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-mono text-red-600 font-bold">
                          {formatCurrency(expense.annualAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Riga totali per mese */}
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell className="sticky left-0 bg-gray-50 z-10">TOTALE</TableCell>
                      {MONTHS.map((_, monthIdx) => {
                        const month = monthIdx + 1;
                        const monthTotal = expectedExpenses.reduce((sum, exp) => {
                          if (exp.monthlyOccurrences?.includes(month)) {
                            return sum + exp.amount;
                          }
                          return sum;
                        }, 0);
                        return (
                          <TableCell key={monthIdx} className="text-center font-mono text-red-600">
                            {formatCurrency(monthTotal)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-mono text-red-600">
                        {formatCurrency(totalExpectedExpenses)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* INCASSI PREVISTI */}
        <TabsContent value="revenue">
          {/* Riepilogo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Totale Previsto Annuale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalExpectedIncomes)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Incassato Finora</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalCollected)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Da Incassare</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(totalExpectedIncomes - totalCollected)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Centri di Ricavo (Aggregatori) */}
          <Card className="mb-6">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Centri di Ricavo</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setRevenueFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {revenueCenters.map((center) => (
                  <div
                    key={center.id}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: center.color || "#6b7280" }}
                    />
                    <span className="font-medium">{center.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({center.expectedIncomesCount || 0} clienti)
                    </span>
                    <span className="text-sm font-mono text-green-600">
                      {formatCurrency(center.totalExpected || 0)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setEditingRevenueCenter(center);
                        setRevenueFormOpen(true);
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteRevenueCenter(center.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {revenueCenters.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nessun centro di ricavo. Crea Siti Web, Marketing, Domini, Licenze...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sotto-tab Vista Aggregata / Vista Mensile */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <Button
                variant={incomeView === "aggregate" ? "default" : "outline"}
                size="sm"
                onClick={() => setIncomeView("aggregate")}
              >
                Vista Aggregata
              </Button>
              <Button
                variant={incomeView === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setIncomeView("monthly")}
              >
                Vista Mensile
              </Button>
            </div>
            <Button onClick={() => setIncomeFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Incasso Previsto
            </Button>
          </div>

          {incomeView === "aggregate" ? (
            /* Vista Aggregata - Tabella incassi */
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Centro</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead className="text-right">Importo Annuale</TableHead>
                    <TableHead>Frequenza</TableHead>
                    <TableHead className="text-center">Giorno</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Affidabilità</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...expectedIncomes]
                    .map((income) => ({
                      ...income,
                      annualAmount: income.amount * (income.monthlyOccurrences?.length || 0),
                    }))
                    .sort((a, b) => b.annualAmount - a.annualAmount)
                    .map((income) => {
                    const annualAmount = income.annualAmount;

                    return (
                    <TableRow key={income.id}>
                      <TableCell>
                        <div className="font-medium">{income.clientName}</div>
                        {income.notes && (
                          <p className="text-xs text-muted-foreground">{income.notes}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {income.revenueCenter ? (
                          <div className="flex items-center gap-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: income.revenueCenter.color || "#6b7280" }}
                            />
                            <span className="text-sm">{income.revenueCenter.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {formatCurrency(income.amount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600 font-bold">
                        {formatCurrency(annualAmount)}
                      </TableCell>
                      <TableCell>
                        {FREQUENCY_LABELS[income.frequency] || income.frequency}
                      </TableCell>
                      <TableCell className="text-center">{income.expectedDay}</TableCell>
                      <TableCell>
                        {(() => {
                          const formatDate = (d: string) => {
                            const [y, m] = d.split("-");
                            return `${MONTHS[parseInt(m) - 1]} ${y.slice(2)}`;
                          };
                          const start = formatDate(income.startDate);
                          const end = income.endDate ? formatDate(income.endDate) : null;
                          if (!end) return <span className="text-xs">Da {start}</span>;
                          return <span className="text-xs">{start} → {end}</span>;
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge className={RELIABILITY_COLORS[income.reliability || "high"]}>
                          {income.reliability === "high" ? "Alta" : income.reliability === "low" ? "Bassa" : "Media"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingIncome(income);
                              setIncomeFormOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteIncome(income.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {expectedIncomes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Nessun incasso previsto configurato
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          ) : (
            /* Vista Mensile - Tabella con mesi come colonne */
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-white z-10">Cliente</TableHead>
                      {MONTHS.map((month, idx) => (
                        <TableHead key={idx} className="text-center min-w-[80px]">
                          {month}
                        </TableHead>
                      ))}
                      <TableHead className="text-right font-bold">Totale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...expectedIncomes]
                      .map((income) => ({
                        ...income,
                        annualAmount: income.amount * (income.monthlyOccurrences?.length || 0),
                      }))
                      .sort((a, b) => b.annualAmount - a.annualAmount)
                      .map((income) => (
                      <TableRow key={income.id}>
                        <TableCell className="sticky left-0 bg-white z-10">
                          <div className="font-medium text-sm">{income.clientName}</div>
                          {income.revenueCenter && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: income.revenueCenter.color || "#6b7280" }}
                              />
                              <span className="text-xs text-muted-foreground">{income.revenueCenter.name}</span>
                            </div>
                          )}
                        </TableCell>
                        {MONTHS.map((_, monthIdx) => {
                          const month = monthIdx + 1;
                          const hasIncome = income.monthlyOccurrences?.includes(month);
                          return (
                            <TableCell key={monthIdx} className="text-center">
                              {hasIncome ? (
                                <span className="text-sm font-mono text-green-600">
                                  {formatCurrency(income.amount)}
                                </span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-mono text-green-600 font-bold">
                          {formatCurrency(income.annualAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Riga totali per mese */}
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell className="sticky left-0 bg-gray-50 z-10">TOTALE</TableCell>
                      {MONTHS.map((_, monthIdx) => {
                        const month = monthIdx + 1;
                        const monthTotal = expectedIncomes.reduce((sum, inc) => {
                          if (inc.monthlyOccurrences?.includes(month)) {
                            return sum + inc.amount;
                          }
                          return sum;
                        }, 0);
                        return (
                          <TableCell key={monthIdx} className="text-center font-mono text-green-600">
                            {formatCurrency(monthTotal)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-mono text-green-600">
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
