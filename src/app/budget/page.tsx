"use client";

import { useEffect, useState, useCallback } from "react";
import { BudgetTable } from "@/components/budget/BudgetTable";
import type { BudgetItem, Category, CostCenter, RevenueCenter, ExpectedExpense, ExpectedIncome } from "@/types";

export default function BudgetPage() {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [revenueCenters, setRevenueCenters] = useState<RevenueCenter[]>([]);
  const [expectedExpenses, setExpectedExpenses] = useState<ExpectedExpense[]>([]);
  const [expectedIncomes, setExpectedIncomes] = useState<ExpectedIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [budgetRes, categoriesRes, costCentersRes, revenueCentersRes, expensesRes, incomesRes] = await Promise.all([
        fetch("/api/budget?year=2026"),
        fetch("/api/categories"),
        fetch("/api/cost-centers"),
        fetch("/api/revenue-centers"),
        fetch("/api/expected-expenses?year=2026"),
        fetch("/api/expected-incomes?year=2026"),
      ]);

      if (!budgetRes.ok || !categoriesRes.ok || !costCentersRes.ok || !revenueCentersRes.ok) {
        throw new Error("Errore nel caricamento dei dati");
      }

      const budgetData = await budgetRes.json();
      const categoriesData = await categoriesRes.json();
      const costCentersData = await costCentersRes.json();
      const revenueCentersData = await revenueCentersRes.json();
      const expensesData = expensesRes.ok ? await expensesRes.json() : [];
      const incomesData = incomesRes.ok ? await incomesRes.json() : [];

      setItems(budgetData);
      setCategories(categoriesData);
      setCostCenters(costCentersData);
      setRevenueCenters(revenueCentersData);
      setExpectedExpenses(expensesData);
      setExpectedIncomes(incomesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async (data: {
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
  }) => {
    const res = await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error("Errore nel salvataggio");
    }

    await fetchData();
  };

  const handleEdit = async (
    id: number,
    data: {
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
    }
  ) => {
    const res = await fetch(`/api/budget/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error("Errore nel salvataggio");
    }

    await fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Sei sicuro di voler eliminare questa voce?")) {
      return;
    }

    const res = await fetch(`/api/budget/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Errore nell'eliminazione");
    }

    await fetchData();
  };

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Previsionale 2026</h1>
        <p className="text-muted-foreground">
          Gestisci le entrate e uscite previste per l&apos;anno
        </p>
      </div>

      <BudgetTable
        items={items}
        categories={categories}
        costCenters={costCenters}
        revenueCenters={revenueCenters}
        expectedExpenses={expectedExpenses}
        expectedIncomes={expectedIncomes}
        onRefresh={fetchData}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
