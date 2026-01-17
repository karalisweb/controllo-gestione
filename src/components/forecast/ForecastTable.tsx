"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, eurosToCents, centsToEuros } from "@/lib/utils/currency";
import { MONTHS_SHORT } from "@/lib/utils/dates";
import { calculateSplit } from "@/lib/utils/splits";
import {
  Calendar,
  Pencil,
  Trash2,
  FileStack,
  Check,
  X,
  Plus,
  RefreshCw,
  ChevronRight,
  Calculator,
  Users,
  Receipt,
  Building2,
  ArrowRight,
} from "lucide-react";
import { ForecastSplitPreview } from "./ForecastSplitPreview";

// Componente card per vista mobile
function ForecastCard({
  item,
  balance,
  formatDateDisplay,
  onDelete,
  onOpenPDR,
  onShowSplit,
}: {
  item: ForecastItem;
  balance: number;
  formatDateDisplay: (date: string) => string;
  onDelete: (id: number) => Promise<void>;
  onOpenPDR: (id: number) => void;
  onShowSplit: (item: ForecastItem) => void;
}) {
  return (
    <div className="p-3 border-b last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Data e Centro */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground">
              {formatDateDisplay(item.date)}
            </span>
            {item.type === "expense" && item.costCenter ? (
              <div className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.costCenter.color || "#666" }}
                />
                <span className="text-xs text-muted-foreground">{item.costCenter.name}</span>
              </div>
            ) : item.type === "income" && item.revenueCenter ? (
              <div className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.revenueCenter.color || "#666" }}
                />
                <span className="text-xs text-muted-foreground">{item.revenueCenter.name}</span>
              </div>
            ) : null}
            {item.sourceType === "pdr" && (
              <Badge variant="outline" className="text-xs">PDR</Badge>
            )}
          </div>
          {/* Descrizione */}
          <p className="text-sm font-medium">{item.description}</p>
          {/* Preview ripartizione compatta per incassi */}
          {item.type === "income" && (
            <div className="mt-1">
              <ForecastSplitPreview amount={item.amount} compact />
            </div>
          )}
        </div>
        {/* Importo e Saldo */}
        <div className="text-right shrink-0">
          <div
            className={`font-mono font-bold ${
              item.type === "income" ? "text-green-600" : "text-red-600"
            }`}
          >
            {item.type === "income" ? "+" : "-"}
            {formatCurrency(item.amount)}
          </div>
          <div className={`font-mono text-xs ${balance >= 0 ? "text-green-700" : "text-red-700"}`}>
            <ChevronRight className="h-3 w-3 inline" />
            {formatCurrency(balance)}
          </div>
        </div>
      </div>
      {/* Azioni */}
      <div className="flex justify-end gap-2 mt-2">
        {item.type === "income" && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs text-blue-600"
            onClick={() => onShowSplit(item)}
          >
            <Calculator className="h-3 w-3 mr-1" />
            Ripartizione
          </Button>
        )}
        {item.type === "expense" && item.sourceType !== "pdr" && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs text-blue-600"
            onClick={() => onOpenPDR(item.id)}
          >
            <FileStack className="h-3 w-3 mr-1" />
            PDR
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs text-red-500"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Elimina
        </Button>
      </div>
    </div>
  );
}

// Types
interface ForecastItem {
  id: number;
  date: string;
  description: string;
  type: "income" | "expense";
  amount: number;
  sourceType: string;
  sourceId: number | null;
  costCenterId: number | null;
  revenueCenterId: number | null;
  paymentPlanId: number | null;
  reliability: string | null;
  priority: string | null;
  notes: string | null;
  costCenter?: { id: number; name: string; color: string | null } | null;
  revenueCenter?: { id: number; name: string; color: string | null } | null;
}

interface PaymentPlan {
  id: number;
  creditorName: string;
  totalAmount: number;
  installmentAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  isActive: boolean;
}

interface CostCenter {
  id: number;
  name: string;
  color: string | null;
}

interface RevenueCenter {
  id: number;
  name: string;
  color: string | null;
}

interface ForecastTableProps {
  items: ForecastItem[];
  paymentPlans: PaymentPlan[];
  costCenters: CostCenter[];
  revenueCenters: RevenueCenter[];
  initialBalance: number;
  onUpdate: (id: number, data: Partial<ForecastItem>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onMoveToPDR: (
    id: number,
    planId?: number,
    newPlanData?: {
      creditorName: string;
      installmentAmount: number;
      totalInstallments: number;
      startDate: string;
    }
  ) => Promise<void>;
  onAdd: (data: {
    date: string;
    description: string;
    type: "income" | "expense";
    amount: number;
    costCenterId?: number;
    revenueCenterId?: number;
    reliability?: string;
    priority?: string;
    notes?: string;
  }) => Promise<void>;
  onRefresh: () => void;
  onGenerate: () => void;
}

export function ForecastTable({
  items,
  paymentPlans,
  costCenters,
  revenueCenters,
  initialBalance,
  onUpdate,
  onDelete,
  onMoveToPDR,
  onAdd,
  onRefresh,
  onGenerate,
}: ForecastTableProps) {
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");

  // Stati per editing inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<"date" | "amount" | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Stati per modale PDR
  const [pdrDialogOpen, setPdrDialogOpen] = useState(false);
  const [pdrItemId, setPdrItemId] = useState<number | null>(null);
  const [pdrMode, setPdrMode] = useState<"existing" | "new">("existing");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [newPlanData, setNewPlanData] = useState({
    creditorName: "",
    installmentAmount: "",
    totalInstallments: "",
    startDate: "",
  });

  // Stati per modale aggiunta
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Stati per modale ripartizione
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitItem, setSplitItem] = useState<ForecastItem | null>(null);

  const [newItemData, setNewItemData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    type: "expense" as "income" | "expense",
    amount: "",
    costCenterId: "",
    revenueCenterId: "",
    notes: "",
  });

  // Filtra items
  const filteredItems = useMemo(() => {
    let filtered = [...items];

    if (filter !== "all") {
      filtered = filtered.filter((item) => item.type === filter);
    }

    if (selectedMonth !== "all") {
      filtered = filtered.filter((item) => {
        const month = new Date(item.date).getMonth() + 1;
        return month === selectedMonth;
      });
    }

    // Ordina per data
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return filtered;
  }, [items, filter, selectedMonth]);

  // Calcola saldo iniziale per il mese selezionato
  const monthInitialBalance = useMemo(() => {
    if (selectedMonth === "all") return initialBalance;

    // Somma tutti i movimenti precedenti al mese selezionato
    const previousItems = items.filter((item) => {
      const month = new Date(item.date).getMonth() + 1;
      return month < selectedMonth;
    });

    const previousSum = previousItems.reduce((sum, item) => {
      return sum + (item.type === "income" ? item.amount : -item.amount);
    }, 0);

    return initialBalance + previousSum;
  }, [items, selectedMonth, initialBalance]);

  // Calcola saldo progressivo
  const itemsWithBalance = useMemo(() => {
    let runningBalance = monthInitialBalance;
    return filteredItems.map((item) => {
      const change = item.type === "income" ? item.amount : -item.amount;
      runningBalance += change;
      return { ...item, balance: runningBalance };
    });
  }, [filteredItems, monthInitialBalance]);

  // Formatta data per display
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(2);
    return `${day}/${month}/${year}`;
  };

  // Inizia editing
  const startEdit = (id: number, field: "date" | "amount", currentValue: string | number) => {
    setEditingId(id);
    setEditingField(field);
    if (field === "amount") {
      setEditValue(centsToEuros(currentValue as number).toString());
    } else {
      setEditValue(currentValue as string);
    }
  };

  // Salva editing
  const saveEdit = async () => {
    if (editingId === null || editingField === null) return;

    try {
      if (editingField === "amount") {
        const newAmount = eurosToCents(parseFloat(editValue.replace(",", ".")));
        await onUpdate(editingId, { amount: newAmount });
      } else if (editingField === "date") {
        await onUpdate(editingId, { date: editValue });
      }
    } catch (error) {
      console.error("Errore salvataggio:", error);
    }

    setEditingId(null);
    setEditingField(null);
    setEditValue("");
  };

  // Annulla editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditingField(null);
    setEditValue("");
  };

  // Gestisce keydown per editing
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  // Apri modale ripartizione
  const openSplitDialog = (item: ForecastItem) => {
    setSplitItem(item);
    setSplitDialogOpen(true);
  };

  // Apri modale PDR
  const openPDRDialog = (itemId: number) => {
    const item = items.find((i) => i.id === itemId);
    setPdrItemId(itemId);
    setPdrMode(paymentPlans.length > 0 ? "existing" : "new");
    setSelectedPlanId("");
    setNewPlanData({
      creditorName: item?.description || "",
      installmentAmount: item ? centsToEuros(item.amount).toString() : "",
      totalInstallments: "3",
      startDate: new Date().toISOString().split("T")[0],
    });
    setPdrDialogOpen(true);
  };

  // Conferma PDR
  const confirmPDR = async () => {
    if (pdrItemId === null) return;

    try {
      if (pdrMode === "existing" && selectedPlanId) {
        await onMoveToPDR(pdrItemId, parseInt(selectedPlanId));
      } else if (pdrMode === "new") {
        await onMoveToPDR(pdrItemId, undefined, {
          creditorName: newPlanData.creditorName,
          installmentAmount: eurosToCents(parseFloat(newPlanData.installmentAmount.replace(",", "."))),
          totalInstallments: parseInt(newPlanData.totalInstallments),
          startDate: newPlanData.startDate,
        });
      }
      setPdrDialogOpen(false);
    } catch (error) {
      console.error("Errore spostamento PDR:", error);
    }
  };

  // Conferma aggiunta
  const confirmAdd = async () => {
    try {
      await onAdd({
        date: newItemData.date,
        description: newItemData.description,
        type: newItemData.type,
        amount: eurosToCents(parseFloat(newItemData.amount.replace(",", "."))),
        costCenterId: newItemData.costCenterId ? parseInt(newItemData.costCenterId) : undefined,
        revenueCenterId: newItemData.revenueCenterId ? parseInt(newItemData.revenueCenterId) : undefined,
        notes: newItemData.notes || undefined,
      });
      setAddDialogOpen(false);
      setNewItemData({
        date: new Date().toISOString().split("T")[0],
        description: "",
        type: "expense",
        amount: "",
        costCenterId: "",
        revenueCenterId: "",
        notes: "",
      });
    } catch (error) {
      console.error("Errore aggiunta:", error);
    }
  };

  // Calcola totali mese incluse ripartizioni
  const monthTotals = useMemo(() => {
    const incomeItems = filteredItems.filter((i) => i.type === "income");
    const incomes = incomeItems.reduce((sum, i) => sum + i.amount, 0);
    const expenses = filteredItems
      .filter((i) => i.type === "expense")
      .reduce((sum, i) => sum + i.amount, 0);

    // Calcola ripartizioni aggregate sugli incassi
    const splitTotals = incomeItems.reduce(
      (acc, item) => {
        const split = calculateSplit(item.amount);
        return {
          grossAmount: acc.grossAmount + split.grossAmount,
          netAmount: acc.netAmount + split.netAmount,
          danielaAmount: acc.danielaAmount + split.danielaAmount,
          alessioAmount: acc.alessioAmount + split.alessioAmount,
          agencyAmount: acc.agencyAmount + split.agencyAmount,
          vatAmount: acc.vatAmount + split.vatAmount,
        };
      },
      {
        grossAmount: 0,
        netAmount: 0,
        danielaAmount: 0,
        alessioAmount: 0,
        agencyAmount: 0,
        vatAmount: 0,
      }
    );

    const totaleSoci = splitTotals.danielaAmount + splitTotals.alessioAmount;
    const totaleBonifico = totaleSoci + splitTotals.vatAmount;

    return {
      incomes,
      expenses,
      net: incomes - expenses,
      splits: {
        ...splitTotals,
        totaleSoci,
        totaleBonifico,
      },
    };
  }, [filteredItems]);

  return (
    <div className="space-y-4">
      {/* Header con azioni */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="text-lg">Previsionale</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={onGenerate} className="flex-1 sm:flex-none text-xs sm:text-sm">
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Genera da Piano</span>
                <span className="sm:hidden ml-1">Genera</span>
              </Button>
              <Button size="sm" onClick={() => setAddDialogOpen(true)} className="flex-1 sm:flex-none text-xs sm:text-sm">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nuova Voce</span>
                <span className="sm:hidden ml-1">Nuova</span>
              </Button>
            </div>
          </div>

          {/* Filtri mese - scrollabile su mobile */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-2 -mx-2 px-2">
            <Button
              variant={selectedMonth === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedMonth("all")}
              className="text-xs shrink-0"
            >
              Anno
            </Button>
            {MONTHS_SHORT.map((month, idx) => (
              <Button
                key={month}
                variant={selectedMonth === idx + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMonth(idx + 1)}
                className="text-xs px-2 sm:px-3 shrink-0"
              >
                {month}
              </Button>
            ))}
          </div>

          {/* Filtri tipo */}
          <div className="flex gap-2 mt-2">
            <Button
              variant={filter === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("all")}
              className="text-xs sm:text-sm"
            >
              Tutto ({filteredItems.length})
            </Button>
            <Button
              variant={filter === "expense" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("expense")}
              className="text-xs sm:text-sm"
            >
              Spese
            </Button>
            <Button
              variant={filter === "income" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("income")}
              className="text-xs sm:text-sm"
            >
              Incassi
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Riepilogo - Desktop */}
          <div className="hidden sm:grid grid-cols-4 gap-4 mb-4 p-3 bg-muted/30 rounded-lg">
            <div>
              <div className="text-xs text-muted-foreground">Saldo Iniziale</div>
              <div className={`font-mono font-bold ${monthInitialBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
                {formatCurrency(monthInitialBalance)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Incassi</div>
              <div className="font-mono font-bold text-green-600">
                +{formatCurrency(monthTotals.incomes)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Spese</div>
              <div className="font-mono font-bold text-red-600">
                -{formatCurrency(monthTotals.expenses)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Saldo Finale</div>
              <div className={`font-mono font-bold ${monthInitialBalance + monthTotals.net >= 0 ? "text-green-700" : "text-red-700"}`}>
                {formatCurrency(monthInitialBalance + monthTotals.net)}
              </div>
            </div>
          </div>

          {/* Riepilogo - Mobile (compatto) */}
          <div className="sm:hidden grid grid-cols-3 gap-2 mb-4 p-2 bg-muted/30 rounded-lg text-center">
            <div>
              <div className="text-xs text-muted-foreground">Saldo Iniziale</div>
              <div className={`font-mono text-sm font-bold ${monthInitialBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
                {formatCurrency(monthInitialBalance)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Incassi</div>
              <div className="font-mono text-sm font-bold text-green-600">
                +{formatCurrency(monthTotals.incomes)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Spese</div>
              <div className="font-mono text-sm font-bold text-red-600">
                -{formatCurrency(monthTotals.expenses)}
              </div>
            </div>
          </div>

          {/* Riepilogo Ripartizioni Previste */}
          {monthTotals.splits.grossAmount > 0 && (
            <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                  Ripartizioni Previste
                </span>
              </div>

              {/* Desktop - Griglia completa */}
              <div className="hidden sm:grid grid-cols-5 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Users className="h-3 w-3 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Soci</div>
                    <div className="font-mono font-medium text-indigo-600">
                      {formatCurrency(monthTotals.splits.totaleSoci)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center">
                    <Receipt className="h-3 w-3 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Fondo IVA</div>
                    <div className="font-mono font-medium text-orange-600">
                      {formatCurrency(monthTotals.splits.vatAmount)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center">
                    <ArrowRight className="h-3 w-3 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Bonifico</div>
                    <div className="font-mono font-bold text-purple-600">
                      {formatCurrency(monthTotals.splits.totaleBonifico)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Building2 className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Disponibile</div>
                    <div className="font-mono font-bold text-green-600">
                      {formatCurrency(monthTotals.splits.agencyAmount)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">su Incassi Lordi</div>
                  <div className="font-mono font-medium">
                    {formatCurrency(monthTotals.splits.grossAmount)}
                  </div>
                </div>
              </div>

              {/* Mobile - Griglia compatta */}
              <div className="sm:hidden grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between bg-purple-100 dark:bg-purple-900/30 rounded px-2 py-1">
                  <span className="text-xs text-purple-700 dark:text-purple-300">Bonifico</span>
                  <span className="font-mono font-bold text-purple-600">
                    {formatCurrency(monthTotals.splits.totaleBonifico)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-green-100 dark:bg-green-900/30 rounded px-2 py-1">
                  <span className="text-xs text-green-700 dark:text-green-300">Disponibile</span>
                  <span className="font-mono font-bold text-green-600">
                    {formatCurrency(monthTotals.splits.agencyAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Vista Mobile - Cards */}
          <div className="sm:hidden border rounded-lg max-h-[500px] overflow-y-auto">
            {itemsWithBalance.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 px-4">
                Nessuna voce. Clicca &quot;Genera da Piano&quot; per popolare il previsionale.
              </div>
            ) : (
              itemsWithBalance.map((item) => (
                <ForecastCard
                  key={item.id}
                  item={item}
                  balance={item.balance}
                  formatDateDisplay={formatDateDisplay}
                  onDelete={onDelete}
                  onOpenPDR={openPDRDialog}
                  onShowSplit={openSplitDialog}
                />
              ))
            )}
          </div>

          {/* Vista Desktop - Tabella */}
          <div className="hidden sm:block overflow-x-auto max-h-[600px] overflow-y-auto border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Data</TableHead>
                  <TableHead className="w-[120px]">Tipo</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead className="text-right w-[120px]">Importo</TableHead>
                  <TableHead className="text-right w-[120px]">Saldo</TableHead>
                  <TableHead className="w-[120px] text-center">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsWithBalance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nessuna voce. Clicca "Genera da Piano" per popolare il previsionale.
                    </TableCell>
                  </TableRow>
                ) : (
                  itemsWithBalance.map((item) => (
                    <TableRow key={item.id} className="group">
                      {/* Data */}
                      <TableCell>
                        {editingId === item.id && editingField === "date" ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="date"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              className="h-7 w-[120px] text-xs"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEdit}>
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="font-mono text-sm cursor-pointer hover:bg-muted px-2 py-1 rounded flex items-center gap-1"
                            onClick={() => startEdit(item.id, "date", item.date)}
                          >
                            {formatDateDisplay(item.date)}
                            <Calendar className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                          </div>
                        )}
                      </TableCell>

                      {/* Tipo/Centro */}
                      <TableCell>
                        {item.type === "expense" && item.costCenter ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.costCenter.color || "#666" }}
                            />
                            <span className="text-xs truncate">{item.costCenter.name}</span>
                          </div>
                        ) : item.type === "income" && item.revenueCenter ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.revenueCenter.color || "#666" }}
                            />
                            <span className="text-xs truncate">{item.revenueCenter.name}</span>
                          </div>
                        ) : (
                          <Badge variant={item.type === "income" ? "default" : "secondary"} className="text-xs">
                            {item.type === "income" ? "Incasso" : "Spesa"}
                          </Badge>
                        )}
                        {item.sourceType === "pdr" && (
                          <Badge variant="outline" className="text-xs ml-1">PDR</Badge>
                        )}
                      </TableCell>

                      {/* Descrizione */}
                      <TableCell className="font-medium">
                        {item.description}
                      </TableCell>

                      {/* Importo */}
                      <TableCell className="text-right">
                        {editingId === item.id && editingField === "amount" ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              className="h-7 w-[80px] text-xs text-right"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEdit}>
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className={`font-mono cursor-pointer hover:bg-muted px-2 py-1 rounded inline-flex items-center gap-1 ${
                              item.type === "income" ? "text-green-600" : "text-red-600"
                            }`}
                            onClick={() => startEdit(item.id, "amount", item.amount)}
                          >
                            {item.type === "income" ? "+" : "-"}
                            {formatCurrency(item.amount)}
                            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                          </div>
                        )}
                      </TableCell>

                      {/* Saldo */}
                      <TableCell className={`text-right font-mono font-bold ${
                        item.balance >= 0 ? "text-green-700" : "text-red-700"
                      }`}>
                        {formatCurrency(item.balance)}
                      </TableCell>

                      {/* Azioni */}
                      <TableCell>
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.type === "income" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => openSplitDialog(item)}
                              title="Vedi ripartizione"
                            >
                              <Calculator className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          {item.type === "expense" && item.sourceType !== "pdr" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => openPDRDialog(item.id)}
                              title="Sposta in PDR"
                            >
                              <FileStack className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => onDelete(item.id)}
                            title="Elimina"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog PDR */}
      <Dialog open={pdrDialogOpen} onOpenChange={setPdrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sposta in Piano di Rientro</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {paymentPlans.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant={pdrMode === "existing" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPdrMode("existing")}
                >
                  Piano Esistente
                </Button>
                <Button
                  variant={pdrMode === "new" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPdrMode("new")}
                >
                  Nuovo Piano
                </Button>
              </div>
            )}

            {pdrMode === "existing" && paymentPlans.length > 0 ? (
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona piano..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.creditorName} ({formatCurrency(plan.installmentAmount)}/mese)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Nome Creditore</label>
                  <Input
                    value={newPlanData.creditorName}
                    onChange={(e) => setNewPlanData({ ...newPlanData, creditorName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Importo Rata</label>
                    <Input
                      value={newPlanData.installmentAmount}
                      onChange={(e) => setNewPlanData({ ...newPlanData, installmentAmount: e.target.value })}
                      placeholder="Es: 100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">N. Rate</label>
                    <Input
                      type="number"
                      value={newPlanData.totalInstallments}
                      onChange={(e) => setNewPlanData({ ...newPlanData, totalInstallments: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Data Prima Rata</label>
                  <Input
                    type="date"
                    value={newPlanData.startDate}
                    onChange={(e) => setNewPlanData({ ...newPlanData, startDate: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPdrDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={confirmPDR}>
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Aggiungi */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova Voce Previsionale</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={newItemData.type === "expense" ? "default" : "outline"}
                size="sm"
                onClick={() => setNewItemData({ ...newItemData, type: "expense" })}
              >
                Spesa
              </Button>
              <Button
                variant={newItemData.type === "income" ? "default" : "outline"}
                size="sm"
                onClick={() => setNewItemData({ ...newItemData, type: "income" })}
              >
                Incasso
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium">Data</label>
              <Input
                type="date"
                value={newItemData.date}
                onChange={(e) => setNewItemData({ ...newItemData, date: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Descrizione</label>
              <Input
                value={newItemData.description}
                onChange={(e) => setNewItemData({ ...newItemData, description: e.target.value })}
                placeholder="Es: Consulenza cliente X"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Importo (lordo IVA inclusa)</label>
              <Input
                value={newItemData.amount}
                onChange={(e) => setNewItemData({ ...newItemData, amount: e.target.value })}
                placeholder="Es: 500"
              />
            </div>

            {/* Preview ripartizione per incassi */}
            {newItemData.type === "income" && newItemData.amount && parseFloat(newItemData.amount.replace(",", ".")) > 0 && (
              <ForecastSplitPreview
                amount={parseFloat(newItemData.amount.replace(",", "."))}
                fromEuros={true}
              />
            )}

            {newItemData.type === "expense" && (
              <div>
                <label className="text-sm font-medium">Centro di Costo</label>
                <Select
                  value={newItemData.costCenterId}
                  onValueChange={(v) => setNewItemData({ ...newItemData, costCenterId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {costCenters.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id.toString()}>
                        {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newItemData.type === "income" && (
              <div>
                <label className="text-sm font-medium">Centro di Ricavo</label>
                <Select
                  value={newItemData.revenueCenterId}
                  onValueChange={(v) => setNewItemData({ ...newItemData, revenueCenterId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {revenueCenters.map((rc) => (
                      <SelectItem key={rc.id} value={rc.id.toString()}>
                        {rc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Note (opzionale)</label>
              <Input
                value={newItemData.notes}
                onChange={(e) => setNewItemData({ ...newItemData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={confirmAdd}
              disabled={!newItemData.description || !newItemData.amount}
            >
              Aggiungi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ripartizione */}
      <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Ripartizione Incasso Previsto
            </DialogTitle>
          </DialogHeader>

          {splitItem && (
            <div className="space-y-4">
              {/* Info incasso */}
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="text-sm text-muted-foreground mb-1">
                  {formatDateDisplay(splitItem.date)}
                </div>
                <div className="font-medium text-lg">{splitItem.description}</div>
                <div className="text-2xl font-bold text-green-600 mt-2">
                  {formatCurrency(splitItem.amount)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Importo lordo (IVA inclusa)
                </div>
              </div>

              {/* Preview ripartizione completa */}
              <ForecastSplitPreview amount={splitItem.amount} />
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setSplitDialogOpen(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
