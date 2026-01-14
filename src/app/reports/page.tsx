"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { formatCurrency } from "@/lib/utils/currency";
import { ArrowDown, ArrowUp, Calendar } from "lucide-react";

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

const PRIORITY_COLORS: Record<string, string> = {
  essential: "bg-red-100 text-red-800",
  important: "bg-orange-100 text-orange-800",
  investment: "bg-blue-100 text-blue-800",
  normal: "bg-gray-100 text-gray-800",
};

const RELIABILITY_COLORS: Record<string, string> = {
  high: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
};

interface CostCenterReport {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  priority: string | null;
  isEssential: boolean;
  annualBudget: number;
  paymentFrequency: string;
  startDate: string | null;
  endDate: string | null;
  monthlySpent: Record<number, number>;
  totalSpent: number;
  remaining: number;
  firstPaymentDate: string | null;
  lastPaymentDate: string | null;
  transactionCount: number;
}

interface RevenueCenterReport {
  id: number;
  name: string;
  description: string | null;
  clientName: string | null;
  costCenterId: number | null;
  costCenterName: string | null;
  color: string | null;
  reliability: string | null;
  responsiblePerson: string | null;
  annualTarget: number;
  monthlyTarget: number;
  expectedFrequency: string;
  monthlyCollected: Record<number, number>;
  totalCollected: number;
  remaining: number;
  percentComplete: number;
  firstCollectionDate: string | null;
  lastCollectionDate: string | null;
  transactionCount: number;
}

interface CostReport {
  year: number;
  centers: CostCenterReport[];
  monthlyTotals: Record<number, number>;
  grandTotal: number;
  totalBudget: number;
  variance: number;
}

interface RevenueReport {
  year: number;
  centers: RevenueCenterReport[];
  monthlyTotals: Record<number, number>;
  grandTotal: number;
  totalTarget: number;
  variance: number;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export default function ReportsPage() {
  const [costReport, setCostReport] = useState<CostReport | null>(null);
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(2026);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [costRes, revenueRes] = await Promise.all([
        fetch(`/api/cost-centers/report?year=${year}`),
        fetch(`/api/revenue-centers/report?year=${year}`),
      ]);

      if (costRes.ok) {
        setCostReport(await costRes.json());
      }
      if (revenueRes.ok) {
        setRevenueReport(await revenueRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Caricamento report...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Report Consuntivo</h1>
          <p className="text-muted-foreground">
            Spese e ricavi reali per centro, mese per mese
          </p>
        </div>
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Riepilogo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totale Speso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(costReport?.grandTotal || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Budget: {formatCurrency(costReport?.totalBudget || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totale Incassato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(revenueReport?.grandTotal || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Target: {formatCurrency(revenueReport?.totalTarget || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saldo Reale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (revenueReport?.grandTotal || 0) - (costReport?.grandTotal || 0) >= 0
                ? "text-green-600"
                : "text-red-600"
            }`}>
              {formatCurrency((revenueReport?.grandTotal || 0) - (costReport?.grandTotal || 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Ricavi - Costi
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scostamento Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (costReport?.variance || 0) >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              {(costReport?.variance || 0) >= 0 ? "+" : ""}
              {formatCurrency(costReport?.variance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Risparmiato vs budget
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="costs">
        <TabsList className="mb-6">
          <TabsTrigger value="costs" className="text-red-600">
            <ArrowDown className="h-4 w-4 mr-1" />
            Costi ({costReport?.centers.length || 0})
          </TabsTrigger>
          <TabsTrigger value="revenues" className="text-green-600">
            <ArrowUp className="h-4 w-4 mr-1" />
            Ricavi ({revenueReport?.centers.length || 0})
          </TabsTrigger>
          <TabsTrigger value="summary">
            Riepilogo Mensile
          </TabsTrigger>
        </TabsList>

        {/* COSTI */}
        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-red-600">
                Spese Reali per Centro di Costo - {year}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white min-w-[180px]">Centro</TableHead>
                    {MONTHS.map((month, idx) => (
                      <TableHead key={idx} className="text-center min-w-[85px]">{month}</TableHead>
                    ))}
                    <TableHead className="text-center min-w-[100px] font-bold">Totale</TableHead>
                    <TableHead className="text-center min-w-[100px]">Budget</TableHead>
                    <TableHead className="text-center min-w-[90px]">+/-</TableHead>
                    <TableHead className="text-center min-w-[130px]">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Periodo
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costReport?.centers.map((center) => {
                    const priority = center.priority || (center.isEssential ? "essential" : "normal");
                    return (
                      <TableRow key={center.id} className={center.totalSpent === 0 ? "opacity-50" : ""}>
                        <TableCell className="sticky left-0 bg-white">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: center.color || "#6b7280" }}
                            />
                            <div>
                              <div className="font-medium text-sm flex items-center gap-1">
                                {center.name}
                                {priority !== "normal" && (
                                  <span className={`text-[10px] px-1 rounded ${PRIORITY_COLORS[priority]}`}>
                                    {priority === "essential" ? "V" : priority === "important" ? "I" : "€"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        {MONTHS.map((_, monthIdx) => {
                          const month = monthIdx + 1;
                          const value = center.monthlySpent[month] || 0;
                          return (
                            <TableCell
                              key={monthIdx}
                              className={`text-center text-sm font-mono ${
                                value > 0 ? "text-red-600" : "text-gray-300"
                              }`}
                            >
                              {value > 0 ? formatCurrency(value) : "-"}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-bold text-red-600 font-mono">
                          {formatCurrency(center.totalSpent)}
                        </TableCell>
                        <TableCell className="text-center text-sm font-mono text-muted-foreground">
                          {formatCurrency(center.annualBudget)}
                        </TableCell>
                        <TableCell className={`text-center text-sm font-mono ${
                          center.remaining >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {center.remaining >= 0 ? "+" : ""}
                          {formatCurrency(center.remaining)}
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {center.firstPaymentDate && center.lastPaymentDate ? (
                            <span>
                              {formatShortDate(center.firstPaymentDate)} → {formatShortDate(center.lastPaymentDate)}
                            </span>
                          ) : center.firstPaymentDate ? (
                            <span>Da {formatShortDate(center.firstPaymentDate)}</span>
                          ) : (
                            <span className="text-gray-400">Nessun mov.</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Riga totali */}
                  <TableRow className="bg-gray-50 font-bold border-t-2">
                    <TableCell className="sticky left-0 bg-gray-50">TOTALE</TableCell>
                    {MONTHS.map((_, monthIdx) => {
                      const month = monthIdx + 1;
                      const value = costReport?.monthlyTotals[month] || 0;
                      return (
                        <TableCell key={monthIdx} className="text-center text-red-600 font-mono">
                          {value > 0 ? formatCurrency(value) : "-"}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center text-red-600 font-mono">
                      {formatCurrency(costReport?.grandTotal || 0)}
                    </TableCell>
                    <TableCell className="text-center font-mono text-muted-foreground">
                      {formatCurrency(costReport?.totalBudget || 0)}
                    </TableCell>
                    <TableCell className={`text-center font-mono ${
                      (costReport?.variance || 0) >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {(costReport?.variance || 0) >= 0 ? "+" : ""}
                      {formatCurrency(costReport?.variance || 0)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RICAVI */}
        <TabsContent value="revenues">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-green-600">
                Incassi Reali per Centro di Ricavo - {year}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white min-w-[180px]">Centro</TableHead>
                    <TableHead className="min-w-[120px]">Centro Costo</TableHead>
                    {MONTHS.map((month, idx) => (
                      <TableHead key={idx} className="text-center min-w-[85px]">{month}</TableHead>
                    ))}
                    <TableHead className="text-center min-w-[100px] font-bold">Totale</TableHead>
                    <TableHead className="text-center min-w-[100px]">Target</TableHead>
                    <TableHead className="text-center min-w-[70px]">%</TableHead>
                    <TableHead className="text-center min-w-[130px]">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Periodo
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueReport?.centers.map((center) => (
                    <TableRow key={center.id} className={center.totalCollected === 0 ? "opacity-50" : ""}>
                      <TableCell className="sticky left-0 bg-white">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: center.color || "#6b7280" }}
                          />
                          <div>
                            <div className="font-medium text-sm">{center.name}</div>
                            {center.clientName && (
                              <div className="text-[10px] text-muted-foreground">{center.clientName}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {center.costCenterName || "-"}
                      </TableCell>
                      {MONTHS.map((_, monthIdx) => {
                        const month = monthIdx + 1;
                        const value = center.monthlyCollected[month] || 0;
                        return (
                          <TableCell
                            key={monthIdx}
                            className={`text-center text-sm font-mono ${
                              value > 0 ? "text-green-600" : "text-gray-300"
                            }`}
                          >
                            {value > 0 ? formatCurrency(value) : "-"}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-bold text-green-600 font-mono">
                        {formatCurrency(center.totalCollected)}
                      </TableCell>
                      <TableCell className="text-center text-sm font-mono text-muted-foreground">
                        {formatCurrency(center.annualTarget)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={
                          center.percentComplete >= 100
                            ? "bg-green-100 text-green-800"
                            : center.percentComplete >= 50
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }>
                          {center.percentComplete}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {center.firstCollectionDate && center.lastCollectionDate ? (
                          <span>
                            {formatShortDate(center.firstCollectionDate)} → {formatShortDate(center.lastCollectionDate)}
                          </span>
                        ) : center.firstCollectionDate ? (
                          <span>Da {formatShortDate(center.firstCollectionDate)}</span>
                        ) : (
                          <span className="text-gray-400">Nessun mov.</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Riga totali */}
                  <TableRow className="bg-gray-50 font-bold border-t-2">
                    <TableCell className="sticky left-0 bg-gray-50">TOTALE</TableCell>
                    <TableCell />
                    {MONTHS.map((_, monthIdx) => {
                      const month = monthIdx + 1;
                      const value = revenueReport?.monthlyTotals[month] || 0;
                      return (
                        <TableCell key={monthIdx} className="text-center text-green-600 font-mono">
                          {value > 0 ? formatCurrency(value) : "-"}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center text-green-600 font-mono">
                      {formatCurrency(revenueReport?.grandTotal || 0)}
                    </TableCell>
                    <TableCell className="text-center font-mono text-muted-foreground">
                      {formatCurrency(revenueReport?.totalTarget || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={
                        (revenueReport?.grandTotal || 0) >= (revenueReport?.totalTarget || 1)
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }>
                        {revenueReport?.totalTarget
                          ? Math.round((revenueReport.grandTotal / revenueReport.totalTarget) * 100)
                          : 0}%
                      </Badge>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RIEPILOGO */}
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Riepilogo Mensile - {year}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white min-w-[120px]">Voce</TableHead>
                    {MONTHS.map((month, idx) => (
                      <TableHead key={idx} className="text-center min-w-[85px]">{month}</TableHead>
                    ))}
                    <TableHead className="text-center min-w-[100px] font-bold">Anno</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Riga Ricavi */}
                  <TableRow>
                    <TableCell className="sticky left-0 bg-white font-medium text-green-600">
                      Ricavi
                    </TableCell>
                    {MONTHS.map((_, monthIdx) => {
                      const month = monthIdx + 1;
                      const value = revenueReport?.monthlyTotals[month] || 0;
                      return (
                        <TableCell key={monthIdx} className="text-center text-green-600 font-mono">
                          {value > 0 ? formatCurrency(value) : "-"}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-bold text-green-600 font-mono">
                      {formatCurrency(revenueReport?.grandTotal || 0)}
                    </TableCell>
                  </TableRow>
                  {/* Riga Costi */}
                  <TableRow>
                    <TableCell className="sticky left-0 bg-white font-medium text-red-600">
                      Costi
                    </TableCell>
                    {MONTHS.map((_, monthIdx) => {
                      const month = monthIdx + 1;
                      const value = costReport?.monthlyTotals[month] || 0;
                      return (
                        <TableCell key={monthIdx} className="text-center text-red-600 font-mono">
                          {value > 0 ? `-${formatCurrency(value)}` : "-"}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-bold text-red-600 font-mono">
                      -{formatCurrency(costReport?.grandTotal || 0)}
                    </TableCell>
                  </TableRow>
                  {/* Riga Saldo */}
                  <TableRow className="bg-gray-50 font-bold border-t-2">
                    <TableCell className="sticky left-0 bg-gray-50">Saldo</TableCell>
                    {MONTHS.map((_, monthIdx) => {
                      const month = monthIdx + 1;
                      const revenue = revenueReport?.monthlyTotals[month] || 0;
                      const cost = costReport?.monthlyTotals[month] || 0;
                      const balance = revenue - cost;
                      return (
                        <TableCell
                          key={monthIdx}
                          className={`text-center font-mono ${balance >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {balance !== 0 ? formatCurrency(balance) : "-"}
                        </TableCell>
                      );
                    })}
                    <TableCell className={`text-center font-mono ${
                      (revenueReport?.grandTotal || 0) - (costReport?.grandTotal || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}>
                      {formatCurrency((revenueReport?.grandTotal || 0) - (costReport?.grandTotal || 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
