"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/currency";
import {
  Target,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Shield,
  Calendar,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  CreditCard,
  FileText,
  Bell,
  ChevronRight,
  Receipt,
  Clock,
  PartyPopper,
} from "lucide-react";
import Link from "next/link";
import { QuickEntry } from "@/components/dashboard/QuickEntry";

interface DashboardData {
  currentBalance: number;
  balanceChange7Days: number;
  runway: {
    months: number;
    target: number;
    percent: number;
    avgMonthlyBurn: number;
  };
  quarterSales: {
    quarter: number;
    year: number;
    daysRemaining: number;
    gap: number;
    salesAvailable: number;
    salesWonAvailable: number;
    salesGross: number;
    salesWonGross: number;
    remainingToSell: number;
    progress: number;
  };
  currentMonthSustainability: {
    month: number;
    year: number;
    income: number;
    expenses: number;
    pdr: number;
    margin: number;
    prevMonth: {
      month: number;
      year: number;
      margin: number;
    };
    marginChange: number;
  };
  next7Days: {
    incomes: Array<{ id: number; date: string; description: string; amount: number; clientName: string }>;
    expenses: Array<{ id: number; date: string; description: string; amount: number; type: string; isEssential: boolean }>;
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  last7Days: {
    incomes: Array<{ id: number; date: string; description: string; amount: number }>;
    expenses: Array<{ id: number; date: string; description: string; amount: number }>;
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  actions: {
    overdueInstallments: Array<{ id: number; creditorName: string; dueDate: string; amount: number }>;
    overdueTotal: number;
    invoicesToIssue: Array<{ id: number; clientName: string; amount: number }>;
    invoicesTotal: number;
    latePayments: Array<{ id: number; clientName: string; amount: number; expectedDay: number }>;
    lateTotal: number;
  };
  pdr: {
    plans: Array<{
      id: number;
      creditorName: string;
      category: { name: string; color: string } | null;
      totalAmount: number;
      remaining: number;
      paidInstallments: number;
      totalInstallments: number;
      progress: number;
      estimatedCloseDate: string;
    }>;
    totalRemaining: number;
    monthlyTotal: number;
  };
  trend: Array<{
    month: number;
    year: number;
    income: number;
    expenses: number;
    margin: number;
  }>;
}

const MONTH_NAMES = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard-ceo?year=2026");
      if (!res.ok) throw new Error("Errore nel caricamento");
      const dashboardData = await res.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  };

  const formatMonth = (month: number) => MONTH_NAMES[month - 1];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <p className="text-red-500">{error || "Errore nel caricamento"}</p>
          <Button onClick={fetchData} className="mt-4">Riprova</Button>
        </div>
      </div>
    );
  }

  const hasActions = data.actions.overdueInstallments.length > 0 ||
                     data.actions.invoicesToIssue.length > 0 ||
                     data.actions.latePayments.length > 0;

  return (
    <div className="min-h-screen pb-24">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f172a]">
              <span className="text-[#d4af37] font-bold text-sm">K</span>
              <span className="text-[#d4af37] font-medium text-xs -ml-0.5">f</span>
            </div>
            <span className="font-semibold text-foreground">Dashboard</span>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
        {/* ============ 1. HERO: VENDI ANCORA ============ */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                OBIETTIVO Q{data.quarterSales.quarter} {data.quarterSales.year}
              </span>
              <Badge variant="outline" className="ml-auto text-xs">
                {data.quarterSales.daysRemaining} giorni rimasti
              </Badge>
            </div>

            <div className="text-center py-4">
              <div className="text-xs text-muted-foreground mb-1">Vendi ancora</div>
              <div className="text-3xl sm:text-4xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {formatCurrency(data.quarterSales.remainingToSell)}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Venduto {formatCurrency(data.quarterSales.salesAvailable)}</span>
                <span>Target {formatCurrency(data.quarterSales.gap)}</span>
              </div>
              <div className="h-3 bg-amber-200 dark:bg-amber-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all rounded-full"
                  style={{ width: `${data.quarterSales.progress}%` }}
                />
              </div>
              <div className="text-center text-sm font-medium text-amber-600 mt-2">
                {data.quarterSales.progress}% raggiunto
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============ 2. CASSA + RUNWAY ============ */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">CASSA OGGI</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono">
                {formatCurrency(data.currentBalance)}
              </div>
              <div className={`flex items-center gap-1 text-xs mt-1 ${
                data.balanceChange7Days >= 0 ? "text-green-600" : "text-red-600"
              }`}>
                {data.balanceChange7Days >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{data.balanceChange7Days >= 0 ? "+" : ""}{formatCurrency(data.balanceChange7Days)} vs 7gg</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">RUNWAY</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono">
                {data.runway.months} <span className="text-base font-normal text-muted-foreground">mesi</span>
              </div>
              <div className="mt-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all rounded-full ${
                      data.runway.percent >= 100 ? "bg-green-500" :
                      data.runway.percent >= 60 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(100, data.runway.percent)}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  target: {data.runway.target} mesi
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ============ 3. SOSTENIBILITÀ MESE ============ */}
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formatMonth(data.currentMonthSustainability.month)} {data.currentMonthSustainability.year} - Sostenibilità
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Entrate previste</span>
                <span className="font-mono text-green-600">+{formatCurrency(data.currentMonthSustainability.income)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Uscite operative</span>
                <span className="font-mono text-red-600">-{formatCurrency(data.currentMonthSustainability.expenses)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Rate PDR</span>
                <span className="font-mono text-amber-600">-{formatCurrency(data.currentMonthSustainability.pdr)}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">MARGINE PREVISTO</span>
                  <span className={`font-mono font-bold text-lg ${
                    data.currentMonthSustainability.margin >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {data.currentMonthSustainability.margin >= 0 ? "+" : ""}{formatCurrency(data.currentMonthSustainability.margin)}
                    {data.currentMonthSustainability.margin < 0 && (
                      <AlertTriangle className="inline h-4 w-4 ml-1" />
                    )}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                vs {formatMonth(data.currentMonthSustainability.prevMonth.month)}:
                <span className={data.currentMonthSustainability.marginChange >= 0 ? "text-green-600" : "text-red-600"}>
                  {data.currentMonthSustainability.marginChange >= 0 ? "+" : ""}{formatCurrency(data.currentMonthSustainability.marginChange)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============ 4. PROSSIMI 7GG + ULTIMI 7GG ============ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Prossimi 7 giorni */}
          <Card>
            <CardHeader className="pb-2 px-4">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Prossimi 7 giorni
                </span>
                <span className={`font-mono text-sm ${
                  data.next7Days.balance >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {data.next7Days.balance >= 0 ? "+" : ""}{formatCurrency(data.next7Days.balance)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {data.next7Days.incomes.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-muted-foreground mb-1">IN ENTRATA</div>
                  {data.next7Days.incomes.slice(0, 3).map((income) => (
                    <div key={income.id} className="flex justify-between items-center py-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-10">{formatDate(income.date)}</span>
                        <span className="truncate max-w-[120px]">{income.clientName}</span>
                      </div>
                      <span className="font-mono text-green-600">+{formatCurrency(income.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              {data.next7Days.expenses.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">IN USCITA</div>
                  {data.next7Days.expenses.slice(0, 4).map((expense) => (
                    <div key={expense.id} className="flex justify-between items-center py-1 text-sm">
                      <div className="flex items-center gap-2">
                        {expense.isEssential && <div className="w-2 h-2 rounded-full bg-red-500" />}
                        {expense.type === "pdr" && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                        {!expense.isEssential && expense.type !== "pdr" && <div className="w-2 h-2 rounded-full bg-muted" />}
                        <span className="text-xs text-muted-foreground w-10">{formatDate(expense.date)}</span>
                        <span className="truncate max-w-[100px]">{expense.description}</span>
                      </div>
                      <span className="font-mono text-red-600">-{formatCurrency(expense.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              {data.next7Days.incomes.length === 0 && data.next7Days.expenses.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nessun movimento previsto</p>
              )}
              <Link href="/forecast" className="block mt-3">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  Vedi tutti <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Ultimi 7 giorni */}
          <Card>
            <CardHeader className="pb-2 px-4">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Ultimi 7 giorni
                </span>
                <span className={`font-mono text-sm ${
                  data.last7Days.balance >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {data.last7Days.balance >= 0 ? "+" : ""}{formatCurrency(data.last7Days.balance)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {data.last7Days.incomes.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-muted-foreground mb-1">INCASSATI</div>
                  {data.last7Days.incomes.slice(0, 3).map((income) => (
                    <div key={income.id} className="flex justify-between items-center py-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-10">{formatDate(income.date)}</span>
                        <span className="truncate max-w-[120px]">{income.description}</span>
                      </div>
                      <span className="font-mono text-green-600">+{formatCurrency(income.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              {data.last7Days.expenses.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">SPESI</div>
                  {data.last7Days.expenses.slice(0, 4).map((expense) => (
                    <div key={expense.id} className="flex justify-between items-center py-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-10">{formatDate(expense.date)}</span>
                        <span className="truncate max-w-[100px]">{expense.description}</span>
                      </div>
                      <span className="font-mono text-red-600">{formatCurrency(expense.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              {data.last7Days.incomes.length === 0 && data.last7Days.expenses.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nessun movimento registrato</p>
              )}
              <Link href="/transactions" className="block mt-3">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  Vedi tutti <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* ============ 5. AZIONI RICHIESTE ============ */}
        {hasActions && (
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-2 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Azioni Richieste
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {/* Rate scadute */}
              {data.actions.overdueInstallments.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="font-medium text-red-700 dark:text-red-400">
                        {data.actions.overdueInstallments.length} rate PDR scadute
                      </span>
                    </div>
                    <span className="font-mono font-bold text-red-600">
                      {formatCurrency(data.actions.overdueTotal)}
                    </span>
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">
                    {data.actions.overdueInstallments.slice(0, 3).map(i => i.creditorName).join(" • ")}
                  </div>
                  <Link href="/payment-plans">
                    <Button size="sm" variant="outline" className="mt-2 h-7 text-xs border-red-300 text-red-600 hover:bg-red-100">
                      Gestisci <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              )}

              {/* Fatture da emettere */}
              {data.actions.invoicesToIssue.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        {data.actions.invoicesToIssue.length} fatture da emettere
                      </span>
                    </div>
                    <span className="font-mono font-bold text-amber-600">
                      {formatCurrency(data.actions.invoicesTotal)}
                    </span>
                  </div>
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    {data.actions.invoicesToIssue.slice(0, 3).map(i => i.clientName).join(" • ")}
                  </div>
                </div>
              )}

              {/* Incassi in ritardo */}
              {data.actions.latePayments.length > 0 && (
                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-orange-500" />
                      <span className="font-medium text-orange-700 dark:text-orange-400">
                        {data.actions.latePayments.length} incassi in ritardo
                      </span>
                    </div>
                    <span className="font-mono font-bold text-orange-600">
                      {formatCurrency(data.actions.lateTotal)}
                    </span>
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-400">
                    {data.actions.latePayments.slice(0, 3).map(i => i.clientName).join(" • ")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ============ 6. PIANI DI RIENTRO ============ */}
        {data.pdr.plans.length > 0 && (
          <Card>
            <CardHeader className="pb-2 px-4">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Piani di Rientro
                </span>
                <Link href="/payment-plans">
                  <Button variant="ghost" size="sm" className="h-6 text-xs">
                    Gestisci <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-3">
                <span>Debito residuo: <span className="font-mono font-medium text-foreground">{formatCurrency(data.pdr.totalRemaining)}</span></span>
                <span>Rate mese: <span className="font-mono font-medium text-foreground">{formatCurrency(data.pdr.monthlyTotal)}</span></span>
              </div>
              <div className="space-y-3">
                {data.pdr.plans.slice(0, 3).map((plan) => (
                  <div key={plan.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{plan.creditorName}</span>
                        {plan.category && (
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: plan.category.color || undefined, color: plan.category.color || undefined }}
                          >
                            {plan.category.name}
                          </Badge>
                        )}
                        {plan.progress >= 75 && (
                          <PartyPopper className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatMonth(new Date(plan.estimatedCloseDate).getMonth() + 1)} {new Date(plan.estimatedCloseDate).getFullYear()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all rounded-full"
                          style={{ width: `${plan.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono w-10 text-right">{plan.progress}%</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{plan.paidInstallments}/{plan.totalInstallments} rate</span>
                      <span>{formatCurrency(plan.remaining)} rimasti</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============ 7. TREND ============ */}
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trend ultimi 3 mesi
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-2">
              {data.trend.map((month, idx) => {
                const isCurrentMonth = idx === data.trend.length - 1;
                return (
                  <div
                    key={`${month.month}-${month.year}`}
                    className={`p-3 rounded-lg text-center ${
                      isCurrentMonth ? "bg-muted" : "bg-muted/50"
                    }`}
                  >
                    <div className="text-xs text-muted-foreground mb-1">
                      {formatMonth(month.month)} {isCurrentMonth && "(prev)"}
                    </div>
                    <div className={`font-mono font-bold ${
                      month.margin >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {month.margin >= 0 ? "+" : ""}{formatCurrency(month.margin)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {month.margin >= 0 ? (
                        <CheckCircle className="inline h-3 w-3 text-green-500" />
                      ) : (
                        <AlertTriangle className="inline h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {data.trend.length >= 2 && (
              <div className="text-center text-xs text-muted-foreground mt-3">
                {data.trend[data.trend.length - 1].margin > data.trend[data.trend.length - 2].margin ? (
                  <span className="text-green-600 flex items-center justify-center gap-1">
                    <TrendingUp className="h-3 w-3" /> In miglioramento
                  </span>
                ) : data.trend[data.trend.length - 1].margin < data.trend[data.trend.length - 2].margin ? (
                  <span className="text-red-600 flex items-center justify-center gap-1">
                    <TrendingDown className="h-3 w-3" /> In peggioramento
                  </span>
                ) : (
                  <span>Stabile</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-4 gap-2">
          <Link href="/forecast" className="block">
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
              <Calendar className="h-5 w-5" />
              <span className="text-[10px]">Previsionale</span>
            </Button>
          </Link>
          <Link href="/transactions" className="block">
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
              <FileText className="h-5 w-5" />
              <span className="text-[10px]">Consuntivo</span>
            </Button>
          </Link>
          <Link href="/sales" className="block">
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
              <Target className="h-5 w-5" />
              <span className="text-[10px]">Commerciale</span>
            </Button>
          </Link>
          <Link href="/settings" className="block">
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
              <Receipt className="h-5 w-5" />
              <span className="text-[10px]">Piano</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* FAB Quick Entry */}
      <QuickEntry onSuccess={fetchData} />
    </div>
  );
}
