"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
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
import type { PaymentPlanCategory } from "@/types";

const schema = z.object({
  creditorName: z.string().min(1, "Nome creditore obbligatorio"),
  categoryId: z.string().optional(),
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
  categoryId: number | null;
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
    categoryId?: number;
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
  const [categories, setCategories] = useState<PaymentPlanCategory[]>([]);

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
      categoryId: "",
      totalAmount: "",
      totalInstallments: "",
      installmentAmount: "",
      startDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  // Carica le categorie
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/payment-plan-categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (error) {
        console.error("Errore nel caricamento categorie:", error);
      }
    };
    fetchCategories();
  }, []);

  // Popola il form quando si modifica un piano esistente
  useEffect(() => {
    if (editingPlan) {
      setValue("creditorName", editingPlan.creditorName);
      setValue("categoryId", editingPlan.categoryId?.toString() || "");
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
        categoryId: "",
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
        categoryId: data.categoryId ? parseInt(data.categoryId) : undefined,
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

  const selectedCategoryId = watch("categoryId");

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

          <div className="space-y-2">
            <Label htmlFor="categoryId">Categoria</Label>
            <Select
              value={selectedCategoryId || ""}
              onValueChange={(value) => setValue("categoryId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona categoria..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    <div className="flex items-center gap-2">
                      {cat.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                      )}
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
