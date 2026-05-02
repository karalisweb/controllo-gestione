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
import {
  Target,
  Pencil,
  Loader2,
  Plus,
  Trash2,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, centsToEuros, eurosToCents } from "@/lib/utils/currency";

interface MonthRow {
  month: number;
  target: number;
  targetIsOverride: boolean;
  alreadyInvoiced: number;
  recurringPlanned: number;
  oneTimePlanned: number;
  totalCertain: number;
  gap: number;
  pipelineWeighted: number;
}

interface YearlyResponse {
  year: number;
  defaultTarget: number;
  months: MonthRow[];
  totals: {
    target: number;
    alreadyInvoiced: number;
    recurringPlanned: number;
    oneTimePlanned: number;
    totalCertain: number;
    gap: number;
    pipelineWeighted: number;
  };
  unassignedPipelineGross: number;
  unassignedPipelineWeighted: number;
  currentMonth: number;
}

interface Deal {
  id: number;
  clientName: string;
  valueCents: number;
  stage: "lead" | "preventivo" | "trattativa" | "won" | "lost";
  probabilityPct: number;
  expectedCloseDate: string | null;
  notes: string | null;
}

const STAGE_LABEL: Record<string, string> = {
  lead: "Lead",
  preventivo: "Preventivo",
  trattativa: "Trattativa",
  won: "Vinto",
  lost: "Perso",
};
const STAGE_COLOR: Record<string, string> = {
  lead: "bg-muted text-muted-foreground",
  preventivo: "bg-blue-500/10 text-blue-500 border-blue-500/40",
  trattativa: "bg-amber-500/10 text-amber-500 border-amber-500/40",
  won: "bg-green-500/10 text-green-500 border-green-500/40",
  lost: "bg-red-500/10 text-red-500 border-red-500/40",
};
const STAGE_DEFAULT_PROB: Record<string, number> = {
  lead: 10, preventivo: 40, trattativa: 70, won: 100, lost: 0,
};

const MONTH_LABELS = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

export default function SalesPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [yearly, setYearly] = useState<YearlyResponse | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTarget, setEditingTarget] = useState<{ month: number | "default"; value: string } | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/sales-pipeline/yearly?year=${year}`),
        fetch("/api/deals"),
      ]);
      if (r1.ok) setYearly(await r1.json());
      if (r2.ok) setDeals((await r2.json()).deals || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore caricamento");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const commitTarget = async () => {
    if (!editingTarget) return;
    const raw = editingTarget.value.trim().replace(",", ".");
    const cur = editingTarget;
    setEditingTarget(null);
    if (raw === "") return;
    const euros = Number(raw);
    if (!Number.isFinite(euros) || euros < 0) return;
    const cents = eurosToCents(euros);
    try {
      if (cur.month === "default") {
        const r = await fetch("/api/sales-pipeline/yearly", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ defaultTarget: cents }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      } else {
        const r = await fetch("/api/sales-pipeline/yearly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year, month: cur.month, amountCents: cents }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      }
      toast.success("Obiettivo aggiornato");
      fetchAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  };

  const updateDeal = async (id: number, patch: Partial<Deal>) => {
    try {
      const r = await fetch(`/api/deals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      fetchAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  };

  const deleteDeal = async (id: number) => {
    if (!confirm("Eliminare questa trattativa?")) return;
    try {
      const r = await fetch(`/api/deals/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success("Eliminata");
      fetchAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  };

  // Filtra le trattative per mese se filterMonth è impostato (basato su expectedCloseDate)
  const visibleDeals = filterMonth == null
    ? deals
    : deals.filter((d) => {
        if (!d.expectedCloseDate) return false;
        const [, m] = d.expectedCloseDate.split("-").map(Number);
        return m === filterMonth;
      });
  const unassignedDeals = deals.filter((d) =>
    (d.stage !== "won" && d.stage !== "lost") && !d.expectedCloseDate
  );

  return (
    <div className="min-h-screen pb-20">
      <MobileHeader title="Piano Commerciale" />
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6" />
              Piano Commerciale {year}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Quanto devi muovere il culo, mese per mese.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setYear((y) => y - 1)} disabled={loading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-mono font-bold text-lg w-16 text-center">{year}</span>
            <Button variant="outline" size="icon" onClick={() => setYear((y) => y + 1)} disabled={loading}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {yearly && (
          <>
            {/* Riga obiettivo default */}
            <Card className="mb-4">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Obiettivo mensile DEFAULT (lordo IVA)</p>
                  {editingTarget?.month === "default" ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editingTarget.value}
                      onChange={(e) => setEditingTarget({ month: "default", value: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); commitTarget(); }
                        else if (e.key === "Escape") { e.preventDefault(); setEditingTarget(null); }
                      }}
                      onBlur={commitTarget}
                      autoFocus
                      className="font-mono font-bold text-2xl h-10 px-2 rounded border border-primary/60 bg-background outline-none w-40"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingTarget({ month: "default", value: String(centsToEuros(yearly.defaultTarget)) })}
                      className="font-mono font-bold text-2xl text-primary inline-flex items-center gap-2"
                    >
                      {formatCurrency(yearly.defaultTarget)} <Pencil className="h-4 w-4 opacity-60" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Click su una cella obiettivo nella tabella sotto per fare un override mese-specifico.
                </p>
              </CardContent>
            </Card>

            {/* Tabella 12 mesi */}
            <Card className="mb-4">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Mese</TableHead>
                        <TableHead className="text-right">Obiettivo</TableHead>
                        <TableHead className="text-right">Già fatturato</TableHead>
                        <TableHead className="text-right">Ricorrenti</TableHead>
                        <TableHead className="text-right">One-time</TableHead>
                        <TableHead className="text-right">Totale certo</TableHead>
                        <TableHead className="text-right">Gap</TableHead>
                        <TableHead className="text-right">Pipeline pesata</TableHead>
                        <TableHead className="text-right w-[120px]">Stato</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {yearly.months.map((m) => {
                        const isCurrent = m.month === yearly.currentMonth && yearly.year === today.getFullYear();
                        const isPast = (yearly.year < today.getFullYear()) || (yearly.year === today.getFullYear() && m.month < today.getMonth() + 1);
                        const finalGap = m.gap - m.pipelineWeighted; // dopo pipeline pesata
                        const stateColor = finalGap <= 0 ? "text-green-500" : m.gap > 0 && (m.gap - m.pipelineWeighted) <= m.gap * 0.3 ? "text-amber-500" : "text-red-500";
                        const isFilteredHere = filterMonth === m.month;
                        const isEditingTargetCell = editingTarget?.month === m.month;
                        return (
                          <TableRow
                            key={m.month}
                            className={`${isCurrent ? "bg-primary/5" : ""} ${isPast ? "opacity-60" : ""} ${isFilteredHere ? "ring-1 ring-primary/40" : ""} hover:bg-muted/30 cursor-pointer`}
                            onClick={() => setFilterMonth(filterMonth === m.month ? null : m.month)}
                          >
                            <TableCell className={`font-medium ${isCurrent ? "text-primary" : ""}`}>
                              {MONTH_LABELS[m.month - 1]}
                            </TableCell>
                            <TableCell
                              className="text-right font-mono"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isEditingTargetCell) {
                                  setEditingTarget({ month: m.month, value: String(centsToEuros(m.target)) });
                                }
                              }}
                            >
                              {isEditingTargetCell ? (
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={editingTarget!.value}
                                  onChange={(ev) => setEditingTarget({ month: m.month, value: ev.target.value })}
                                  onKeyDown={(ev) => {
                                    if (ev.key === "Enter") { ev.preventDefault(); commitTarget(); }
                                    else if (ev.key === "Escape") { ev.preventDefault(); setEditingTarget(null); }
                                  }}
                                  onBlur={commitTarget}
                                  autoFocus
                                  onClick={(ev) => ev.stopPropagation()}
                                  className="h-7 px-1 text-xs rounded border border-primary/60 bg-background outline-none w-24 text-right font-mono"
                                />
                              ) : (
                                <span className={`inline-flex items-center gap-1 ${m.targetIsOverride ? "text-amber-500" : ""}`}>
                                  {formatCurrency(m.target)}
                                  {m.targetIsOverride && <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-500 border-amber-500/40">★</Badge>}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-500">
                              {m.alreadyInvoiced > 0 ? formatCurrency(m.alreadyInvoiced) : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-blue-500">
                              {m.recurringPlanned > 0 ? formatCurrency(m.recurringPlanned) : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-amber-500">
                              {m.oneTimePlanned > 0 ? formatCurrency(m.oneTimePlanned) : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {formatCurrency(m.totalCertain)}
                            </TableCell>
                            <TableCell className={`text-right font-mono ${m.gap > 0 ? "text-red-500" : "text-green-500"}`}>
                              {m.gap > 0 ? "" : "+"}{formatCurrency(Math.abs(m.gap))}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {m.pipelineWeighted > 0 ? `+${formatCurrency(m.pipelineWeighted)}` : "—"}
                            </TableCell>
                            <TableCell className={`text-right font-mono font-bold ${stateColor}`}>
                              {finalGap <= 0
                                ? <span title="Coperto anche con pipeline pesata">✓ {formatCurrency(-finalGap)}</span>
                                : <span title="Manca anche dopo aver contato pipeline pesata">−{formatCurrency(finalGap)}</span>
                              }
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Totali anno */}
                      <TableRow className="bg-muted/40 font-bold border-t-2">
                        <TableCell>Anno {year}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(yearly.totals.target)}</TableCell>
                        <TableCell className="text-right font-mono text-green-500">{formatCurrency(yearly.totals.alreadyInvoiced)}</TableCell>
                        <TableCell className="text-right font-mono text-blue-500">{formatCurrency(yearly.totals.recurringPlanned)}</TableCell>
                        <TableCell className="text-right font-mono text-amber-500">{formatCurrency(yearly.totals.oneTimePlanned)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(yearly.totals.totalCertain)}</TableCell>
                        <TableCell className={`text-right font-mono ${yearly.totals.gap > 0 ? "text-red-500" : "text-green-500"}`}>
                          {yearly.totals.gap > 0 ? "" : "+"}{formatCurrency(Math.abs(yearly.totals.gap))}
                        </TableCell>
                        <TableCell className="text-right font-mono">+{formatCurrency(yearly.totals.pipelineWeighted)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <p className="text-[10px] text-muted-foreground p-3 italic">
                  Click su una riga mese per filtrare la pipeline qui sotto a quel mese. Click sull&apos;obiettivo per modificarlo (override).
                  La colonna <strong>Stato</strong> tiene conto anche della pipeline pesata: ✓ verde = ce la fai anche solo coi deal aperti, − rosso = manca.
                </p>
              </CardContent>
            </Card>

            {/* Pipeline trattative */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-semibold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Pipeline — cosa bolle in pentola
                      {filterMonth != null && (
                        <Badge variant="outline" className="ml-1 bg-primary/10 text-primary border-primary/40">
                          Filtro: {MONTH_LABELS[filterMonth - 1]}
                          <button type="button" className="ml-1.5 opacity-70 hover:opacity-100" onClick={() => setFilterMonth(null)}>×</button>
                        </Badge>
                      )}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {filterMonth != null
                        ? `Trattative con chiusura prevista in ${MONTH_LABELS[filterMonth - 1]}`
                        : "Tutte le trattative aperte"}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setNewOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Nuova
                  </Button>
                </div>

                {newOpen && (
                  <NewDealForm onClose={() => setNewOpen(false)} onSaved={fetchAll} />
                )}

                {visibleDeals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {filterMonth != null
                      ? `Nessuna trattativa attesa a ${MONTH_LABELS[filterMonth - 1]}.`
                      : "Nessuna trattativa. Aggiungi qualcosa che sta bollendo in pentola."}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead className="text-right">Valore lordo</TableHead>
                          <TableHead className="text-right w-[80px]">%</TableHead>
                          <TableHead className="text-right">Atteso</TableHead>
                          <TableHead className="text-right">Pesato</TableHead>
                          <TableHead className="w-[40px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleDeals.map((d) => (
                          <TableRow key={d.id} className={d.stage === "won" ? "bg-green-500/5" : d.stage === "lost" ? "opacity-50" : ""}>
                            <TableCell className="font-medium">{d.clientName}</TableCell>
                            <TableCell>
                              <select
                                value={d.stage}
                                onChange={(e) => updateDeal(d.id, { stage: e.target.value as Deal["stage"], probabilityPct: STAGE_DEFAULT_PROB[e.target.value] })}
                                className={`text-xs px-2 py-1 rounded border ${STAGE_COLOR[d.stage]} bg-background`}
                              >
                                {Object.entries(STAGE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                              </select>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(d.valueCents)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={d.probabilityPct}
                                onChange={(e) => updateDeal(d.id, { probabilityPct: Number(e.target.value) })}
                                className="w-16 text-right text-xs px-1 py-0.5 rounded border border-border bg-background outline-none"
                              />
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              <input
                                type="date"
                                value={d.expectedCloseDate || ""}
                                onChange={(e) => updateDeal(d.id, { expectedCloseDate: e.target.value || null })}
                                className="text-xs px-1 py-0.5 rounded border border-border bg-background outline-none"
                              />
                            </TableCell>
                            <TableCell className="text-right font-mono text-amber-500">
                              {formatCurrency(Math.round(d.valueCents * d.probabilityPct / 100))}
                            </TableCell>
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => deleteDeal(d.id)}
                                className="text-muted-foreground hover:text-red-500"
                                title="Elimina"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {filterMonth == null && unassignedDeals.length > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-3 italic">
                    {unassignedDeals.length} trattative aperte senza data attesa: {formatCurrency(yearly.unassignedPipelineGross)} gross / {formatCurrency(yearly.unassignedPipelineWeighted)} pesato. Imposta una data per assegnarle a un mese.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Form rapido nuova trattativa ────────────────────────────────────
function NewDealForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [clientName, setClientName] = useState("");
  const [valueEuros, setValueEuros] = useState("");
  const [stage, setStage] = useState<Deal["stage"]>("lead");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!clientName.trim() || !valueEuros) {
      toast.error("Cliente e valore obbligatori");
      return;
    }
    const euros = Number(valueEuros.replace(",", "."));
    if (!Number.isFinite(euros) || euros < 0) {
      toast.error("Valore non valido");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          valueCents: eurosToCents(euros),
          stage,
          probabilityPct: STAGE_DEFAULT_PROB[stage],
          expectedCloseDate: expectedCloseDate || null,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success("Trattativa creata");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mb-4 p-3 rounded-lg bg-muted/30 border border-dashed">
      <input
        type="text"
        placeholder="Cliente"
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
        className="text-sm px-2 py-1.5 rounded border border-border bg-background outline-none sm:col-span-2"
      />
      <input
        type="text"
        inputMode="decimal"
        placeholder="Valore € lordo"
        value={valueEuros}
        onChange={(e) => setValueEuros(e.target.value)}
        className="text-sm px-2 py-1.5 rounded border border-border bg-background outline-none"
      />
      <select
        value={stage}
        onChange={(e) => setStage(e.target.value as Deal["stage"])}
        className="text-sm px-2 py-1.5 rounded border border-border bg-background outline-none"
      >
        {Object.entries(STAGE_LABEL).map(([v, l]) => <option key={v} value={v}>{l} ({STAGE_DEFAULT_PROB[v]}%)</option>)}
      </select>
      <input
        type="date"
        placeholder="Atteso"
        value={expectedCloseDate}
        onChange={(e) => setExpectedCloseDate(e.target.value)}
        className="text-sm px-2 py-1.5 rounded border border-border bg-background outline-none"
      />
      <div className="flex gap-2 sm:col-span-5 justify-end mt-1">
        <Button variant="outline" size="sm" onClick={onClose}>Annulla</Button>
        <Button size="sm" onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salva"}
        </Button>
      </div>
    </div>
  );
}
