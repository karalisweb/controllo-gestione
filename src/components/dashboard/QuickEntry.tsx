"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, eurosToCents, centsToEuros } from "@/lib/utils/currency";
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  X,
  Loader2,
  CreditCard,
  Receipt,
} from "lucide-react";

interface ExpectedIncome {
  id: number;
  clientName: string;
  amount: number;
  expectedDay: number | null;
}

interface ExpectedExpense {
  id: number;
  name: string;
  amount: number;
  expectedDay: number | null;
  costCenterId: number | null;
}

interface PdrInstallment {
  id: number;
  planId: number;
  creditorName: string;
  amount: number;
  dueDate: string;
}

interface QuickEntryProps {
  onSuccess?: () => void;
}

type EntryType = null | "income" | "expense";
type SelectedItem = {
  type: "income" | "expense" | "pdr" | "manual";
  id?: number;
  planId?: number;
  description: string;
  amount: number;
  costCenterId?: number | null;
};

export function QuickEntry({ onSuccess }: QuickEntryProps) {
  const [fabOpen, setFabOpen] = useState(false);
  const [entryType, setEntryType] = useState<EntryType>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dati per suggerimenti
  const [expectedIncomes, setExpectedIncomes] = useState<ExpectedIncome[]>([]);
  const [expectedExpenses, setExpectedExpenses] = useState<ExpectedExpense[]>([]);
  const [pdrInstallments, setPdrInstallments] = useState<PdrInstallment[]>([]);

  // Form state
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [addToConsuntivo, setAddToConsuntivo] = useState(true);
  const [updatePrevisionale, setUpdatePrevisionale] = useState(true);

  // Carica suggerimenti quando si apre il modal
  useEffect(() => {
    if (entryType) {
      loadSuggestions();
    }
  }, [entryType]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      if (entryType === "income") {
        const res = await fetch("/api/expected-incomes?year=2026");
        if (res.ok) {
          const data = await res.json();
          setExpectedIncomes(data.filter((i: ExpectedIncome & { isActive: boolean }) => i.isActive));
        }
      } else if (entryType === "expense") {
        // Carica spese previste
        const expRes = await fetch("/api/expected-expenses?year=2026");
        if (expRes.ok) {
          const data = await expRes.json();
          setExpectedExpenses(data.filter((e: ExpectedExpense & { isActive: boolean }) => e.isActive));
        }

        // Carica rate PDR non pagate
        const pdrRes = await fetch("/api/payment-plans?active=true");
        if (pdrRes.ok) {
          const plans = await pdrRes.json();
          const installments: PdrInstallment[] = [];
          for (const plan of plans) {
            if (plan.installments) {
              for (const inst of plan.installments) {
                if (!inst.isPaid) {
                  installments.push({
                    id: inst.id,
                    planId: plan.id,
                    creditorName: plan.creditorName,
                    amount: inst.amount,
                    dueDate: inst.dueDate,
                  });
                }
              }
            }
          }
          // Ordina per data e prendi le prime 5
          installments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
          setPdrInstallments(installments.slice(0, 5));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (item: SelectedItem) => {
    setSelectedItem(item);
    setAmount(centsToEuros(item.amount).toFixed(2));
    setDescription(item.description);
  };

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setSaving(true);
    try {
      const amountCents = eurosToCents(parseFloat(amount));
      const finalAmount = entryType === "expense" ? -Math.abs(amountCents) : Math.abs(amountCents);

      // 1. Registra in Consuntivo (transazione)
      if (addToConsuntivo) {
        const txRes = await fetch("/api/transactions/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            description: description || (entryType === "income" ? "Incasso" : "Pagamento"),
            amount: finalAmount,
            costCenterId: selectedItem?.costCenterId || null,
          }),
        });

        if (!txRes.ok) {
          throw new Error("Errore nel salvataggio transazione");
        }
      }

      // 2. Se è una rata PDR, segnala come pagata
      if (selectedItem?.type === "pdr" && selectedItem.id && selectedItem.planId && updatePrevisionale) {
        const pdrRes = await fetch(`/api/payment-plans/${selectedItem.planId}/installments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            installmentId: selectedItem.id,
            paidDate: date,
          }),
        });

        if (!pdrRes.ok) {
          console.error("Errore nell'aggiornamento rata PDR");
        }
      }

      // Chiudi e reset
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Errore:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFabOpen(false);
    setEntryType(null);
    setSelectedItem(null);
    setAmount("");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
    setAddToConsuntivo(true);
    setUpdatePrevisionale(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  };

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setFabOpen(true)}
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground shadow-lg rounded-full px-4 py-3 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
      >
        <Plus className="h-5 w-5" />
        <span className="font-medium">Movimento</span>
      </button>

      {/* Modal Selezione Tipo */}
      <Dialog open={fabOpen && !entryType} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Registra Movimento</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <button
              onClick={() => setEntryType("income")}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                <ArrowDownLeft className="h-8 w-8 text-white" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-700">ENTRATA</div>
                <div className="text-sm text-green-600">Ho incassato</div>
              </div>
            </button>

            <button
              onClick={() => setEntryType("expense")}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
                <ArrowUpRight className="h-8 w-8 text-white" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-red-700">USCITA</div>
                <div className="text-sm text-red-600">Ho pagato</div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Entrata */}
      <Dialog open={fabOpen && entryType === "income"} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-green-500" />
              Registra Entrata
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Importo */}
            <div className="space-y-2">
              <Label>Importo *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-lg font-mono"
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Suggerimenti */}
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : expectedIncomes.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">INCASSI PREVISTI</Label>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {expectedIncomes.slice(0, 6).map((income) => (
                    <button
                      key={income.id}
                      onClick={() => handleSelectItem({
                        type: "income",
                        id: income.id,
                        description: `Canone ${income.clientName}`,
                        amount: income.amount,
                      })}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                        selectedItem?.id === income.id && selectedItem?.type === "income"
                          ? "border-green-500 bg-green-50"
                          : "border-border hover:border-green-300 hover:bg-green-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {selectedItem?.id === income.id && selectedItem?.type === "income" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-muted" />
                        )}
                        <span className="font-medium">{income.clientName}</span>
                      </div>
                      <span className="font-mono text-green-600">{formatCurrency(income.amount)}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setSelectedItem({ type: "manual", description: "", amount: 0 });
                      setAmount("");
                      setDescription("");
                    }}
                    className={`w-full flex items-center gap-2 p-3 rounded-lg border transition-all ${
                      selectedItem?.type === "manual"
                        ? "border-green-500 bg-green-50"
                        : "border-dashed border-muted-foreground/30 hover:border-green-300"
                    }`}
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Altro (inserimento manuale)</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* Descrizione (se manuale) */}
            {selectedItem?.type === "manual" && (
              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Es. Pagamento cliente..."
                />
              </div>
            )}

            {/* Data */}
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Opzioni */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="consuntivo"
                  checked={addToConsuntivo}
                  onCheckedChange={(checked) => setAddToConsuntivo(checked === true)}
                />
                <label htmlFor="consuntivo" className="text-sm">
                  Registra in Consuntivo (transazione effettiva)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="previsionale"
                  checked={updatePrevisionale}
                  onCheckedChange={(checked) => setUpdatePrevisionale(checked === true)}
                />
                <label htmlFor="previsionale" className="text-sm">
                  Aggiorna Previsionale (segna come incassato)
                </label>
              </div>
            </div>

            {/* Azioni */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Annulla
              </Button>
              <Button
                onClick={handleSave}
                disabled={!amount || parseFloat(amount) <= 0 || saving}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Registra Entrata
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Uscita */}
      <Dialog open={fabOpen && entryType === "expense"} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-red-500" />
              Registra Uscita
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Importo */}
            <div className="space-y-2">
              <Label>Importo *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-lg font-mono"
                  placeholder="0,00"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Rate PDR */}
                {pdrInstallments.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      RATE PDR IN SCADENZA
                    </Label>
                    <div className="space-y-1">
                      {pdrInstallments.map((inst) => (
                        <button
                          key={inst.id}
                          onClick={() => handleSelectItem({
                            type: "pdr",
                            id: inst.id,
                            planId: inst.planId,
                            description: `PDR ${inst.creditorName}`,
                            amount: inst.amount,
                          })}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                            selectedItem?.id === inst.id && selectedItem?.type === "pdr"
                              ? "border-amber-500 bg-amber-50"
                              : "border-border hover:border-amber-300 hover:bg-amber-50/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {selectedItem?.id === inst.id && selectedItem?.type === "pdr" ? (
                              <Check className="h-4 w-4 text-amber-500" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-muted" />
                            )}
                            <div className="text-left">
                              <span className="font-medium">{inst.creditorName}</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {formatDate(inst.dueDate)}
                              </Badge>
                            </div>
                          </div>
                          <span className="font-mono text-red-600">{formatCurrency(inst.amount)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spese Previste */}
                {expectedExpenses.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Receipt className="h-3 w-3" />
                      SPESE PREVISTE DEL MESE
                    </Label>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {expectedExpenses.slice(0, 5).map((expense) => (
                        <button
                          key={expense.id}
                          onClick={() => handleSelectItem({
                            type: "expense",
                            id: expense.id,
                            description: expense.name,
                            amount: expense.amount,
                            costCenterId: expense.costCenterId,
                          })}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                            selectedItem?.id === expense.id && selectedItem?.type === "expense"
                              ? "border-red-500 bg-red-50"
                              : "border-border hover:border-red-300 hover:bg-red-50/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {selectedItem?.id === expense.id && selectedItem?.type === "expense" ? (
                              <Check className="h-4 w-4 text-red-500" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-muted" />
                            )}
                            <span className="font-medium">{expense.name}</span>
                          </div>
                          <span className="font-mono text-red-600">{formatCurrency(expense.amount)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manuale */}
                <button
                  onClick={() => {
                    setSelectedItem({ type: "manual", description: "", amount: 0 });
                    setAmount("");
                    setDescription("");
                  }}
                  className={`w-full flex items-center gap-2 p-3 rounded-lg border transition-all ${
                    selectedItem?.type === "manual"
                      ? "border-red-500 bg-red-50"
                      : "border-dashed border-muted-foreground/30 hover:border-red-300"
                  }`}
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Altro (inserimento manuale)</span>
                </button>
              </>
            )}

            {/* Descrizione (se manuale) */}
            {selectedItem?.type === "manual" && (
              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Es. Spesa imprevista..."
                />
              </div>
            )}

            {/* Data */}
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Opzioni */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="consuntivo-exp"
                  checked={addToConsuntivo}
                  onCheckedChange={(checked) => setAddToConsuntivo(checked === true)}
                />
                <label htmlFor="consuntivo-exp" className="text-sm">
                  Registra in Consuntivo (transazione effettiva)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="previsionale-exp"
                  checked={updatePrevisionale}
                  onCheckedChange={(checked) => setUpdatePrevisionale(checked === true)}
                />
                <label htmlFor="previsionale-exp" className="text-sm">
                  {selectedItem?.type === "pdr"
                    ? "Segna rata PDR come pagata"
                    : "Aggiorna Previsionale (segna come pagato)"}
                </label>
              </div>
            </div>

            {/* Azioni */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Annulla
              </Button>
              <Button
                onClick={handleSave}
                disabled={!amount || parseFloat(amount) <= 0 || saving}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Registra Uscita
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
