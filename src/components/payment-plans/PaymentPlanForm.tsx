"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, eurosToCents, centsToEuros } from "@/lib/utils/currency";

const schema = z.object({
  creditorName: z.string().min(1, "Nome creditore obbligatorio"),
  totalAmount: z.string().min(1, "Importo totale obbligatorio"),
  totalInstallments: z.string().min(1, "Numero rate obbligatorio"),
  installmentAmount: z.string().optional(),
  startDate: z.string().min(1, "Data inizio obbligatoria"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface EditingPlan {
  id: number;
  creditorName: string;
  totalAmount: number;
  totalInstallments: number;
  installmentAmount: number;
  startDate: string;
  notes: string | null;
}

interface PaymentPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPlan?: EditingPlan | null;
  onSubmit: (data: {
    creditorName: string;
    totalAmount: number;
    totalInstallments: number;
    installmentAmount?: number;
    startDate: string;
    notes?: string;
    regenerateInstallments?: boolean;
  }) => Promise<void>;
}

export function PaymentPlanForm({
  open,
  onOpenChange,
  editingPlan,
  onSubmit,
}: PaymentPlanFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      creditorName: "",
      totalAmount: "",
      totalInstallments: "",
      installmentAmount: "",
      startDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  // Popola il form quando si modifica un piano esistente
  useEffect(() => {
    if (editingPlan) {
      setValue("creditorName", editingPlan.creditorName);
      setValue("totalAmount", centsToEuros(editingPlan.totalAmount).toFixed(2));
      setValue("totalInstallments", editingPlan.totalInstallments.toString());
      // Calcola importo rata da totale / numero rate
      const calculatedInstallment = centsToEuros(editingPlan.totalAmount) / editingPlan.totalInstallments;
      setValue("installmentAmount", calculatedInstallment.toFixed(2));
      setValue("startDate", editingPlan.startDate);
      setValue("notes", editingPlan.notes || "");
    } else {
      reset({
        creditorName: "",
        totalAmount: "",
        totalInstallments: "",
        installmentAmount: "",
        startDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
    }
  }, [editingPlan, setValue, reset]);

  const totalAmount = watch("totalAmount");
  const totalInstallments = watch("totalInstallments");

  // Aggiorna automaticamente l'importo rata quando cambiano totale o numero rate
  useEffect(() => {
    if (totalAmount && totalInstallments) {
      const calculated = parseFloat(totalAmount) / parseInt(totalInstallments);
      if (!isNaN(calculated) && calculated > 0) {
        setValue("installmentAmount", calculated.toFixed(2));
      }
    }
  }, [totalAmount, totalInstallments, setValue]);

  const handleFormSubmit = async (data: FormData) => {
    try {
      await onSubmit({
        creditorName: data.creditorName,
        totalAmount: eurosToCents(parseFloat(data.totalAmount)),
        totalInstallments: parseInt(data.totalInstallments),
        installmentAmount: data.installmentAmount
          ? eurosToCents(parseFloat(data.installmentAmount))
          : undefined,
        startDate: data.startDate,
        notes: data.notes || undefined,
        regenerateInstallments: !!editingPlan, // Rigenera rate solo in modifica
      });
      reset();
      onOpenChange(false);
    } catch {
      // Errore gestito dal chiamante
    }
  };

  const isEditing = !!editingPlan;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifica Piano di Rientro" : "Nuovo Piano di Rientro"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="creditorName">Nome Creditore</Label>
            <Input
              id="creditorName"
              placeholder="Es. Matteo PDR"
              {...register("creditorName")}
            />
            {errors.creditorName && (
              <p className="text-sm text-red-500">
                {errors.creditorName.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Importo Totale (€)</Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                placeholder="1000.00"
                {...register("totalAmount")}
              />
              {errors.totalAmount && (
                <p className="text-sm text-red-500">
                  {errors.totalAmount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalInstallments">Numero Rate</Label>
              <Input
                id="totalInstallments"
                type="number"
                min="1"
                placeholder="12"
                {...register("totalInstallments")}
              />
              {errors.totalInstallments && (
                <p className="text-sm text-red-500">
                  {errors.totalInstallments.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="installmentAmount">
              Importo Rata (€)
            </Label>
            <Input
              id="installmentAmount"
              type="number"
              step="0.01"
              placeholder="Calcolato automaticamente"
              {...register("installmentAmount")}
            />
            <p className="text-xs text-muted-foreground">
              Calcolato da Totale ÷ Rate. Puoi modificarlo manualmente.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Data Prima Rata</Label>
            <Input id="startDate" type="date" {...register("startDate")} />
            {errors.startDate && (
              <p className="text-sm text-red-500">{errors.startDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note (Opzionale)</Label>
            <Input
              id="notes"
              placeholder="Note aggiuntive..."
              {...register("notes")}
            />
          </div>

          {isEditing && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <strong>Attenzione:</strong> Salvando le modifiche verranno rigenerate tutte le rate e lo stato dei pagamenti verrà azzerato.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvataggio..." : isEditing ? "Salva Modifiche" : "Crea Piano"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
