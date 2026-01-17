"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, eurosToCents, centsToEuros } from "@/lib/utils/currency";
import { calculateSplit } from "@/lib/utils/splits";
import { User, Building2, Receipt, Users, ArrowRight } from "lucide-react";

interface ForecastSplitPreviewProps {
  /** Importo lordo in centesimi (se già convertito) o in euro (se fromEuros=true) */
  amount: number;
  /** Se true, l'importo è in euro e verrà convertito in centesimi */
  fromEuros?: boolean;
  /** Mostra versione compatta (solo totali) */
  compact?: boolean;
}

export function ForecastSplitPreview({
  amount,
  fromEuros = false,
  compact = false,
}: ForecastSplitPreviewProps) {
  const split = useMemo(() => {
    if (!amount || amount <= 0) return null;
    const amountCents = fromEuros ? eurosToCents(amount) : amount;
    return calculateSplit(amountCents);
  }, [amount, fromEuros]);

  if (!split) return null;

  const totaleSoci = split.danielaAmount + split.alessioAmount;
  const totaleBonifico = totaleSoci + split.vatAmount;

  if (compact) {
    // Versione compatta per tabella
    return (
      <div className="text-xs text-muted-foreground space-y-0.5">
        <div className="flex justify-between">
          <span>Disponibile:</span>
          <span className="font-mono text-green-600">{formatCurrency(split.agencyAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Bonifico:</span>
          <span className="font-mono text-purple-600">{formatCurrency(totaleBonifico)}</span>
        </div>
      </div>
    );
  }

  // Versione completa per dialog
  return (
    <Card className="bg-muted/30">
      <CardContent className="p-3 space-y-3">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Ripartizione Prevista
        </div>

        {/* Netto (imponibile) */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Imponibile (netto)</span>
          <span className="font-mono">{formatCurrency(split.netAmount)}</span>
        </div>

        {/* Quote Soci */}
        <div className="space-y-2">
          {/* Daniela */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center">
                <User className="h-3 w-3 text-purple-600" />
              </div>
              <div>
                <div className="text-sm">Daniela</div>
                <div className="text-xs text-muted-foreground">10%</div>
              </div>
            </div>
            <div className="font-mono text-sm text-purple-600">
              {formatCurrency(split.danielaAmount)}
            </div>
          </div>

          {/* Alessio */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-3 w-3 text-blue-600" />
              </div>
              <div>
                <div className="text-sm">Alessio</div>
                <div className="text-xs text-muted-foreground">20%</div>
              </div>
            </div>
            <div className="font-mono text-sm text-blue-600">
              {formatCurrency(split.alessioAmount)}
            </div>
          </div>

          {/* Totale Soci */}
          <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/30 -mx-3 px-3 py-2 border-y border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center">
                <Users className="h-3 w-3 text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Totale Soci</span>
            </div>
            <div className="font-mono text-sm font-bold text-indigo-600">
              {formatCurrency(totaleSoci)}
            </div>
          </div>

          {/* Fondo IVA */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center">
                <Receipt className="h-3 w-3 text-orange-600" />
              </div>
              <div>
                <div className="text-sm">Fondo IVA</div>
                <div className="text-xs text-muted-foreground">22%</div>
              </div>
            </div>
            <div className="font-mono text-sm text-orange-600">
              {formatCurrency(split.vatAmount)}
            </div>
          </div>

          {/* Totale Bonifico */}
          <div className="flex items-center justify-between bg-purple-100 dark:bg-purple-950/40 -mx-3 px-3 py-3 border-t-2 border-purple-300 dark:border-purple-700">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-purple-200 flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-purple-700" />
              </div>
              <div>
                <div className="text-sm font-bold text-purple-800 dark:text-purple-200">Bonifico</div>
                <div className="text-xs text-purple-600 dark:text-purple-400">Soci + IVA</div>
              </div>
            </div>
            <div className="font-mono font-bold text-purple-700 dark:text-purple-300">
              {formatCurrency(totaleBonifico)}
            </div>
          </div>
        </div>

        {/* Disponibile Agenzia */}
        <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 -mx-3 px-3 py-3 rounded-b-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <div className="text-sm font-bold">Disponibile</div>
              <div className="text-xs text-muted-foreground">70% del netto</div>
            </div>
          </div>
          <div className="font-mono font-bold text-lg text-green-600">
            {formatCurrency(split.agencyAmount)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
