"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ServiceForm } from "@/components/servizi/ServiceForm";
import { MobileHeader } from "@/components/MobileHeader";
import { Plus, Edit2, Trash2, Search, Download, Repeat, Layers, Package, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/currency";
import type { Service, ServiceType, RevenueCenter } from "@/types";

const TYPE_LABELS: Record<ServiceType, string> = {
  recurring: "Ricorrente",
  installments: "Acconto+Saldo",
};

const TYPE_COLORS: Record<ServiceType, string> = {
  recurring: "bg-blue-500/15 text-blue-500 border-blue-500/40",
  installments: "bg-purple-500/15 text-purple-500 border-purple-500/40",
};

const TYPE_ICONS: Record<ServiceType, React.ComponentType<{ className?: string }>> = {
  recurring: Repeat,
  installments: Layers,
};

const INTERVAL_LABELS: Record<number, string> = {
  1: "Mensile",
  3: "Trimestrale",
  6: "Semestrale",
  12: "Annuale",
};

type TypeFilter = "all" | ServiceType;
type SortKey = "name" | "type" | "revenueCenter" | "amount" | "interval";
type SortDir = "asc" | "desc";

function compareStrings(a: string | null | undefined, b: string | null | undefined, dir: SortDir): number {
  const va = (a ?? "").toLowerCase();
  const vb = (b ?? "").toLowerCase();
  if (va === vb) return 0;
  if (va === "") return 1;
  if (vb === "") return -1;
  const cmp = va.localeCompare(vb, "it");
  return dir === "asc" ? cmp : -cmp;
}

function compareNumbers(a: number | null | undefined, b: number | null | undefined, dir: SortDir): number {
  const va = a ?? 0;
  const vb = b ?? 0;
  if (va === vb) return 0;
  return dir === "asc" ? va - vb : vb - va;
}

export default function ServiziPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [revenueCenters, setRevenueCenters] = useState<RevenueCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("type");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

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
      const [svcRes, rcRes] = await Promise.all([
        fetch("/api/services"),
        fetch("/api/revenue-centers?year=2026"),
      ]);
      if (svcRes.ok) setServices(await svcRes.json());
      if (rcRes.ok) setRevenueCenters(await rcRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const counts = useMemo(() => ({
    all: services.length,
    recurring: services.filter((s) => s.type === "recurring").length,
    installments: services.filter((s) => s.type === "installments").length,
  }), [services]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = services.filter((svc) => {
      if (filter !== "all" && svc.type !== filter) return false;
      if (s && !svc.name.toLowerCase().includes(s)) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "name": return compareStrings(a.name, b.name, sortDir);
        case "type": {
          const cmp = compareStrings(a.type, b.type, sortDir);
          return cmp !== 0 ? cmp : compareStrings(a.name, b.name, "asc");
        }
        case "revenueCenter": return compareStrings(a.revenueCenter?.name, b.revenueCenter?.name, sortDir);
        case "amount": return compareNumbers(a.defaultAmount, b.defaultAmount, sortDir);
        case "interval": return compareNumbers(
          a.type === "recurring" ? a.defaultIntervalMonths : a.defaultOffsetDays,
          b.type === "recurring" ? b.defaultIntervalMonths : b.defaultOffsetDays,
          sortDir,
        );
        default: return 0;
      }
    });
  }, [services, filter, search, sortKey, sortDir]);

  const handleCreate = async (data: Partial<Service>) => {
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Errore creazione");
      throw new Error(err.error);
    }
    toast.success("Servizio creato");
    await fetchData();
  };

  const handleUpdate = async (data: Partial<Service>) => {
    if (!editing) return;
    const res = await fetch(`/api/services/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Errore aggiornamento");
      throw new Error(err.error);
    }
    toast.success("Servizio aggiornato");
    setEditing(null);
    await fetchData();
  };

  const handleDelete = async (svc: Service) => {
    if (!confirm(`Eliminare il servizio "${svc.name}"?`)) return;
    const res = await fetch(`/api/services/${svc.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Errore eliminazione"); return; }
    toast.success("Servizio eliminato");
    await fetchData();
  };

  const handleSeed = async () => {
    if (!confirm("Crea il catalogo iniziale di servizi (Marketing mensile/trimestrale, Pacchetto Assistenza, Dominio annuale, Sito Web 50/50, MSD pacchetto)?\n\nÈ idempotente: i servizi già presenti non vengono duplicati.")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/services/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const { summary } = data;
      const deprecatedNote = summary.deprecated > 0 ? `Deprecati ${summary.deprecated} servizi generici. ` : "";
      let msg = `${deprecatedNote}Creati ${summary.created} servizi (${summary.skippedExisting} già presenti).`;
      if (summary.missingRevenueCenter?.length) {
        msg += ` Centri di ricavo mancanti per: ${summary.missingRevenueCenter.join(", ")}.`;
      }
      toast.success(msg, { duration: 8000 });
      await fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSeeding(false);
    }
  };

  const renderInterval = (svc: Service) => {
    if (svc.type === "recurring") {
      const m = svc.defaultIntervalMonths || 1;
      return INTERVAL_LABELS[m] || `Ogni ${m} mesi`;
    }
    return `${svc.defaultFirstPct || 50}/${100 - (svc.defaultFirstPct || 50)} a ${svc.defaultOffsetDays || 60}gg`;
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <MobileHeader title="Catalogo Servizi" />
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Caricamento catalogo...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <MobileHeader title="Catalogo Servizi" />

      <div className="p-3 sm:p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">Catalogo Servizi</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Pacchetti standard che vendi: vengono usati per generare le sottoscrizioni cliente×servizio.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding} className="text-xs">
              <Download className="h-4 w-4 mr-1.5" />
              {seeding ? "Creo..." : "Catalogo iniziale"}
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }} className="text-xs">
              <Plus className="h-4 w-4 mr-1.5" />
              Nuovo
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as TypeFilter)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="all" className="text-xs">Tutti ({counts.all})</TabsTrigger>
            <TabsTrigger value="recurring" className="text-xs">Ricorrenti ({counts.recurring})</TabsTrigger>
            <TabsTrigger value="installments" className="text-xs">Acconto+Saldo ({counts.installments})</TabsTrigger>
          </TabsList>
        </Tabs>

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
              {services.length === 0 ? (
                <>
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium mb-1">Catalogo vuoto</p>
                  <p className="text-sm mb-4">
                    Premi <strong>Catalogo iniziale</strong> per creare i pacchetti standard
                    (Marketing, Sito Web, MSD, Dominio, Assistenza), oppure aggiungi un servizio a mano.
                  </p>
                </>
              ) : (
                <p className="text-sm">Nessun servizio corrisponde ai filtri.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            {/* Mobile: cards */}
            <div className="sm:hidden divide-y">
              {filtered.map((svc) => {
                const Icon = TYPE_ICONS[svc.type];
                return (
                  <div key={svc.id} className="p-3 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <Icon className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{svc.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className={`text-xs px-1.5 py-0 ${TYPE_COLORS[svc.type]}`}>
                            {TYPE_LABELS[svc.type]}
                          </Badge>
                          {svc.revenueCenter && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: svc.revenueCenter.color || "#6b7280" }} />
                              {svc.revenueCenter.name}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{renderInterval(svc)}</span>
                          {(svc.defaultAmount ?? 0) > 0 && (
                            <span className="text-xs text-foreground font-medium">{formatCurrency(svc.defaultAmount!)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(svc); setFormOpen(true); }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(svc)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("name")}>
                      <span className="inline-flex items-center gap-1">Nome <SortIcon col="name" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("type")}>
                      <span className="inline-flex items-center gap-1">Tipo <SortIcon col="type" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("revenueCenter")}>
                      <span className="inline-flex items-center gap-1">Centro di ricavo <SortIcon col="revenueCenter" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("interval")}>
                      <span className="inline-flex items-center gap-1">Intervallo / Schema <SortIcon col="interval" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("amount")}>
                      <span className="inline-flex items-center gap-1">Importo standard <span className="text-[10px] text-muted-foreground font-normal">(IVA incl.)</span> <SortIcon col="amount" /></span>
                    </TableHead>
                    <TableHead className="text-right w-[100px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((svc) => {
                    const Icon = TYPE_ICONS[svc.type];
                    return (
                      <TableRow key={svc.id}>
                        <TableCell><Icon className="h-4 w-4 text-muted-foreground" /></TableCell>
                        <TableCell className="font-medium">
                          {svc.name}
                          {svc.description && <p className="text-xs text-muted-foreground font-normal mt-0.5">{svc.description}</p>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={TYPE_COLORS[svc.type]}>{TYPE_LABELS[svc.type]}</Badge>
                        </TableCell>
                        <TableCell>
                          {svc.revenueCenter ? (
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: svc.revenueCenter.color || "#6b7280" }} />
                              <span className="text-sm">{svc.revenueCenter.name}</span>
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">{renderInterval(svc)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {(svc.defaultAmount ?? 0) > 0 ? formatCurrency(svc.defaultAmount!) : <span className="text-muted-foreground">variabile</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(svc); setFormOpen(true); }}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(svc)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <CardHeader className="border-t p-3">
              <CardTitle className="text-xs text-muted-foreground font-normal">
                {filtered.length} serviz{filtered.length === 1 ? "io" : "i"} mostrat{filtered.length === 1 ? "o" : "i"} su {services.length} totali
              </CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>

      <ServiceForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}
        onSubmit={editing ? handleUpdate : handleCreate}
        editing={editing}
        revenueCenters={revenueCenters}
        defaultType={filter !== "all" ? filter : undefined}
      />
    </div>
  );
}
