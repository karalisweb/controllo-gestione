"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import type { PaymentPlan } from "@/types";
import {
  ChevronDown,
  ChevronRight,
  Check,
  Trash2,
  Calendar,
  Pencil,
  CalendarDays,
  X,
} from "lucide-react";

interface PaymentPlanListProps {
  plans: PaymentPlan[];
  onPayInstallment: (planId: number, installmentId: number) => Promise<void>;
  onUnpayInstallment: (planId: number, installmentId: number) => Promise<void>;
  onDeletePlan: (planId: number) => Promise<void>;
  onEditPlan?: (plan: PaymentPlan) => void;
  onUpdateInstallmentDate?: (planId: number, installmentId: number, newDate: string) => Promise<void>;
}

export function PaymentPlanList({
  plans,
  onPayInstallment,
  onUnpayInstallment,
  onDeletePlan,
  onEditPlan,
  onUpdateInstallmentDate,
}: PaymentPlanListProps) {
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<{ planId: number; installmentId: number; date: string } | null>(null);

  const toggleExpand = (planId: number) => {
    setExpandedPlan(expandedPlan === planId ? null : planId);
  };

  const handlePayInstallment = async (
    planId: number,
    installmentId: number
  ) => {
    setLoading(`pay-${installmentId}`);
    try {
      await onPayInstallment(planId, installmentId);
    } finally {
      setLoading(null);
    }
  };

  const handleUnpayInstallment = async (
    planId: number,
    installmentId: number
  ) => {
    setLoading(`unpay-${installmentId}`);
    try {
      await onUnpayInstallment(planId, installmentId);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (planId: number) => {
    if (!confirm("Sei sicuro di voler eliminare questo piano di rientro?")) {
      return;
    }
    setLoading(`delete-${planId}`);
    try {
      await onDeletePlan(planId);
    } finally {
      setLoading(null);
    }
  };

  const handleSaveDate = async () => {
    if (!editingDate || !onUpdateInstallmentDate) return;
    setLoading(`date-${editingDate.installmentId}`);
    try {
      await onUpdateInstallmentDate(editingDate.planId, editingDate.installmentId, editingDate.date);
      setEditingDate(null);
    } finally {
      setLoading(null);
    }
  };

  const getProgress = (plan: PaymentPlan) => {
    const paid = plan.paidInstallments || 0;
    const total = plan.totalInstallments;
    return (paid / total) * 100;
  };

  const getNextDueInstallment = (plan: PaymentPlan) => {
    if (!plan.installments) return null;
    const today = new Date().toISOString().split("T")[0];
    return plan.installments.find((i) => !i.isPaid && i.dueDate >= today);
  };

  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nessun piano di rientro presente.</p>
            <p className="text-sm">Crea un nuovo piano per iniziare.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => {
        const isExpanded = expandedPlan === plan.id;
        const progress = getProgress(plan);
        const nextDue = getNextDueInstallment(plan);
        const paidAmount = (plan.paidInstallments || 0) * plan.installmentAmount;
        const remainingAmount = plan.totalAmount - paidAmount;

        return (
          <Card key={plan.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto"
                    onClick={() => toggleExpand(plan.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </Button>
                  <CardTitle className="text-lg">{plan.creditorName}</CardTitle>
                  <Badge variant={plan.isActive ? "default" : "secondary"}>
                    {plan.isActive ? "Attivo" : "Completato"}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  {onEditPlan && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => onEditPlan(plan)}
                      title="Modifica piano"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(plan.id)}
                    disabled={loading === `delete-${plan.id}`}
                    title="Elimina piano"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Importo Totale
                  </div>
                  <div className="font-semibold">
                    {formatCurrency(plan.totalAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Rata</div>
                  <div className="font-semibold">
                    {formatCurrency(plan.installmentAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Rate Pagate
                  </div>
                  <div className="font-semibold">
                    {plan.paidInstallments || 0} / {plan.totalInstallments}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Rimanente</div>
                  <div className="font-semibold text-red-600">
                    {formatCurrency(remainingAmount)}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{progress.toFixed(0)}% completato</span>
                  {nextDue && (
                    <span>
                      Prossima rata: {formatDate(nextDue.dueDate)} -{" "}
                      {formatCurrency(nextDue.amount)}
                    </span>
                  )}
                </div>
              </div>

              {/* Note */}
              {plan.notes && (
                <p className="text-sm text-muted-foreground mb-4">
                  {plan.notes}
                </p>
              )}

              {/* Tabella rate espandibile */}
              {isExpanded && plan.installments && (
                <div className="mt-4 border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Scadenza</TableHead>
                        <TableHead className="text-right">Importo</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead className="text-right">Azione</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plan.installments.map((installment, index) => {
                        const isOverdue =
                          !installment.isPaid &&
                          installment.dueDate <
                            new Date().toISOString().split("T")[0];

                        return (
                          <TableRow
                            key={installment.id}
                            className={isOverdue ? "bg-red-50" : ""}
                          >
                            <TableCell className="font-medium">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              {editingDate?.installmentId === installment.id ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="date"
                                    value={editingDate.date}
                                    onChange={(e) => setEditingDate({ ...editingDate, date: e.target.value })}
                                    className="h-8 w-36"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-green-600"
                                    onClick={handleSaveDate}
                                    disabled={loading === `date-${installment.id}`}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-500"
                                    onClick={() => setEditingDate(null)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  {formatDate(installment.dueDate)}
                                  {!installment.isPaid && onUpdateInstallmentDate && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-blue-600"
                                      onClick={() => setEditingDate({
                                        planId: plan.id,
                                        installmentId: installment.id,
                                        date: installment.dueDate
                                      })}
                                      title="Modifica data"
                                    >
                                      <CalendarDays className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {installment.paidDate && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      (pagata il {formatDate(installment.paidDate)})
                                    </span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(installment.amount)}
                            </TableCell>
                            <TableCell>
                              {installment.isPaid ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-green-100 text-green-800"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Pagata
                                </Badge>
                              ) : isOverdue ? (
                                <Badge variant="destructive">Scaduta</Badge>
                              ) : (
                                <Badge variant="outline">Da pagare</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {installment.isPaid ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleUnpayInstallment(
                                      plan.id,
                                      installment.id
                                    )
                                  }
                                  disabled={
                                    loading === `unpay-${installment.id}`
                                  }
                                >
                                  Annulla
                                </Button>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() =>
                                    handlePayInstallment(
                                      plan.id,
                                      installment.id
                                    )
                                  }
                                  disabled={loading === `pay-${installment.id}`}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Paga
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
