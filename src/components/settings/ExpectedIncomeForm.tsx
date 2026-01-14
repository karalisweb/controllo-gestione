"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { eurosToCents, centsToEuros } from "@/lib/utils/currency";
import type { ExpectedIncome, RevenueCenter } from "@/types";

const schema = z.object({
  clientName: z.string().min(1, "Nome cliente obbligatorio"),
  revenueCenterId: z.string().optional(),
  amount: z.string().min(1, "Importo obbligatorio"),
  frequency: z.enum(["monthly", "quarterly", "semiannual", "annual", "one_time"]),
  expectedDay: z.string().min(1, "Giorno previsto obbligatorio"),
  startDate: z.string().min(1, "Data inizio obbligatoria"),
  endDate: z.string().optional(),
  reliability: z.enum(["high", "medium", "low"]),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Mensile",
  quarterly: "Trimestrale",
  semiannual: "Semestrale",
  annual: "Annuale",
  one_time: "Una tantum",
};

const RELIABILITY_LABELS: Record<string, string> = {
  high: "Alta - Pagamento sicuro",
  medium: "Media - Probabile",
  low: "Bassa - Incerto",
};

interface ExpectedIncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<ExpectedIncome>) => Promise<void>;
  editingIncome?: ExpectedIncome | null;
  revenueCenters: RevenueCenter[];
}

export function ExpectedIncomeForm({
  open,
  onOpenChange,
  onSubmit,
  editingIncome,
  revenueCenters,
}: ExpectedIncomeFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editingIncome
      ? {
          clientName: editingIncome.clientName,
          revenueCenterId: editingIncome.revenueCenterId?.toString() || "",
          amount: centsToEuros(editingIncome.amount).toString(),
          frequency: editingIncome.frequency,
          expectedDay: (editingIncome.expectedDay || 20).toString(),
          startDate: editingIncome.startDate,
          endDate: editingIncome.endDate || "",
          reliability: editingIncome.reliability || "high",
          notes: editingIncome.notes || "",
        }
      : {
          clientName: "",
          revenueCenterId: "",
          amount: "",
          frequency: "monthly",
          expectedDay: "20",
          startDate: "",
          endDate: "",
          reliability: "high",
          notes: "",
        },
  });

  const frequency = watch("frequency");
  const reliability = watch("reliability");
  const revenueCenterId = watch("revenueCenterId");

  // Reset form when editingIncome changes
  useEffect(() => {
    if (editingIncome) {
      reset({
        clientName: editingIncome.clientName,
        revenueCenterId: editingIncome.revenueCenterId?.toString() || "",
        amount: centsToEuros(editingIncome.amount).toString(),
        frequency: editingIncome.frequency,
        expectedDay: (editingIncome.expectedDay || 20).toString(),
        startDate: editingIncome.startDate,
        endDate: editingIncome.endDate || "",
        reliability: editingIncome.reliability || "high",
        notes: editingIncome.notes || "",
      });
    } else {
      reset({
        clientName: "",
        revenueCenterId: "",
        amount: "",
        frequency: "monthly",
        expectedDay: "20",
        startDate: "",
        endDate: "",
        reliability: "high",
        notes: "",
      });
    }
  }, [editingIncome, reset]);

  const handleFormSubmit = async (data: FormData) => {
    try {
      await onSubmit({
        clientName: data.clientName,
        revenueCenterId: data.revenueCenterId ? parseInt(data.revenueCenterId) : null,
        amount: eurosToCents(parseFloat(data.amount)),
        frequency: data.frequency,
        expectedDay: parseInt(data.expectedDay),
        startDate: data.startDate,
        endDate: data.endDate || null,
        reliability: data.reliability,
        notes: data.notes || null,
      });
      reset();
      onOpenChange(false);
    } catch {
      // Errore gestito dal chiamante
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingIncome ? "Modifica Incasso Previsto" : "Nuovo Incasso Previsto"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nome Cliente *</Label>
              <Input
                id="clientName"
                placeholder="Es. Colombo Palace"
                {...register("clientName")}
              />
              {errors.clientName && (
                <p className="text-sm text-red-500">{errors.clientName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="revenueCenterId">Centro di Ricavo</Label>
              <Select
                value={revenueCenterId || "none"}
                onValueChange={(value) => setValue("revenueCenterId", value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  {revenueCenters.map((rc) => (
                    <SelectItem key={rc.id} value={rc.id.toString()}>
                      {rc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Importo (€) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="317.20"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedDay">Giorno Incasso *</Label>
              <Input
                id="expectedDay"
                type="number"
                min="1"
                max="28"
                placeholder="20"
                {...register("expectedDay")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequenza *</Label>
              <Select
                value={frequency}
                onValueChange={(value) =>
                  setValue("frequency", value as FormData["frequency"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reliability">Affidabilità *</Label>
              <Select
                value={reliability}
                onValueChange={(value) =>
                  setValue("reliability", value as FormData["reliability"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RELIABILITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                &quot;Bassa&quot; non conta nel previsionale
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inizio Contratto *</Label>
              <Input
                id="startDate"
                type="date"
                {...register("startDate")}
              />
              {errors.startDate && (
                <p className="text-sm text-red-500">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data Fine Contratto</Label>
              <Input
                id="endDate"
                type="date"
                {...register("endDate")}
              />
              <p className="text-xs text-muted-foreground">
                Lascia vuoto se indefinito
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Input
              id="notes"
              placeholder="Note aggiuntive..."
              {...register("notes")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvataggio..." : editingIncome ? "Salva" : "Crea"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
