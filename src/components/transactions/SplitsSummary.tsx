"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { User, Building2, Receipt, ArrowRightLeft } from "lucide-react";

interface SplitData {
  id: number;
  transactionId: number;
  grossAmount: number;
  netAmount: number;
  danielaAmount: number;
  alessioAmount: number;
  agencyAmount: number;
  vatAmount: number;
  createdAt: string;
}

export function SplitsSummary() {
  const [splits, setSplits] = useState<SplitData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSplits = async () => {
      try {
        const res = await fetch("/api/splits");
        if (res.ok) {
          const data = await res.json();
          setSplits(data);
        }
      } catch (error) {
        console.error("Errore caricamento ripartizioni:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSplits();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          Caricamento...
        </CardContent>
      </Card>
    );
  }

  if (splits.length === 0) {
    return null; // Non mostrare nulla se non ci sono ripartizioni
  }

  // Calcola totali
  const totals = splits.reduce(
    (acc, split) => ({
      grossAmount: acc.grossAmount + split.grossAmount,
      netAmount: acc.netAmount + split.netAmount,
      danielaAmount: acc.danielaAmount + split.danielaAmount,
      alessioAmount: acc.alessioAmount + split.alessioAmount,
      agencyAmount: acc.agencyAmount + split.agencyAmount,
      vatAmount: acc.vatAmount + split.vatAmount,
    }),
    {
      grossAmount: 0,
      netAmount: 0,
      danielaAmount: 0,
      alessioAmount: 0,
      agencyAmount: 0,
      vatAmount: 0,
    }
  );

  // Totale bonifico = Alessio + Daniela + IVA
  const totalTransfer = totals.alessioAmount + totals.danielaAmount + totals.vatAmount;

  return (
    <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-purple-500" />
          Riepilogo Ripartizioni
          <Badge variant="secondary" className="ml-auto">
            {splits.length} incassi
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dettaglio per destinatario */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center">
                <User className="h-3 w-3 text-purple-600" />
              </div>
              <span className="text-sm text-muted-foreground">Daniela</span>
            </div>
            <div className="font-semibold text-purple-600">
              {formatCurrency(totals.danielaAmount)}
            </div>
            <div className="text-xs text-muted-foreground">10% del netto</div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-3 w-3 text-blue-600" />
              </div>
              <span className="text-sm text-muted-foreground">Alessio</span>
            </div>
            <div className="font-semibold text-blue-600">
              {formatCurrency(totals.alessioAmount)}
            </div>
            <div className="text-xs text-muted-foreground">20% del netto</div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center">
                <Receipt className="h-3 w-3 text-orange-600" />
              </div>
              <span className="text-sm text-muted-foreground">IVA</span>
            </div>
            <div className="font-semibold text-orange-600">
              {formatCurrency(totals.vatAmount)}
            </div>
            <div className="text-xs text-muted-foreground">22% del netto</div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                <Building2 className="h-3 w-3 text-green-600" />
              </div>
              <span className="text-sm text-muted-foreground">Agenzia</span>
            </div>
            <div className="font-semibold text-green-600">
              {formatCurrency(totals.agencyAmount)}
            </div>
            <div className="text-xs text-muted-foreground">70% del netto</div>
          </div>
        </div>

        {/* Riepilogo bonifico unico */}
        <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-purple-800 dark:text-purple-200">
                Bonifico Unico (Soci + IVA)
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">
                Alessio + Daniela + Fondo IVA
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {formatCurrency(totalTransfer)}
              </div>
            </div>
          </div>
        </div>

        {/* Riepilogo incassi */}
        <div className="flex items-center justify-between text-sm pt-2 border-t border-purple-200 dark:border-purple-700">
          <span className="text-muted-foreground">Totale incassi ripartiti</span>
          <span className="font-semibold">{formatCurrency(totals.grossAmount)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
