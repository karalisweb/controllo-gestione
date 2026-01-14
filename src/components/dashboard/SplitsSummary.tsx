"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { User, Building2, Receipt } from "lucide-react";
import type { IncomeSplit } from "@/types";

interface SplitsSummaryProps {
  splits: IncomeSplit[];
}

export function SplitsSummary({ splits }: SplitsSummaryProps) {
  const totals = splits.reduce(
    (acc, split) => ({
      gross: acc.gross + split.grossAmount,
      net: acc.net + split.netAmount,
      daniela: acc.daniela + split.danielaAmount,
      alessio: acc.alessio + split.alessioAmount,
      agency: acc.agency + split.agencyAmount,
      vat: acc.vat + split.vatAmount,
    }),
    { gross: 0, net: 0, daniela: 0, alessio: 0, agency: 0, vat: 0 }
  );

  if (splits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ripartizioni del Periodo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Nessuna ripartizione registrata.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ripartizioni del Periodo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Totale lordo */}
        <div className="flex justify-between items-center pb-2 border-b">
          <span className="text-sm text-muted-foreground">
            Totale incassi ({splits.length} movimenti)
          </span>
          <span className="font-mono font-bold text-green-600">
            {formatCurrency(totals.gross)}
          </span>
        </div>

        {/* Ripartizioni */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                <User className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-sm">Daniela</div>
                <div className="text-xs text-muted-foreground">10%</div>
              </div>
            </div>
            <div className="font-mono font-medium text-purple-600">
              {formatCurrency(totals.daniela)}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-sm">Alessio</div>
                <div className="text-xs text-muted-foreground">20%</div>
              </div>
            </div>
            <div className="font-mono font-medium text-blue-600">
              {formatCurrency(totals.alessio)}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-sm">Agenzia</div>
                <div className="text-xs text-muted-foreground">70%</div>
              </div>
            </div>
            <div className="font-mono font-medium text-green-600">
              {formatCurrency(totals.agency)}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                <Receipt className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <div className="font-medium text-sm">Fondo IVA</div>
                <div className="text-xs text-muted-foreground">22%</div>
              </div>
            </div>
            <div className="font-mono font-medium text-orange-600">
              {formatCurrency(totals.vat)}
            </div>
          </div>
        </div>

        {/* Disponibilità effettiva */}
        <div className="bg-gray-50 rounded-lg p-3 mt-4">
          <div className="text-xs text-muted-foreground mb-1">
            Disponibilità effettiva per l&apos;agenzia
          </div>
          <div className="text-lg font-bold text-green-600">
            {formatCurrency(totals.agency)}
          </div>
          <div className="text-xs text-muted-foreground">
            (dopo ripartizioni soci e accantonamento IVA)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
