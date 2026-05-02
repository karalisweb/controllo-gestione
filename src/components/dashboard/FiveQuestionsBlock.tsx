"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Repeat,
  PiggyBank,
  Sparkles,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface DashboardQuestionsResponse {
  year: number;
  month: number;
  today: string;
  monthSoFar: {
    invoicedNet: number;
    soci: number;
    agency: number;
    spent: number;
    balance: number;
  };
  breakEven: {
    expensesMonthTotal: number;
    agencyToDate: number;
    agencyMissing: number;
    netToInvoice: number;
    reached: boolean;
  };
  recurring: {
    recurringIncomeNet: number;
    recurringAgency: number;
    fixedStructure: number;
    structureGap: number;
    pdrMonthTotal: number;
    gapWithPdr: number;
  };
  investments: {
    currentBalance: number;
    monthlyBurn: number;
    runwayDays: number;
    safetyTarget: number;
    surplus: number;
  };
}

interface FundRow {
  id: number;
  name: string;
  type: "liquid" | "emergency";
  targetCents: number;
  currentCents: number;
  progressPct: number;
}
interface FundsResponse {
  funds: FundRow[];
  totals: { target: number; current: number };
}

const MONTH_LABELS = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

function trafficLight(state: "green" | "yellow" | "red"): string {
  return state === "green" ? "bg-green-500" : state === "yellow" ? "bg-amber-500" : "bg-red-500";
}

export function FiveQuestionsBlock() {
  const [data, setData] = useState<DashboardQuestionsResponse | null>(null);
  const [funds, setFunds] = useState<FundsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r1, r2] = await Promise.all([
          fetch("/api/dashboard-questions"),
          fetch("/api/funds"),
        ]);
        if (r1.ok) {
          const json: DashboardQuestionsResponse = await r1.json();
          if (!cancelled) setData(json);
        }
        if (r2.ok) {
          const json: FundsResponse = await r2.json();
          if (!cancelled) setFunds(json);
        }
      } catch {
        // silent: la pagina ha le altre sezioni che continuano a funzionare
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data) return null;

  const monthName = MONTH_LABELS[data.month - 1];

  // Card 1 — semaforo
  const card1State: "green" | "yellow" | "red" =
    data.monthSoFar.balance > 0 ? "green" : data.monthSoFar.balance > -50000 ? "yellow" : "red";

  // Card 2 — semaforo (raggiunto / quasi / lontano)
  const card2State: "green" | "yellow" | "red" = data.breakEven.reached
    ? "green"
    : data.breakEven.expensesMonthTotal > 0 && data.breakEven.agencyMissing / data.breakEven.expensesMonthTotal < 0.3
      ? "yellow"
      : "red";

  // Card 3 — copre o no la struttura
  const card3State: "green" | "yellow" | "red" =
    data.recurring.structureGap >= 0 ? "green" : "red";

  // Card 5 — runway
  const card5State: "green" | "yellow" | "red" =
    data.investments.runwayDays >= 90 ? "green"
      : data.investments.runwayDays >= 60 ? "yellow"
        : "red";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {/* Card 1 — Come va il mese? */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${trafficLight(card1State)}`} />
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Come va {monthName}?
              </h3>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Fatturato netto</p>
              <p className="font-mono font-bold">{formatCurrency(data.monthSoFar.invoicedNet)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Soci usciti</p>
              <p className="font-mono">-{formatCurrency(data.monthSoFar.soci)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Resta a {monthName}</p>
              <p className="font-mono font-bold text-primary">{formatCurrency(data.monthSoFar.agency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Speso</p>
              <p className="font-mono">-{formatCurrency(data.monthSoFar.spent)}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground">Saldo {monthName}</p>
            <p className={`font-mono font-bold text-2xl ${data.monthSoFar.balance >= 0 ? "text-green-500" : "text-red-500"}`}>
              {data.monthSoFar.balance >= 0 ? "+" : ""}{formatCurrency(data.monthSoFar.balance)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2 — Quanto devo vendere? */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${trafficLight(card2State)}`} />
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Quanto devo vendere?
              </h3>
            </div>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Spese mese (incl. PDR)</p>
              <p className="font-mono">-{formatCurrency(data.breakEven.expensesMonthTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Resta a oggi</p>
              <p className="font-mono">{formatCurrency(data.breakEven.agencyToDate)}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            {data.breakEven.reached ? (
              <>
                <p className="text-xs text-muted-foreground">Break-even raggiunto</p>
                <p className="font-mono font-bold text-2xl text-green-500">+{formatCurrency(data.breakEven.agencyToDate - data.breakEven.expensesMonthTotal)}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Da fatturare netto questo mese</p>
                <p className="font-mono font-bold text-2xl text-primary">{formatCurrency(data.breakEven.netToInvoice)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  per coprire {formatCurrency(data.breakEven.agencyMissing)} mancanti
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 3 — Ricorrente copre i fissi? */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${trafficLight(card3State)}`} />
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Ricorrente copre i fissi?
              </h3>
            </div>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Resta dai ricorrenti</p>
              <p className="font-mono font-bold">{formatCurrency(data.recurring.recurringAgency)}</p>
              <p className="text-[10px] text-muted-foreground">su netto {formatCurrency(data.recurring.recurringIncomeNet)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Spese fisse struttura</p>
              <p className="font-mono">-{formatCurrency(data.recurring.fixedStructure)}</p>
              <p className="text-[10px] text-muted-foreground">escl. PDR</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              {data.recurring.structureGap >= 0 ? "Margine struttura" : "Scopertura struttura"}
            </p>
            <p className={`font-mono font-bold text-2xl ${data.recurring.structureGap >= 0 ? "text-green-500" : "text-red-500"}`}>
              {data.recurring.structureGap >= 0 ? "+" : ""}{formatCurrency(data.recurring.structureGap)}
            </p>
            {data.recurring.pdrMonthTotal > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {data.recurring.gapWithPdr >= 0
                  ? `con PDR (${formatCurrency(data.recurring.pdrMonthTotal)}) margine: +${formatCurrency(data.recurring.gapWithPdr)}`
                  : `con PDR (${formatCurrency(data.recurring.pdrMonthTotal)}) scoperto per ${formatCurrency(-data.recurring.gapWithPdr)}`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 4 — Sto costruendo il gruzzolo? */}
      {(() => {
        const totalCurrent = funds?.totals.current ?? 0;
        const totalTarget = funds?.totals.target ?? 0;
        const overallPct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
        const card4State: "green" | "yellow" | "red" = overallPct >= 100 ? "green" : overallPct >= 30 ? "yellow" : "red";
        const liquid = funds?.funds.find((f) => f.type === "liquid");
        const emergency = funds?.funds.find((f) => f.type === "emergency");

        return (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${trafficLight(card4State)}`} />
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    Sto costruendo il gruzzolo?
                  </h3>
                </div>
                <PiggyBank className="h-4 w-4 text-muted-foreground" />
              </div>
              {funds && funds.funds.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {liquid && (
                      <div>
                        <p className="text-xs text-muted-foreground">{liquid.name}</p>
                        <p className="font-mono font-bold">
                          {formatCurrency(liquid.currentCents)} <span className="text-muted-foreground font-normal text-xs">/ {formatCurrency(liquid.targetCents)}</span>
                        </p>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                          <div className={`h-1.5 rounded-full ${liquid.progressPct >= 100 ? "bg-green-500" : "bg-primary"}`} style={{ width: `${liquid.progressPct}%` }} />
                        </div>
                      </div>
                    )}
                    {emergency && (
                      <div>
                        <p className="text-xs text-muted-foreground">{emergency.name}</p>
                        <p className="font-mono font-bold">
                          {formatCurrency(emergency.currentCents)} <span className="text-muted-foreground font-normal text-xs">/ {formatCurrency(emergency.targetCents)}</span>
                        </p>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                          <div className={`h-1.5 rounded-full ${emergency.progressPct >= 100 ? "bg-green-500" : "bg-primary"}`} style={{ width: `${emergency.progressPct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-baseline justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Gruzzolo costruito</p>
                      <p className={`font-mono font-bold text-2xl ${card4State === "green" ? "text-green-500" : card4State === "yellow" ? "text-amber-500" : "text-foreground"}`}>
                        {overallPct}%
                      </p>
                    </div>
                    <Link href="/fondi" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                      Aggiorna saldo <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Fondi non ancora caricati</p>
                  <Link href="/fondi" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                    Vai a /fondi <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Card 5 — Posso permettermi investimenti? — col-span-2 su lg */}
      <Card className="lg:col-span-2">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${trafficLight(card5State)}`} />
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Posso permettermi investimenti?
              </h3>
            </div>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Cassa oggi</p>
              <p className="font-mono font-bold">{formatCurrency(data.investments.currentBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Burn medio/mese</p>
              <p className="font-mono">-{formatCurrency(data.investments.monthlyBurn)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Runway</p>
              <p className={`font-mono font-bold ${card5State === "green" ? "text-green-500" : card5State === "yellow" ? "text-amber-500" : "text-red-500"}`}>
                {data.investments.runwayDays} giorni
              </p>
              <p className="text-[10px] text-muted-foreground">target 90gg</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Eccedenza sopra 90gg</p>
              <p className={`font-mono font-bold ${data.investments.surplus > 0 ? "text-green-500" : "text-red-500"}`}>
                {data.investments.surplus > 0 ? "+" : ""}{formatCurrency(data.investments.surplus)}
              </p>
              {data.investments.surplus > 0 ? (
                <p className="text-[10px] text-green-500">disponibili per investimenti</p>
              ) : (
                <p className="text-[10px] text-red-500">prima ricostruisci runway</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
