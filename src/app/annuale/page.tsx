"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MobileHeader } from "@/components/MobileHeader";
import { ChevronLeft, ChevronRight, Pencil, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/currency";

interface MonthRow {
  month: number;
  income: number;
  expenses: number;
  balance: number;
  alessio: number;
  daniela: number;
  iva: number;
  isPartial: boolean;
}

interface YearlyResponse {
  year: number;
  months: MonthRow[];
  totals: { income: number; expenses: number; balance: number; alessio: number; daniela: number; iva: number };
  averages: { income: number; expenses: number; balance: number; alessio: number; daniela: number; iva: number };
  fixedMonthlyCosts: number;
  monthlyHours: number;
  fixedHourlyCost: number;
}

const MONTH_LABELS = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

export default function AnnualePage() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<YearlyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  const [hoursValue, setHoursValue] = useState("");

  const fetchData = useCallback(async (y: number) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/yearly?year=${y}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json: YearlyResponse = await r.json();
      setData(json);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore caricamento");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(year); }, [year, fetchData]);

  const commitHours = async () => {
    const n = Number(hoursValue);
    setEditingHours(false);
    if (!Number.isFinite(n) || n <= 0) return;
    if (data && n === data.monthlyHours) return;
    try {
      const r = await fetch("/api/settings/agency-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: n }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success("Monte ore aggiornato");
      fetchData(year);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <MobileHeader title="Annuale" />
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header con frecce anno */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Sintesi annuale</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              12 mesi a colpo d&apos;occhio: incassato, costi, saldo, Alessio, IVA
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setYear((y) => y - 1)}
              disabled={loading}
              aria-label="Anno precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-mono font-bold text-lg w-16 text-center">{year}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setYear((y) => y + 1)}
              disabled={loading}
              aria-label="Anno successivo"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabella 12 mesi */}
        <Card className="mb-4">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Mese</TableHead>
                    <TableHead className="text-right">Incassato</TableHead>
                    <TableHead className="text-right">Costi</TableHead>
                    <TableHead className="text-right">Saldo mese</TableHead>
                    <TableHead className="text-right">Alessio</TableHead>
                    <TableHead className="text-right">Daniela</TableHead>
                    <TableHead className="text-right">IVA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.months.map((m) => {
                    const partialClass = m.isPartial ? "text-muted-foreground" : "";
                    return (
                      <TableRow key={m.month} className="hover:bg-muted/30">
                        <TableCell>
                          <Link
                            href={`/movimenti?year=${year}&month=${m.month}`}
                            className="hover:text-primary transition-colors flex items-center gap-1.5"
                            title={`Apri ${MONTH_LABELS[m.month - 1]} ${year} in /movimenti`}
                          >
                            <span className="font-medium">{MONTH_LABELS[m.month - 1]} {year}</span>
                            {m.isPartial && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-500/10 text-amber-500 border-amber-500/40" title="Include previsti">
                                <Clock className="h-2.5 w-2.5" />
                              </Badge>
                            )}
                          </Link>
                        </TableCell>
                        <TableCell className={`text-right font-mono ${partialClass} ${!m.isPartial && m.income > 0 ? "text-green-500" : ""}`}>
                          {m.income > 0 ? formatCurrency(m.income) : "—"}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${partialClass} ${!m.isPartial && m.expenses > 0 ? "text-red-500" : ""}`}>
                          {m.expenses > 0 ? `-${formatCurrency(m.expenses)}` : "—"}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-medium ${partialClass || (m.balance >= 0 ? "text-foreground" : "text-red-500")}`}>
                          {m.income === 0 && m.expenses === 0 ? "—" : formatCurrency(m.balance)}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${partialClass}`}>
                          {m.alessio > 0 ? formatCurrency(m.alessio) : "—"}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${partialClass}`}>
                          {m.daniela > 0 ? formatCurrency(m.daniela) : "—"}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${partialClass}`}>
                          {m.iva > 0 ? formatCurrency(m.iva) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* TOTALI */}
                  {data && (
                    <TableRow className="bg-muted/40 font-bold border-t-2">
                      <TableCell>Totali</TableCell>
                      <TableCell className="text-right font-mono text-green-500">{formatCurrency(data.totals.income)}</TableCell>
                      <TableCell className="text-right font-mono text-red-500">-{formatCurrency(data.totals.expenses)}</TableCell>
                      <TableCell className={`text-right font-mono ${data.totals.balance >= 0 ? "text-foreground" : "text-red-500"}`}>
                        {formatCurrency(data.totals.balance)}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(data.totals.alessio)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(data.totals.daniela)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(data.totals.iva)}</TableCell>
                    </TableRow>
                  )}
                  {/* MEDIE */}
                  {data && (
                    <TableRow className="bg-muted/20 italic text-muted-foreground">
                      <TableCell>Medie (÷12)</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(data.averages.income)}</TableCell>
                      <TableCell className="text-right font-mono">-{formatCurrency(data.averages.expenses)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(data.averages.balance)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(data.averages.alessio)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(data.averages.daniela)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(data.averages.iva)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Box Costo orario fisso d'agenzia */}
        {data && (
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Costo orario fisso d&apos;agenzia
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Costi fissi mensili medi</p>
                  <p className="font-mono font-bold text-lg">{formatCurrency(data.fixedMonthlyCosts)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Template ricorrenti (escl. PDR e una-tantum)</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Monte ore agenzia / mese</p>
                  {editingHours ? (
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={hoursValue}
                      onChange={(e) => setHoursValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); commitHours(); }
                        else if (e.key === "Escape") { e.preventDefault(); setEditingHours(false); }
                      }}
                      onBlur={commitHours}
                      autoFocus
                      className="font-mono font-bold text-lg h-10 px-2 rounded border border-primary/60 bg-background outline-none w-32"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setEditingHours(true); setHoursValue(String(data.monthlyHours)); }}
                      title="Clicca per modificare il monte ore"
                      className="font-mono font-bold text-lg flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                      {data.monthlyHours} h
                      <Pencil className="h-3.5 w-3.5 opacity-70" />
                    </button>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">Default 480 = team × giorni lavorativi</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Costo orario fisso</p>
                  <p className="font-mono font-bold text-lg text-primary">
                    {formatCurrency(data.fixedHourlyCost)} / h
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Costi fissi ÷ monte ore</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!data && !loading && (
          <p className="text-center text-muted-foreground py-12">Nessun dato per {year}</p>
        )}
      </div>
    </div>
  );
}
