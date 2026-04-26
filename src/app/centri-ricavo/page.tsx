"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RevenueCenterForm } from "@/components/settings/RevenueCenterForm";
import { MobileHeader } from "@/components/MobileHeader";
import { Plus, Edit2, Trash2, Search, TrendingUp, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/currency";
import type { RevenueCenter } from "@/types";

type RevenueCenterWithStats = RevenueCenter & {
  totalExpected?: number;
  collected?: number;
  expectedIncomesCount?: number;
};

type SortKey = "name" | "voci" | "target" | "collected" | "remaining";
type SortDir = "asc" | "desc";

function compareStrings(a: string | null | undefined, b: string | null | undefined, dir: SortDir): number {
  const va = (a ?? "").toLowerCase();
  const vb = (b ?? "").toLowerCase();
  if (va === vb) return 0;
  if (va === "") return 1;
  if (vb === "") return -1;
  return dir === "asc" ? va.localeCompare(vb, "it") : vb.localeCompare(va, "it");
}
function compareNumbers(a: number | null | undefined, b: number | null | undefined, dir: SortDir): number {
  const va = a ?? 0;
  const vb = b ?? 0;
  if (va === vb) return 0;
  return dir === "asc" ? va - vb : vb - va;
}

export default function CentriRicavoPage() {
  const [centers, setCenters] = useState<RevenueCenterWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RevenueCenter | null>(null);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };
  const SortIcon = ({ col }: { col: SortKey }) => {
    if (col !== sortKey) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/revenue-centers?year=2026");
      if (res.ok) setCenters(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = centers.filter((c) => !s || c.name.toLowerCase().includes(s));
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "name": return compareStrings(a.name, b.name, sortDir);
        case "voci": return compareNumbers(a.expectedIncomesCount, b.expectedIncomesCount, sortDir);
        case "target": return compareNumbers(a.totalExpected, b.totalExpected, sortDir);
        case "collected": return compareNumbers(a.collected, b.collected, sortDir);
        case "remaining": return compareNumbers((a.totalExpected || 0) - (a.collected || 0), (b.totalExpected || 0) - (b.collected || 0), sortDir);
        default: return 0;
      }
    });
  }, [centers, search, sortKey, sortDir]);

  const totalExpected = centers.reduce((s, c) => s + (c.totalExpected || 0), 0);
  const totalCollected = centers.reduce((s, c) => s + (c.collected || 0), 0);
  const totalVoci = centers.reduce((s, c) => s + (c.expectedIncomesCount || 0), 0);

  const handleCreate = async (data: Partial<RevenueCenter>) => {
    const res = await fetch("/api/revenue-centers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error("Errore creazione"); throw new Error(); }
    toast.success("Centro di ricavo creato");
    await fetchData();
  };

  const handleUpdate = async (data: Partial<RevenueCenter>) => {
    if (!editing) return;
    const res = await fetch(`/api/revenue-centers/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error("Errore aggiornamento"); throw new Error(); }
    toast.success("Centro di ricavo aggiornato");
    setEditing(null);
    await fetchData();
  };

  const handleDelete = async (c: RevenueCenter) => {
    if (!confirm(`Eliminare il centro di ricavo "${c.name}"? Gli incassi collegati non vengono eliminati ma perderanno l'assegnazione.`)) return;
    const res = await fetch(`/api/revenue-centers/${c.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Errore eliminazione"); return; }
    toast.success("Centro di ricavo eliminato");
    await fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <MobileHeader title="Centri di Ricavo" />
        <div className="flex items-center justify-center h-64"><div className="text-muted-foreground">Caricamento...</div></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <MobileHeader title="Centri di Ricavo" />

      <div className="p-3 sm:p-4 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">Centri di Ricavo</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Categorie con cui aggreghi gli incassi (Marketing, Domini, Siti Web, Pacchetto Assistenza, ecc.).
            </p>
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }} className="text-xs">
            <Plus className="h-4 w-4 mr-1.5" />
            Nuovo
          </Button>
        </div>

        {/* 3 box riepilogo */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground mb-1">Centri attivi</p>
            <p className="text-base sm:text-xl font-bold font-mono text-foreground">{centers.length}</p>
            <p className="text-xs text-muted-foreground">{totalVoci} incassi collegati</p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground mb-1">Target annuo</p>
            <p className="text-base sm:text-xl font-bold font-mono text-green-500 dark:text-green-400">{formatCurrency(totalExpected)}</p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground mb-1">Incassato</p>
            <p className="text-base sm:text-xl font-bold font-mono text-foreground">{formatCurrency(totalCollected)}</p>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {centers.length === 0 ? (
                <>
                  <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium mb-1">Nessun centro di ricavo</p>
                  <p className="text-sm">Premi <strong>Nuovo</strong> per crearne uno.</p>
                </>
              ) : (
                <p className="text-sm">Nessun centro corrisponde alla ricerca.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y">
              {filtered.map((c) => (
                <div key={c.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: c.color || "#6b7280" }} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{c.expectedIncomesCount || 0} voci</span>
                        <span>•</span>
                        <span className="font-mono text-green-500">{formatCurrency(c.totalExpected || 0)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(c); setFormOpen(true); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("name")}>
                      <span className="inline-flex items-center gap-1">Nome <SortIcon col="name" /></span>
                    </TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead className="text-center cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("voci")}>
                      <span className="inline-flex items-center gap-1">Voci <SortIcon col="voci" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("target")}>
                      <span className="inline-flex items-center gap-1">Target annuo <SortIcon col="target" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("collected")}>
                      <span className="inline-flex items-center gap-1">Incassato <SortIcon col="collected" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("remaining")}>
                      <span className="inline-flex items-center gap-1">Da incassare <SortIcon col="remaining" /></span>
                    </TableHead>
                    <TableHead className="text-right w-[100px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => {
                    const remaining = (c.totalExpected || 0) - (c.collected || 0);
                    return (
                      <TableRow key={c.id}>
                        <TableCell><div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color || "#6b7280" }} /></TableCell>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[260px] truncate">{c.description || "—"}</TableCell>
                        <TableCell className="text-center"><Badge variant="secondary">{c.expectedIncomesCount || 0}</Badge></TableCell>
                        <TableCell className="text-right font-mono text-green-600">{formatCurrency(c.totalExpected || 0)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(c.collected || 0)}</TableCell>
                        <TableCell className={`text-right font-mono font-bold ${remaining >= 0 ? "text-orange-500" : "text-green-600"}`}>{formatCurrency(remaining)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(c); setFormOpen(true); }}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(c)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell></TableCell>
                    <TableCell>TOTALE</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-center"><Badge>{totalVoci}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-green-600">{formatCurrency(totalExpected)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totalCollected)}</TableCell>
                    <TableCell className={`text-right font-mono ${totalExpected - totalCollected >= 0 ? "text-orange-500" : "text-green-600"}`}>{formatCurrency(totalExpected - totalCollected)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <CardHeader className="border-t p-3">
              <CardTitle className="text-xs text-muted-foreground font-normal">
                {filtered.length} centr{filtered.length === 1 ? "o" : "i"} mostrat{filtered.length === 1 ? "o" : "i"} su {centers.length} totali
              </CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>

      <RevenueCenterForm
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}
        onSubmit={editing ? handleUpdate : handleCreate}
        editingCenter={editing}
      />
    </div>
  );
}
