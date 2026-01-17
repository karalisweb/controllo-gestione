"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Shield, Swords, TrendingUp, Loader2 } from "lucide-react";

interface MonthlyData {
  month: number;
  preventivato: number;
  fatturato: number;
  costi: number;
  costiPrevisti: number;
  margine: number;
  liquidita: number;
  deltaFatturato: number;
  deltaFatturatoPercent: number;
}

interface AnnualControlData {
  year: number;
  initialBalance: number;
  monthlyData: MonthlyData[];
  totals: {
    preventivato: number;
    fatturato: number;
    costi: number;
    margine: number;
    liquiditaFinale: number;
  };
  phase: "defense" | "attack" | "growth";
  currentMonth: number;
}

const MONTHS = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
];

function formatCurrency(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(euros);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}%`;
}

export function AnnualControlTable() {
  const [data, setData] = useState<AnnualControlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/annual-control?year=${selectedYear}`
        );
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Errore caricamento dati:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedYear]);

  const getPhaseInfo = (phase: string) => {
    switch (phase) {
      case "defense":
        return {
          label: "DIFESA",
          color: "bg-red-500",
          textColor: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          icon: Shield,
          description: "Liquidità negativa - Priorità: sopravvivenza",
        };
      case "attack":
        return {
          label: "ATTACCO",
          color: "bg-yellow-500",
          textColor: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          icon: Swords,
          description: "Liquidità 0-5.000€ - Priorità: stabilizzazione",
        };
      case "growth":
        return {
          label: "CRESCITA",
          color: "bg-green-500",
          textColor: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          icon: TrendingUp,
          description: "Liquidità >7.000€ - Priorità: investimenti",
        };
      default:
        return {
          label: "N/D",
          color: "bg-gray-500",
          textColor: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          icon: Shield,
          description: "",
        };
    }
  };

  // Generate year options (current year and 2 years back)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Impossibile caricare i dati
        </CardContent>
      </Card>
    );
  }

  const phaseInfo = getPhaseInfo(data.phase);
  const PhaseIcon = phaseInfo.icon;

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-slate-100">Controllo di Gestione Annuale</CardTitle>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] bg-slate-800 border-slate-600 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()} className="text-slate-200 focus:bg-slate-700">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Phase Banner */}
        <div
          className={cn(
            "mt-3 flex items-center gap-3 rounded-lg border p-3",
            phaseInfo.bgColor,
            phaseInfo.borderColor
          )}
        >
          <div className={cn("rounded-full p-2", phaseInfo.color)}>
            <PhaseIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className={cn("font-bold", phaseInfo.textColor)}>
              FASE: {phaseInfo.label}
            </div>
            <div className="text-sm text-slate-400">
              {phaseInfo.description}
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-sm text-slate-400">Liquidità attuale</div>
            <div className={cn("text-xl font-bold", phaseInfo.textColor)}>
              {formatCurrency(
                data.monthlyData[data.currentMonth - 1]?.liquidita ||
                  data.initialBalance
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-3 px-3 text-left font-semibold text-slate-200">
                  Voce
                </th>
                {MONTHS.map((month, idx) => (
                  <th
                    key={month}
                    className={cn(
                      "py-3 px-2 text-center font-semibold min-w-[80px]",
                      idx + 1 === data.currentMonth
                        ? "bg-blue-500/20 text-blue-400"
                        : "text-slate-300"
                    )}
                  >
                    {month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-base">
              {/* Preventivato */}
              <tr className="border-b border-slate-700/50 hover:bg-slate-800/50">
                <td className="py-3 px-3 font-medium text-slate-200">Preventivato</td>
                {data.monthlyData.map((m, idx) => (
                  <td
                    key={m.month}
                    className={cn(
                      "py-3 px-2 text-center font-mono text-slate-200",
                      idx + 1 === data.currentMonth && "bg-blue-500/10"
                    )}
                  >
                    {m.preventivato > 0 ? formatCurrency(m.preventivato) : "-"}
                  </td>
                ))}
              </tr>

              {/* Costi Preventivati */}
              <tr className="border-b border-slate-700/50 hover:bg-slate-800/50">
                <td className="py-3 px-3 font-medium text-slate-200">- Costi</td>
                {data.monthlyData.map((m, idx) => (
                  <td
                    key={m.month}
                    className={cn(
                      "py-3 px-2 text-center font-mono text-red-400",
                      idx + 1 === data.currentMonth && "bg-blue-500/10"
                    )}
                  >
                    {m.costiPrevisti > 0 ? `-${formatCurrency(m.costiPrevisti)}` : "-"}
                  </td>
                ))}
              </tr>

              {/* Margine = Preventivato - Costi Preventivati */}
              <tr className="border-b border-slate-700 hover:bg-slate-800/50 bg-slate-800/30">
                <td className="py-3 px-3 font-bold text-slate-100">= Margine</td>
                {data.monthlyData.map((m, idx) => {
                  const marginePrevisto = m.preventivato - m.costiPrevisti;
                  return (
                    <td
                      key={m.month}
                      className={cn(
                        "py-3 px-2 text-center font-mono font-semibold",
                        idx + 1 === data.currentMonth && "bg-blue-500/20",
                        marginePrevisto >= 0 ? "text-green-400" : "text-red-400"
                      )}
                    >
                      {m.preventivato > 0 || m.costiPrevisti > 0
                        ? formatCurrency(marginePrevisto)
                        : "-"}
                    </td>
                  );
                })}
              </tr>

              {/* Liquidità */}
              <tr className="bg-cyan-500/10">
                <td className="py-3 px-3 font-bold text-cyan-400">Liquidità</td>
                {data.monthlyData.map((m, idx) => (
                  <td
                    key={m.month}
                    className={cn(
                      "py-3 px-2 text-center font-mono font-bold text-lg",
                      idx + 1 === data.currentMonth && "bg-cyan-500/20",
                      m.liquidita >= 0 ? "text-cyan-400" : "text-red-400"
                    )}
                  >
                    {formatCurrency(m.liquidita)}
                  </td>
                ))}
              </tr>

              {/* Target Minimo Vendita = Costi + 40% */}
              <tr className="border-t-2 border-amber-500/30 bg-amber-500/10">
                <td className="py-3 px-3 font-bold text-amber-400">Target Vendita</td>
                {data.monthlyData.map((m, idx) => {
                  const targetMinimo = Math.round(m.costiPrevisti * 1.4);
                  return (
                    <td
                      key={m.month}
                      className={cn(
                        "py-3 px-2 text-center font-mono font-bold text-amber-400",
                        idx + 1 === data.currentMonth && "bg-amber-500/20"
                      )}
                    >
                      {m.costiPrevisti > 0 ? formatCurrency(targetMinimo) : "-"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {/* Monthly Details (scrollable) */}
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-3" style={{ width: "max-content" }}>
              {data.monthlyData.map((m, idx) => {
                const isCurrentMonth = idx + 1 === data.currentMonth;
                const hasData = m.preventivato > 0 || m.costiPrevisti > 0;
                const marginePrevisto = m.preventivato - m.costiPrevisti;
                const targetMinimo = Math.round(m.costiPrevisti * 1.4);
                return (
                  <div
                    key={m.month}
                    className={cn(
                      "rounded-lg border p-4 min-w-[150px]",
                      isCurrentMonth
                        ? "border-blue-500 bg-slate-800"
                        : "border-slate-700 bg-slate-800/50"
                    )}
                  >
                    <div
                      className={cn(
                        "text-center font-bold text-lg mb-3",
                        isCurrentMonth ? "text-blue-400" : "text-slate-200"
                      )}
                    >
                      {MONTHS[idx]}
                    </div>
                    {hasData ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Prev:</span>
                          <span className="font-mono text-slate-200">
                            {formatCurrency(m.preventivato)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Costi:</span>
                          <span className="font-mono text-red-400">
                            -{formatCurrency(m.costiPrevisti)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-slate-700 pt-2">
                          <span className="font-medium text-slate-300">Marg:</span>
                          <span
                            className={cn(
                              "font-mono font-medium",
                              marginePrevisto >= 0
                                ? "text-green-400"
                                : "text-red-400"
                            )}
                          >
                            {formatCurrency(marginePrevisto)}
                          </span>
                        </div>
                        <div className="flex justify-between bg-cyan-500/10 -mx-4 px-4 py-2 mt-2">
                          <span className="font-bold text-cyan-400">Liq:</span>
                          <span
                            className={cn(
                              "font-mono font-bold",
                              m.liquidita >= 0
                                ? "text-cyan-400"
                                : "text-red-400"
                            )}
                          >
                            {formatCurrency(m.liquidita)}
                          </span>
                        </div>
                        <div className="flex justify-between bg-amber-500/10 -mx-4 px-4 py-2 rounded-b-lg">
                          <span className="font-bold text-amber-400">Target:</span>
                          <span className="font-mono font-bold text-amber-400">
                            {formatCurrency(targetMinimo)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-sm text-slate-500 py-4">
                        Nessun dato
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-slate-700 text-sm text-slate-400">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500/50"></div>
              <span>Mese corrente</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-mono font-medium">Target</span>
              <span>= Costi + 40%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
