"use client";

import { useState, useEffect, useCallback } from "react";
import { ForecastTable } from "@/components/forecast/ForecastTable";
import { MobileHeader } from "@/components/MobileHeader";

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

export default function ForecastPage() {
  const [items, setItems] = useState<ForecastItem[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [revenueCenters, setRevenueCenters] = useState<RevenueCenter[]>([]);
  const [initialBalance, setInitialBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const currentYear = new Date().getFullYear();

  // Carica dati
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [forecastRes, plansRes, costRes, revenueRes, settingsRes] = await Promise.all([
        fetch(`/api/forecast?startDate=${currentYear}-01-01&endDate=${currentYear}-12-31`),
        fetch("/api/payment-plans"),
        fetch("/api/cost-centers"),
        fetch("/api/revenue-centers"),
        fetch("/api/settings"),
      ]);

      if (forecastRes.ok) {
        const data = await forecastRes.json();
        setItems(data);
      }

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPaymentPlans(data.filter((p: PaymentPlan) => p.isActive));
      }

      if (costRes.ok) {
        const data = await costRes.json();
        setCostCenters(data);
      }

      if (revenueRes.ok) {
        const data = await revenueRes.json();
        setRevenueCenters(data);
      }

      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        const balanceSetting = settings.find((s: { key: string }) => s.key === "initial_balance");
        if (balanceSetting) {
          setInitialBalance(parseInt(balanceSetting.value) || 0);
        }
      }
    } catch (error) {
      console.error("Errore caricamento:", error);
    }
    setLoading(false);
  }, [currentYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Genera voci da piano annuale
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/forecast", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: `${currentYear}-01-01`,
          endDate: `${currentYear}-12-31`,
          regenerate: false,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        console.log("Generazione completata:", result);
        await loadData();
      }
    } catch (error) {
      console.error("Errore generazione:", error);
    }
    setGenerating(false);
  };

  // Aggiorna voce
  const handleUpdate = async (id: number, data: Partial<ForecastItem>) => {
    try {
      const res = await fetch(`/api/forecast/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Errore aggiornamento:", error);
    }
  };

  // Elimina voce
  const handleDelete = async (id: number) => {
    if (!confirm("Eliminare questa voce?")) return;

    try {
      const res = await fetch(`/api/forecast/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Errore eliminazione:", error);
    }
  };

  // Sposta in PDR
  const handleMoveToPDR = async (
    id: number,
    planId?: number,
    newPlanData?: {
      creditorName: string;
      installmentAmount: number;
      totalInstallments: number;
      startDate: string;
    }
  ) => {
    try {
      const res = await fetch(`/api/forecast/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentPlanId: planId,
          newPlanData,
        }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Errore spostamento PDR:", error);
    }
  };

  // Aggiungi voce
  const handleAdd = async (data: {
    date: string;
    description: string;
    type: "income" | "expense";
    amount: number;
    costCenterId?: number;
    revenueCenterId?: number;
    reliability?: string;
    priority?: string;
    notes?: string;
  }) => {
    try {
      const res = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Errore aggiunta:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <MobileHeader title="Previsionale" showBack backHref="/" />
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Caricamento...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <MobileHeader title="Previsionale" showBack backHref="/" />

      <div className="p-4 lg:p-6 space-y-4">
        {/* Header Desktop */}
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold">Previsionale {currentYear}</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci date, importi e piani di rientro
          </p>
        </div>

        {/* Header Mobile */}
        <div className="lg:hidden">
          <h1 className="text-lg font-bold">Previsionale {currentYear}</h1>
          <p className="text-xs text-muted-foreground">
            Gestisci date, importi e piani di rientro
          </p>
        </div>

        {/* Tabella Previsionale */}
        <ForecastTable
        items={items}
        paymentPlans={paymentPlans}
        costCenters={costCenters}
        revenueCenters={revenueCenters}
        initialBalance={initialBalance}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onMoveToPDR={handleMoveToPDR}
        onAdd={handleAdd}
          onRefresh={loadData}
          onGenerate={handleGenerate}
        />
      </div>
    </div>
  );
}
