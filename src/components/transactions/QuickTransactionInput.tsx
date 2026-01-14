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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Check,
  AlertTriangle,
  Plus,
  Calendar,
  FileText,
} from "lucide-react";
import { formatCurrency, parseItalianCurrency, formatAmount } from "@/lib/utils/currency";
import type { CostCenter, RevenueCenter, ExpectedExpense, ExpectedIncome } from "@/types";

type TransactionType = "income" | "expense";

interface SelectedExpected {
  id: number;
  name: string;
  amount: number;
  expectedDay: number | null;
  frequency: string;
  isExtraordinary?: boolean;
}

interface QuickTransactionInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function QuickTransactionInput({
  open,
  onOpenChange,
  onComplete,
}: QuickTransactionInputProps) {
  // Step state
  const [step, setStep] = useState(1);

  // Data state
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [revenueCenters, setRevenueCenters] = useState<RevenueCenter[]>([]);
  const [expectedExpenses, setExpectedExpenses] = useState<ExpectedExpense[]>([]);
  const [expectedIncomes, setExpectedIncomes] = useState<ExpectedIncome[]>([]);
  const [loading, setLoading] = useState(false);

  // Selection state
  const [transactionType, setTransactionType] = useState<TransactionType | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<CostCenter | RevenueCenter | null>(null);
  const [isExtraordinary, setIsExtraordinary] = useState(false);
  const [selectedExpected, setSelectedExpected] = useState<SelectedExpected | null>(null);

  // Form state
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  // Saving state
  const [saving, setSaving] = useState(false);

  // Fetch data on open
  useEffect(() => {
    if (open) {
      fetchData();
      resetForm();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [costRes, revenueRes, expenseRes, incomeRes] = await Promise.all([
        fetch("/api/cost-centers"),
        fetch("/api/revenue-centers"),
        fetch("/api/expected-expenses"),
        fetch("/api/expected-incomes"),
      ]);

      const [costData, revenueData, expenseData, incomeData] = await Promise.all([
        costRes.json(),
        revenueRes.json(),
        expenseRes.json(),
        incomeRes.json(),
      ]);

      setCostCenters(costData.filter((c: CostCenter) => c.isActive));
      setRevenueCenters(revenueData.filter((r: RevenueCenter) => r.isActive));
      setExpectedExpenses(expenseData.filter((e: ExpectedExpense) => e.isActive));
      setExpectedIncomes(incomeData.filter((i: ExpectedIncome) => i.isActive));
    } catch (error) {
      console.error("Errore nel caricamento dati:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setTransactionType(null);
    setSelectedCenter(null);
    setIsExtraordinary(false);
    setSelectedExpected(null);
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setNotes("");
  };

  // Get expected items for selected center
  const getExpectedItems = (): SelectedExpected[] => {
    if (!selectedCenter) return [];

    if (transactionType === "expense") {
      return expectedExpenses
        .filter((e) => e.costCenterId === selectedCenter.id)
        .map((e) => ({
          id: e.id,
          name: e.name,
          amount: e.amount,
          expectedDay: e.expectedDay,
          frequency: e.frequency,
        }));
    } else {
      return expectedIncomes
        .filter((i) => i.revenueCenterId === selectedCenter.id)
        .map((i) => ({
          id: i.id,
          name: i.clientName,
          amount: i.amount,
          expectedDay: i.expectedDay,
          frequency: i.frequency,
        }));
    }
  };

  // Calculate difference
  const getDifference = () => {
    if (!selectedExpected || selectedExpected.isExtraordinary) return null;

    const actualAmount = parseItalianCurrency(amount);
    const expectedAmount = selectedExpected.amount;
    const diff = actualAmount - expectedAmount;
    const percentage = expectedAmount > 0 ? (diff / expectedAmount) * 100 : 0;

    return { diff, percentage, expectedAmount };
  };

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    try {
      const actualAmount = parseItalianCurrency(amount);
      const finalAmount = transactionType === "expense" ? -Math.abs(actualAmount) : Math.abs(actualAmount);

      const payload = {
        date,
        description: description || selectedExpected?.name || "Movimento manuale",
        amount: finalAmount,
        costCenterId: transactionType === "expense" ? selectedCenter?.id : null,
        revenueCenterId: transactionType === "income" ? selectedCenter?.id : null,
        notes: notes || null,
        isExtraordinary,
        expectedExpenseId: transactionType === "expense" && !isExtraordinary ? selectedExpected?.id : null,
        expectedIncomeId: transactionType === "income" && !isExtraordinary ? selectedExpected?.id : null,
      };

      const res = await fetch("/api/transactions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Errore nel salvataggio");
      }

      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Errore salvataggio:", error);
      alert("Errore nel salvataggio della transazione");
    } finally {
      setSaving(false);
    }
  };

  // Format frequency label
  const formatFrequency = (freq: string) => {
    const labels: Record<string, string> = {
      monthly: "/mese",
      quarterly: "/trim",
      semiannual: "/sem",
      annual: "/anno",
      one_time: "una tantum",
    };
    return labels[freq] || freq;
  };

  // Render step content
  const renderStep = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return null;
    }
  };

  // STEP 1: Tipo movimento
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <p className="text-muted-foreground">Seleziona il tipo di movimento</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => {
            setTransactionType("income");
            setStep(2);
          }}
          className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950 transition-all group"
        >
          <TrendingUp className="h-12 w-12 text-green-500 mb-3 group-hover:scale-110 transition-transform" />
          <span className="text-lg font-semibold text-green-700 dark:text-green-400">INCASSO</span>
          <span className="text-sm text-muted-foreground">Entrata di denaro</span>
        </button>

        <button
          onClick={() => {
            setTransactionType("expense");
            setStep(2);
          }}
          className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-all group"
        >
          <TrendingDown className="h-12 w-12 text-red-500 mb-3 group-hover:scale-110 transition-transform" />
          <span className="text-lg font-semibold text-red-700 dark:text-red-400">SPESA</span>
          <span className="text-sm text-muted-foreground">Uscita di denaro</span>
        </button>
      </div>
    </div>
  );

  // STEP 2: Centro di costo/ricavo
  const renderStep2 = () => {
    const centers = transactionType === "expense" ? costCenters : revenueCenters;
    const centerLabel = transactionType === "expense" ? "Centro di Costo" : "Centro di Ricavo";

    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <p className="text-muted-foreground">Seleziona il {centerLabel}</p>
        </div>

        {/* Checkbox straordinaria */}
        <label className="flex items-center gap-3 p-3 rounded-lg border bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors">
          <input
            type="checkbox"
            checked={isExtraordinary}
            onChange={(e) => setIsExtraordinary(e.target.checked)}
            className="w-5 h-5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
          />
          <div>
            <span className="font-medium text-amber-800 dark:text-amber-200">Spesa/Incasso STRAORDINARIO</span>
            <p className="text-sm text-amber-600 dark:text-amber-400">Non prevista nel piano</p>
          </div>
          <AlertTriangle className="h-5 w-5 text-amber-500 ml-auto" />
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          {centers.map((center) => (
            <button
              key={center.id}
              onClick={() => {
                setSelectedCenter(center);
                if (isExtraordinary) {
                  // Se straordinaria, salta step 3 e vai direttamente al form
                  setSelectedExpected({
                    id: 0,
                    name: "",
                    amount: 0,
                    expectedDay: null,
                    frequency: "one_time",
                    isExtraordinary: true,
                  });
                  setStep(4);
                } else {
                  setStep(3);
                }
              }}
              className="flex flex-col items-center p-4 rounded-lg border-2 hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div
                className="w-4 h-4 rounded-full mb-2"
                style={{ backgroundColor: center.color || "#6b7280" }}
              />
              <span className="font-medium text-center text-sm">{center.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // STEP 3: Movimento previsto
  const renderStep3 = () => {
    const items = getExpectedItems();
    const itemLabel = transactionType === "expense" ? "spesa prevista" : "incasso previsto";

    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <Badge
            style={{ backgroundColor: selectedCenter?.color || "#6b7280" }}
            className="text-white mb-2"
          >
            {selectedCenter?.name}
          </Badge>
          <p className="text-muted-foreground">Seleziona la {itemLabel}</p>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedExpected(item);
                setAmount(formatAmount(item.amount));
                setDescription(item.name);
                // Pre-fill date with expected day
                if (item.expectedDay) {
                  const now = new Date();
                  const expectedDate = new Date(now.getFullYear(), now.getMonth(), item.expectedDay);
                  setDate(expectedDate.toISOString().split("T")[0]);
                }
                setStep(4);
              }}
              className="w-full flex items-center justify-between p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  Previsto giorno {item.expectedDay || "N/D"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(item.amount)}</p>
                <p className="text-xs text-muted-foreground">{formatFrequency(item.frequency)}</p>
              </div>
            </button>
          ))}

          {items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nessun movimento previsto per questo centro
            </div>
          )}

          {/* Opzione movimento non in lista */}
          <button
            onClick={() => {
              setSelectedExpected({
                id: 0,
                name: "",
                amount: 0,
                expectedDay: null,
                frequency: "one_time",
                isExtraordinary: true,
              });
              setIsExtraordinary(true);
              setStep(4);
            }}
            className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-dashed hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950 transition-all"
          >
            <Plus className="h-5 w-5 text-amber-500" />
            <div className="text-left">
              <p className="font-medium text-amber-700 dark:text-amber-400">Movimento non in lista</p>
              <p className="text-sm text-amber-600 dark:text-amber-500">Segna come straordinario</p>
            </div>
          </button>
        </div>
      </div>
    );
  };

  // STEP 4: Dettagli
  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Badge
            style={{ backgroundColor: selectedCenter?.color || "#6b7280" }}
            className="text-white"
          >
            {selectedCenter?.name}
          </Badge>
          {isExtraordinary && (
            <Badge variant="outline" className="border-amber-500 text-amber-600">
              Straordinario
            </Badge>
          )}
        </div>
        {selectedExpected && !selectedExpected.isExtraordinary && (
          <p className="text-sm text-muted-foreground">{selectedExpected.name}</p>
        )}
      </div>

      <div className="space-y-4">
        {/* Descrizione (se straordinaria) */}
        {isExtraordinary && (
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Es. Riparazione PC, Multa, ecc."
            />
          </div>
        )}

        {/* Importo */}
        <div className="space-y-2">
          <Label htmlFor="amount">Importo *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
            <Input
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-8 text-lg font-semibold"
              placeholder="0,00"
            />
          </div>
          {selectedExpected && !selectedExpected.isExtraordinary && (
            <p className="text-xs text-muted-foreground">
              Previsto: {formatCurrency(selectedExpected.amount)}
            </p>
          )}
        </div>

        {/* Data */}
        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Note */}
        <div className="space-y-2">
          <Label htmlFor="notes">Note (opzionale)</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 pl-10 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Aggiungi note..."
            />
          </div>
        </div>
      </div>

      <Button
        className="w-full"
        onClick={() => setStep(5)}
        disabled={!amount || (isExtraordinary && !description)}
      >
        Continua
      </Button>
    </div>
  );

  // STEP 5: Riepilogo
  const renderStep5 = () => {
    const diff = getDifference();
    const actualAmount = parseItalianCurrency(amount);

    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <Check className="h-12 w-12 mx-auto text-green-500 mb-2" />
          <p className="text-lg font-semibold">Riepilogo Movimento</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo</span>
              <Badge variant={transactionType === "income" ? "default" : "destructive"}>
                {transactionType === "income" ? "INCASSO" : "SPESA"}
              </Badge>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Centro</span>
              <Badge style={{ backgroundColor: selectedCenter?.color || "#6b7280" }} className="text-white">
                {selectedCenter?.name}
              </Badge>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Voce</span>
              <span className="font-medium text-right max-w-[200px] truncate">
                {description || selectedExpected?.name}
              </span>
            </div>

            {isExtraordinary && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo</span>
                <Badge variant="outline" className="border-amber-500 text-amber-600">
                  Straordinario
                </Badge>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">Data</span>
              <span className="font-medium">
                {new Date(date).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="flex justify-between text-lg pt-2 border-t">
              <span className="font-semibold">Importo</span>
              <span className={`font-bold ${transactionType === "income" ? "text-green-600" : "text-red-600"}`}>
                {transactionType === "income" ? "+" : "-"}{formatCurrency(actualAmount)}
              </span>
            </div>

            {notes && (
              <div className="pt-2 border-t">
                <span className="text-muted-foreground text-sm">Note:</span>
                <p className="text-sm mt-1">{notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Differenza con previsionale */}
        {diff && (
          <Card className={diff.diff === 0 ? "border-green-200 bg-green-50 dark:bg-green-950" : "border-amber-200 bg-amber-50 dark:bg-amber-950"}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                {diff.diff === 0 ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                <span className="font-semibold">
                  {diff.diff === 0 ? "Come previsto" : "Differenza con previsione"}
                </span>
              </div>

              {diff.diff !== 0 && (
                <div className="grid grid-cols-3 gap-4 text-center mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Previsto</p>
                    <p className="font-semibold">{formatCurrency(diff.expectedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reale</p>
                    <p className="font-semibold">{formatCurrency(actualAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Delta</p>
                    <p className={`font-semibold ${diff.diff > 0 ? "text-red-600" : "text-green-600"}`}>
                      {diff.diff > 0 ? "+" : ""}{formatCurrency(diff.diff)}
                      <span className="text-xs block">
                        ({diff.percentage > 0 ? "+" : ""}{diff.percentage.toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Button
          className="w-full"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Salvataggio..." : "Conferma e Salva"}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  if (step === 4 && isExtraordinary && step === 4) {
                    // Se siamo allo step 4 e siamo in straordinario, torna allo step 2
                    setStep(2);
                  } else {
                    setStep(step - 1);
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle>
              {step === 1 && "Nuovo Movimento"}
              {step === 2 && (transactionType === "expense" ? "Centro di Costo" : "Centro di Ricavo")}
              {step === 3 && "Movimento Previsto"}
              {step === 4 && "Dettagli"}
              {step === 5 && "Conferma"}
            </DialogTitle>
          </div>

          {/* Progress indicator */}
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Caricamento...</div>
          </div>
        ) : (
          <div className="py-4">{renderStep()}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
