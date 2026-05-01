"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MobileHeader } from "@/components/MobileHeader";
import { PiggyBank, Pencil, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, centsToEuros, eurosToCents } from "@/lib/utils/currency";

interface FundRow {
  id: number;
  name: string;
  type: "liquid" | "emergency";
  targetCents: number;
  currentCents: number;
  progressPct: number;
  notes: string | null;
  targetIsAuto: boolean;
}

interface FundsResponse {
  funds: FundRow[];
  fixedMonthlyCosts: number;
  totals: { target: number; current: number };
}

export default function FondiPage() {
  const [data, setData] = useState<FundsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: number; field: "current" | "target"; value: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/funds");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json: FundsResponse = await r.json();
      setData(json);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore caricamento");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const commitEdit = async () => {
    if (!editing) return;
    const raw = editing.value.trim().replace(",", ".");
    const cur = editing;
    setEditing(null);
    if (raw === "") return;
    const euros = Number(raw);
    if (!Number.isFinite(euros) || euros < 0) {
      toast.error("Importo non valido");
      return;
    }
    const cents = eurosToCents(euros);
    const body = cur.field === "current"
      ? { currentCents: cents }
      : { targetCents: cents };
    try {
      const r = await fetch(`/api/funds/${cur.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      toast.success("Fondo aggiornato");
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  };

  const resetTargetAuto = async (fund: FundRow) => {
    if (fund.type !== "emergency") return;
    if (!confirm("Tornare al target automatico (3 × spese fisse mensili)?")) return;
    try {
      const r = await fetch(`/api/funds/${fund.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCents: null }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success("Target torna automatico");
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <MobileHeader title="Fondi" />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PiggyBank className="h-6 w-6" />
            Fondi
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Conti separati per gruzzolo di emergenza. Saldo aggiornato a mano quando versi.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {data && data.funds.map((fund) => {
          const remaining = Math.max(0, fund.targetCents - fund.currentCents);
          const reached = fund.currentCents >= fund.targetCents && fund.targetCents > 0;
          const isEditingCurrent = editing?.id === fund.id && editing.field === "current";
          const isEditingTarget = editing?.id === fund.id && editing.field === "target";

          return (
            <Card key={fund.id} className="mb-4">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="font-semibold text-base flex items-center gap-2">
                      {fund.name}
                      {reached && <Sparkles className="h-4 w-4 text-amber-500" />}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fund.type === "liquid"
                        ? "Liquidità immediata in caso di urgenza"
                        : "Riserva per coprire 3 mesi di spese fisse strutturali"}
                    </p>
                  </div>
                  <span className={`text-sm font-mono font-bold ${reached ? "text-green-500" : "text-foreground"}`}>
                    {fund.progressPct}%
                  </span>
                </div>

                {/* Barra progresso */}
                <div className="w-full bg-muted rounded-full h-2 mb-4">
                  <div
                    className={`h-2 rounded-full transition-all ${reached ? "bg-green-500" : "bg-primary"}`}
                    style={{ width: `${fund.progressPct}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Saldo attuale */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Saldo attuale</p>
                    {isEditingCurrent ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editing.value}
                        onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
                          else if (e.key === "Escape") { e.preventDefault(); setEditing(null); }
                        }}
                        onBlur={commitEdit}
                        autoFocus
                        className="font-mono font-bold text-lg h-10 px-2 rounded border border-primary/60 bg-background outline-none w-32"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing({ id: fund.id, field: "current", value: String(centsToEuros(fund.currentCents)) })}
                        title="Clicca per aggiornare il saldo del fondo"
                        className="font-mono font-bold text-lg flex items-center gap-1.5 hover:text-primary transition-colors"
                      >
                        {formatCurrency(fund.currentCents)}
                        <Pencil className="h-3.5 w-3.5 opacity-70" />
                      </button>
                    )}
                  </div>

                  {/* Target */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Target {fund.targetIsAuto && <span className="text-amber-500">(auto)</span>}
                    </p>
                    {isEditingTarget ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editing.value}
                        onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
                          else if (e.key === "Escape") { e.preventDefault(); setEditing(null); }
                        }}
                        onBlur={commitEdit}
                        autoFocus
                        className="font-mono font-bold text-lg h-10 px-2 rounded border border-primary/60 bg-background outline-none w-32"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing({ id: fund.id, field: "target", value: String(centsToEuros(fund.targetCents)) })}
                        title={fund.targetIsAuto ? "Target calcolato automaticamente. Clicca per impostarne uno fisso." : "Clicca per modificare il target"}
                        className="font-mono font-bold text-lg flex items-center gap-1.5 hover:text-primary transition-colors"
                      >
                        {formatCurrency(fund.targetCents)}
                        <Pencil className="h-3.5 w-3.5 opacity-70" />
                      </button>
                    )}
                    {fund.type === "emergency" && !fund.targetIsAuto && (
                      <button
                        type="button"
                        onClick={() => resetTargetAuto(fund)}
                        className="text-[10px] text-muted-foreground hover:text-primary mt-0.5 underline"
                      >
                        torna ad auto
                      </button>
                    )}
                  </div>

                  {/* Manca */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{reached ? "Raggiunto" : "Manca"}</p>
                    <p className={`font-mono font-bold text-lg ${reached ? "text-green-500" : "text-foreground"}`}>
                      {reached ? "✓" : formatCurrency(remaining)}
                    </p>
                  </div>
                </div>

                {fund.type === "emergency" && data && (
                  <p className="text-[10px] text-muted-foreground mt-3">
                    Spese fisse mensili medie: {formatCurrency(data.fixedMonthlyCosts)}
                    {fund.targetIsAuto && ` × 3 = ${formatCurrency(data.fixedMonthlyCosts * 3)}`}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Riepilogo totale */}
        {data && data.funds.length > 0 && (
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Totale fondi</span>
                <div className="text-right">
                  <p className="font-mono font-bold">
                    {formatCurrency(data.totals.current)} <span className="text-muted-foreground font-normal">/ {formatCurrency(data.totals.target)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.totals.target > 0 ? Math.round((data.totals.current / data.totals.target) * 100) : 0}% del gruzzolo costruito
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground mt-6 italic">
          I fondi sono conti reali separati (banca o contanti). Aggiorna il saldo quando versi qualcosa — niente regole automatiche, decidi tu mese per mese.
        </p>
      </div>
    </div>
  );
}
