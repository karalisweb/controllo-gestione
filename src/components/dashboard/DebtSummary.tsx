"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/currency";
import { CreditCard, ArrowRight, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface DebtSummaryProps {
  total: number;
  remaining: number;
  plansCount: number;
  plansWithoutPlan: number;
}

export function DebtSummary({
  total,
  remaining,
  plansCount,
  plansWithoutPlan,
}: DebtSummaryProps) {
  const paidPercent = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-orange-500" />
          Debiti PDR
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progresso */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{paidPercent}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${paidPercent}%` }}
              />
            </div>
          </div>

          {/* Numeri */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(remaining)}
              </div>
              <div className="text-xs text-muted-foreground">da pagare</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(total - remaining)}
              </div>
              <div className="text-xs text-muted-foreground">già pagato</div>
            </div>
          </div>

          {/* Alert debiti senza piano */}
          {plansWithoutPlan > 0 && (
            <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-700">
                {plansWithoutPlan} debiti senza piano di rientro
              </span>
            </div>
          )}

          {/* Info */}
          <div className="text-sm text-muted-foreground">
            {plansCount} piani attivi
          </div>

          {/* Link */}
          <Link href="/payment-plans">
            <Button variant="outline" size="sm" className="w-full">
              Gestisci Piani
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
