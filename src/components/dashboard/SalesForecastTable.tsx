"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { centsToEuros, eurosToCents, formatCurrency } from "@/lib/utils/currency";

interface MonthForecast {
  year: number;
  month: number;
  label: string;
  target: number;
  revenuePrev: number;
  gap: number;
  expensePrev: number;
  earningsPrev: number;
  earningsTarget: number;
  alessioPrev: number;
  danielaPrev: number;
}

interface ApiResponse {
  defaultTarget: number;
  months: MonthForecast[];
}

const ROWS: Array<{ key: keyof MonthForecast; label: string; color?: string }> = [
  { key: "revenuePrev", label: "Fatturato previsto", color: "text-foreground" },
  { key: "target", label: "Obiettivo fatturato", color: "text-amber-500" },
  { key: "gap", label: "Gap mensile", color: "text-red-500" },
  { key: "expensePrev", label: "Spese previste (incl. PDR)", color: "text-red-500" },
  { key: "earningsPrev", label: "Guadagno previsto", color: "text-green-500" },
  { key: "earningsTarget", label: "Guadagno con obiettivo", color: "text-green-500" },
  { key: "alessioPrev", label: "Guadagno Alessio", color: "text-foreground" },
  { key: "danielaPrev", label: "Guadagno Daniela", color: "text-foreground" },
];

export function SalesForecastTable() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ year: number; month: number } | null>(null);
  const [editValue, setEditValue] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/dashboard/sales-forecast?months=4");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = (await r.json()) as ApiResponse;
      setData(json);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore caricamento previsionale");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startEdit = (m: MonthForecast) => {
    setEditing({ year: m.year, month: m.month });
    setEditValue(centsToEuros(m.target).toFixed(2));
  };

  const cancel = () => {
    setEditing(null);
    setEditValue("");
  };

  const commit = async () => {
    if (!editing) return;
    const parsed = parseFloat(editValue.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) {
      cancel();
      return;
    }
    const cents = eurosToCents(parsed);
    try {
      const r = await fetch("/api/dashboard/sales-target", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: editing.year, month: editing.month, amount: cents }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      toast.success("Obiettivo aggiornato");
      setEditing(null);
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin inline" />
          <p className="text-sm mt-2">Caricamento previsionale...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.months.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-amber-500" />
          Previsionale 4 mesi
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-2 text-xs font-medium text-muted-foreground"></th>
              {data.months.map((m) => (
                <th key={`${m.year}-${m.month}`} className="text-right py-2 px-2 text-xs font-medium uppercase">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-b border-border/40 last:border-0">
                <td className="py-1.5 pr-2 text-xs text-muted-foreground">{row.label}</td>
                {data.months.map((m) => {
                  const value = m[row.key] as number;
                  const isTarget = row.key === "target";
                  const isEditing = isTarget && editing?.year === m.year && editing?.month === m.month;
                  return (
                    <td key={`${m.year}-${m.month}`} className={`py-1.5 px-2 text-right font-mono text-sm ${row.color || ""}`}>
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); commit(); }
                            else if (e.key === "Escape") { e.preventDefault(); cancel(); }
                          }}
                          onBlur={commit}
                          autoFocus
                          className="h-7 px-1 text-xs rounded border border-primary/60 bg-background outline-none w-24 text-right font-mono"
                        />
                      ) : isTarget ? (
                        <button
                          type="button"
                          onClick={() => startEdit(m)}
                          title="Clicca per modificare l'obiettivo"
                          className="px-1 py-0.5 rounded hover:bg-amber-500/10 transition-colors flex items-center gap-1 ml-auto"
                        >
                          {formatCurrency(value)}
                          <Pencil className="h-2.5 w-2.5 opacity-70" />
                        </button>
                      ) : (
                        formatCurrency(value)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
