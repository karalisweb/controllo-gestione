"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionList } from "@/components/transactions/TransactionList";
import { ImportModal } from "@/components/transactions/ImportModal";
import { SplitCalculator } from "@/components/transactions/SplitCalculator";
import { QuickTransactionInput } from "@/components/transactions/QuickTransactionInput";
import { SplitsSummary } from "@/components/transactions/SplitsSummary";
import { formatCurrency } from "@/lib/utils/currency";
import type { Category } from "@/types";
import { Upload, TrendingUp, TrendingDown, Wallet, Plus } from "lucide-react";

// Tipo per transazioni con centri di costo/ricavo
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
  linkedTransactionId?: number | null;
  notes: string | null;
  createdAt: Date | null;
  category?: { id: number | null; name: string | null; type: string | null; color: string | null } | null;
  costCenter?: { id: number | null; name: string | null; color: string | null } | null;
  revenueCenter?: { id: number | null; name: string | null; color: string | null } | null;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithCenters[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [quickInputOpen, setQuickInputOpen] = useState(false);
  const [splitTransaction, setSplitTransaction] = useState<TransactionWithCenters | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("all");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [txRes, catRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/categories"),
      ]);

      if (!txRes.ok || !catRes.ok) {
        throw new Error("Errore nel caricamento dei dati");
      }

      const [txData, catData] = await Promise.all([
        txRes.json(),
        catRes.json(),
      ]);

      setTransactions(txData);
      setCategories(catData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Errore nell'eliminazione");
    await fetchData();
  };

  const handleUpdateCategory = async (
    id: number,
    categoryId: number | null
  ) => {
    const res = await fetch(`/api/transactions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
    if (!res.ok) throw new Error("Errore nell'aggiornamento");
    await fetchData();
  };

  const handleSplitComplete = async () => {
    await fetchData();
    setSplitTransaction(null);
  };

  // Filtra transazioni per tab
  const filteredTransactions =
    activeTab === "all"
      ? transactions
      : activeTab === "income"
        ? transactions.filter((t) => t.amount > 0)
        : transactions.filter((t) => t.amount < 0);

  // Calcola totali
  const totalIncome = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome + totalExpense;

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Caricamento...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Errore: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">Consuntivo</h1>
          <p className="text-muted-foreground">
            Movimenti reali importati da Qonto
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setQuickInputOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Movimento
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importa CSV
          </Button>
        </div>
      </div>

      {/* Riepilogo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Totale Entrate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter((t) => t.amount > 0).length} movimenti
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Uscite</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter((t) => t.amount < 0).length} movimenti
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                balance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(balance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Differenza entrate - uscite
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Riepilogo ripartizioni (bonifici soci + IVA) */}
      <div className="mb-8">
        <SplitsSummary />
      </div>

      {/* Lista transazioni */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Tutti ({transactions.length})
          </TabsTrigger>
          <TabsTrigger value="income">
            Entrate ({transactions.filter((t) => t.amount > 0).length})
          </TabsTrigger>
          <TabsTrigger value="expense">
            Uscite ({transactions.filter((t) => t.amount < 0).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <TransactionList
            transactions={filteredTransactions}
            categories={categories}
            onDelete={handleDelete}
            onUpdateCategory={handleUpdateCategory}
            onSplit={(tx) => setSplitTransaction(tx)}
          />
        </TabsContent>
      </Tabs>

      {/* Modali */}
      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={fetchData}
      />

      <QuickTransactionInput
        open={quickInputOpen}
        onOpenChange={setQuickInputOpen}
        onComplete={fetchData}
      />

      {splitTransaction && (
        <SplitCalculator
          transaction={splitTransaction}
          open={!!splitTransaction}
          onOpenChange={(open) => !open && setSplitTransaction(null)}
          onComplete={handleSplitComplete}
        />
      )}
    </div>
  );
}
