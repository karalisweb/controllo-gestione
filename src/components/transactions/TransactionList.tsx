"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import type { Category, CostCenter, RevenueCenter } from "@/types";
import { Trash2, Calculator, AlertTriangle, ArrowRightLeft } from "lucide-react";

interface TransactionWithCenters {
  id: number;
  externalId: string | null;
  date: string;
  description: string | null;
  amount: number;
  categoryId: number | null;
  costCenterId: number | null;
  revenueCenterId: number | null;
  isSplit: boolean | null;
  isTransfer?: boolean | null;
  notes: string | null;
  createdAt: Date | null;
  category?: { id: number | null; name: string | null; type: string | null; color: string | null } | null;
  costCenter?: { id: number | null; name: string | null; color: string | null } | null;
  revenueCenter?: { id: number | null; name: string | null; color: string | null } | null;
}

interface TransactionListProps {
  transactions: TransactionWithCenters[];
  categories: Category[];
  onDelete: (id: number) => Promise<void>;
  onUpdateCategory: (id: number, categoryId: number | null) => Promise<void>;
  onSplit: (transaction: TransactionWithCenters) => void;
}

export function TransactionList({
  transactions,
  categories,
  onDelete,
  onUpdateCategory,
  onSplit,
}: TransactionListProps) {
  const [loading, setLoading] = useState<number | null>(null);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [revenueCenters, setRevenueCenters] = useState<RevenueCenter[]>([]);

  // Fetch centri di costo/ricavo
  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const [costRes, revenueRes] = await Promise.all([
          fetch("/api/cost-centers"),
          fetch("/api/revenue-centers"),
        ]);
        const [costData, revenueData] = await Promise.all([
          costRes.json(),
          revenueRes.json(),
        ]);
        setCostCenters(costData.filter((c: CostCenter) => c.isActive));
        setRevenueCenters(revenueData.filter((r: RevenueCenter) => r.isActive));
      } catch (error) {
        console.error("Errore caricamento centri:", error);
      }
    };
    fetchCenters();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Sei sicuro di voler eliminare questa transazione?")) return;
    setLoading(id);
    try {
      await onDelete(id);
    } finally {
      setLoading(null);
    }
  };

  const handleCenterChange = async (
    transactionId: number,
    centerId: string,
    isIncome: boolean
  ) => {
    setLoading(transactionId);
    try {
      const payload = isIncome
        ? { revenueCenterId: centerId === "none" ? null : parseInt(centerId) }
        : { costCenterId: centerId === "none" ? null : parseInt(centerId) };

      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Errore aggiornamento");

      // Trigger refresh (onUpdateCategory is used as refresh callback)
      await onUpdateCategory(transactionId, null);
    } catch (error) {
      console.error("Errore:", error);
    } finally {
      setLoading(null);
    }
  };

  // Check if transaction is extraordinary (from notes)
  const isExtraordinary = (tx: TransactionWithCenters) => {
    return tx.notes?.includes("[STRAORDINARIO]");
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nessuna transazione trovata.</p>
        <p className="text-sm">Usa &quot;Nuovo Movimento&quot; per inserire manualmente o importa da Qonto.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Data</TableHead>
            <TableHead>Descrizione</TableHead>
            <TableHead className="w-48">Centro</TableHead>
            <TableHead className="text-right w-32">Importo</TableHead>
            <TableHead className="w-28 text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const isIncome = tx.amount > 0;
            const isTransfer = tx.isTransfer;
            const centers = isIncome ? revenueCenters : costCenters;
            const currentCenter = isIncome ? tx.revenueCenter : tx.costCenter;
            const currentCenterId = isIncome ? tx.revenueCenterId : tx.costCenterId;
            const extraordinary = isExtraordinary(tx);

            return (
              <TableRow key={tx.id} className={isTransfer ? "bg-purple-50 dark:bg-purple-950/20" : ""}>
                <TableCell className="font-mono text-sm">
                  {formatDate(tx.date)}
                </TableCell>
                <TableCell>
                  <div className="max-w-md">
                    <div className="flex items-center gap-2">
                      {isTransfer && (
                        <ArrowRightLeft className="h-4 w-4 text-purple-500 shrink-0" />
                      )}
                      <p className="truncate">{tx.description || "-"}</p>
                      {extraordinary && (
                        <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs shrink-0">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Straord.
                        </Badge>
                      )}
                    </div>
                    {tx.notes && !extraordinary && !tx.notes.includes("[RIPARTIZIONE]") && (
                      <p className="text-xs text-muted-foreground truncate">
                        {tx.notes}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {isTransfer ? (
                    <Badge variant="outline" className="border-purple-500 text-purple-600">
                      <ArrowRightLeft className="h-3 w-3 mr-1" />
                      Giroconto
                    </Badge>
                  ) : currentCenter ? (
                    <Badge
                      style={{
                        backgroundColor: currentCenter.color || "#6b7280",
                        color: "white",
                      }}
                    >
                      {currentCenter.name}
                    </Badge>
                  ) : (
                    <Select
                      value={currentCenterId?.toString() || "none"}
                      onValueChange={(value) =>
                        handleCenterChange(tx.id, value, isIncome)
                      }
                      disabled={loading === tx.id}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Assegna centro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">Non assegnato</span>
                        </SelectItem>
                        {centers.map((center) => (
                          <SelectItem key={center.id} value={center.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: center.color || "#6b7280" }}
                              />
                              {center.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={`font-mono font-medium ${
                      isTransfer ? "text-purple-600" : isIncome ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isIncome ? "+" : ""}
                    {formatCurrency(tx.amount)}
                  </span>
                  {tx.isSplit && (
                    <Badge
                      variant="secondary"
                      className="ml-2 text-xs bg-blue-100 text-blue-800"
                    >
                      Ripartito
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {isIncome && !tx.isSplit && !isTransfer && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        onClick={() => onSplit(tx)}
                        title="Calcola ripartizione"
                      >
                        <Calculator className="h-4 w-4" />
                      </Button>
                    )}
                    {!isTransfer && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(tx.id)}
                        disabled={loading === tx.id}
                        title="Elimina"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
