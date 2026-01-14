"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { AlertTriangle, TrendingUp, Calendar, Target } from "lucide-react";

interface KeyMetricsProps {
  daysUntilDifficulty: number | null;
  difficultyDate: string | null;
  endPeriodBalance: number;
  requiredRevenue: number;
  status: "defense" | "stabilization" | "growth";
  horizonDays: number;
}

export function KeyMetrics({
  daysUntilDifficulty,
  difficultyDate,
  endPeriodBalance,
  requiredRevenue,
  status,
  horizonDays,
}: KeyMetricsProps) {
  const statusConfig = {
    defense: {
      label: "DIFESA",
      color: "bg-red-500",
      textColor: "text-red-600",
      bgLight: "bg-red-50",
      borderColor: "border-red-200",
    },
    stabilization: {
      label: "STABILIZZAZIONE",
      color: "bg-yellow-500",
      textColor: "text-yellow-600",
      bgLight: "bg-yellow-50",
      borderColor: "border-yellow-200",
    },
    growth: {
      label: "RICOSTRUZIONE",
      color: "bg-green-500",
      textColor: "text-green-600",
      bgLight: "bg-green-50",
      borderColor: "border-green-200",
    },
  };

  const config = statusConfig[status];

  // Calcola percentuale barra progresso
  const progressPercent =
    daysUntilDifficulty !== null
      ? Math.min(100, Math.round((daysUntilDifficulty / horizonDays) * 100))
      : 100;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  };

  return (
    <div className={`rounded-lg border-2 ${config.borderColor} ${config.bgLight} p-6`}>
      {/* Stato */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`${config.color} text-white px-3 py-1 rounded-full text-sm font-bold`}>
          {config.label}
        </div>
        {status === "defense" && (
          <AlertTriangle className="h-5 w-5 text-red-500" />
        )}
      </div>

      {/* Barra progresso giorni */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-1">
          <span>OGGI</span>
          <span>
            {daysUntilDifficulty !== null
              ? `DIFFICOLTÀ (${formatDate(difficultyDate)})`
              : `FINE PERIODO (${horizonDays}gg)`}
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${config.color} transition-all duration-500`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="text-center mt-1">
          <span className={`text-lg font-bold ${config.textColor}`}>
            {daysUntilDifficulty !== null
              ? `${daysUntilDifficulty} giorni rimasti`
              : "Nessuna difficoltà prevista"}
          </span>
        </div>
      </div>

      {/* 3 Card con numeri chiave */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Giorni alla difficoltà */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <div className={`text-3xl font-bold ${daysUntilDifficulty !== null && daysUntilDifficulty < 14 ? "text-red-600" : ""}`}>
              {daysUntilDifficulty !== null ? daysUntilDifficulty : "∞"}
            </div>
            <div className="text-sm text-muted-foreground">
              {daysUntilDifficulty !== null ? "giorni alla difficoltà" : "nessuna difficoltà"}
            </div>
            {difficultyDate && (
              <div className="text-xs text-muted-foreground mt-1">
                {formatDate(difficultyDate)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saldo fine periodo */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <div
              className={`text-3xl font-bold ${
                endPeriodBalance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(endPeriodBalance)}
            </div>
            <div className="text-sm text-muted-foreground">
              saldo previsto
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              fine {horizonDays} giorni
            </div>
          </CardContent>
        </Card>

        {/* Target fatturato */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <div className={`text-3xl font-bold ${requiredRevenue > 0 ? "text-orange-600" : "text-green-600"}`}>
              {requiredRevenue > 0 ? formatCurrency(requiredRevenue) : "OK"}
            </div>
            <div className="text-sm text-muted-foreground">
              {requiredRevenue > 0 ? "devi fatturare" : "nessun gap"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              per stare a zero
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
