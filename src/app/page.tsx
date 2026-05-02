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
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Line, ComposedChart } from "recharts";
import { QuickEntry } from "@/components/dashboard/QuickEntry";
import { SalesForecastTable } from "@/components/dashboard/SalesForecastTable";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { FiveQuestionsBlock } from "@/components/dashboard/FiveQuestionsBlock";
import { AnimatedNumber } from "@/components/ui/animated-number";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

interface DashboardData {
  currentBalance: number;
  balanceChange7Days: number;
  runway: {
    days: number;
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
    earnings: number;
    target: number;
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
    return <DashboardSkeleton />;
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
      <header className="lg:hidden sticky top-0 z-30 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background">
              <Wallet size={16} className="text-primary" />
            </div>
            <span className="font-semibold text-foreground">Dashboard</span>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Notifiche">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <motion.div
        className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* ============ 0a. CASSA + RUNWAY (la prima cosa che vedo) ============ */}
        <motion.div variants={fadeInUp} transition={{ duration: 0.4 }} className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">CASSA OGGI</span>
              </div>
              <div className="text-xl sm:text-3xl font-bold font-mono">
                {formatCurrency(data.currentBalance)}
              </div>
              <div className={`flex items-center gap-1 text-[10px] sm:text-xs mt-1 ${
                data.balanceChange7Days >= 0 ? "text-green-600" : "text-red-600"
              }`}>
                {data.balanceChange7Days >= 0 ? (
                  <TrendingUp className="h-3 w-3 shrink-0" />
                ) : (
                  <TrendingDown className="h-3 w-3 shrink-0" />
                )}
                <span className="truncate">{data.balanceChange7Days >= 0 ? "+" : ""}{formatCurrency(data.balanceChange7Days)} vs 7gg</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">RUNWAY</span>
              </div>
              <div className="text-xl sm:text-3xl font-bold font-mono">
                {data.runway.days < 0 ? (
                  <span className="text-red-500 text-sm sm:text-2xl">esaurita {Math.abs(data.runway.days)}gg fa</span>
                ) : (
                  <>
                    {data.runway.days} <span className="text-sm sm:text-base font-normal text-muted-foreground">gg</span>
                  </>
                )}
              </div>
              <div className="mt-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all rounded-full ${
                      data.runway.percent >= 100 ? "bg-green-500" :
                      data.runway.percent >= 60 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, data.runway.percent))}%` }}
                  />
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  target: {data.runway.target}gg
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ============ 0b. LE 5 DOMANDE OPERATIVE (collassate) ============ */}
        <motion.div variants={fadeInUp} transition={{ duration: 0.4 }}>
          <FiveQuestionsBlock />
        </motion.div>

        {/* ============ 1. PREVISIONALE 4 MESI ============ */}
        <motion.div variants={fadeInUp} transition={{ duration: 0.4 }}>
          <SalesForecastTable />
        </motion.div>

        {/* ============ 2. TREND 3 MESI ============ */}
        <motion.div variants={fadeInUp} transition={{ duration: 0.4 }}>
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trend ultimi 3 mesi
              {data.trend.length >= 2 && (
                <span className="ml-auto">
                  {data.trend[data.trend.length - 1].margin > data.trend[data.trend.length - 2].margin ? (
                    <Badge variant="outline" className="text-green-600 border-green-600/30 text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" /> In miglioramento
                    </Badge>
                  ) : data.trend[data.trend.length - 1].margin < data.trend[data.trend.length - 2].margin ? (
                    <Badge variant="outline" className="text-red-600 border-red-600/30 text-xs">
                      <TrendingDown className="h-3 w-3 mr-1" /> In peggioramento
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-xs">Stabile</Badge>
                  )}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {data.trend.length > 0 && (
              <div className="h-48 hidden sm:block">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={data.trend.map(m => ({
                      name: formatMonth(m.month),
                      entrate: m.income / 100,
                      uscite: m.expenses / 100,
                      guadagno: m.earnings / 100,
                      obiettivo: m.target / 100,
                    }))}
                    margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorEntrate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorUscite" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#71717a", fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#132032",
                        border: "1px solid #2a2a35",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#f5f5f7",
                      }}
                      formatter={(value: number | undefined) => [value != null ? `${value.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €` : ""]}
                    />
                    <Area
                      type="monotone"
                      dataKey="entrate"
                      stroke="#22c55e"
                      fillOpacity={1}
                      fill="url(#colorEntrate)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="uscite"
                      stroke="#ef4444"
                      fillOpacity={1}
                      fill="url(#colorUscite)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="guadagno"
                      stroke="#eab308"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#eab308" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="obiettivo"
                      stroke="#d4a726"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
            {/* Legenda compatta — nascosta su mobile dove il chart non si vede */}
            <div className="hidden sm:flex flex-wrap gap-3 text-[10px] text-muted-foreground mt-2">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>Entrate</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>Uscite</span>
              <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-yellow-500"></span>Guadagno (netto − spese)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-amber-600 border-dashed border-amber-600 border-t"></span>Obiettivo</span>
            </div>
            {/* Card per mese sotto il chart */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {data.trend.map((month, idx) => (
                <div
                  key={`${month.month}-${month.year}`}
                  className={`p-2 rounded-lg text-center ${
                    idx === data.trend.length - 1 ? "bg-muted" : "bg-muted/50"
                  }`}
                >
                  <div className="text-xs text-muted-foreground">
                    {formatMonth(month.month)} {idx === data.trend.length - 1 && "(prev)"}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Fatturato: <span className="font-mono text-green-500">{formatCurrency(month.income)}</span>
                  </div>
                  <div className={`font-mono text-sm font-bold ${
                    (month.earnings ?? month.margin) >= 0 ? "text-yellow-500" : "text-red-500"
                  }`}>
                    Guadagno: {(month.earnings ?? month.margin) >= 0 ? "+" : ""}{formatCurrency(month.earnings ?? month.margin)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* ============ 3. PROSSIMI 7GG + ULTIMI 7GG ============ */}
        <motion.div variants={fadeInUp} transition={{ duration: 0.4 }} className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        <span className="truncate max-w-[160px] sm:max-w-[200px]">{income.clientName}</span>
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
                        <span className="truncate max-w-[140px] sm:max-w-[180px]">{expense.description}</span>
                      </div>
                      <span className="font-mono text-red-600">-{formatCurrency(expense.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              {data.next7Days.incomes.length === 0 && data.next7Days.expenses.length === 0 && (
                <div className="flex flex-col items-center py-6 text-center">
                  <Calendar className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Nessun movimento previsto</p>
                  <Link href="/forecast">
                    <Button variant="link" size="sm" className="text-xs mt-1 text-primary">
                      Aggiungi previsione <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
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
                        <span className="truncate max-w-[160px] sm:max-w-[200px]">{income.description}</span>
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
                        <span className="truncate max-w-[140px] sm:max-w-[180px]">{expense.description}</span>
                      </div>
                      <span className="font-mono text-red-600">{formatCurrency(expense.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              {data.last7Days.incomes.length === 0 && data.last7Days.expenses.length === 0 && (
                <div className="flex flex-col items-center py-6 text-center">
                  <Receipt className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Nessun movimento registrato</p>
                  <Link href="/transactions?new=1">
                    <Button variant="link" size="sm" className="text-xs mt-1 text-primary">
                      Registra movimento <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              )}
              <Link href="/transactions" className="block mt-3">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  Vedi tutti <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* ============ 4. PIANI DI RIENTRO ============ */}
        {data.pdr.plans.length > 0 && (
          <motion.div variants={fadeInUp} transition={{ duration: 0.4 }}>
          <Card>
            <CardHeader className="pb-2 px-4">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Debiti
                </span>
                <Link href="/debts">
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
          </motion.div>
        )}

        {/* Quick Links */}
        <motion.div variants={fadeInUp} transition={{ duration: 0.4 }} className="grid grid-cols-4 gap-2">
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
        </motion.div>
      </motion.div>

      {/* FAB Quick Entry */}
      <QuickEntry onSuccess={fetchData} />
    </div>
  );
}
