"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SalesForm } from "@/components/sales/SalesForm";
import { formatCurrency } from "@/lib/utils/currency";
import type { SalesOpportunity, MonthlyGap, YearGapSummary } from "@/types";

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

const PROJECT_TYPE_LABELS: Record<string, string> = {
  sito_web: "Sito Web",
  marketing: "Marketing",
  msd: "MSD",
  licenza: "Licenza",
  altro: "Altro",
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  sito_web_50_50: "50% + 50% 60gg",
  msd_30_70: "30% + 70% 21gg",
  marketing_4_trim: "4 rate trim.",
  immediato: "Immediato",
  custom: "Custom",
};

export default function SalesPage() {
  const [year] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [monthlyGaps, setMonthlyGaps] = useState<MonthlyGap[]>([]);
  const [yearSummary, setYearSummary] = useState<YearGapSummary | null>(null);
  const [yearProgress, setYearProgress] = useState(0);
  const [sales, setSales] = useState<SalesOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState<SalesOpportunity | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch gap data
      const gapRes = await fetch(`/api/sales/gap?year=${year}`);
      const gapData = await gapRes.json();
      setMonthlyGaps(gapData.months || []);
      setYearSummary(gapData.year || null);
      setYearProgress(gapData.yearProgress || 0);

      // Fetch all sales
      const salesRes = await fetch(`/api/sales?year=${year}`);
      const salesData = await salesRes.json();
      setSales(salesData || []);
    } catch (error) {
      console.error("Errore nel caricamento:", error);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddSale = () => {
    setEditingSale(null);
    setShowForm(true);
  };

  const handleEditSale = (sale: SalesOpportunity) => {
    setEditingSale(sale);
    setShowForm(true);
  };

  // Promuovi obiettivo a opportunità
  const handlePromoteToOpportunity = async (sale: SalesOpportunity, clientName: string) => {
    const res = await fetch(`/api/sales/${sale.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "opportunity",
        clientName,
      }),
    });

    if (res.ok) {
      fetchData();
    }
  };

  // Chiudi come vinta
  const handleWinSale = async (sale: SalesOpportunity) => {
    const today = new Date().toISOString().split("T")[0];

    const res = await fetch(`/api/sales/${sale.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "won",
        closedDate: today,
      }),
    });

    if (res.ok) {
      fetchData();
    }
  };

  // Segna come persa
  const handleLoseSale = async (sale: SalesOpportunity) => {
    const res = await fetch(`/api/sales/${sale.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "lost",
      }),
    });

    if (res.ok) {
      fetchData();
    }
  };

  const handleDeleteSale = async (id: number) => {
    if (!confirm("Sei sicuro di voler eliminare?")) return;

    const res = await fetch(`/api/sales/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      fetchData();
    }
  };

  const handleSaveSuccess = () => {
    setShowForm(false);
    setEditingSale(null);
    fetchData();
  };

  const currentMonthGap = selectedMonth
    ? monthlyGaps.find((g) => g.month === selectedMonth)
    : null;

  const filteredSales = selectedMonth
    ? sales.filter((s) => s.month === selectedMonth)
    : sales;

  // Raggruppa per stato
  const objectives = filteredSales.filter((s) => s.status === "objective");
  const opportunities = filteredSales.filter((s) => s.status === "opportunity");
  const won = filteredSales.filter((s) => s.status === "won");
  const lost = filteredSales.filter((s) => s.status === "lost");

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Caricamento...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Piano Commerciale {year}</h1>
          <p className="text-muted-foreground">
            Obiettivi, opportunità e vendite per coprire il gap del previsionale
          </p>
        </div>
        <Button onClick={handleAddSale}>+ Nuovo</Button>
      </div>

      {/* Riepilogo Anno */}
      {yearSummary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Situazione Anno {year}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-sm text-muted-foreground">Entrate previste</div>
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(yearSummary.expectedIncomeAvailable)}
                  <span className="text-xs text-muted-foreground ml-1">(disp.)</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Uscite + PDR</div>
                <div className="text-lg font-semibold text-red-600">
                  {formatCurrency(yearSummary.totalOutflows)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">GAP da coprire</div>
                <div className="text-xl font-bold text-orange-600">
                  {formatCurrency(yearSummary.gap)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Target vendite lordo</div>
                <div className="text-xl font-bold">
                  {formatCurrency(yearSummary.salesTargetGross)}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Pianificato: {formatCurrency(yearSummary.salesTotalGross)}</span>
                <span>{yearProgress}% del gap coperto</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    yearProgress >= 100
                      ? "bg-green-500"
                      : yearProgress >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(100, yearProgress)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Vinto: {formatCurrency(yearSummary.salesClosedGross)}</span>
                <span>Manca: {formatCurrency(yearSummary.remainingGap)} disponibili</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtro mese */}
      <div className="flex items-center gap-4">
        <Select
          value={selectedMonth?.toString() || "all"}
          onValueChange={(v) => setSelectedMonth(v === "all" ? null : parseInt(v))}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtra per mese" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i mesi</SelectItem>
            {MONTHS.map((name, idx) => (
              <SelectItem key={idx} value={(idx + 1).toString()}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedMonth && currentMonthGap && (
          <div className="flex gap-4 text-sm">
            <span>
              Gap mese: <strong className="text-orange-600">{formatCurrency(currentMonthGap.gap)}</strong>
            </span>
            <span>
              Target: <strong>{formatCurrency(currentMonthGap.salesTargetGross)}</strong>
            </span>
            <span>
              Progresso: <strong>{currentMonthGap.progress}%</strong>
            </span>
          </div>
        )}
      </div>

      {/* Tabella riepilogo mensile */}
      {!selectedMonth && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Riepilogo Mensile</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mese</TableHead>
                  <TableHead className="text-right">Gap</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Pianificato</TableHead>
                  <TableHead className="text-right">Disp.</TableHead>
                  <TableHead className="text-center">Stato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyGaps.map((gap) => (
                  <TableRow
                    key={gap.month}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedMonth(gap.month)}
                  >
                    <TableCell className="font-medium">{MONTHS[gap.month - 1]}</TableCell>
                    <TableCell className="text-right text-orange-600">
                      {gap.gap > 0 ? formatCurrency(gap.gap) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {gap.salesTargetGross > 0 ? formatCurrency(gap.salesTargetGross) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {gap.sales.totalGross > 0 ? formatCurrency(gap.sales.totalGross) : "-"}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {gap.sales.totalAvailable > 0 ? formatCurrency(gap.sales.totalAvailable) : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden mx-auto">
                        <div
                          className={`h-full ${
                            gap.progress >= 100
                              ? "bg-green-500"
                              : gap.progress >= 50
                              ? "bg-yellow-500"
                              : gap.progress > 0
                              ? "bg-red-500"
                              : "bg-gray-300"
                          }`}
                          style={{ width: `${Math.min(100, gap.progress)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{gap.progress}%</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* OBIETTIVI */}
      {objectives.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge variant="outline" className="text-base">Obiettivi</Badge>
              <span className="text-sm text-muted-foreground font-normal">
                Ipotesi di vendita da realizzare
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mese</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente/Note</TableHead>
                  <TableHead className="text-right">Lordo</TableHead>
                  <TableHead className="text-right">Disponibile</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {objectives.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{MONTHS[sale.month - 1]}</TableCell>
                    <TableCell>{PROJECT_TYPE_LABELS[sale.projectType]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {sale.clientName || sale.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(sale.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {sale.breakdown ? formatCurrency(sale.breakdown.availableAmount) : "-"}
                    </TableCell>
                    <TableCell>{PAYMENT_TYPE_LABELS[sale.paymentType]}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const client = prompt("Nome cliente per la trattativa:");
                            if (client) handlePromoteToOpportunity(sale, client);
                          }}
                        >
                          Trattativa
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEditSale(sale)}>
                          Modifica
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => handleDeleteSale(sale.id)}
                        >
                          Elimina
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* OPPORTUNITA' */}
      {opportunities.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge className="bg-blue-600 text-base">Opportunità</Badge>
              <span className="text-sm text-muted-foreground font-normal">
                Trattative in corso
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mese</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Lordo</TableHead>
                  <TableHead className="text-right">Disponibile</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{MONTHS[sale.month - 1]}</TableCell>
                    <TableCell className="font-medium">{sale.clientName}</TableCell>
                    <TableCell>{PROJECT_TYPE_LABELS[sale.projectType]}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(sale.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {sale.breakdown ? formatCurrency(sale.breakdown.availableAmount) : "-"}
                    </TableCell>
                    <TableCell>{PAYMENT_TYPE_LABELS[sale.paymentType]}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleWinSale(sale)}
                        >
                          Vinta
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleLoseSale(sale)}
                        >
                          Persa
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEditSale(sale)}>
                          Modifica
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* VINTE */}
      {won.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge className="bg-green-600 text-base">Vinte</Badge>
              <span className="text-sm text-muted-foreground font-normal">
                Vendite chiuse
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mese</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Lordo</TableHead>
                  <TableHead className="text-right">Disponibile</TableHead>
                  <TableHead>Data chiusura</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {won.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{MONTHS[sale.month - 1]}</TableCell>
                    <TableCell className="font-medium">{sale.clientName}</TableCell>
                    <TableCell>{PROJECT_TYPE_LABELS[sale.projectType]}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(sale.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {sale.breakdown ? formatCurrency(sale.breakdown.availableAmount) : "-"}
                    </TableCell>
                    <TableCell>{sale.closedDate || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => handleEditSale(sale)}>
                        Dettagli
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* PERSE */}
      {lost.length > 0 && (
        <Card className="opacity-60">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge variant="destructive" className="text-base">Perse</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mese</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Lordo</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lost.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{MONTHS[sale.month - 1]}</TableCell>
                    <TableCell>{sale.clientName || "-"}</TableCell>
                    <TableCell>{PROJECT_TYPE_LABELS[sale.projectType]}</TableCell>
                    <TableCell className="text-right">{formatCurrency(sale.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => handleDeleteSale(sale.id)}
                      >
                        Elimina
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {filteredSales.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              Nessun obiettivo, opportunità o vendita{selectedMonth ? " per questo mese" : ""}.
              <br />
              <Button variant="link" onClick={handleAddSale}>
                Aggiungi il primo obiettivo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form modale */}
      {showForm && (
        <SalesForm
          sale={editingSale}
          defaultMonth={selectedMonth || new Date().getMonth() + 1}
          year={year}
          onClose={() => {
            setShowForm(false);
            setEditingSale(null);
          }}
          onSuccess={handleSaveSuccess}
        />
      )}
    </div>
  );
}
