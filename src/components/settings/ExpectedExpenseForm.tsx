"use client";

import { useEffect } from "react";
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
import type { ExpectedExpense, CostCenter } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Nome spesa obbligatorio"),
  costCenterId: z.string().optional(),
  amount: z.string().min(1, "Importo obbligatorio"),
  frequency: z.enum(["monthly", "quarterly", "semiannual", "annual", "one_time"]),
  expectedDay: z.string().min(1, "Giorno previsto obbligatorio"),
  startDate: z.string().min(1, "Data inizio obbligatoria"),
  endDate: z.string().optional(),
  priority: z.enum(["essential", "important", "investment", "normal"]),
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

const PRIORITY_LABELS: Record<string, string> = {
  essential: "Vitale - Non posso farne a meno",
  important: "Importante - Difficile rimuovere",
  investment: "Investimento - Genera valore",
  normal: "Normale",
};

interface ExpectedExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<ExpectedExpense>) => Promise<void>;
  editingExpense?: ExpectedExpense | null;
  costCenters: CostCenter[];
}

export function ExpectedExpenseForm({
  open,
  onOpenChange,
  onSubmit,
  editingExpense,
  costCenters,
}: ExpectedExpenseFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editingExpense
      ? {
          name: editingExpense.name,
          costCenterId: editingExpense.costCenterId?.toString() || "",
          amount: centsToEuros(editingExpense.amount).toString(),
          frequency: editingExpense.frequency,
          expectedDay: (editingExpense.expectedDay || 1).toString(),
          startDate: editingExpense.startDate,
          endDate: editingExpense.endDate || "",
          priority: editingExpense.priority || "normal",
          notes: editingExpense.notes || "",
        }
      : {
          name: "",
          costCenterId: "",
          amount: "",
          frequency: "monthly",
          expectedDay: "1",
          startDate: "",
          endDate: "",
          priority: "normal",
          notes: "",
        },
  });

  const frequency = watch("frequency");
  const priority = watch("priority");
  const costCenterId = watch("costCenterId");

  // Reset form when editingExpense changes
  useEffect(() => {
    if (editingExpense) {
      reset({
        name: editingExpense.name,
        costCenterId: editingExpense.costCenterId?.toString() || "",
        amount: centsToEuros(editingExpense.amount).toString(),
        frequency: editingExpense.frequency,
        expectedDay: (editingExpense.expectedDay || 1).toString(),
        startDate: editingExpense.startDate,
        endDate: editingExpense.endDate || "",
        priority: editingExpense.priority || "normal",
        notes: editingExpense.notes || "",
      });
    } else {
      reset({
        name: "",
        costCenterId: "",
        amount: "",
        frequency: "monthly",
        expectedDay: "1",
        startDate: "",
        endDate: "",
        priority: "normal",
        notes: "",
      });
    }
  }, [editingExpense, reset]);

  const handleFormSubmit = async (data: FormData) => {
    try {
      await onSubmit({
        name: data.name,
        costCenterId: data.costCenterId ? parseInt(data.costCenterId) : null,
        amount: eurosToCents(parseFloat(data.amount)),
        frequency: data.frequency,
        expectedDay: parseInt(data.expectedDay),
        startDate: data.startDate,
        endDate: data.endDate || null,
        priority: data.priority,
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
            {editingExpense ? "Modifica Spesa Prevista" : "Nuova Spesa Prevista"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Spesa *</Label>
              <Input
                id="name"
                placeholder="Es. Wind Telefonia"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="costCenterId">Centro di Costo</Label>
              <Select
                value={costCenterId || "none"}
                onValueChange={(value) => setValue("costCenterId", value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id.toString()}>
                      {cc.name}
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
                placeholder="31.68"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedDay">Giorno Pagamento *</Label>
              <Input
                id="expectedDay"
                type="number"
                min="1"
                max="28"
                placeholder="1"
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
              <Label htmlFor="priority">Priorità *</Label>
              <Select
                value={priority}
                onValueChange={(value) =>
                  setValue("priority", value as FormData["priority"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {isSubmitting ? "Salvataggio..." : editingExpense ? "Salva" : "Crea"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
