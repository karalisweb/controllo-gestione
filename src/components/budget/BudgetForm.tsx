"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MONTHS } from "@/lib/utils/dates";
import { eurosToCents } from "@/lib/utils/currency";
import type { Category, BudgetItem, CostCenter, RevenueCenter } from "@/types";

interface BudgetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  costCenters?: CostCenter[];
  revenueCenters?: RevenueCenter[];
  editingItem?: BudgetItem | null;
  defaultMonth?: number;
  defaultType?: "income" | "expense";
  onSubmit: (data: {
    categoryId?: number;
    costCenterId?: number;
    revenueCenterId?: number;
    description: string;
    amount: number;
    month: number;
    year: number;
    isRecurring: boolean;
    clientName?: string;
    notes?: string;
  }) => Promise<void>;
}

export function BudgetForm({
  open,
  onOpenChange,
  categories,
  costCenters = [],
  revenueCenters = [],
  editingItem,
  defaultMonth = 1,
  defaultType = "income",
  onSubmit,
}: BudgetFormProps) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"income" | "expense">(
    editingItem
      ? (editingItem.amount >= 0 ? "income" : "expense")
      : defaultType
  );
  const [categoryId, setCategoryId] = useState<string>(
    editingItem?.categoryId?.toString() || ""
  );
  const [costCenterId, setCostCenterId] = useState<string>(
    editingItem?.costCenterId?.toString() || ""
  );
  const [revenueCenterId, setRevenueCenterId] = useState<string>(
    editingItem?.revenueCenterId?.toString() || ""
  );
  const [description, setDescription] = useState(editingItem?.description || "");
  const [amount, setAmount] = useState(
    editingItem ? Math.abs(editingItem.amount / 100).toString() : ""
  );
  const [month, setMonth] = useState(
    editingItem?.month?.toString() || defaultMonth.toString()
  );
  const [clientName, setClientName] = useState(editingItem?.clientName || "");
  const [isRecurring, setIsRecurring] = useState(editingItem?.isRecurring || false);
  const [notes, setNotes] = useState(editingItem?.notes || "");

  const filteredCategories = categories.filter((c) => c.type === type);
  const activeCostCenters = costCenters.filter((c) => c.isActive);
  const activeRevenueCenters = revenueCenters.filter((c) => c.isActive);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const amountCents = eurosToCents(parseFloat(amount) || 0);
      const finalAmount = type === "expense" ? -amountCents : amountCents;

      await onSubmit({
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        costCenterId: type === "expense" && costCenterId ? parseInt(costCenterId) : undefined,
        revenueCenterId: type === "income" && revenueCenterId ? parseInt(revenueCenterId) : undefined,
        description,
        amount: finalAmount,
        month: parseInt(month),
        year: 2026,
        isRecurring,
        clientName: clientName || undefined,
        notes: notes || undefined,
      });

      // Reset form
      setDescription("");
      setAmount("");
      setCategoryId("");
      setCostCenterId("");
      setRevenueCenterId("");
      setClientName("");
      setNotes("");
      setIsRecurring(false);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Modifica voce" : "Nuova voce previsionale"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v: "income" | "expense") => {
              setType(v);
              setCategoryId("");
              setCostCenterId("");
              setRevenueCenterId("");
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Entrata</SelectItem>
                <SelectItem value="expense">Uscita</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mese</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona categoria" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "expense" && activeCostCenters.length > 0 && (
            <div className="space-y-2">
              <Label>Centro di Costo</Label>
              <Select value={costCenterId} onValueChange={setCostCenterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona centro di costo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nessuno</SelectItem>
                  {activeCostCenters.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id.toString()}>
                      {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "income" && activeRevenueCenters.length > 0 && (
            <div className="space-y-2">
              <Label>Centro di Ricavo</Label>
              <Select value={revenueCenterId} onValueChange={setRevenueCenterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona centro di ricavo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nessuno</SelectItem>
                  {activeRevenueCenters.map((rc) => (
                    <SelectItem key={rc.id} value={rc.id.toString()}>
                      {rc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Es. Sito web cliente X"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Importo (EUR)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {type === "income" && (
            <div className="space-y-2">
              <Label htmlFor="clientName">Nome Cliente</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Es. Azienda Srl"
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="isRecurring">Voce ricorrente</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note aggiuntive..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvataggio..." : editingItem ? "Salva" : "Aggiungi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
