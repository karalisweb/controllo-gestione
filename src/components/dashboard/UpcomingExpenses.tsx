"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { Calendar, AlertCircle, CreditCard, Receipt } from "lucide-react";

interface Expense {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: "cost" | "pdr" | "tax";
  isEssential: boolean;
  isPaid: boolean;
}

interface UpcomingExpensesProps {
  expenses: Expense[];
}

export function UpcomingExpenses({ expenses }: UpcomingExpensesProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdr":
        return <CreditCard className="h-4 w-4" />;
      case "tax":
        return <Receipt className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string, isEssential: boolean) => {
    if (isEssential) {
      return (
        <Badge variant="destructive" className="text-xs">
          VITALE
        </Badge>
      );
    }
    switch (type) {
      case "pdr":
        return (
          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
            PDR
          </Badge>
        );
      case "tax":
        return (
          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
            TASSE
          </Badge>
        );
      default:
        return null;
    }
  };

  const total = expenses.reduce((sum, e) => sum + Math.abs(e.amount), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Prossime Scadenze (7gg)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nessuna scadenza nei prossimi 7 giorni.
          </p>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <div
                key={`${expense.type}-${expense.id}-${expense.date}`}
                className={`flex items-center justify-between py-2 border-b last:border-0 ${
                  expense.isEssential ? "bg-red-50 -mx-2 px-2 rounded" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">
                    {getTypeIcon(expense.type)}
                  </div>
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      {expense.description}
                      {getTypeBadge(expense.type, expense.isEssential)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(expense.date)}
                    </div>
                  </div>
                </div>
                <div className="font-mono font-semibold text-red-600">
                  {formatCurrency(expense.amount)}
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t font-semibold">
              <span>Totale 7 giorni</span>
              <span className="text-red-600">{formatCurrency(-total)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
