"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, eurosToCents, centsToEuros } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { calculateSplit, type SplitResult } from "@/lib/utils/splits";
import { Calculator, CheckCircle, User, Building2, Receipt, Users, ArrowRight } from "lucide-react";

interface TransactionForSplit {
  id: number;
  date: string;
  description: string | null;
  amount: number;
}

interface SplitCalculatorProps {
  transaction: TransactionForSplit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface EditableSplit {
  danielaAmount: number;
  alessioAmount: number;
  agencyAmount: number;
  vatAmount: number;
}

export function SplitCalculator({
  transaction,
  open,
  onOpenChange,
  onComplete,
}: SplitCalculatorProps) {
  const [baseSplit, setBaseSplit] = useState<SplitResult | null>(null);
  const [editedAmounts, setEditedAmounts] = useState<EditableSplit | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction && transaction.amount > 0) {
      const calculated = calculateSplit(transaction.amount);
      setBaseSplit(calculated);
      setEditedAmounts({
        danielaAmount: calculated.danielaAmount,
        alessioAmount: calculated.alessioAmount,
        agencyAmount: calculated.agencyAmount,
        vatAmount: calculated.vatAmount,
      });
      setSaved(false);
      setError(null);
    }
  }, [transaction]);

  const handleAmountChange = (field: keyof EditableSplit, euroValue: string) => {
    if (!editedAmounts) return;
    const cents = eurosToCents(parseFloat(euroValue) || 0);
    setEditedAmounts({
      ...editedAmounts,
      [field]: cents,
    });
  };

  // Calcola totali derivati
  const totaleSoci = editedAmounts
    ? editedAmounts.danielaAmount + editedAmounts.alessioAmount
    : 0;
  const totaleBonifico = editedAmounts
    ? totaleSoci + editedAmounts.vatAmount
    : 0;

  const handleSave = async () => {
    if (!editedAmounts) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: transaction.id,
          customAmounts: editedAmounts,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore nel salvataggio");
      }

      setSaved(true);
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setSaving(false);
    }
  };

  if (!baseSplit || !editedAmounts) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Ripartizione Incasso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info transazione */}
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="text-sm text-muted-foreground mb-1">
              {formatDate(transaction.date)}
            </div>
            <div className="font-medium text-lg">{transaction.description}</div>
            <div className="text-2xl font-bold text-green-600 mt-2">
              {formatCurrency(transaction.amount)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Imponibile: {formatCurrency(baseSplit.netAmount)}
            </div>
          </div>

          {/* Ripartizione quote soci */}
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Daniela */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium">Daniela</div>
                    <div className="text-xs text-muted-foreground">10% del netto</div>
                  </div>
                </div>
                {saved ? (
                  <div className="font-mono font-medium text-purple-600">
                    {formatCurrency(editedAmounts.danielaAmount)}
                  </div>
                ) : (
                  <div className="w-28">
                    <Input
                      type="number"
                      step="0.01"
                      value={centsToEuros(editedAmounts.danielaAmount).toFixed(2)}
                      onChange={(e) => handleAmountChange("danielaAmount", e.target.value)}
                      className="text-right font-mono h-8"
                    />
                  </div>
                )}
              </div>

              {/* Alessio */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">Alessio</div>
                    <div className="text-xs text-muted-foreground">20% del netto</div>
                  </div>
                </div>
                {saved ? (
                  <div className="font-mono font-medium text-blue-600">
                    {formatCurrency(editedAmounts.alessioAmount)}
                  </div>
                ) : (
                  <div className="w-28">
                    <Input
                      type="number"
                      step="0.01"
                      value={centsToEuros(editedAmounts.alessioAmount).toFixed(2)}
                      onChange={(e) => handleAmountChange("alessioAmount", e.target.value)}
                      className="text-right font-mono h-8"
                    />
                  </div>
                )}
              </div>

              {/* Totale Soci */}
              <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/30 -mx-4 px-4 py-3 border-y border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Users className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="font-semibold text-indigo-700 dark:text-indigo-300">Totale Soci</div>
                </div>
                <div className="font-mono font-bold text-indigo-600">
                  {formatCurrency(totaleSoci)}
                </div>
              </div>

              {/* Fondo IVA */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <Receipt className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <div className="font-medium">Fondo IVA</div>
                    <div className="text-xs text-muted-foreground">22% del netto</div>
                  </div>
                </div>
                {saved ? (
                  <div className="font-mono font-medium text-orange-600">
                    {formatCurrency(editedAmounts.vatAmount)}
                  </div>
                ) : (
                  <div className="w-28">
                    <Input
                      type="number"
                      step="0.01"
                      value={centsToEuros(editedAmounts.vatAmount).toFixed(2)}
                      onChange={(e) => handleAmountChange("vatAmount", e.target.value)}
                      className="text-right font-mono h-8"
                    />
                  </div>
                )}
              </div>

              {/* Totale Bonifico */}
              <div className="flex items-center justify-between bg-purple-100 dark:bg-purple-950/40 -mx-4 px-4 py-4 border-t-2 border-purple-300 dark:border-purple-700 mt-2">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-purple-200 flex items-center justify-center">
                    <ArrowRight className="h-5 w-5 text-purple-700" />
                  </div>
                  <div>
                    <div className="font-bold text-purple-800 dark:text-purple-200">Totale Bonifico</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">Soci + Fondo IVA</div>
                  </div>
                </div>
                <div className="font-mono font-bold text-xl text-purple-700 dark:text-purple-300">
                  {formatCurrency(totaleBonifico)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agenzia - mostrato separatamente */}
          <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium">Disponibile Agenzia</div>
                <div className="text-xs text-muted-foreground">70% del netto</div>
              </div>
            </div>
            {saved ? (
              <div className="font-mono font-bold text-green-600 text-lg">
                {formatCurrency(editedAmounts.agencyAmount)}
              </div>
            ) : (
              <div className="w-28">
                <Input
                  type="number"
                  step="0.01"
                  value={centsToEuros(editedAmounts.agencyAmount).toFixed(2)}
                  onChange={(e) => handleAmountChange("agencyAmount", e.target.value)}
                  className="text-right font-mono h-8"
                />
              </div>
            )}
          </div>

          {/* Errore */}
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Successo */}
          {saved && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Ripartizione salvata! Bonifico di {formatCurrency(totaleBonifico)} registrato.
            </div>
          )}

          {/* Azioni */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || saved}
            >
              {saving ? "Salvataggio..." : saved ? "Salvato" : "Salva Ripartizione"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
