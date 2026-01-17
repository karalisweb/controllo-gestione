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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Controllo di Gestione Annuale</CardTitle>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
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
            <div className="text-sm text-muted-foreground">
              {phaseInfo.description}
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-sm text-muted-foreground">Liquidità attuale</div>
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-2 text-left font-medium text-muted-foreground">
                  Voce
                </th>
                {MONTHS.map((month, idx) => (
                  <th
                    key={month}
                    className={cn(
                      "py-2 px-1 text-center font-medium min-w-[70px]",
                      idx + 1 === data.currentMonth
                        ? "bg-blue-50 text-blue-700"
                        : "text-muted-foreground"
                    )}
                  >
                    {month}
                  </th>
                ))}
                <th className="py-2 px-2 text-center font-bold bg-gray-100">
                  TOT
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Preventivato */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-2 px-2 font-medium">Preventivato</td>
                {data.monthlyData.map((m, idx) => (
                  <td
                    key={m.month}
                    className={cn(
                      "py-2 px-1 text-center",
                      idx + 1 === data.currentMonth && "bg-blue-50"
                    )}
                  >
                    {m.preventivato > 0 ? formatCurrency(m.preventivato) : "-"}
                  </td>
                ))}
                <td className="py-2 px-2 text-center font-bold bg-gray-100">
                  {formatCurrency(data.totals.preventivato)}
                </td>
              </tr>

              {/* Fatturato */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-2 px-2 font-medium">Fatturato</td>
                {data.monthlyData.map((m, idx) => (
                  <td
                    key={m.month}
                    className={cn(
                      "py-2 px-1 text-center",
                      idx + 1 === data.currentMonth && "bg-blue-50"
                    )}
                  >
                    <div
                      className={cn(
                        m.fatturato > 0 ? "text-green-600" : "text-gray-400"
                      )}
                    >
                      {m.fatturato > 0 ? formatCurrency(m.fatturato) : "-"}
                    </div>
                    {m.preventivato > 0 && m.fatturato > 0 && (
                      <div
                        className={cn(
                          "text-xs",
                          m.deltaFatturato >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        )}
                      >
                        {formatPercent(m.deltaFatturatoPercent)}
                      </div>
                    )}
                  </td>
                ))}
                <td className="py-2 px-2 text-center font-bold bg-gray-100 text-green-600">
                  {formatCurrency(data.totals.fatturato)}
                </td>
              </tr>

              {/* Costi */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-2 px-2 font-medium">Costi</td>
                {data.monthlyData.map((m, idx) => (
                  <td
                    key={m.month}
                    className={cn(
                      "py-2 px-1 text-center text-red-600",
                      idx + 1 === data.currentMonth && "bg-blue-50"
                    )}
                  >
                    {m.costi > 0 ? `-${formatCurrency(m.costi)}` : "-"}
                  </td>
                ))}
                <td className="py-2 px-2 text-center font-bold bg-gray-100 text-red-600">
                  -{formatCurrency(data.totals.costi)}
                </td>
              </tr>

              {/* Margine */}
              <tr className="border-b hover:bg-gray-50 bg-gray-50">
                <td className="py-2 px-2 font-bold">Margine</td>
                {data.monthlyData.map((m, idx) => (
                  <td
                    key={m.month}
                    className={cn(
                      "py-2 px-1 text-center font-medium",
                      idx + 1 === data.currentMonth && "bg-blue-100",
                      m.margine >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {m.fatturato > 0 || m.costi > 0
                      ? formatCurrency(m.margine)
                      : "-"}
                  </td>
                ))}
                <td
                  className={cn(
                    "py-2 px-2 text-center font-bold bg-gray-200",
                    data.totals.margine >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {formatCurrency(data.totals.margine)}
                </td>
              </tr>

              {/* Liquidità */}
              <tr className="hover:bg-gray-50 bg-blue-50">
                <td className="py-2 px-2 font-bold text-blue-700">Liquidità</td>
                {data.monthlyData.map((m, idx) => (
                  <td
                    key={m.month}
                    className={cn(
                      "py-2 px-1 text-center font-medium",
                      idx + 1 === data.currentMonth && "bg-blue-100",
                      m.liquidita >= 0 ? "text-blue-600" : "text-red-600"
                    )}
                  >
                    {formatCurrency(m.liquidita)}
                  </td>
                ))}
                <td
                  className={cn(
                    "py-2 px-2 text-center font-bold bg-blue-100",
                    data.totals.liquiditaFinale >= 0
                      ? "text-blue-700"
                      : "text-red-600"
                  )}
                >
                  {formatCurrency(data.totals.liquiditaFinale)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {/* Totals Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-muted-foreground">Preventivato</div>
              <div className="text-lg font-bold">
                {formatCurrency(data.totals.preventivato)}
              </div>
            </div>
            <div className="rounded-lg bg-green-50 p-3">
              <div className="text-xs text-muted-foreground">Fatturato</div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(data.totals.fatturato)}
              </div>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <div className="text-xs text-muted-foreground">Costi</div>
              <div className="text-lg font-bold text-red-600">
                -{formatCurrency(data.totals.costi)}
              </div>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <div className="text-xs text-muted-foreground">Margine</div>
              <div
                className={cn(
                  "text-lg font-bold",
                  data.totals.margine >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {formatCurrency(data.totals.margine)}
              </div>
            </div>
          </div>

          {/* Monthly Details (scrollable) */}
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2" style={{ width: "max-content" }}>
              {data.monthlyData.map((m, idx) => {
                const isCurrentMonth = idx + 1 === data.currentMonth;
                const hasData = m.fatturato > 0 || m.costi > 0;
                return (
                  <div
                    key={m.month}
                    className={cn(
                      "rounded-lg border p-3 min-w-[120px]",
                      isCurrentMonth
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    )}
                  >
                    <div
                      className={cn(
                        "text-center font-bold mb-2",
                        isCurrentMonth ? "text-blue-700" : ""
                      )}
                    >
                      {MONTHS[idx]}
                    </div>
                    {hasData ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fatt:</span>
                          <span className="text-green-600">
                            {formatCurrency(m.fatturato)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Costi:</span>
                          <span className="text-red-600">
                            -{formatCurrency(m.costi)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="font-medium">Liq:</span>
                          <span
                            className={cn(
                              "font-medium",
                              m.liquidita >= 0
                                ? "text-blue-600"
                                : "text-red-600"
                            )}
                          >
                            {formatCurrency(m.liquidita)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-muted-foreground py-2">
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
        <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></div>
              <span>Mese corrente</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-green-600">+%</span>
              <span>Sopra preventivo</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-red-600">-%</span>
              <span>Sotto preventivo</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
