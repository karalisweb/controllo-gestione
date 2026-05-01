"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { CheckCircle2, ChevronDown, ChevronRight, CornerDownRight, Loader2, Split as SplitIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { centsToEuros, eurosToCents, formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";

interface Contact {
  id: number;
  name: string;
  type: "client" | "supplier" | "ex_supplier" | "other";
  costCenterId?: number | null;
  revenueCenterId?: number | null;
}
interface Center {
  id: number;
  name: string;
}

export interface SplitDetailData {
  iva: number; alessio: number; daniela: number; agency: number;
}

export interface MovementRowData {
  id: string;
  sourceId: number;
  date: string;
  description: string;
  amount: number;
  runningBalance: number;
  status: "planned" | "realized";
  categoryName?: string | null;
  contactId?: number | null;
  contactName?: string | null;
  costCenterId?: number | null;
  revenueCenterId?: number | null;
  isSplit?: boolean;
  isTransfer?: boolean;
  linkedTransactionId?: number | null;
  splitDetail?: SplitDetailData | null;
}

type EditField = "date" | "description" | "contact" | "center" | "amount" | null;

interface Props {
  row: MovementRowData;
  isToday: boolean;
  isPast?: boolean;
  contacts: Contact[];
  costCenters: Center[];
  revenueCenters: Center[];
  onSaved: () => void;
  onContactCreated: (contact: Contact) => void;
  onCenterCreated: (center: Center, type: "expense" | "income") => void;
}

export function TransactionEditableRow({
  row,
  isToday,
  isPast = false,
  contacts,
  costCenters,
  revenueCenters,
  onSaved,
  onContactCreated,
  onCenterCreated,
}: Props) {
  const [editingField, setEditingField] = useState<EditField>(null);
  const [localValue, setLocalValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isExpense = row.amount < 0;
  const contactCandidates = isExpense
    ? contacts.filter((c) => c.type === "supplier" || c.type === "ex_supplier")
    : contacts.filter((c) => c.type === "client");
  const centerCandidates = isExpense ? costCenters : revenueCenters;
  const currentCenterName = row.categoryName || "";

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.type !== "date") {
        inputRef.current.select();
      }
    }
  }, [editingField]);

  const startEdit = (field: NonNullable<EditField>, initial: string) => {
    if (saving) return;
    setLocalValue(initial);
    setEditingField(field);
  };

  const cancel = () => {
    setEditingField(null);
    setLocalValue("");
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  const ensureContactId = async (name: string): Promise<number | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = contactCandidates.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing.id;
    const expectedType = isExpense ? "supplier" : "client";
    const r = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, type: expectedType }),
    });
    if (r.ok) {
      const created = await r.json();
      onContactCreated({ ...created, type: expectedType });
      return created.id;
    } else if (r.status === 409) {
      const data = await r.json().catch(() => ({}));
      return data?.existingId ?? null;
    }
    throw new Error(`Errore creazione contatto: HTTP ${r.status}`);
  };

  const ensureCenterId = async (name: string): Promise<number | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = centerCandidates.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing.id;
    const url = isExpense ? "/api/cost-centers" : "/api/revenue-centers";
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!r.ok) throw new Error(`Errore creazione centro: HTTP ${r.status}`);
    const created = await r.json();
    onCenterCreated({ id: created.id, name: trimmed }, isExpense ? "expense" : "income");
    return created.id;
  };

  const commit = async () => {
    if (saving) return;
    const field = editingField;
    if (!field) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (field === "date") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(localValue) || localValue === row.date) {
          cancel();
          setSaving(false);
          return;
        }
        payload.date = localValue;
      } else if (field === "description") {
        if (localValue === row.description) {
          cancel();
          setSaving(false);
          return;
        }
        payload.description = localValue;
      } else if (field === "contact") {
        const id = await ensureContactId(localValue);
        if (id === row.contactId) {
          cancel();
          setSaving(false);
          return;
        }
        payload.contactId = id;
      } else if (field === "center") {
        const id = await ensureCenterId(localValue);
        const currentId = isExpense ? row.costCenterId : row.revenueCenterId;
        if (id === currentId) {
          cancel();
          setSaving(false);
          return;
        }
        if (isExpense) payload.costCenterId = id;
        else payload.revenueCenterId = id;
      } else if (field === "amount") {
        const parsed = parseFloat(localValue.replace(",", "."));
        if (!Number.isFinite(parsed) || parsed <= 0) {
          cancel();
          setSaving(false);
          return;
        }
        const newCents = eurosToCents(parsed) * (isExpense ? -1 : 1);
        if (newCents === row.amount) {
          cancel();
          setSaving(false);
          return;
        }
        payload.amount = newCents;
      }

      if (Object.keys(payload).length === 0) {
        cancel();
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/transactions/${row.sourceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      toast.success("Salvato");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore salvataggio");
    } finally {
      setSaving(false);
      setEditingField(null);
    }
  };

  const cellButton = (label: string, onClick: () => void, extraClass = "") => (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className={`px-1 py-0.5 rounded hover:bg-muted/50 transition-colors disabled:opacity-50 ${extraClass}`}
    >
      {label}
    </button>
  );

  const datalistContactsId = `contacts-edit-${isExpense ? "exp" : "inc"}`;
  const datalistCentersId = `centers-edit-${isExpense ? "exp" : "inc"}`;

  const canSplit = !isExpense && !row.isSplit && !row.isTransfer;

  const handleDelete = async () => {
    if (saving) return;
    let msg = `Eliminare la riga "${row.description}"?`;
    if (row.isSplit) {
      msg += "\n\n⚠️ Questa è splittata: le 3 righe IVA/Alessio/Daniela resteranno (eliminale singolarmente se vuoi rimuoverle).";
    } else if (row.isTransfer) {
      msg += "\n\n(È una riga generata da split di un incasso. L'incasso padre resta.)";
    }
    if (!confirm(msg)) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/transactions/${row.sourceId}`, { method: "DELETE" });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      toast.success("Riga eliminata");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore eliminazione");
    } finally {
      setSaving(false);
    }
  };

  const handleSplit = async (noVat = false) => {
    if (saving) return;
    const promptMsg = noVat
      ? "Split senza IVA (fattura estera/reverse charge): genera la riga Bonifico soci con solo Alessio + Daniela. Procedere?"
      : "Generare la riga Bonifico soci+IVA dall'incasso?";
    if (!confirm(promptMsg)) return;
    setSaving(true);
    try {
      const r = await fetch("/api/splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: row.sourceId, noVat }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      toast.success(noVat ? "Split no-IVA generato" : "Split generato");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore split");
    } finally {
      setSaving(false);
    }
  };

  const handleUnsplit = async () => {
    if (saving) return;
    if (!confirm("Annullare lo split? Le 3 righe IVA/Alessio/Daniela verranno rimosse e l'incasso tornerà non splittato.")) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/splits?transactionId=${row.sourceId}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      toast.success("Split annullato");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore annullamento split");
    } finally {
      setSaving(false);
    }
  };

  const isChild = !!row.isTransfer; // vecchio modello (3 righe). Manteniamo retro-compat.
  const hasSplitDetail = !!row.splitDetail; // nuovo modello (1 riga + spaccato)
  const rowClass = [
    isToday ? "bg-primary/5" : "",
    isChild ? "bg-muted/20" : "",
    isPast && !isToday ? "opacity-50" : "",
  ].filter(Boolean).join(" ");

  return (
    <>
    <TableRow className={rowClass} data-today={isToday ? "true" : undefined}>
      <TableCell className={isChild ? "pl-6" : ""}>
        <div className="flex items-center gap-1">
          {isChild && <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          {hasSplitDetail && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              title="Espandi spaccato (IVA/Alessio/Daniela)"
              className="p-0.5 rounded hover:bg-muted text-muted-foreground transition-colors"
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          )}
          <CheckCircle2
            className={`h-4 w-4 shrink-0 ${isExpense ? "text-red-500" : "text-green-500"} ${isChild ? "opacity-60" : ""}`}
          />
          {canSplit && (
            <>
              <button
                type="button"
                onClick={() => handleSplit(false)}
                disabled={saving}
                title="Split standard: scorpora IVA + quote soci"
                className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-0.5"
              >
                <SplitIcon className="h-2.5 w-2.5" />
                Split
              </button>
              <button
                type="button"
                onClick={() => handleSplit(true)}
                disabled={saving}
                title="Split senza IVA (fatture estere/reverse charge): solo Alessio + Daniela sul lordo"
                className="px-1.5 py-0.5 text-[10px] rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
              >
                no-IVA
              </button>
            </>
          )}
          {row.isSplit && (
            <button
              type="button"
              onClick={handleUnsplit}
              disabled={saving}
              title="Annulla split (rimuove le 3 righe figlie)"
              className="px-1.5 py-0.5 text-[10px] rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors disabled:opacity-50 flex items-center gap-0.5"
            >
              <SplitIcon className="h-2.5 w-2.5" />
              Annulla split
            </button>
          )}
          {row.isTransfer && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-muted text-muted-foreground border-border" title="Riga generata da split di un incasso">
              da split
            </Badge>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            title="Elimina riga"
            className="ml-auto p-1 rounded hover:bg-red-500/10 text-red-500/70 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </TableCell>

      {/* Data */}
      <TableCell className="text-sm">
        {editingField === "date" ? (
          <input
            ref={inputRef}
            type="date"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKey}
            onBlur={commit}
            disabled={saving}
            className="h-7 px-1 text-xs rounded border border-primary/60 bg-background outline-none w-full"
          />
        ) : (
          cellButton(formatDate(row.date), () => startEdit("date", row.date), "text-left")
        )}
      </TableCell>

      {/* Descrizione */}
      <TableCell className="font-medium text-sm">
        {editingField === "description" ? (
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKey}
            onBlur={commit}
            disabled={saving}
            className="h-7 px-1 text-xs rounded border border-primary/60 bg-background outline-none w-full"
          />
        ) : (
          cellButton(
            row.description,
            () => startEdit("description", row.description),
            "text-left w-full block truncate",
          )
        )}
      </TableCell>

      {/* Contatto */}
      <TableCell className="text-sm text-muted-foreground">
        {editingField === "contact" ? (
          <>
            <input
              ref={inputRef}
              type="text"
              list={datalistContactsId}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onKeyDown={handleKey}
              onBlur={commit}
              disabled={saving}
              placeholder={isExpense ? "Fornitore" : "Cliente"}
              className="h-7 px-1 text-xs rounded border border-primary/60 bg-background outline-none w-full"
            />
            <datalist id={datalistContactsId}>
              {contactCandidates.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </>
        ) : (
          cellButton(
            row.contactName || "—",
            () => startEdit("contact", row.contactName || ""),
            "text-left w-full block truncate",
          )
        )}
      </TableCell>

      {/* Centro (Categoria) */}
      <TableCell className="text-sm text-muted-foreground">
        {editingField === "center" ? (
          <>
            <input
              ref={inputRef}
              type="text"
              list={datalistCentersId}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onKeyDown={handleKey}
              onBlur={commit}
              disabled={saving}
              placeholder={isExpense ? "Centro costo" : "Centro ricavo"}
              className="h-7 px-1 text-xs rounded border border-primary/60 bg-background outline-none w-full"
            />
            <datalist id={datalistCentersId}>
              {centerCandidates.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </>
        ) : (
          cellButton(
            currentCenterName || "—",
            () => startEdit("center", currentCenterName),
            "text-left w-full block truncate",
          )
        )}
      </TableCell>

      {/* Stato (read-only) */}
      <TableCell className="text-center">
        <Badge
          variant="outline"
          className="text-xs px-1.5 py-0 bg-green-500/10 text-green-500 border-green-500/40"
        >
          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
          pagato
        </Badge>
      </TableCell>

      {/* Importo */}
      <TableCell
        className={`text-right font-mono ${isExpense ? "text-red-500" : "text-green-500"}`}
      >
        {editingField === "amount" ? (
          <input
            ref={inputRef}
            type="number"
            step="0.01"
            min="0"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKey}
            onBlur={commit}
            disabled={saving}
            className="h-7 px-1 text-xs rounded border border-primary/60 bg-background outline-none w-24 text-right font-mono"
          />
        ) : (
          cellButton(
            `${row.amount >= 0 ? "+" : ""}${formatCurrency(row.amount)}`,
            () =>
              startEdit("amount", centsToEuros(Math.abs(row.amount)).toFixed(2)),
            "text-right font-mono w-full",
          )
        )}
        {saving && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
      </TableCell>

      {/* Saldo (read-only). Per le righe split (isTransfer) il saldo running NON cambia,
          quindi mostriamo "—" per evidenziare che la riga non incide sul saldo. */}
      <TableCell
        className={`text-right font-mono font-medium ${row.runningBalance >= 0 ? "text-foreground" : "text-red-500"}`}
      >
        {isChild ? <span className="text-muted-foreground/60">—</span> : formatCurrency(row.runningBalance)}
      </TableCell>
    </TableRow>

    {/* Riga espansa: spaccato split (IVA/Alessio/Daniela) — solo info, non incide su saldo */}
    {hasSplitDetail && expanded && row.splitDetail && (
      <TableRow className="bg-muted/30">
        <TableCell colSpan={8} className="py-2 px-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="text-muted-foreground italic">Spaccato:</span>
            <span className="flex items-center gap-1">
              <CornerDownRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">IVA</span>
              <span className="font-mono text-red-500">-{formatCurrency(row.splitDetail.iva)}</span>
            </span>
            <span className="flex items-center gap-1">
              <CornerDownRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Alessio</span>
              <span className="font-mono text-red-500">-{formatCurrency(row.splitDetail.alessio)}</span>
            </span>
            <span className="flex items-center gap-1">
              <CornerDownRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Daniela</span>
              <span className="font-mono text-red-500">-{formatCurrency(row.splitDetail.daniela)}</span>
            </span>
            <span className="ml-auto text-muted-foreground italic">
              Guadagno agenzia residuo: <span className="font-mono not-italic text-green-500">{formatCurrency(row.splitDetail.agency)}</span>
            </span>
          </div>
        </TableCell>
      </TableRow>
    )}
    </>
  );
}
