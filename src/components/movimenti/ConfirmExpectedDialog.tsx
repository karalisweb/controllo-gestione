"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { centsToEuros, eurosToCents } from "@/lib/utils/currency";

interface Contact {
  id: number;
  name: string;
  type: "client" | "supplier" | "ex_supplier" | "other";
  costCenterId?: number | null;
  revenueCenterId?: number | null;
}
interface Center { id: number; name: string }

export interface PreviewRow {
  type: "expected_expense" | "expected_income";
  sourceId: number;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // centesimi (negativo per uscita, positivo per entrata)
  categoryName?: string | null;
  autoSplit?: boolean; // se true e tipo income, applica split sulla tx creata
  autoSplitNoVat?: boolean; // se true, lo split alla conferma è senza IVA
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PreviewRow | null;
  contacts: Contact[];
  costCenters: Center[];
  revenueCenters: Center[];
  onConfirmed: () => void;
  onContactCreated: (c: Contact) => void;
  onCenterCreated: (c: Center, type: "expense" | "income") => void;
}

export function ConfirmExpectedDialog({
  open,
  onOpenChange,
  row,
  contacts,
  costCenters,
  revenueCenters,
  onConfirmed,
  onContactCreated,
  onCenterCreated,
}: Props) {
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [centerName, setCenterName] = useState("");
  const [contactName, setContactName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isExpense = row ? row.amount < 0 : false;

  useEffect(() => {
    if (row && open) {
      setDate(row.date);
      setAmount(centsToEuros(Math.abs(row.amount)).toFixed(2));
      setDescription(row.description);
      setCenterName(row.categoryName || "");
      setContactName("");
    }
  }, [row, open]);

  if (!row) return null;

  const contactCandidates = isExpense
    ? contacts.filter((c) => c.type === "supplier" || c.type === "ex_supplier")
    : contacts.filter((c) => c.type === "client");
  const centerCandidates = isExpense ? costCenters : revenueCenters;

  const ensureCenterId = async (): Promise<number | null> => {
    const trimmed = centerName.trim();
    if (!trimmed) return null;
    const existing = centerCandidates.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const url = isExpense ? "/api/cost-centers" : "/api/revenue-centers";
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const created = await r.json();
    onCenterCreated({ id: created.id, name: trimmed }, isExpense ? "expense" : "income");
    return created.id;
  };

  const ensureContactId = async (centerId: number | null): Promise<number | null> => {
    const trimmed = contactName.trim();
    if (!trimmed) return null;
    const expectedType = isExpense ? "supplier" : "client";
    const existing = contactCandidates.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing.id;
    const r = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: trimmed,
        type: expectedType,
        costCenterId: isExpense ? centerId : null,
        revenueCenterId: !isExpense ? centerId : null,
      }),
    });
    if (r.ok) {
      const created = await r.json();
      onContactCreated({ ...created, type: expectedType });
      return created.id;
    } else if (r.status === 409) {
      const data = await r.json().catch(() => ({}));
      return data?.existingId ?? null;
    }
    throw new Error(`HTTP ${r.status}`);
  };

  const handleConfirm = async () => {
    if (submitting || !row) return;
    const amountNum = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("Importo non valido");
      return;
    }
    if (!description.trim()) {
      toast.error("Descrizione obbligatoria");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast.error("Data non valida");
      return;
    }

    setSubmitting(true);
    try {
      const centerId = await ensureCenterId();
      const contactId = await ensureContactId(centerId);

      const amountCents = eurosToCents(amountNum) * (isExpense ? -1 : 1);
      const payload: Record<string, unknown> = {
        date,
        description: description.trim(),
        amount: amountCents,
        contactId,
      };
      if (isExpense) {
        payload.costCenterId = centerId;
        payload.expectedExpenseId = row.sourceId;
      } else {
        payload.revenueCenterId = centerId;
        payload.expectedIncomeId = row.sourceId;
      }

      // 1. Crea transaction reale
      const txRes = await fetch("/api/transactions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!txRes.ok) {
        const err = await txRes.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${txRes.status}`);
      }
      const txJson = await txRes.json();
      const newTxId = txJson?.transaction?.id ?? null;

      // 1b. Se autoSplit attivo sul previsto, applica split sulla transaction appena creata.
      // autoSplitNoVat eredita la modalità no-IVA (fatture estere/reverse charge).
      if (row.autoSplit && !isExpense && newTxId) {
        const splitRes = await fetch("/api/splits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId: newTxId, noVat: !!row.autoSplitNoVat }),
        });
        if (!splitRes.ok) {
          console.warn("Auto-split alla conferma fallito (transaction creata, ma split non applicato)");
        }
      }

      // 2. Crea override amount=0 per "saltare" il previsto in questo mese
      // (così il previsto non riappare come duplicato nel ledger).
      const [y, m] = row.date.split("-").map(Number);
      const overrideUrl = isExpense
        ? `/api/expected-expenses/${row.sourceId}/override`
        : `/api/expected-incomes/${row.sourceId}/override`;
      const overrideRes = await fetch(overrideUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: y,
          month: m,
          amount: 0,
          notes: "Confermato come transaction reale",
        }),
      });
      if (!overrideRes.ok) {
        // Non fatale: la transaction è stata creata. Logghiamo e continuiamo.
        console.warn("Override per skip previsto fallito (la transaction è creata)");
      }

      toast.success("Previsto confermato");
      onConfirmed();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore conferma");
    } finally {
      setSubmitting(false);
    }
  };

  const datalistContactsId = "confirm-contacts";
  const datalistCentersId = "confirm-centers";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className={`h-5 w-5 ${isExpense ? "text-red-500" : "text-green-500"}`} />
            Conferma {isExpense ? "spesa" : "incasso"}
          </DialogTitle>
          <DialogDescription>
            Compila i dettagli effettivi. Il previsto verrà saltato per questo mese e sostituito dal movimento reale.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 px-2 text-sm rounded-md border border-border bg-background w-full"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Descrizione</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 px-2 text-sm rounded-md border border-border bg-background w-full"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Importo (€)</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 px-2 text-sm rounded-md border border-border bg-background w-full font-mono text-right"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {isExpense ? "Centro di costo" : "Centro di ricavo"}
            </label>
            <input
              type="text"
              list={datalistCentersId}
              value={centerName}
              onChange={(e) => setCenterName(e.target.value)}
              placeholder={isExpense ? "Centro costo" : "Centro ricavo"}
              className="h-9 px-2 text-sm rounded-md border border-border bg-background w-full"
            />
            <datalist id={datalistCentersId}>
              {centerCandidates.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {isExpense ? "Fornitore" : "Cliente"}
            </label>
            <input
              type="text"
              list={datalistContactsId}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder={isExpense ? "Fornitore" : "Cliente"}
              className="h-9 px-2 text-sm rounded-md border border-border bg-background w-full"
            />
            <datalist id={datalistContactsId}>
              {contactCandidates.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annulla
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Conferma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
