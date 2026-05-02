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
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, centsToEuros, eurosToCents } from "@/lib/utils/currency";

interface PipelineResponse {
  year: number;
  month: number;
  target: number;
  targetNet: number;
  alreadyInvoiced: number;
  recurringPlanned: number;
  oneTimePlanned: number;
  totalCertain: number;
  totalCertainNet: number;
  gap: number;
  pipelineGross: number;
  pipelineWeighted: number;
  pipelineCount: number;
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
  const [pipeline, setPipeline] = useState<PipelineResponse | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetValue, setTargetValue] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/sales-pipeline?year=${today.getFullYear()}&month=${today.getMonth() + 1}`),
        fetch("/api/deals"),
      ]);
      if (r1.ok) setPipeline(await r1.json());
      if (r2.ok) setDeals((await r2.json()).deals || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore caricamento");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const commitTarget = async () => {
    const raw = targetValue.trim().replace(",", ".");
    setEditingTarget(false);
    if (raw === "") return;
    const euros = Number(raw);
    if (!Number.isFinite(euros) || euros < 0) return;
    try {
      const r = await fetch("/api/sales-pipeline", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: eurosToCents(euros) }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
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

  const monthName = MONTH_LABELS[today.getMonth()];
  const progressPct = pipeline && pipeline.target > 0
    ? Math.min(100, Math.round((pipeline.totalCertain / pipeline.target) * 100))
    : 0;

  return (
    <div className="min-h-screen pb-20">
      <MobileHeader title="Piano Commerciale" />
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6" />
            Piano Commerciale — {monthName} {today.getFullYear()}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quanto devi muovere il culo per arrivare all&apos;obiettivo del mese.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {pipeline && (
          <>
            {/* Box obiettivo + progresso */}
            <Card className="mb-4">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Obiettivo {monthName} {today.getFullYear()}</p>
                    {editingTarget ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); commitTarget(); }
                          else if (e.key === "Escape") { e.preventDefault(); setEditingTarget(false); }
                        }}
                        onBlur={commitTarget}
                        autoFocus
                        className="font-mono font-bold text-3xl h-12 px-2 rounded border border-primary/60 bg-background outline-none w-48"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditingTarget(true); setTargetValue(String(centsToEuros(pipeline.target))); }}
                        className="font-mono font-bold text-3xl text-primary inline-flex items-center gap-2 hover:opacity-80 transition"
                        title="Modifica obiettivo"
                      >
                        {formatCurrency(pipeline.target)} <span className="text-base text-muted-foreground font-normal">lordo</span>
                        <Pencil className="h-4 w-4 opacity-60" />
                      </button>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      ≈ {formatCurrency(pipeline.targetNet)} netti
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Progresso</p>
                    <p className={`font-mono font-bold text-3xl ${progressPct >= 100 ? "text-green-500" : progressPct >= 70 ? "text-amber-500" : "text-red-500"}`}>
                      {progressPct}%
                    </p>
                  </div>
                </div>

                {/* Barra progresso a strati */}
                <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                  {pipeline.target > 0 && (
                    <>
                      <div className="bg-green-500 h-full" style={{ width: `${Math.min(100, (pipeline.alreadyInvoiced / pipeline.target) * 100)}%` }} title="Già fatturato" />
                      <div className="bg-blue-500 h-full" style={{ width: `${Math.min(100, (pipeline.recurringPlanned / pipeline.target) * 100)}%` }} title="Ricorrenti residui" />
                      <div className="bg-amber-500 h-full" style={{ width: `${Math.min(100, (pipeline.oneTimePlanned / pipeline.target) * 100)}%` }} title="One-time previsti" />
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mt-1.5">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Già fatturato</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Ricorrenti residui</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />One-time previsti</span>
                </div>
              </CardContent>
            </Card>

            {/* Già certo + da trovare */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Già certo questo mese</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>🟢 Già fatturato</span><span className="font-mono">{formatCurrency(pipeline.alreadyInvoiced)}</span></div>
                    <div className="flex justify-between"><span>🔵 Ricorrenti residui</span><span className="font-mono">{formatCurrency(pipeline.recurringPlanned)}</span></div>
                    <div className="flex justify-between"><span>🟡 One-time previsti</span><span className="font-mono">{formatCurrency(pipeline.oneTimePlanned)}</span></div>
                    <div className="flex justify-between border-t pt-2 mt-2 font-semibold">
                      <span>Totale</span><span className="font-mono">{formatCurrency(pipeline.totalCertain)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className={pipeline.gap > 0 ? "border-red-500/40" : "border-green-500/40"}>
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                    {pipeline.gap > 0 ? "Da trovare ancora" : "Sopra obiettivo"}
                  </p>
                  <p className={`font-mono font-bold text-3xl ${pipeline.gap > 0 ? "text-red-500" : "text-green-500"}`}>
                    {pipeline.gap > 0 ? "" : "+"}{formatCurrency(Math.abs(pipeline.gap))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">lordo IVA</p>
                  {pipeline.pipelineCount > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-3 italic">
                      Hai {pipeline.pipelineCount} trattative aperte per {formatCurrency(pipeline.pipelineGross)} totali (pesato: {formatCurrency(pipeline.pipelineWeighted)})
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Pipeline trattative */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-semibold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Pipeline — cosa bolle in pentola
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Trattative aperte e potenzialità del mese
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setNewOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Nuova
                  </Button>
                </div>

                {newOpen && (
                  <NewDealForm onClose={() => setNewOpen(false)} onSaved={fetchAll} />
                )}

                {deals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nessuna trattativa. Aggiungi qualcosa che sta bollendo in pentola.
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
                        {deals.map((d) => (
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
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }) : "—"}
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
                        <TableRow className="bg-muted/30 font-bold border-t-2">
                          <TableCell colSpan={2}>Totale pipeline aperta</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(pipeline.pipelineGross)}</TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right font-mono text-amber-500">{formatCurrency(pipeline.pipelineWeighted)}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground mt-3 italic">
                  Il <Badge variant="outline" className="text-[10px] px-1 py-0 align-middle">Pesato</Badge> è il valore × probabilità. Usalo per stimare cosa entra davvero.
                  La % default per stato (lead 10% / preventivo 40% / trattativa 70%) si può sovrascrivere a mano.
                </p>
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
