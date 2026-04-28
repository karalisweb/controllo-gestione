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
import { NewMovementForm } from "@/components/movimenti/NewMovementForm";
import { TransactionEditableRow } from "@/components/movimenti/TransactionEditableRow";
import { ConfirmExpectedDialog, type PreviewRow } from "@/components/movimenti/ConfirmExpectedDialog";
import { ChevronLeft, ChevronRight, CalendarRange, CheckCircle2, Clock, CreditCard, ArrowDownToLine, ArrowUpFromLine, X, CornerDownRight } from "lucide-react";
import { toast } from "sonner";
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
  contactId?: number | null;
  contactName?: string | null;
  costCenterId?: number | null;
  revenueCenterId?: number | null;
  isSplit?: boolean;
  isTransfer?: boolean;
  linkedTransactionId?: number | null;
  paymentPlanId?: number | null;
}

interface Contact {
  id: number;
  name: string;
  type: "client" | "supplier" | "ex_supplier" | "other";
  costCenterId?: number | null;
  revenueCenterId?: number | null;
}
interface Center { id: number; name: string }

interface AggregatedItem {
  name: string;
  amount: number;
}
interface AggregatedValues {
  iva: number;
  alessio: number;
  daniela: number;
  guadagno: number;
}
interface MovementsResponse {
  year: number;
  month: number;
  initialBalance: number;
  finalBalance: number;
  rowsCount: number;
  rows: MovementRow[];
  totals?: {
    incomeByCenter: AggregatedItem[];
    expenseByCenter: AggregatedItem[];
    values: AggregatedValues;
  };
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
  const [shouldScrollToToday, setShouldScrollToToday] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [costCenters, setCostCenters] = useState<Center[]>([]);
  const [revenueCenters, setRevenueCenters] = useState<Center[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmRow, setConfirmRow] = useState<PreviewRow | null>(null);
  const [markingPaid, setMarkingPaid] = useState<number | null>(null);
  const [editingPdrDateId, setEditingPdrDateId] = useState<number | null>(null);
  const [editingPdrDateValue, setEditingPdrDateValue] = useState("");

  // Carica liste anagrafica/centri una volta sola (per l'editing inline delle transactions)
  useEffect(() => {
    Promise.all([
      fetch("/api/contacts").then((r) => r.json()),
      fetch("/api/cost-centers").then((r) => r.json()),
      fetch("/api/revenue-centers").then((r) => r.json()),
    ])
      .then(([c, cc, rc]) => {
        setContacts(Array.isArray(c) ? c : []);
        setCostCenters(Array.isArray(cc) ? cc : []);
        setRevenueCenters(Array.isArray(rc) ? rc : []);
      })
      .catch(() => {/* silently */});
  }, []);

  const handleContactCreated = useCallback((c: Contact) => {
    setContacts((prev) => [...prev, c]);
  }, []);
  const handleCenterCreated = useCallback((c: Center, type: "expense" | "income") => {
    if (type === "expense") setCostCenters((prev) => [...prev, c]);
    else setRevenueCenters((prev) => [...prev, c]);
  }, []);

  const openConfirmDialog = (row: MovementRow) => {
    if (row.type !== "expected_expense" && row.type !== "expected_income") return;
    setConfirmRow({
      type: row.type,
      sourceId: row.sourceId,
      date: row.date,
      description: row.description,
      amount: row.amount,
      categoryName: row.categoryName,
    });
    setConfirmDialogOpen(true);
  };

  const handleSkipExpected = async (row: MovementRow) => {
    if (row.type !== "expected_expense" && row.type !== "expected_income") return;
    if (!confirm(`Saltare "${row.description}" per questo mese? La riga sparirà dal ledger di ${row.date.slice(0, 7)}.`)) return;
    try {
      const [y, m] = row.date.split("-").map(Number);
      const url = row.type === "expected_expense"
        ? `/api/expected-expenses/${row.sourceId}/override`
        : `/api/expected-incomes/${row.sourceId}/override`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: y,
          month: m,
          amount: 0,
          notes: "Saltato dall'utente in /movimenti",
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      toast.success("Saltato per questo mese");
      fetchMovements(year, month);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  };

  const commitPdrDate = async (row: MovementRow) => {
    const newDate = editingPdrDateValue;
    setEditingPdrDateId(null);
    if (!row.paymentPlanId) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || newDate === row.date) return;
    try {
      const r = await fetch(`/api/payment-plans/${row.paymentPlanId}/installments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installmentId: row.sourceId, dueDate: newDate }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      toast.success("Data rata aggiornata");
      fetchMovements(year, month);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  };

  const handleMarkPaid = async (row: MovementRow) => {
    if (row.type !== "pdr_installment" || !row.paymentPlanId || markingPaid === row.sourceId) return;
    if (!confirm(`Segnare la rata "${row.description}" come pagata oggi?`)) return;
    setMarkingPaid(row.sourceId);
    try {
      const today = new Date().toISOString().slice(0, 10);
      // 1. Crea transaction reale
      const txRes = await fetch("/api/transactions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          description: row.description,
          amount: row.amount, // già negativo
          notes: `[PDR-installment-${row.sourceId}]`,
        }),
      });
      if (!txRes.ok) {
        const err = await txRes.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${txRes.status}`);
      }
      const txJson = await txRes.json();
      const txId = txJson?.transaction?.id ?? null;

      // 2. Segna rata pagata + linka transaction
      const ipRes = await fetch(`/api/payment-plans/${row.paymentPlanId}/installments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installmentId: row.sourceId,
          paidDate: today,
          transactionId: txId,
        }),
      });
      if (!ipRes.ok) {
        const err = await ipRes.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${ipRes.status}`);
      }

      toast.success("Rata segnata come pagata");
      fetchMovements(year, month);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setMarkingPaid(null);
    }
  };

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
    setShouldScrollToToday(true);
  };

  useEffect(() => {
    if (shouldScrollToToday && data) {
      // microtask per aspettare il DOM dopo render
      const t = setTimeout(() => {
        const el = document.querySelector('[data-today="true"]');
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        setShouldScrollToToday(false);
      }, 50);
      return () => clearTimeout(t);
    }
  }, [shouldScrollToToday, data]);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  const monthLabel = `${MONTH_LABELS[month - 1]} ${year}`;
  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div className="min-h-screen pb-20">
      <MobileHeader title="Movimenti" />

      <div className="p-3 sm:p-4 lg:p-6 space-y-4">
        {/* Wrapper sticky: navigazione + saldi + 3 box restano in cima allo scroll */}
        <div className="sticky top-0 z-20 bg-background pb-4 -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6 space-y-4 pt-2 border-b border-border">
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

        {/* Saldi iniziale, finale, disavanzo */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
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
            </Card>
            <Card className={`p-3 sm:p-4 ${data.finalBalance - data.initialBalance >= 0 ? "border-green-500/40" : "border-red-500/40"}`}>
              <p className="text-xs text-muted-foreground mb-1">
                {data.finalBalance - data.initialBalance >= 0 ? "Surplus del mese" : "Disavanzo del mese"}
              </p>
              <p className={`text-base sm:text-xl font-bold font-mono ${data.finalBalance - data.initialBalance >= 0 ? "text-green-500" : "text-red-500"}`}>
                {data.finalBalance - data.initialBalance >= 0 ? "+" : ""}{formatCurrency(data.finalBalance - data.initialBalance)}
              </p>
            </Card>
          </div>
        )}

        {/* 3 box aggregati (Excel-style header) */}
        {data?.totals && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4">
            {/* INGRESSI per centro di ricavo */}
            <Card className="p-3 sm:p-4">
              <p className="text-xs font-semibold text-green-500 mb-2 uppercase tracking-wide">
                Ingressi per centro
              </p>
              {data.totals.incomeByCenter.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nessun incasso</p>
              ) : (
                <div className="space-y-1">
                  {data.totals.incomeByCenter.map((it) => (
                    <div key={it.name} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate mr-2">{it.name}</span>
                      <span className="font-mono text-green-500">{formatCurrency(it.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border">
                    <span>Totale</span>
                    <span className="font-mono text-green-500">
                      {formatCurrency(data.totals.incomeByCenter.reduce((s, i) => s + i.amount, 0))}
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* USCITE per centro di costo */}
            <Card className="p-3 sm:p-4">
              <p className="text-xs font-semibold text-red-500 mb-2 uppercase tracking-wide">
                Uscite per centro
              </p>
              {data.totals.expenseByCenter.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nessuna spesa</p>
              ) : (
                <div className="space-y-1">
                  {data.totals.expenseByCenter.map((it) => (
                    <div key={it.name} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate mr-2">{it.name}</span>
                      <span className="font-mono text-red-500">-{formatCurrency(it.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border">
                    <span>Totale</span>
                    <span className="font-mono text-red-500">
                      -{formatCurrency(data.totals.expenseByCenter.reduce((s, i) => s + i.amount, 0))}
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* VALORI da split */}
            <Card className="p-3 sm:p-4">
              <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
                Valori (da split)
              </p>
              {data.totals.values.iva === 0 && data.totals.values.alessio === 0 && data.totals.values.daniela === 0 && data.totals.values.guadagno === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nessuno split nel mese</p>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Guadagno agenzia</span>
                    <span className="font-mono">{formatCurrency(data.totals.values.guadagno)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IVA</span>
                    <span className="font-mono">{formatCurrency(data.totals.values.iva)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Alessio</span>
                    <span className="font-mono">{formatCurrency(data.totals.values.alessio)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Daniela</span>
                    <span className="font-mono">{formatCurrency(data.totals.values.daniela)}</span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
        </div>{/* fine wrapper sticky */}

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

        {/* Tabella movimenti + form inserimento in cima */}
        {!loading && data && (
          <Card>
            <NewMovementForm
              onSaved={() => fetchMovements(year, month)}
              expectedRows={data.rows
                .filter((r) => (r.type === "expected_expense" || r.type === "expected_income") && r.status === "planned")
                .map((r) => ({
                  type: r.type as "expected_expense" | "expected_income",
                  sourceId: r.sourceId,
                  date: r.date,
                  description: r.description,
                  amount: r.amount,
                  categoryName: r.categoryName,
                }))}
              onMatchSuggested={(row) => {
                setConfirmRow({
                  type: row.type,
                  sourceId: row.sourceId,
                  date: row.date,
                  description: row.description,
                  amount: row.amount,
                  categoryName: row.categoryName,
                });
                setConfirmDialogOpen(true);
              }}
            />

            {data.rows.length === 0 && (
              <CardContent className="p-8 text-center text-muted-foreground">
                <p>Nessun movimento per {monthLabel}.</p>
              </CardContent>
            )}

            {data.rows.length > 0 && (
              <>
                {/* Mobile: cards compatte */}
                <div className="sm:hidden divide-y">
              {data.rows.map((row) => {
                const Icon = TYPE_ICONS[row.type];
                const isToday = row.date === todayStr;
                const isChild = !!row.isTransfer;
                return (
                  <div key={row.id} className={`p-3 ${isToday ? "bg-primary/5" : ""} ${isChild ? "bg-muted/20 pl-8" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        {isChild && <CornerDownRight className="h-3.5 w-3.5 mt-1 text-muted-foreground shrink-0" />}
                        <Icon className={`h-4 w-4 mt-1 shrink-0 ${row.amount >= 0 ? "text-green-500" : "text-red-500"} ${row.status === "planned" || isChild ? "opacity-60" : ""}`} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{row.description}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">{formatDate(row.date)}</span>
                            {row.contactName && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">{row.contactName}</Badge>
                            )}
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
                        {!isChild && (
                          <div className={`font-mono text-xs ${row.runningBalance >= 0 ? "text-muted-foreground" : "text-red-500"}`}>
                            = {formatCurrency(row.runningBalance)}
                          </div>
                        )}
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
                    <TableHead className="w-[160px]">Contatto</TableHead>
                    <TableHead className="w-[160px]">Categoria</TableHead>
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
                    <TableCell colSpan={4} className="text-sm italic text-muted-foreground">Saldo a inizio mese</TableCell>
                    <TableCell></TableCell>
                    <TableCell className={`text-right font-mono font-bold ${data.initialBalance >= 0 ? "text-foreground" : "text-red-500"}`}>
                      {formatCurrency(data.initialBalance)}
                    </TableCell>
                  </TableRow>
                  {data.rows.map((row) => {
                    const isToday = row.date === todayStr;
                    if (row.type === "transaction") {
                      return (
                        <TransactionEditableRow
                          key={row.id}
                          row={row}
                          isToday={isToday}
                          contacts={contacts}
                          costCenters={costCenters}
                          revenueCenters={revenueCenters}
                          onSaved={() => fetchMovements(year, month)}
                          onContactCreated={handleContactCreated}
                          onCenterCreated={handleCenterCreated}
                        />
                      );
                    }
                    const Icon = TYPE_ICONS[row.type];
                    const isExpectedRow = row.type === "expected_expense" || row.type === "expected_income";
                    const isPdrPlanned = row.type === "pdr_installment" && row.status === "planned";
                    return (
                      <TableRow key={row.id} className={isToday ? "bg-primary/5" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Icon className={`h-4 w-4 shrink-0 ${row.amount >= 0 ? "text-green-500" : "text-red-500"} ${row.status === "planned" ? "opacity-60" : ""}`} />
                            {isExpectedRow && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openConfirmDialog(row)}
                                  title="Conferma come movimento reale"
                                  className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-0.5"
                                >
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  Conferma
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSkipExpected(row)}
                                  title="Salta per questo mese (la riga sparisce dal ledger)"
                                  className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground hover:bg-muted/70 transition-colors flex items-center gap-0.5"
                                >
                                  <X className="h-2.5 w-2.5" />
                                  Salta
                                </button>
                              </>
                            )}
                            {isPdrPlanned && (
                              <button
                                type="button"
                                onClick={() => handleMarkPaid(row)}
                                disabled={markingPaid === row.sourceId}
                                title="Segna questa rata come pagata oggi"
                                className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-0.5 disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                {markingPaid === row.sourceId ? "..." : "Segna pagata"}
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {isPdrPlanned ? (
                            editingPdrDateId === row.sourceId ? (
                              <input
                                type="date"
                                value={editingPdrDateValue}
                                onChange={(e) => setEditingPdrDateValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); commitPdrDate(row); }
                                  else if (e.key === "Escape") { e.preventDefault(); setEditingPdrDateId(null); }
                                }}
                                onBlur={() => commitPdrDate(row)}
                                autoFocus
                                className="h-7 px-1 text-xs rounded border border-primary/60 bg-background outline-none w-full"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setEditingPdrDateId(row.sourceId); setEditingPdrDateValue(row.date); }}
                                title="Clicca per modificare la data scadenza (es. anticipo pagamento)"
                                className="px-1 py-0.5 rounded hover:bg-muted/50 transition-colors text-left"
                              >
                                {formatDate(row.date)}
                              </button>
                            )
                          ) : (
                            formatDate(row.date)
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{row.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.contactName || "—"}</TableCell>
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
                    <TableCell colSpan={4} className="text-sm italic text-muted-foreground">Saldo finale previsto</TableCell>
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
              </>
            )}
          </Card>
        )}
      </div>

      <ConfirmExpectedDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        row={confirmRow}
        contacts={contacts}
        costCenters={costCenters}
        revenueCenters={revenueCenters}
        onConfirmed={() => fetchMovements(year, month)}
        onContactCreated={handleContactCreated}
        onCenterCreated={handleCenterCreated}
      />
    </div>
  );
}
