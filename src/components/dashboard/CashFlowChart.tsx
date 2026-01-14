"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { MONTHS_SHORT } from "@/lib/utils/dates";
import { centsToEuros } from "@/lib/utils/currency";

interface MonthlyData {
  month: number;
  income: number;
  expense: number;
  balance: number;
}

interface CashFlowChartProps {
  data: MonthlyData[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const chartData = data.map((d) => ({
    name: MONTHS_SHORT[d.month - 1],
    Entrate: centsToEuros(d.income),
    Uscite: Math.abs(centsToEuros(d.expense)),
    Saldo: centsToEuros(d.balance),
  }));

  const formatEuro = (value: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => formatEuro(value as number)}
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
        <Bar
          dataKey="Entrate"
          fill="hsl(142, 76%, 36%)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="Uscite"
          fill="hsl(0, 84%, 60%)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
