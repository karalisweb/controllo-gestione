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
import {
  Calendar,
  Pencil,
  Trash2,
  FileStack,
  Check,
  X,
  Plus,
  RefreshCw,
} from "lucide-react";

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

  // Calcola totali mese
  const monthTotals = useMemo(() => {
    const incomes = filteredItems
      .filter((i) => i.type === "income")
      .reduce((sum, i) => sum + i.amount, 0);
    const expenses = filteredItems
      .filter((i) => i.type === "expense")
      .reduce((sum, i) => sum + i.amount, 0);
    return { incomes, expenses, net: incomes - expenses };
  }, [filteredItems]);

  return (
    <div className="space-y-4">
      {/* Header con azioni */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Previsionale</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onGenerate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Genera da Piano
              </Button>
              <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuova Voce
              </Button>
            </div>
          </div>

          {/* Filtri mese */}
          <div className="flex flex-wrap gap-1 mt-4">
            <Button
              variant={selectedMonth === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedMonth("all")}
              className="text-xs"
            >
              Anno
            </Button>
            {MONTHS_SHORT.map((month, idx) => (
              <Button
                key={month}
                variant={selectedMonth === idx + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMonth(idx + 1)}
                className="text-xs px-3"
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
            >
              Tutto ({filteredItems.length})
            </Button>
            <Button
              variant={filter === "expense" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("expense")}
            >
              Spese
            </Button>
            <Button
              variant={filter === "income" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("income")}
            >
              Incassi
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Riepilogo */}
          <div className="grid grid-cols-4 gap-4 mb-4 p-3 bg-muted/30 rounded-lg">
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

          {/* Tabella */}
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
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
              <label className="text-sm font-medium">Importo</label>
              <Input
                value={newItemData.amount}
                onChange={(e) => setNewItemData({ ...newItemData, amount: e.target.value })}
                placeholder="Es: 500"
              />
            </div>

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
    </div>
  );
}
