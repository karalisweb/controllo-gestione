"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyMetrics } from "@/components/dashboard/KeyMetrics";
import { UpcomingExpenses } from "@/components/dashboard/UpcomingExpenses";
import { DebtSummary } from "@/components/dashboard/DebtSummary";
import { formatCurrency } from "@/lib/utils/currency";
import {
  Plus,
  Minus,
  Edit,
  BarChart3,
  Calendar,
  TrendingUp,
  Loader2,
  Settings,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

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
  upcomingIncomes: Array<{
    id: number;
    date: string;
    description: string;
    amount: number;
    clientName: string | null;
    reliability: "high" | "medium" | "low";
    isReceived: boolean;
  }>;
  totalExpensesInPeriod: number;
  totalCertainIncomeInPeriod: number;
  debt: {
    total: number;
    remaining: number;
    plansCount: number;
    plansWithoutPlan: number;
  };
}

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
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center py-12">
          <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Benvenuto in Cashflow</h1>
          <p className="text-muted-foreground mb-6">
            Prima di iniziare, devo configurare i dati iniziali: costi fissi, debiti PDR e clienti.
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
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cashflow</h1>
          <p className="text-sm text-muted-foreground">
            Cassa attuale: {formatCurrency(data.currentBalance)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchData}
            title="Aggiorna"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selettore orizzonte temporale */}
      <div className="flex gap-2 mb-6">
        {([30, 90, 180] as const).map((days) => (
          <Button
            key={days}
            variant={horizon === days ? "default" : "outline"}
            size="sm"
            onClick={() => setHorizon(days)}
          >
            {days} giorni
          </Button>
        ))}
      </div>

      {/* Key Metrics - I 3 numeri chiave */}
      <div className="mb-6">
        <KeyMetrics
          daysUntilDifficulty={data.daysUntilDifficulty}
          difficultyDate={data.difficultyDate}
          endPeriodBalance={data.endPeriodBalance}
          requiredRevenue={data.requiredRevenue}
          status={data.status}
          horizonDays={data.horizonDays}
        />
      </div>

      {/* Griglia principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Scadenze */}
        <div className="lg:col-span-2">
          <UpcomingExpenses expenses={data.upcomingExpenses} />
        </div>

        {/* Debiti */}
        <DebtSummary
          total={data.debt.total}
          remaining={data.debt.remaining}
          plansCount={data.debt.plansCount}
          plansWithoutPlan={data.debt.plansWithoutPlan}
        />
      </div>

      {/* Azioni rapide */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Button className="h-auto py-4 flex flex-col gap-1" variant="default">
          <Plus className="h-5 w-5" />
          <span className="text-sm">Incasso</span>
        </Button>
        <Button className="h-auto py-4 flex flex-col gap-1" variant="outline">
          <Minus className="h-5 w-5" />
          <span className="text-sm">Spesa</span>
        </Button>
        <Button className="h-auto py-4 flex flex-col gap-1" variant="outline">
          <Edit className="h-5 w-5" />
          <span className="text-sm">Modifica</span>
        </Button>
        <Link href="/budget" className="block">
          <Button
            className="h-auto py-4 flex flex-col gap-1 w-full"
            variant="outline"
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm">Analisi</span>
          </Button>
        </Link>
      </div>

      {/* Link secondari */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/transactions">
          <Button variant="ghost" className="w-full justify-start">
            <Calendar className="h-4 w-4 mr-2" />
            Check Settimanale
          </Button>
        </Link>
        <Link href="/budget">
          <Button variant="ghost" className="w-full justify-start">
            <TrendingUp className="h-4 w-4 mr-2" />
            Check Mensile
          </Button>
        </Link>
        <Link href="/payment-plans">
          <Button variant="ghost" className="w-full justify-start">
            <BarChart3 className="h-4 w-4 mr-2" />
            Debiti PDR
          </Button>
        </Link>
      </div>

      {/* Riepilogo periodo */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Riepilogo {horizon} giorni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-red-600">
                {formatCurrency(data.totalExpensesInPeriod)}
              </div>
              <div className="text-xs text-muted-foreground">Uscite previste</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(data.totalCertainIncomeInPeriod)}
              </div>
              <div className="text-xs text-muted-foreground">Incassi certi (netto)</div>
            </div>
            <div>
              <div className="text-lg font-semibold">
                {formatCurrency(data.currentBalance)}
              </div>
              <div className="text-xs text-muted-foreground">Cassa oggi</div>
            </div>
            <div>
              <div
                className={`text-lg font-semibold ${
                  data.endPeriodBalance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(data.endPeriodBalance)}
              </div>
              <div className="text-xs text-muted-foreground">Saldo finale</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
