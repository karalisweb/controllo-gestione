"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentPlanForm } from "@/components/payment-plans/PaymentPlanForm";
import { PaymentPlanList } from "@/components/payment-plans/PaymentPlanList";
import { PaymentPlanCategoryManager } from "@/components/payment-plans/PaymentPlanCategoryManager";
import { MobileHeader } from "@/components/MobileHeader";
import { formatCurrency } from "@/lib/utils/currency";
import type { PaymentPlan } from "@/types";
import { Plus, Tags } from "lucide-react";

export default function PaymentPlansPage() {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/payment-plans");
      if (!res.ok) {
        throw new Error("Errore nel caricamento dei piani");
      }
      const data = await res.json();
      setPlans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleCreatePlan = async (data: {
    creditorName: string;
    totalAmount: number;
    totalInstallments: number;
    installmentAmount?: number;
    startDate: string;
    notes?: string;
    regenerateInstallments?: boolean;
  }) => {
    if (editingPlan) {
      // Modifica piano esistente
      const res = await fetch(`/api/payment-plans/${editingPlan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Errore nella modifica del piano");
      }
    } else {
      // Crea nuovo piano
      const res = await fetch("/api/payment-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Errore nella creazione del piano");
      }
    }

    setEditingPlan(null);
    await fetchPlans();
  };

  const handleEditPlan = (plan: PaymentPlan) => {
    setEditingPlan(plan);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingPlan(null);
    }
  };

  const handlePayInstallment = async (
    planId: number,
    installmentId: number
  ) => {
    const res = await fetch(`/api/payment-plans/${planId}/installments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installmentId }),
    });

    if (!res.ok) {
      throw new Error("Errore nel pagamento della rata");
    }

    await fetchPlans();
  };

  const handleUnpayInstallment = async (
    planId: number,
    installmentId: number
  ) => {
    const res = await fetch(
      `/api/payment-plans/${planId}/installments?installmentId=${installmentId}`,
      { method: "DELETE" }
    );

    if (!res.ok) {
      throw new Error("Errore nell'annullamento del pagamento");
    }

    await fetchPlans();
  };

  const handleDeletePlan = async (planId: number) => {
    const res = await fetch(`/api/payment-plans/${planId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Errore nell'eliminazione del piano");
    }

    await fetchPlans();
  };

  const handleUpdateInstallmentDate = async (
    planId: number,
    installmentId: number,
    newDate: string
  ) => {
    const res = await fetch(`/api/payment-plans/${planId}/installments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installmentId, dueDate: newDate }),
    });

    if (!res.ok) {
      throw new Error("Errore nella modifica della data");
    }

    await fetchPlans();
  };

  // Ordina per snowball: debito rimanente dal più piccolo al più grande
  const activePlans = plans
    .filter((p) => p.isActive)
    .sort((a, b) => {
      const remainingA = a.totalAmount - (a.paidInstallments || 0) * a.installmentAmount;
      const remainingB = b.totalAmount - (b.paidInstallments || 0) * b.installmentAmount;
      return remainingA - remainingB;
    });
  const completedPlans = plans.filter((p) => !p.isActive);

  // Calcola totali
  const totalDebt = activePlans.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalPaid = activePlans.reduce(
    (sum, p) => sum + (p.paidInstallments || 0) * p.installmentAmount,
    0
  );
  const totalRemaining = totalDebt - totalPaid;

  if (loading) {
    return (
      <div className="min-h-screen">
        <MobileHeader title="Piani di Rientro" />
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Caricamento...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <MobileHeader title="Piani di Rientro" />
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Errore: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <MobileHeader title="Piani di Rientro" />

      <div className="p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold">Piani di Rientro</h1>
            <p className="text-xs lg:text-sm text-muted-foreground">
              Gestisci i debiti rateizzati con fornitori e creditori
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCategoryManagerOpen(true)}
              className="flex-1 sm:flex-none"
            >
              <Tags className="h-4 w-4 mr-2" />
              Categorie
            </Button>
            <Button onClick={() => setFormOpen(true)} size="sm" className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Piano
            </Button>
          </div>
        </div>

        {/* Riepilogo totali - cards compatte */}
        {activePlans.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <Card className="p-3 sm:p-4">
              <div className="text-xs text-muted-foreground mb-1">Debito Totale</div>
              <div className="text-lg sm:text-2xl font-bold">
                {formatCurrency(totalDebt)}
              </div>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="text-xs text-muted-foreground mb-1">Già Pagato</div>
              <div className="text-lg sm:text-2xl font-bold text-green-600">
                {formatCurrency(totalPaid)}
              </div>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="text-xs text-muted-foreground mb-1">Da Pagare</div>
              <div className="text-lg sm:text-2xl font-bold text-red-600">
                {formatCurrency(totalRemaining)}
              </div>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex">
            <TabsTrigger value="active" className="text-xs sm:text-sm">
              Attivi ({activePlans.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm">
              Completati ({completedPlans.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            <PaymentPlanList
              plans={activePlans}
              onPayInstallment={handlePayInstallment}
              onUnpayInstallment={handleUnpayInstallment}
              onDeletePlan={handleDeletePlan}
              onEditPlan={handleEditPlan}
              onUpdateInstallmentDate={handleUpdateInstallmentDate}
            />
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            <PaymentPlanList
              plans={completedPlans}
              onPayInstallment={handlePayInstallment}
              onUnpayInstallment={handleUnpayInstallment}
              onDeletePlan={handleDeletePlan}
              onEditPlan={handleEditPlan}
              onUpdateInstallmentDate={handleUpdateInstallmentDate}
            />
          </TabsContent>
        </Tabs>

        <PaymentPlanForm
          open={formOpen}
          onOpenChange={handleFormClose}
          editingPlan={editingPlan}
          onSubmit={handleCreatePlan}
        />

        <PaymentPlanCategoryManager
          open={categoryManagerOpen}
          onOpenChange={setCategoryManagerOpen}
        />
      </div>
    </div>
  );
}
