"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { MONTHS_SHORT } from "@/lib/utils/dates";
import { centsToEuros } from "@/lib/utils/currency";

interface CumulativeData {
  month: number;
  cumulative: number;
}

interface CumulativeChartProps {
  data: CumulativeData[];
  startingBalance?: number;
}

export function CumulativeChart({
  data,
  startingBalance = 0,
}: CumulativeChartProps) {
  let running = centsToEuros(startingBalance);
  const chartData = data.map((d) => {
    running += centsToEuros(d.cumulative);
    return {
      name: MONTHS_SHORT[d.month - 1],
      Saldo: running,
      isNegative: running < 0,
    };
  });

  const formatEuro = (value: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);

  const minValue = Math.min(...chartData.map((d) => d.Saldo));
  const maxValue = Math.max(...chartData.map((d) => d.Saldo));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(value) =>
            value >= 1000 || value <= -1000
              ? `${(value / 1000).toFixed(0)}k`
              : value.toString()
          }
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          domain={[Math.min(minValue, 0) * 1.1, maxValue * 1.1]}
        />
        <Tooltip
          formatter={(value) => formatEuro(value as number)}
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <ReferenceLine
          y={0}
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="3 3"
        />
        <Area
          type="monotone"
          dataKey="Saldo"
          stroke="hsl(217, 91%, 60%)"
          fillOpacity={1}
          fill="url(#colorSaldo)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
