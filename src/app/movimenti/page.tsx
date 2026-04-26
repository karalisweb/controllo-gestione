"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import { ChevronLeft, ChevronRight, CalendarRange, CheckCircle2, Clock, CreditCard, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";

interface MovementRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  runningBalance: number;
  type: "expected_expense" | "expected_income" | "pdr_installment" | "transaction";
  status: "planned" | "realized";
  sourceId: number;
  categoryName?: string | null;
  isOverride?: boolean;
}

interface MovementsResponse {
  year: number;
  month: number;
  initialBalance: number;
  finalBalance: number;
  rowsCount: number;
  rows: MovementRow[];
}

const MONTH_LABELS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const TYPE_ICONS: Record<MovementRow["type"], React.ComponentType<{ className?: string }>> = {
  expected_expense: ArrowUpFromLine,
  expected_income: ArrowDownToLine,
  pdr_installment: CreditCard,
  transaction: CheckCircle2,
};

const TYPE_LABELS: Record<MovementRow["type"], string> = {
  expected_expense: "Spesa prevista",
  expected_income: "Incasso previsto",
  pdr_installment: "Rata PDR",
  transaction: "Realizzato",
};

export default function MovimentiPage() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [data, setData] = useState<MovementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovements = useCallback(async (y: number, m: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/movements?year=${y}&month=${m}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as MovementsResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovements(year, month);
  }, [fetchMovements, year, month]);

  const goPrev = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };
  const goNext = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
  };

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  const monthLabel = `${MONTH_LABELS[month - 1]} ${year}`;
  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div className="min-h-screen pb-20">
      <MobileHeader title="Movimenti" />

      <div className="p-3 sm:p-4 lg:p-6 space-y-4">
        {/* Header navigazione */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarRange className="h-5 w-5" />
              {monthLabel}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Tutti i movimenti programmati e realizzati del mese.
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={goPrev} className="h-8 w-8 p-0" title="Mese precedente">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {!isCurrentMonth && (
              <Button variant="outline" size="sm" onClick={goToday} className="h-8 px-3 text-xs">
                Oggi
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={goNext} className="h-8 w-8 p-0" title="Mese successivo">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Saldi iniziale e finale */}
        {data && (
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <Card className="p-3 sm:p-4">
              <p className="text-xs text-muted-foreground mb-1">Saldo a inizio mese</p>
              <p className={`text-base sm:text-xl font-bold font-mono ${data.initialBalance >= 0 ? "text-foreground" : "text-red-500"}`}>
                {formatCurrency(data.initialBalance)}
              </p>
            </Card>
            <Card className="p-3 sm:p-4">
              <p className="text-xs text-muted-foreground mb-1">Saldo finale previsto</p>
              <p className={`text-base sm:text-xl font-bold font-mono ${data.finalBalance >= 0 ? "text-green-500" : "text-red-500"}`}>
                {formatCurrency(data.finalBalance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Variazione: <span className={data.finalBalance - data.initialBalance >= 0 ? "text-green-500" : "text-red-500"}>
                  {data.finalBalance - data.initialBalance >= 0 ? "+" : ""}{formatCurrency(data.finalBalance - data.initialBalance)}
                </span>
              </p>
            </Card>
          </div>
        )}

        {/* Stato */}
        {loading && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Caricamento movimenti...
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-500/40">
            <CardContent className="p-6 text-red-600">
              <p className="font-medium mb-1">Errore</p>
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Tabella movimenti */}
        {!loading && data && data.rows.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>Nessun movimento per {monthLabel}.</p>
            </CardContent>
          </Card>
        )}

        {!loading && data && data.rows.length > 0 && (
          <Card>
            {/* Mobile: cards compatte */}
            <div className="sm:hidden divide-y">
              {data.rows.map((row) => {
                const Icon = TYPE_ICONS[row.type];
                const isToday = row.date === todayStr;
                return (
                  <div key={row.id} className={`p-3 ${isToday ? "bg-primary/5" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <Icon className={`h-4 w-4 mt-1 shrink-0 ${row.amount >= 0 ? "text-green-500" : "text-red-500"} ${row.status === "planned" ? "opacity-60" : ""}`} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{row.description}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">{formatDate(row.date)}</span>
                            {row.categoryName && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">{row.categoryName}</Badge>
                            )}
                            {row.status === "planned" && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 bg-amber-500/10 text-amber-500 border-amber-500/40">
                                <Clock className="h-2.5 w-2.5 mr-0.5" />previsto
                              </Badge>
                            )}
                            {row.isOverride && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 bg-amber-500/15 text-amber-500 border-amber-500/40">★</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-mono font-bold text-sm ${row.amount >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {row.amount >= 0 ? "+" : ""}{formatCurrency(row.amount)}
                        </div>
                        <div className={`font-mono text-xs ${row.runningBalance >= 0 ? "text-muted-foreground" : "text-red-500"}`}>
                          = {formatCurrency(row.runningBalance)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: tabella ledger */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[110px]">Data</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center w-[110px]">Stato</TableHead>
                    <TableHead className="text-right w-[120px]">Importo</TableHead>
                    <TableHead className="text-right w-[140px]">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Riga "saldo iniziale" */}
                  <TableRow className="bg-muted/30">
                    <TableCell></TableCell>
                    <TableCell className="text-xs text-muted-foreground italic">{`${year}-${String(month).padStart(2, "0")}-01`}</TableCell>
                    <TableCell colSpan={3} className="text-sm italic text-muted-foreground">Saldo a inizio mese</TableCell>
                    <TableCell></TableCell>
                    <TableCell className={`text-right font-mono font-bold ${data.initialBalance >= 0 ? "text-foreground" : "text-red-500"}`}>
                      {formatCurrency(data.initialBalance)}
                    </TableCell>
                  </TableRow>
                  {data.rows.map((row) => {
                    const Icon = TYPE_ICONS[row.type];
                    const isToday = row.date === todayStr;
                    return (
                      <TableRow key={row.id} className={isToday ? "bg-primary/5" : ""}>
                        <TableCell>
                          <Icon className={`h-4 w-4 ${row.amount >= 0 ? "text-green-500" : "text-red-500"} ${row.status === "planned" ? "opacity-60" : ""}`} />
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(row.date)}</TableCell>
                        <TableCell className="font-medium text-sm">{row.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.categoryName || "—"}</TableCell>
                        <TableCell className="text-center">
                          {row.status === "planned" ? (
                            <Badge variant="outline" className="text-xs px-1.5 py-0 bg-amber-500/10 text-amber-500 border-amber-500/40" title={TYPE_LABELS[row.type]}>
                              <Clock className="h-2.5 w-2.5 mr-0.5" />previsto
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs px-1.5 py-0 bg-green-500/10 text-green-500 border-green-500/40" title={TYPE_LABELS[row.type]}>
                              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />pagato
                            </Badge>
                          )}
                          {row.isOverride && (
                            <Badge variant="outline" className="ml-1 text-xs px-1 py-0 bg-amber-500/15 text-amber-500 border-amber-500/40" title="Importo modificato per questo mese">
                              ★
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${row.amount >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {row.amount >= 0 ? "+" : ""}{formatCurrency(row.amount)}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-medium ${row.runningBalance >= 0 ? "text-foreground" : "text-red-500"}`}>
                          {formatCurrency(row.runningBalance)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Riga "saldo finale" */}
                  <TableRow className="bg-muted/30 font-bold">
                    <TableCell></TableCell>
                    <TableCell className="text-xs text-muted-foreground italic">fine mese</TableCell>
                    <TableCell colSpan={3} className="text-sm italic text-muted-foreground">Saldo finale previsto</TableCell>
                    <TableCell className={`text-right font-mono ${data.finalBalance - data.initialBalance >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {data.finalBalance - data.initialBalance >= 0 ? "+" : ""}{formatCurrency(data.finalBalance - data.initialBalance)}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${data.finalBalance >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {formatCurrency(data.finalBalance)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Counter footer */}
            <div className="border-t p-3 text-xs text-muted-foreground">
              {data.rowsCount} movimenti nel mese
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
