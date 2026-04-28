"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDownToLine, ArrowUpFromLine, Lightbulb, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/currency";

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

export interface ExpectedRowLite {
  type: "expected_expense" | "expected_income";
  sourceId: number;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // centesimi (negativo per uscita, positivo per entrata)
  categoryName?: string | null;
}

interface NewMovementFormProps {
  onSaved: () => void;
  expectedRows?: ExpectedRowLite[];
  onMatchSuggested?: (row: ExpectedRowLite) => void;
}

export function NewMovementForm({ onSaved, expectedRows, onMatchSuggested }: NewMovementFormProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [type, setType] = useState<"expense" | "income">("expense");
  const [date, setDate] = useState(todayStr);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [centerName, setCenterName] = useState("");
  const [contactName, setContactName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [costCenters, setCostCenters] = useState<Center[]>([]);
  const [revenueCenters, setRevenueCenters] = useState<Center[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/contacts").then((r) => r.json()),
      fetch("/api/cost-centers").then((r) => r.json()),
      fetch("/api/revenue-centers").then((r) => r.json()),
    ])
      .then(([c, cc, rc]) => {
        setContacts(Array.isArray(c) ? c : []);
        setCostCenters(Array.isArray(cc) ? cc : []);
        setRevenueCenters(Array.isArray(rc) ? rc : []);
      })
      .catch(() => {
        // Silently — il form funziona anche senza autocomplete
      });
  }, []);

  const visibleContacts =
    type === "expense"
      ? contacts.filter((c) => c.type === "supplier")
      : contacts.filter((c) => c.type === "client");
  const visibleCenters = type === "expense" ? costCenters : revenueCenters;

  const reset = () => {
    setDescription("");
    setAmount("");
    setCenterName("");
    setContactName("");
    setDate(new Date().toISOString().slice(0, 10));
  };

  const ensureCenter = async (): Promise<number | null> => {
    const trimmed = centerName.trim();
    if (!trimmed) return null;
    const existing = visibleCenters.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing.id;
    const url = type === "expense" ? "/api/cost-centers" : "/api/revenue-centers";
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!r.ok) throw new Error(`Errore creazione centro: HTTP ${r.status}`);
    const created = await r.json();
    const id = created?.id ?? null;
    if (id) {
      const newCenter = { id, name: trimmed };
      if (type === "expense") setCostCenters((prev) => [...prev, newCenter]);
      else setRevenueCenters((prev) => [...prev, newCenter]);
    }
    return id;
  };

  const ensureContact = async (centerId: number | null): Promise<number | null> => {
    const trimmed = contactName.trim();
    if (!trimmed) return null;
    const expectedType: Contact["type"] = type === "expense" ? "supplier" : "client";
    const existing = contacts.find(
      (c) =>
        c.name.toLowerCase() === trimmed.toLowerCase() && c.type === expectedType,
    );
    if (existing) return existing.id;
    const r = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: trimmed,
        type: expectedType,
        costCenterId: type === "expense" ? centerId : null,
        revenueCenterId: type === "income" ? centerId : null,
      }),
    });
    if (!r.ok) {
      // Se è un duplicato (409) usa l'id esistente restituito
      if (r.status === 409) {
        const data = await r.json().catch(() => ({}));
        if (data?.existingId) return data.existingId;
      }
      throw new Error(`Errore creazione contatto: HTTP ${r.status}`);
    }
    const created = await r.json();
    const id = created?.id ?? null;
    if (id) {
      setContacts((prev) => [
        ...prev,
        {
          id,
          name: trimmed,
          type: expectedType,
          costCenterId: type === "expense" ? centerId : null,
          revenueCenterId: type === "income" ? centerId : null,
        },
      ]);
    }
    return id;
  };

  const todayStrNow = new Date().toISOString().slice(0, 10);
  const isFuture = date > todayStrNow;

  // Match suggerito (modalità B): cerca tra i previsti del mese un candidato compatibile
  // per type + importo (±5%) + (opzionale) nome contatto contenuto nella descrizione del previsto.
  const suggestedMatch = useMemo<ExpectedRowLite | null>(() => {
    if (!expectedRows || expectedRows.length === 0) return null;
    if (isFuture) return null; // se è scadenza non ha senso suggerire
    const amountNum = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(amountNum) || amountNum <= 0) return null;
    const expectedTypeKey = type === "expense" ? "expected_expense" : "expected_income";
    const candidates = expectedRows.filter((r) => {
      if (r.type !== expectedTypeKey) return false;
      const rAmt = Math.abs(r.amount) / 100;
      if (rAmt === 0) return false;
      const ratio = Math.abs(rAmt - amountNum) / Math.max(rAmt, amountNum);
      if (ratio > 0.05) return false;
      return true;
    });
    if (candidates.length === 0) return null;
    // Bonus se descrizione/contatto del form combacia con quella del previsto
    const desc = description.trim().toLowerCase();
    const contact = contactName.trim().toLowerCase();
    candidates.sort((a, b) => {
      const aDelta = Math.abs(Math.abs(a.amount) / 100 - amountNum);
      const bDelta = Math.abs(Math.abs(b.amount) / 100 - amountNum);
      const aMatch = (desc && a.description.toLowerCase().includes(desc)) || (contact && a.description.toLowerCase().includes(contact));
      const bMatch = (desc && b.description.toLowerCase().includes(desc)) || (contact && b.description.toLowerCase().includes(contact));
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return aDelta - bDelta;
    });
    return candidates[0];
  }, [expectedRows, amount, type, description, contactName, isFuture]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const amountNum = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("Importo non valido");
      return;
    }
    if (!description.trim()) {
      toast.error("Descrizione obbligatoria");
      return;
    }

    setSubmitting(true);
    try {
      const centerId = await ensureCenter();
      const contactId = await ensureContact(centerId);

      if (isFuture) {
        // ───── Data futura → crea SCADENZA (expected_expense / expected_income one_time) ─────
        const amountAbs = Math.round(amountNum * 100);
        const day = parseInt(date.slice(8, 10), 10);
        const url =
          type === "expense" ? "/api/expected-expenses" : "/api/expected-incomes";
        const payload: Record<string, unknown> =
          type === "expense"
            ? {
                name: description.trim(),
                contactId,
                costCenterId: centerId,
                amount: amountAbs,
                frequency: "one_time",
                expectedDay: day,
                startDate: date,
              }
            : {
                clientName: contactName.trim() || description.trim(),
                revenueCenterId: centerId,
                amount: amountAbs,
                frequency: "one_time",
                expectedDay: day,
                startDate: date,
              };
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        toast.success("Scadenza salvata");
      } else {
        // ───── Data passata o oggi → crea TRANSACTION reale ─────
        const amountCents = Math.round(amountNum * 100) * (type === "expense" ? -1 : 1);
        const payload: Record<string, unknown> = {
          date,
          description: description.trim(),
          amount: amountCents,
          contactId,
        };
        if (type === "expense") payload.costCenterId = centerId;
        else payload.revenueCenterId = centerId;

        const res = await fetch("/api/transactions/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        toast.success("Movimento salvato");
      }
      reset();
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore salvataggio");
    } finally {
      setSubmitting(false);
    }
  };

  const centerListId = `centers-${type}`;
  const contactListId = `contacts-${type}`;

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-border bg-muted/20 p-2 flex flex-wrap items-center gap-2"
    >
      <div className="flex rounded-md overflow-hidden border border-border">
        <button
          type="button"
          onClick={() => setType("expense")}
          className={`px-2 py-1.5 text-xs flex items-center gap-1 transition-colors ${
            type === "expense"
              ? "bg-red-500/15 text-red-500"
              : "bg-transparent text-muted-foreground hover:bg-muted"
          }`}
          title="Uscita (spesa)"
        >
          <ArrowUpFromLine className="h-3.5 w-3.5" /> Uscita
        </button>
        <button
          type="button"
          onClick={() => setType("income")}
          className={`px-2 py-1.5 text-xs flex items-center gap-1 transition-colors ${
            type === "income"
              ? "bg-green-500/15 text-green-500"
              : "bg-transparent text-muted-foreground hover:bg-muted"
          }`}
          title="Entrata (incasso)"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" /> Entrata
        </button>
      </div>

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="h-8 px-2 text-sm rounded-md border border-border bg-background"
        required
      />

      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrizione"
        className="h-8 px-2 text-sm rounded-md border border-border bg-background flex-1 min-w-[140px]"
        required
      />

      <input
        type="text"
        list={centerListId}
        value={centerName}
        onChange={(e) => setCenterName(e.target.value)}
        placeholder={type === "expense" ? "Centro costo" : "Centro ricavo"}
        className="h-8 px-2 text-sm rounded-md border border-border bg-background w-[150px]"
      />
      <datalist id={centerListId}>
        {visibleCenters.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>

      <input
        type="text"
        list={contactListId}
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
        placeholder={type === "expense" ? "Fornitore" : "Cliente"}
        className="h-8 px-2 text-sm rounded-md border border-border bg-background w-[150px]"
      />
      <datalist id={contactListId}>
        {visibleContacts.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>

      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0,00 €"
        className="h-8 px-2 text-sm rounded-md border border-border bg-background w-[110px] text-right font-mono"
        required
      />

      <Button type="submit" size="sm" disabled={submitting} className="h-8" title={isFuture ? "Data futura → verrà salvata come scadenza prevista" : "Crea movimento reale"}>
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Plus className="h-4 w-4 mr-1" />
            {isFuture ? "Salva come scadenza" : "Salva"}
          </>
        )}
      </Button>

      {suggestedMatch && onMatchSuggested && (
        <div className="basis-full mt-1 flex items-center gap-2 px-2 py-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 text-xs">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="text-muted-foreground">
            Forse stai confermando il previsto:{" "}
            <span className="font-medium text-foreground">{suggestedMatch.description}</span>{" "}
            del {suggestedMatch.date.slice(8, 10)}/{suggestedMatch.date.slice(5, 7)} ({formatCurrency(Math.abs(suggestedMatch.amount))})
          </span>
          <button
            type="button"
            onClick={() => onMatchSuggested(suggestedMatch)}
            className="ml-auto px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors"
          >
            Conferma questo
          </button>
        </div>
      )}
    </form>
  );
}
