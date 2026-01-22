"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import {
  AlertTriangle,
  Calendar,
  TrendingUp,
  Target,
  Loader2,
  Settings,
  ChevronRight,
  FileText,
  CreditCard,
  BarChart3,
  Wallet,
  Bell,
  User,
} from "lucide-react";
import Link from "next/link";
import { AnnualControlTable } from "@/components/dashboard/AnnualControlTable";

interface CashflowData {
  daysUntilDifficulty: number | null;
  difficultyDate: string | null;
  endPeriodBalance: number;
  requiredRevenue: number;
  status: "defense" | "stabilization" | "growth";
  currentBalance: number;
  horizonDays: number;
  upcomingExpenses: Array<{
    id: number;
    date: string;
    description: string;
    amount: number;
    type: "cost" | "pdr" | "tax";
    isEssential: boolean;
    isPaid: boolean;
  }>;
  totalExpensesInPeriod: number;
  totalCertainIncomeInPeriod: number;
  debt: {
    total: number;
    remaining: number;
    plansCount: number;
  };
}

const STATUS_CONFIG = {
  defense: {
    label: "DIFESA",
    sublabel: "Meno di 30 giorni di margine",
    color: "bg-red-500",
    textColor: "text-red-600",
    borderColor: "border-red-500",
    bgColor: "bg-red-500/10",
  },
  stabilization: {
    label: "STABILIZZAZIONE",
    sublabel: "Riesco a pagare, margine ridotto",
    color: "bg-amber-500",
    textColor: "text-amber-600",
    borderColor: "border-amber-500",
    bgColor: "bg-amber-500/10",
  },
  growth: {
    label: "RICOSTRUZIONE",
    sublabel: "Ho buffer, posso investire",
    color: "bg-green-500",
    textColor: "text-green-600",
    borderColor: "border-green-500",
    bgColor: "bg-green-500/10",
  },
};

export default function Home() {
  const [data, setData] = useState<CashflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState<30 | 90 | 180>(30);
  const [setupStatus, setSetupStatus] = useState<{
    isSetupComplete: boolean;
    initialBalance: string;
  } | null>(null);

  useEffect(() => {
    checkSetup();
  }, []);

  useEffect(() => {
    if (setupStatus?.isSetupComplete) {
      fetchData();
    }
  }, [horizon, setupStatus]);

  const checkSetup = async () => {
    try {
      const res = await fetch("/api/setup");
      if (res.ok) {
        const status = await res.json();
        setSetupStatus(status);
        if (!status.isSetupComplete) {
          setLoading(false);
        }
      }
    } catch {
      setLoading(false);
    }
  };

  const runSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setup", { method: "POST" });
      if (res.ok) {
        await checkSetup();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cashflow?horizon=${horizon}`);
      if (res.ok) {
        const cashflowData = await res.json();
        setData(cashflowData);
      }
    } finally {
      setLoading(false);
    }
  };

  // Setup non completato
  if (!loading && setupStatus && !setupStatus.isSetupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Benvenuto in Cashflow</h1>
          <p className="text-muted-foreground mb-6">
            Prima di iniziare, configuro i dati iniziali.
          </p>
          <Button onClick={runSetup} size="lg">
            Configura Dati Iniziali
          </Button>
        </div>
      </div>
    );
  }

  // Loading
  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const config = STATUS_CONFIG[data.status];
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  };

  // Calcola percentuale barra progresso
  const progressPercent =
    data.daysUntilDifficulty !== null
      ? Math.min(100, Math.round((data.daysUntilDifficulty / data.horizonDays) * 100))
      : 100;

  return (
    <div className="min-h-screen pb-20">
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
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Bell className="h-5 w-5" />
            </Button>
            <Link href="/profile">
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <User className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        {/* STATO AZIENDA - Hero Banner */}
        <div className={`rounded-xl border-2 ${config.borderColor} ${config.bgColor} p-4 sm:p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge className={`${config.color} text-white font-bold`}>
                {config.label}
              </Badge>
              {data.status === "defense" && (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
            </div>
            {/* Horizon selector */}
            <div className="flex gap-1">
              {([30, 90, 180] as const).map((days) => (
                <Button
                  key={days}
                  variant={horizon === days ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setHorizon(days)}
                  className="h-7 px-2 text-xs"
                >
                  {days}g
                </Button>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">{config.sublabel}</p>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>OGGI</span>
              <span>
                {data.daysUntilDifficulty !== null
                  ? `DIFFICOLTÀ ${formatDate(data.difficultyDate)}`
                  : `FINE ${horizon}g`}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${config.color} transition-all`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="text-center">
            <span className={`text-lg font-bold ${config.textColor}`}>
              {data.daysUntilDifficulty !== null
                ? `${data.daysUntilDifficulty} giorni prima della difficoltà`
                : "Nessuna difficoltà prevista"}
            </span>
          </div>
        </div>

        {/* I 3 NUMERI CHIAVE */}
        <div className="grid grid-cols-3 gap-3">
          {/* 1. Giorni alla difficoltà */}
          <Card className="text-center">
            <CardContent className="p-3 sm:p-4">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <div className={`text-2xl sm:text-3xl font-bold font-mono ${
                data.daysUntilDifficulty !== null && data.daysUntilDifficulty < 14
                  ? "text-red-600"
                  : "text-foreground"
              }`}>
                {data.daysUntilDifficulty !== null ? data.daysUntilDifficulty : "∞"}
              </div>
              <div className="text-xs text-muted-foreground">
                giorni
              </div>
            </CardContent>
          </Card>

          {/* 2. Saldo fine periodo */}
          <Card className="text-center">
            <CardContent className="p-3 sm:p-4">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <div className={`text-xl sm:text-2xl font-bold font-mono ${
                data.endPeriodBalance >= 0 ? "text-green-600" : "text-red-600"
              }`}>
                {formatCurrency(data.endPeriodBalance)}
              </div>
              <div className="text-xs text-muted-foreground">
                saldo finale
              </div>
            </CardContent>
          </Card>

          {/* 3. Target fatturato */}
          <Card className="text-center">
            <CardContent className="p-3 sm:p-4">
              <Target className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <div className={`text-xl sm:text-2xl font-bold font-mono ${
                data.requiredRevenue > 0 ? "text-amber-600" : "text-green-600"
              }`}>
                {data.requiredRevenue > 0 ? formatCurrency(data.requiredRevenue) : "OK"}
              </div>
              <div className="text-xs text-muted-foreground">
                da fatturare
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PROSSIME SCADENZE (7 giorni) */}
        {data.upcomingExpenses.length > 0 && (
          <Card>
            <CardHeader className="pb-2 px-4">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Prossime Scadenze (7gg)</span>
                <Link href="/forecast">
                  <Button variant="ghost" size="sm" className="h-6 text-xs">
                    Vedi tutte <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {data.upcomingExpenses.slice(0, 5).map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        expense.isEssential ? "bg-red-500" :
                        expense.type === "pdr" ? "bg-amber-500" : "bg-muted"
                      }`} />
                      <div>
                        <div className="text-sm font-medium truncate max-w-[180px] sm:max-w-none">
                          {expense.description}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(expense.date)}
                          {expense.type === "pdr" && (
                            <Badge variant="outline" className="ml-2 text-xs py-0">PDR</Badge>
                          )}
                          {expense.isEssential && (
                            <Badge variant="outline" className="ml-2 text-xs py-0 border-red-500 text-red-500">VITALE</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono text-sm font-bold text-red-600">
                      {formatCurrency(expense.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* QUICK STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Cassa oggi</span>
            </div>
            <div className="font-mono font-bold text-foreground">
              {formatCurrency(data.currentBalance)}
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Uscite {horizon}g</span>
            </div>
            <div className="font-mono font-bold text-red-600">
              {formatCurrency(data.totalExpensesInPeriod)}
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Incassi certi</span>
            </div>
            <div className="font-mono font-bold text-green-600">
              {formatCurrency(data.totalCertainIncomeInPeriod)}
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Debiti PDR</span>
            </div>
            <div className="font-mono font-bold text-amber-600">
              {formatCurrency(data.debt.remaining)}
            </div>
          </Card>
        </div>

        {/* QUICK LINKS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link href="/forecast" className="block">
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs">Previsionale</span>
            </Button>
          </Link>
          <Link href="/transactions" className="block">
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
              <FileText className="h-5 w-5" />
              <span className="text-xs">Consuntivo</span>
            </Button>
          </Link>
          <Link href="/payment-plans" className="block">
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
              <CreditCard className="h-5 w-5" />
              <span className="text-xs">PDR</span>
            </Button>
          </Link>
          <Link href="/settings" className="block">
            <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
              <Settings className="h-5 w-5" />
              <span className="text-xs">Piano Annuale</span>
            </Button>
          </Link>
        </div>

        {/* CONTROLLO DI GESTIONE ANNUALE */}
        <AnnualControlTable />
      </div>
    </div>
  );
}
