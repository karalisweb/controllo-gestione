"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
import { Wand2, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";

interface Contact {
  id: number;
  name: string;
  type: "client" | "supplier" | "ex_supplier" | "other";
  costCenterId: number | null;
  revenueCenterId: number | null;
}
interface Center { id: number; name: string }

interface MatchSuggestion {
  contactId: number | null;
  contactName: string | null;
  costCenterId: number | null;
  costCenterName: string | null;
  revenueCenterId: number | null;
  revenueCenterName: string | null;
  matchedOn: "contact" | "center" | null;
}

interface Row {
  id: number;
  date: string;
  description: string | null;
  amount: number;
  currentContactId: number | null;
  currentCostCenterId: number | null;
  currentRevenueCenterId: number | null;
  suggestion: MatchSuggestion;
}

interface ApiResponse {
  total: number;
  withMatch: number;
  withoutMatch: number;
  transactions: Row[];
  contacts: Contact[];
  costCenters: Center[];
  revenueCenters: Center[];
}

type FilterMode = "all" | "with_match" | "without_match";

interface UserChoice {
  contactId: number | null;
  costCenterId: number | null;
  revenueCenterId: number | null;
  selected: boolean;
}

export default function RiconciliaPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [choices, setChoices] = useState<Record<number, UserChoice>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/transactions/auto-match");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as ApiResponse;
      setData(json);
      // Inizializza scelte utente con i suggerimenti del server
      const initial: Record<number, UserChoice> = {};
      for (const r of json.transactions) {
        initial[r.id] = {
          contactId: r.suggestion.contactId,
          costCenterId: r.suggestion.costCenterId ?? r.currentCostCenterId,
          revenueCenterId: r.suggestion.revenueCenterId ?? r.currentRevenueCenterId,
          selected: false,
        };
      }
      setChoices(initial);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    switch (filter) {
      case "with_match":
        return data.transactions.filter((r) => r.suggestion.matchedOn !== null);
      case "without_match":
        return data.transactions.filter((r) => r.suggestion.matchedOn === null);
      default:
        return data.transactions;
    }
  }, [data, filter]);

  const selectedCount = useMemo(
    () => Object.values(choices).filter((c) => c.selected).length,
    [choices],
  );

  const updateChoice = (id: number, patch: Partial<UserChoice>) => {
    setChoices((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const selectAllMatches = () => {
    if (!data) return;
    setChoices((prev) => {
      const next = { ...prev };
      for (const r of data.transactions) {
        if (r.suggestion.matchedOn !== null) {
          next[r.id] = { ...next[r.id], selected: true };
        }
      }
      return next;
    });
  };

  const deselectAll = () => {
    setChoices((prev) => {
      const next: typeof prev = {};
      for (const id in prev) next[parseInt(id)] = { ...prev[parseInt(id)], selected: false };
      return next;
    });
  };

  const applySelection = async () => {
    if (!data || selectedCount === 0) return;
    const updates = data.transactions
      .filter((r) => choices[r.id]?.selected)
      .map((r) => {
        const c = choices[r.id];
        const payload: Record<string, unknown> = { transactionId: r.id };
        if (c.contactId !== r.currentContactId) payload.contactId = c.contactId;
        if (r.amount < 0) {
          if (c.costCenterId !== r.currentCostCenterId) payload.costCenterId = c.costCenterId;
        } else {
          if (c.revenueCenterId !== r.currentRevenueCenterId) payload.revenueCenterId = c.revenueCenterId;
        }
        return payload;
      })
      .filter((u) => Object.keys(u).length > 1); // più di solo transactionId

    if (updates.length === 0) {
      toast.info("Nessuna modifica da applicare");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions/auto-match/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      toast.success(`Applicate ${result.applied} di ${result.requested} righe`);
      await fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore applicazione");
    } finally {
      setSubmitting(false);
    }
  };

  const filterButton = (mode: FilterMode, label: string, count?: number) => (
    <button
      key={mode}
      onClick={() => setFilter(mode)}
      className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
        filter === mode
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-transparent text-muted-foreground border-border hover:bg-muted"
      }`}
    >
      {label}
      {count !== undefined && <span className="ml-1 opacity-70">({count})</span>}
    </button>
  );

  return (
    <div className="min-h-screen pb-20">
      <MobileHeader title="Riconcilia" />

      <div className="p-3 sm:p-4 lg:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Riconcilia movimenti
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Associa contatto e centro alle transazioni del passato sfruttando il matching automatico.
            </p>
          </div>
        </div>

        {loading && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Caricamento...
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

        {!loading && data && data.total === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
              <p className="font-medium text-foreground">Tutto già categorizzato.</p>
              <p className="text-sm">Non ci sono transazioni senza contatto associato.</p>
            </CardContent>
          </Card>
        )}

        {!loading && data && data.total > 0 && (
          <>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {filterButton("all", "Tutti", data.total)}
                  {filterButton("with_match", "Con match", data.withMatch)}
                  {filterButton("without_match", "Senza match", data.withoutMatch)}
                  <div className="flex-1" />
                  <Button variant="outline" size="sm" onClick={selectAllMatches} className="h-8 text-xs">
                    Spunta tutti i match
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll} className="h-8 text-xs">
                    Deseleziona
                  </Button>
                  <Button
                    size="sm"
                    onClick={applySelection}
                    disabled={submitting || selectedCount === 0}
                    className="h-8 text-xs"
                  >
                    {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Applica selezione ({selectedCount})
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="w-[100px]">Data</TableHead>
                      <TableHead>Descrizione</TableHead>
                      <TableHead className="text-right w-[110px]">Importo</TableHead>
                      <TableHead className="w-[200px]">Contatto</TableHead>
                      <TableHead className="w-[180px]">Centro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => {
                      const choice = choices[row.id];
                      if (!choice) return null;
                      const isExpense = row.amount < 0;
                      const contactCandidates = isExpense
                        ? data.contacts.filter((c) => c.type === "supplier" || c.type === "ex_supplier")
                        : data.contacts.filter((c) => c.type === "client");
                      const centerCandidates = isExpense ? data.costCenters : data.revenueCenters;
                      const currentCenterId = isExpense ? choice.costCenterId : choice.revenueCenterId;

                      return (
                        <TableRow key={row.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={choice.selected}
                              onChange={(e) => updateChoice(row.id, { selected: e.target.checked })}
                              className="h-4 w-4 cursor-pointer"
                            />
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(row.date)}</TableCell>
                          <TableCell className="text-sm">
                            <div className="font-medium truncate max-w-[300px]">{row.description || "(senza descrizione)"}</div>
                            {row.suggestion.matchedOn && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 bg-green-500/10 text-green-500 border-green-500/40">
                                <Wand2 className="h-2.5 w-2.5 mr-0.5" />match {row.suggestion.matchedOn === "contact" ? "su fornitore/cliente" : "su centro"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className={`text-right font-mono text-sm ${row.amount >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {row.amount >= 0 ? "+" : ""}{formatCurrency(row.amount)}
                          </TableCell>
                          <TableCell>
                            <select
                              value={choice.contactId ?? ""}
                              onChange={(e) => {
                                const cid = e.target.value ? parseInt(e.target.value) : null;
                                // Se cambio contatto, eredito il centro associato (se presente)
                                const found = data.contacts.find((c) => c.id === cid);
                                const patch: Partial<UserChoice> = { contactId: cid };
                                if (found) {
                                  if (isExpense && found.costCenterId) patch.costCenterId = found.costCenterId;
                                  if (!isExpense && found.revenueCenterId) patch.revenueCenterId = found.revenueCenterId;
                                }
                                updateChoice(row.id, patch);
                              }}
                              className="h-8 px-2 text-sm rounded-md border border-border bg-background w-full"
                            >
                              <option value="">— nessuno —</option>
                              {contactCandidates.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>
                            <select
                              value={currentCenterId ?? ""}
                              onChange={(e) => {
                                const cid = e.target.value ? parseInt(e.target.value) : null;
                                if (isExpense) updateChoice(row.id, { costCenterId: cid });
                                else updateChoice(row.id, { revenueCenterId: cid });
                              }}
                              className="h-8 px-2 text-sm rounded-md border border-border bg-background w-full"
                            >
                              <option value="">— nessuno —</option>
                              {centerCandidates.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t p-3 text-xs text-muted-foreground flex items-center justify-between">
                <span>{filteredRows.length} righe visibili — {data.total} totali</span>
                <span>{selectedCount} selezionate</span>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
