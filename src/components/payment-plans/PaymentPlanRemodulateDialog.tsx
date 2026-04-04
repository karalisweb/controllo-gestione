"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, eurosToCents, centsToEuros } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import type { PaymentPlan } from "@/types";

interface RemodulateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PaymentPlan | null;
  onConfirm: (planId: number, data: {
    remainingInstallments: number;
    newInstallmentAmount: number; // centesimi
    nextDueDate: string;
  }) => Promise<void>;
}

export function PaymentPlanRemodulateDialog({
  open,
  onOpenChange,
  plan,
  onConfirm,
}: RemodulateDialogProps) {
  const paidCount = plan?.paidInstallments || 0;
  const unpaidCount = plan ? plan.totalInstallments - paidCount : 0;

  const [numRate, setNumRate] = useState("");
  const [importoRata, setImportoRata] = useState("");
  const [dataInizio, setDataInizio] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Inizializza i campi quando cambia il piano
  const initializeFields = () => {
    if (!plan) return;
    const currentUnpaid = plan.totalInstallments - paidCount;
    setNumRate(currentUnpaid.toString());
    setImportoRata(centsToEuros(plan.installmentAmount).toFixed(2));

    // Trova la prima rata non pagata come data di default
    const firstUnpaid = plan.installments?.find((i) => !i.isPaid);
    setDataInizio(firstUnpaid?.dueDate || new Date().toISOString().split("T")[0]);
  };

  // Preview calcoli
  const preview = useMemo(() => {
    if (!plan) return null;
    const num = parseInt(numRate);
    const importo = parseFloat(importoRata?.replace(",", ".") || "0");
    if (isNaN(num) || num <= 0 || isNaN(importo) || importo <= 0) return null;

    const importoCents = eurosToCents(importo);
    const paidAmount = plan.installments
      ?.filter((i) => i.isPaid)
      .reduce((sum, i) => sum + i.amount, 0) || 0;
    const newRemaining = num * importoCents;
    const newTotal = paidAmount + newRemaining;

    return {
      paidAmount,
      newRemaining,
      newTotal,
      numRate: num,
      importoCents,
    };
  }, [plan, numRate, importoRata]);

  const handleConfirm = async () => {
    if (!plan || !preview) return;
    setSubmitting(true);
    try {
      await onConfirm(plan.id, {
        remainingInstallments: preview.numRate,
        newInstallmentAmount: preview.importoCents,
        nextDueDate: dataInizio,
      });
      onOpenChange(false);
    } catch {
      // Errore gestito dal chiamante
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen) initializeFields();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rimodula Piano di Rientro</DialogTitle>
        </DialogHeader>

        {plan && (
          <div className="space-y-4">
            {/* Riepilogo stato attuale */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="font-medium text-sm">{plan.creditorName}</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Rate pagate: </span>
                  <span className="font-mono font-medium">{paidCount} / {plan.totalInstallments}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Già saldato: </span>
                  <span className="font-mono font-medium text-green-600">
                    {formatCurrency(
                      plan.installments
                        ?.filter((i) => i.isPaid)
                        .reduce((sum, i) => sum + i.amount, 0) || 0
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Rate rimanenti: </span>
                  <span className="font-mono font-medium">{unpaidCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Residuo attuale: </span>
                  <span className="font-mono font-medium text-red-600">
                    {formatCurrency(plan.totalAmount - (
                      plan.installments
                        ?.filter((i) => i.isPaid)
                        .reduce((sum, i) => sum + i.amount, 0) || 0
                    ))}
                  </span>
                </div>
              </div>
            </div>

            {/* Campi rimodulazione */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numRate">Nuove rate rimanenti</Label>
                <Input
                  id="numRate"
                  type="number"
                  min="1"
                  value={numRate}
                  onChange={(e) => setNumRate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="importoRata">Importo rata (€)</Label>
                <Input
                  id="importoRata"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={importoRata}
                  onChange={(e) => setImportoRata(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataInizio">Data prossima rata</Label>
              <Input
                id="dataInizio"
                type="date"
                value={dataInizio}
                onChange={(e) => setDataInizio(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Le rate successive verranno generate con cadenza mensile da questa data.
              </p>
            </div>

            {/* Preview */}
            {preview && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-1">
                <div className="font-medium text-blue-800">Anteprima nuovo piano:</div>
                <div className="text-blue-700">
                  {preview.numRate} rate da {formatCurrency(preview.importoCents)}/mese
                  a partire dal {formatDate(dataInizio)}
                </div>
                <div className="text-blue-700">
                  Nuovo residuo: <span className="font-mono font-bold">{formatCurrency(preview.newRemaining)}</span>
                  {" · "}Nuovo totale: <span className="font-mono font-bold">{formatCurrency(preview.newTotal)}</span>
                </div>
              </div>
            )}

            {/* Avviso */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              Le {paidCount} rate già pagate verranno mantenute. Solo le rate non pagate verranno sostituite.
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annulla
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || !preview}
          >
            {submitting ? "Rimodulazione..." : "Conferma Rimodulazione"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
