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
import { ContactForm } from "@/components/anagrafica/ContactForm";
import { MobileHeader } from "@/components/MobileHeader";
import { Plus, Edit2, Trash2, Search, Download, Users, Building2, UserMinus, HelpCircle, RefreshCcw, UserCheck } from "lucide-react";
import { toast } from "sonner";
import type { Contact, ContactType, CostCenter } from "@/types";

const TYPE_LABELS: Record<ContactType, string> = {
  client: "Cliente",
  supplier: "Fornitore",
  ex_supplier: "Ex fornitore",
  other: "Altro",
};

const TYPE_COLORS: Record<ContactType, string> = {
  client: "bg-green-500/15 text-green-500 border-green-500/40",
  supplier: "bg-blue-500/15 text-blue-500 border-blue-500/40",
  ex_supplier: "bg-orange-500/15 text-orange-500 border-orange-500/40",
  other: "bg-gray-500/15 text-gray-500 border-gray-500/40",
};

const TYPE_ICONS: Record<ContactType, React.ComponentType<{ className?: string }>> = {
  client: Users,
  supplier: Building2,
  ex_supplier: UserMinus,
  other: HelpCircle,
};

type TypeFilter = "all" | ContactType;

export default function AnagraficaPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const [contactsRes, ccRes] = await Promise.all([
        fetch("/api/contacts"),
        fetch("/api/cost-centers?year=2026"),
      ]);
      if (contactsRes.ok) setContacts(await contactsRes.json());
      if (ccRes.ok) setCostCenters(await ccRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Conteggi per tipo (filtri tab)
  const counts = useMemo(() => {
    const c: Record<TypeFilter, number> = {
      all: contacts.length,
      client: 0,
      supplier: 0,
      ex_supplier: 0,
      other: 0,
    };
    for (const ct of contacts) c[ct.type]++;
    return c;
  }, [contacts]);

  // Filtrati per tab + search
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (filter !== "all" && c.type !== filter) return false;
      if (s && !c.name.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [contacts, filter, search]);

  const handleCreate = async (data: Partial<Contact>) => {
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Errore creazione contatto");
      throw new Error(err.error || "Errore");
    }
    toast.success("Contatto creato");
    await fetchContacts();
  };

  const handleUpdate = async (data: Partial<Contact>) => {
    if (!editing) return;
    const res = await fetch(`/api/contacts/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Errore aggiornamento contatto");
      throw new Error(err.error || "Errore");
    }
    toast.success("Contatto aggiornato");
    setEditing(null);
    await fetchContacts();
  };

  const handleDelete = async (contact: Contact) => {
    if (!confirm(`Eliminare il contatto "${contact.name}"?`)) return;
    const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Errore eliminazione");
      return;
    }
    toast.success("Contatto eliminato");
    await fetchContacts();
  };

  const handleToggleSupplierStatus = async (contact: Contact) => {
    const newType: ContactType =
      contact.type === "supplier" ? "ex_supplier" : "supplier";
    const newLabel = newType === "ex_supplier" ? "Ex Fornitore" : "Fornitore";
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: newType }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Errore aggiornamento");
      return;
    }
    toast.success(`"${contact.name}" spostato in ${newLabel}`);
    await fetchContacts();
  };

  const runSeed = async (clear: boolean) => {
    const confirmMsg = clear
      ? "ATTENZIONE: cancellerò tutti i contatti esistenti (anche quelli aggiunti a mano) e li ricreerò dai dati di clienti, fornitori e creditori esistenti.\n\nProcedo?"
      : "Importerò clienti, fornitori e creditori dagli incassi previsti, spese previste e piani di rientro esistenti.\n\nÈ idempotente: i contatti già presenti non verranno duplicati. Procedo?";

    if (!confirm(confirmMsg)) return;

    setSeeding(true);
    try {
      const url = clear
        ? "/api/contacts/seed-from-existing?clear=1"
        : "/api/contacts/seed-from-existing";
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const { summary } = data;
      const total =
        summary.created.client +
        summary.created.supplier +
        summary.created.ex_supplier +
        summary.created.other;
      const clearedNote = clear
        ? `Cancellati: ${summary.cleared.contacts} contatti precedenti, ${summary.cleared.paymentPlansUnlinked} pdr e ${summary.cleared.expectedExpensesUnlinked} spese unlinked. `
        : "";
      toast.success(
        `${clearedNote}Importati ${total} contatti (${summary.created.client} clienti, ${summary.created.supplier} fornitori, ${summary.created.ex_supplier} ex-fornitori). ` +
          `${summary.skippedExisting} già presenti. Linkati: ${summary.paymentPlansLinked} pdr, ${summary.expectedExpensesLinked} spese.`,
        { duration: 10000 },
      );
      await fetchContacts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSeeding(false);
    }
  };

  const handleSeed = () => runSeed(false);
  const handleResetAndReseed = () => runSeed(true);

  if (loading) {
    return (
      <div className="min-h-screen">
        <MobileHeader title="Anagrafica" />
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Caricamento anagrafica...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <MobileHeader title="Anagrafica" />

      <div className="p-3 sm:p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
              Anagrafica
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Clienti, fornitori, ex-fornitori e altri contatti.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={seeding}
              className="text-xs"
              title="Aggiunge i contatti mancanti dai dati esistenti (idempotente)"
            >
              <Download className="h-4 w-4 mr-1.5" />
              {seeding ? "Importo..." : "Importa esistenti"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAndReseed}
              disabled={seeding}
              className="text-xs text-orange-600 border-orange-600/40 hover:bg-orange-500/10"
              title="Cancella tutti i contatti e li reimporta da zero (utile per applicare normalizzazioni nuove)"
            >
              <RefreshCcw className="h-4 w-4 mr-1.5" />
              Pulisci e re-importa
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }} className="text-xs">
              <Plus className="h-4 w-4 mr-1.5" />
              Nuovo
            </Button>
          </div>
        </div>

        {/* Tabs filtro tipo */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as TypeFilter)}>
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="all" className="text-xs">Tutti ({counts.all})</TabsTrigger>
            <TabsTrigger value="client" className="text-xs">Clienti ({counts.client})</TabsTrigger>
            <TabsTrigger value="supplier" className="text-xs">Fornitori ({counts.supplier})</TabsTrigger>
            <TabsTrigger value="ex_supplier" className="text-xs">Ex ({counts.ex_supplier})</TabsTrigger>
            <TabsTrigger value="other" className="text-xs">Altri ({counts.other})</TabsTrigger>
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
              {contacts.length === 0 ? (
                <>
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium mb-1">Anagrafica vuota</p>
                  <p className="text-sm mb-4">
                    Premi <strong>Importa esistenti</strong> per popolarla con i clienti già censiti
                    negli incassi previsti, oppure aggiungi un contatto a mano.
                  </p>
                </>
              ) : (
                <p className="text-sm">Nessun contatto corrisponde ai filtri.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            {/* Mobile: cards */}
            <div className="sm:hidden divide-y">
              {filtered.map((c) => {
                const Icon = TYPE_ICONS[c.type];
                return (
                  <div key={c.id} className="p-3 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <Icon className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{c.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className={`text-xs px-1.5 py-0 ${TYPE_COLORS[c.type]}`}>
                            {TYPE_LABELS[c.type]}
                          </Badge>
                          {c.costCenter && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: c.costCenter.color || "#6b7280" }}
                              />
                              {c.costCenter.name}
                            </span>
                          )}
                          {(c.type === "supplier" || c.type === "ex_supplier") && c.isMovable === false && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0 bg-red-500/10 text-red-500 border-red-500/40">
                              date fisse
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {c.type === "supplier" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-orange-500"
                          title="Sposta in Ex Fornitori"
                          onClick={() => handleToggleSupplierStatus(c)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                      {c.type === "ex_supplier" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-500"
                          title="Riporta tra Fornitori attivi"
                          onClick={() => handleToggleSupplierStatus(c)}
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setEditing(c); setFormOpen(true); }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => handleDelete(c)}
                      >
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Centro di costo</TableHead>
                    <TableHead>Spostabile</TableHead>
                    <TableHead>Email / Telefono</TableHead>
                    <TableHead className="text-right w-[100px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => {
                    const Icon = TYPE_ICONS[c.type];
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={TYPE_COLORS[c.type]}>
                            {TYPE_LABELS[c.type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {c.costCenter ? (
                            <div className="flex items-center gap-1">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: c.costCenter.color || "#6b7280" }}
                              />
                              <span className="text-sm">{c.costCenter.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.type === "supplier" || c.type === "ex_supplier" ? (
                            c.isMovable === false ? (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/40">
                                no
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/40">
                                sì
                              </Badge>
                            )
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.email || c.phone ? (
                            <div className="space-y-0.5">
                              {c.email && <div>{c.email}</div>}
                              {c.phone && <div>{c.phone}</div>}
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {c.type === "supplier" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-orange-500"
                                title="Sposta in Ex Fornitori"
                                onClick={() => handleToggleSupplierStatus(c)}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            )}
                            {c.type === "ex_supplier" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-500"
                                title="Riporta tra Fornitori attivi"
                                onClick={() => handleToggleSupplierStatus(c)}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => { setEditing(c); setFormOpen(true); }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={() => handleDelete(c)}
                            >
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

            {/* Footer count */}
            <CardHeader className="border-t p-3">
              <CardTitle className="text-xs text-muted-foreground font-normal">
                {filtered.length} contatt{filtered.length === 1 ? "o" : "i"} mostrat{filtered.length === 1 ? "o" : "i"} su {contacts.length} totali
              </CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>

      {/* Form */}
      <ContactForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        onSubmit={editing ? handleUpdate : handleCreate}
        editing={editing}
        costCenters={costCenters}
        defaultType={filter !== "all" ? filter : undefined}
      />
    </div>
  );
}
