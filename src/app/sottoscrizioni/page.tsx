"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
import { SubscriptionForm } from "@/components/sottoscrizioni/SubscriptionForm";
import { MobileHeader } from "@/components/MobileHeader";
import { Plus, Edit2, Trash2, Search, Download, Link as LinkIcon, ArrowUp, ArrowDown, ArrowUpDown, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { generateOccurrences } from "@/lib/utils/subscriptions";
import type { Subscription, Contact, Service } from "@/types";

type SortKey = "client" | "service" | "startDate" | "endDate" | "amount" | "occurrences";
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

export default function SottoscrizioniPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("client");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);

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
      const [subsRes, contactsRes, svcRes] = await Promise.all([
        fetch("/api/subscriptions"),
        fetch("/api/contacts"),
        fetch("/api/services"),
      ]);
      if (subsRes.ok) setSubscriptions(await subsRes.json());
      if (contactsRes.ok) setContacts(await contactsRes.json());
      if (svcRes.ok) setServices(await svcRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Per ogni subscription calcola: importo effettivo + numero occorrenze
  const enriched = useMemo(() => {
    return subscriptions.map((s) => {
      const svc = s.service;
      const effectiveAmount = s.customAmount ?? (svc?.defaultAmount ?? 0);
      let occurrencesCount = 0;
      if (svc) {
        const occ = generateOccurrences({
          type: svc.type,
          startDate: s.startDate,
          endDate: s.endDate,
          amount: effectiveAmount,
          intervalMonths: s.customIntervalMonths ?? (svc.defaultIntervalMonths ?? 1),
          firstPct: s.customFirstPct ?? (svc.defaultFirstPct ?? 50),
          offsetDays: s.customOffsetDays ?? (svc.defaultOffsetDays ?? 60),
        });
        occurrencesCount = occ.length;
      }
      return { ...s, effectiveAmount, occurrencesCount };
    });
  }, [subscriptions]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = enriched.filter((sub) => {
      if (!s) return true;
      const clientName = sub.contact?.name?.toLowerCase() || "";
      const serviceName = sub.service?.name?.toLowerCase() || "";
      return clientName.includes(s) || serviceName.includes(s);
    });

    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "client": return compareStrings(a.contact?.name, b.contact?.name, sortDir);
        case "service": return compareStrings(a.service?.name, b.service?.name, sortDir);
        case "startDate": return compareStrings(a.startDate, b.startDate, sortDir);
        case "endDate": return compareStrings(a.endDate, b.endDate, sortDir);
        case "amount": return compareNumbers(a.effectiveAmount, b.effectiveAmount, sortDir);
        case "occurrences": return compareNumbers(a.occurrencesCount, b.occurrencesCount, sortDir);
        default: return 0;
      }
    });
  }, [enriched, search, sortKey, sortDir]);

  const handleCreate = async (data: Partial<Subscription>) => {
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Errore");
      throw new Error(err.error);
    }
    toast.success("Sottoscrizione creata");
    await fetchData();
  };

  const handleUpdate = async (data: Partial<Subscription>) => {
    if (!editing) return;
    const res = await fetch(`/api/subscriptions/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Errore");
      throw new Error(err.error);
    }
    toast.success("Sottoscrizione aggiornata");
    setEditing(null);
    await fetchData();
  };

  const handleDelete = async (sub: Subscription) => {
    if (!confirm(`Eliminare la sottoscrizione "${sub.contact?.name} → ${sub.service?.name}"?`)) return;
    const res = await fetch(`/api/subscriptions/${sub.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Errore eliminazione"); return; }
    toast.success("Sottoscrizione eliminata");
    await fetchData();
  };

  const runMigrate = async (clear: boolean) => {
    const confirmMsg = clear
      ? "ATTENZIONE: cancellerò tutte le sottoscrizioni esistenti (anche quelle aggiunte a mano) e le ricreerò dagli incassi previsti.\n\nProcedo?"
      : "Migra tutti gli incassi previsti esistenti in sottoscrizioni cliente×servizio.\n\nÈ idempotente. I clienti senza match in anagrafica e i centri di ricavo senza servizio mappato verranno saltati e segnalati. Procedo?";
    if (!confirm(confirmMsg)) return;
    setMigrating(true);
    try {
      const url = clear
        ? "/api/subscriptions/migrate-from-expected-incomes?clear=1"
        : "/api/subscriptions/migrate-from-expected-incomes";
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const { summary } = data;
      const clearedNote = clear ? `Cancellate ${summary.cleared} sottoscrizioni precedenti. ` : "";
      let msg = `${clearedNote}Migrate ${summary.created} sottoscrizioni su ${summary.total} incassi previsti (${summary.skippedExisting} già presenti).`;
      if (summary.skippedNoContact?.length) {
        msg += ` Senza contact: ${summary.skippedNoContact.length}.`;
      }
      if (summary.skippedNoService?.length) {
        msg += ` Senza servizio mappato: ${summary.skippedNoService.length}.`;
      }
      toast.success(msg, { duration: 12000 });
      if (summary.skippedNoContact?.length || summary.skippedNoService?.length) {
        console.log("Skipped no contact:", summary.skippedNoContact);
        console.log("Skipped no service:", summary.skippedNoService);
      }
      await fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setMigrating(false);
    }
  };

  const handleMigrate = () => runMigrate(false);
  const handleResetAndMigrate = () => runMigrate(true);

  const renderInterval = (sub: Subscription & { effectiveAmount: number }) => {
    const svc = sub.service;
    if (!svc) return "—";
    if (svc.type === "recurring") {
      const m = sub.customIntervalMonths ?? svc.defaultIntervalMonths ?? 1;
      const labels: Record<number, string> = { 1: "Mensile", 3: "Trim.", 6: "Sem.", 12: "Annuale" };
      return labels[m] || `Ogni ${m}m`;
    }
    const pct = sub.customFirstPct ?? svc.defaultFirstPct ?? 50;
    const days = sub.customOffsetDays ?? svc.defaultOffsetDays ?? 60;
    return `${pct}/${100 - pct} a ${days}gg`;
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <MobileHeader title="Sottoscrizioni" />
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Caricamento sottoscrizioni...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <MobileHeader title="Sottoscrizioni" />

      <div className="p-3 sm:p-4 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">Sottoscrizioni</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Cliente × servizio del catalogo. Generano automaticamente le occorrenze nel ledger Movimenti.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMigrate}
              disabled={migrating}
              className="text-xs"
              title="Importa gli incassi previsti come sottoscrizioni (idempotente, salta i duplicati)"
            >
              <Download className="h-4 w-4 mr-1.5" />
              {migrating ? "Migro..." : "Migra incassi previsti"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAndMigrate}
              disabled={migrating}
              className="text-xs text-orange-600 border-orange-600/40 hover:bg-orange-500/10"
              title="Cancella tutte le sottoscrizioni e le ricrea da zero"
            >
              <RefreshCcw className="h-4 w-4 mr-1.5" />
              Pulisci e re-importa
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }} className="text-xs">
              <Plus className="h-4 w-4 mr-1.5" />
              Nuova
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per cliente o servizio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {subscriptions.length === 0 ? (
                <>
                  <LinkIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium mb-1">Nessuna sottoscrizione</p>
                  <p className="text-sm mb-4">
                    Premi <strong>Migra incassi previsti</strong> per importare gli incassi
                    già censiti come sottoscrizioni cliente×servizio, o crea una nuova manualmente.
                  </p>
                </>
              ) : (
                <p className="text-sm">Nessuna sottoscrizione corrisponde alla ricerca.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y">
              {filtered.map((sub) => (
                <div key={sub.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{sub.contact?.name || "?"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{sub.service?.name || "?"}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs px-1.5 py-0">{renderInterval(sub)}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(sub.startDate)}{sub.endDate ? ` → ${formatDate(sub.endDate)}` : ""}</span>
                        <span className="text-xs font-mono font-medium">{formatCurrency(sub.effectiveAmount || 0)}</span>
                        <span className="text-xs text-muted-foreground">· {sub.occurrencesCount || 0} occ.</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(sub); setFormOpen(true); }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(sub)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("client")}>
                      <span className="inline-flex items-center gap-1">Cliente <SortIcon col="client" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("service")}>
                      <span className="inline-flex items-center gap-1">Servizio <SortIcon col="service" /></span>
                    </TableHead>
                    <TableHead>Schema</TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("startDate")}>
                      <span className="inline-flex items-center gap-1">Inizio <SortIcon col="startDate" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("endDate")}>
                      <span className="inline-flex items-center gap-1">Fine <SortIcon col="endDate" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("amount")}>
                      <span className="inline-flex items-center gap-1">Importo <span className="text-[10px] font-normal text-muted-foreground">(IVA incl.)</span> <SortIcon col="amount" /></span>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("occurrences")}>
                      <span className="inline-flex items-center gap-1">Occorrenze <SortIcon col="occurrences" /></span>
                    </TableHead>
                    <TableHead className="text-right w-[100px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.contact?.name || "—"}</TableCell>
                      <TableCell>
                        <div>
                          {sub.service?.name || "—"}
                          {sub.service?.revenueCenterId && (
                            <p className="text-xs text-muted-foreground mt-0.5">{(sub as Subscription & { revenueCenter?: { name: string } }).revenueCenter?.name || ""}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{renderInterval(sub)}</TableCell>
                      <TableCell className="text-sm">{formatDate(sub.startDate)}</TableCell>
                      <TableCell className="text-sm">{sub.endDate ? formatDate(sub.endDate) : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(sub.effectiveAmount || 0)}</TableCell>
                      <TableCell className="text-center text-sm">{sub.occurrencesCount || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(sub); setFormOpen(true); }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(sub)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <CardHeader className="border-t p-3">
              <CardTitle className="text-xs text-muted-foreground font-normal">
                {filtered.length} sottoscrizion{filtered.length === 1 ? "e" : "i"} su {subscriptions.length} totali
              </CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>

      <SubscriptionForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}
        onSubmit={editing ? handleUpdate : handleCreate}
        editing={editing}
        contacts={contacts}
        services={services}
      />
    </div>
  );
}
