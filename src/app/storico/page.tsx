"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { History, TrendingUp, TrendingDown, Trophy, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/currency";

interface MonthRow {
  month: number;
  label: string;
  byYear: Record<number, number | null>;
  avg: number;
}

interface HistoricalResponse {
  years: number[];
  months: MonthRow[];
  totalsByYear: Record<number, number>;
  avgByYear: Record<number, number>;
  bestMonth: { year: number; month: number; amount: number } | null;
  worstMonth: { year: number; month: number; amount: number } | null;
  currentYear: number;
  currentMonthIdx: number;
}

const MONTH_SHORT = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

export default function StoricoPage() {
  const [data, setData] = useState<HistoricalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/historical-revenue");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json: HistoricalResponse = await r.json();
      setData(json);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore caricamento");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSeed = async (force: boolean) => {
    setSeeding(true);
    try {
      const url = force ? "/api/historical-revenue/seed?force=1" : "/api/historical-revenue/seed";
      const r = await fetch(url, { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      if (json.action === "skipped") toast.info("Dati già caricati. Usa 'Ricarica' per resettare.");
      else toast.success(`${json.action === "reseeded" ? "Ricaricati" : "Caricati"} ${json.inserted} record storici`);
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setSeeding(false);
    }
  };

  const isEmpty = data && data.years.length === 0;
  const onlyCurrentYear = data && data.years.length === 1 && data.years[0] === data.currentYear;

  return (
    <div className="min-h-screen pb-20">
      <MobileHeader title="Storico" />
      <div className="container mx-auto px-4 py-6 max-w-[1400px]">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="h-6 w-6" />
              Storico pluriennale
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Fatturato mensile anno per anno. Confronto, AVG storico, mese in corso.
            </p>
          </div>
          {(isEmpty || onlyCurrentYear) && (
            <Button onClick={() => handleSeed(false)} disabled={seeding} size="sm">
              {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Carica dati storici
            </Button>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {data && (
          <>
            {/* Box riepilogo top */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{data.currentYear} a oggi</p>
                  <p className="font-mono font-bold text-xl">{formatCurrency(data.totalsByYear[data.currentYear] || 0)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Media mensile: {formatCurrency(data.avgByYear[data.currentYear] || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Media annua storica</p>
                  <p className="font-mono font-bold text-xl">
                    {formatCurrency(
                      data.years.filter((y) => y !== data.currentYear).length > 0
                        ? Math.round(
                            data.years
                              .filter((y) => y !== data.currentYear)
                              .reduce((s, y) => s + (data.totalsByYear[y] || 0), 0)
                              / data.years.filter((y) => y !== data.currentYear).length
                          )
                        : 0
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Su {data.years.filter((y) => y !== data.currentYear).length} anni completi
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-amber-500" />
                    Mese migliore di sempre
                  </p>
                  <p className="font-mono font-bold text-xl text-green-500">
                    {data.bestMonth ? formatCurrency(data.bestMonth.amount) : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {data.bestMonth ? `${MONTH_SHORT[data.bestMonth.month - 1]} ${data.bestMonth.year}` : ""}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    Mese peggiore
                  </p>
                  <p className="font-mono font-bold text-xl text-red-500">
                    {data.worstMonth ? formatCurrency(data.worstMonth.amount) : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {data.worstMonth ? `${MONTH_SHORT[data.worstMonth.month - 1]} ${data.worstMonth.year}` : ""}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Matrice mese × anno */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-card z-10 font-semibold w-[100px]">Mese</TableHead>
                        {data.years.map((y) => (
                          <TableHead key={y} className={`text-right font-mono ${y === data.currentYear ? "text-primary font-bold" : ""}`}>
                            {y}
                          </TableHead>
                        ))}
                        <TableHead className="text-right font-semibold bg-muted/30 sticky right-0 z-10">AVG storico</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.months.map((row, idx) => {
                        const isCurrentMonthRow = idx === data.currentMonthIdx;
                        return (
                          <TableRow key={row.month} className="hover:bg-muted/20">
                            <TableCell className="sticky left-0 bg-card z-10 font-medium">
                              {row.label}
                            </TableCell>
                            {data.years.map((y) => {
                              const amount = row.byYear[y];
                              const isBest = data.bestMonth && data.bestMonth.year === y && data.bestMonth.month === row.month;
                              const isWorst = data.worstMonth && data.worstMonth.year === y && data.worstMonth.month === row.month;
                              const isCurrentCell = y === data.currentYear && isCurrentMonthRow;
                              const isFuture = y === data.currentYear && idx > data.currentMonthIdx;
                              const cellClass = [
                                "text-right font-mono",
                                isBest ? "bg-green-500/10 text-green-600 font-bold" : "",
                                isWorst ? "bg-red-500/10 text-red-600" : "",
                                isCurrentCell ? "bg-primary/10 font-bold text-primary" : "",
                                isFuture ? "text-muted-foreground/40" : "",
                              ].filter(Boolean).join(" ");
                              // Delta vs AVG storico per la cella dell'anno corrente
                              let delta: number | null = null;
                              if (y === data.currentYear && amount != null && row.avg > 0 && !isFuture) {
                                delta = Math.round(((amount - row.avg) / row.avg) * 100);
                              }
                              return (
                                <TableCell key={y} className={cellClass}>
                                  {amount == null
                                    ? <span className="text-muted-foreground/40">—</span>
                                    : (
                                      <span className="inline-flex items-center justify-end gap-1">
                                        {formatCurrency(amount)}
                                        {delta != null && (
                                          <span className={`text-[9px] font-normal ${delta > 0 ? "text-green-500" : delta < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                                            {delta > 0 ? "+" : ""}{delta}%
                                          </span>
                                        )}
                                      </span>
                                    )
                                  }
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-right font-mono font-semibold bg-muted/30 sticky right-0 z-10">
                              {row.avg > 0 ? formatCurrency(row.avg) : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* TOTALI annui */}
                      <TableRow className="bg-muted/40 font-bold border-t-2">
                        <TableCell className="sticky left-0 bg-muted/40 z-10">Totale anno</TableCell>
                        {data.years.map((y) => (
                          <TableCell key={y} className={`text-right font-mono ${y === data.currentYear ? "text-primary" : ""}`}>
                            {formatCurrency(data.totalsByYear[y] || 0)}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-mono bg-muted/40 sticky right-0 z-10">—</TableCell>
                      </TableRow>
                      {/* AVG mensile per anno */}
                      <TableRow className="bg-muted/20 italic text-muted-foreground">
                        <TableCell className="sticky left-0 bg-muted/20 z-10">Media mensile</TableCell>
                        {data.years.map((y) => (
                          <TableCell key={y} className="text-right font-mono">
                            {formatCurrency(data.avgByYear[y] || 0)}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-mono bg-muted/20 sticky right-0 z-10">—</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="mt-4 flex flex-wrap gap-3 items-center text-[10px] text-muted-foreground">
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/40">cella verde</Badge> mese migliore di sempre
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/40">cella rossa</Badge> mese peggiore
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/40">cella oro</Badge> mese in corso
              <span className="ml-auto inline-flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> il delta % sull&apos;anno corrente è il confronto con l&apos;AVG storico del mese
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
