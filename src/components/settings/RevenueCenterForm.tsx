"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import type { RevenueCenter } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  description: z.string().optional(),
  color: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const COLORS = [
  "#22c55e", "#14b8a6", "#3b82f6", "#6366f1", "#8b5cf6",
  "#ec4899", "#f97316", "#eab308", "#ef4444", "#6b7280",
];

interface RevenueCenterFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<RevenueCenter>) => Promise<void>;
  editingCenter?: RevenueCenter | null;
}

export function RevenueCenterForm({
  open,
  onOpenChange,
  onSubmit,
  editingCenter,
}: RevenueCenterFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editingCenter
      ? {
          name: editingCenter.name,
          description: editingCenter.description || "",
          color: editingCenter.color || COLORS[0],
        }
      : {
          name: "",
          description: "",
          color: COLORS[0],
        },
  });

  const selectedColor = watch("color");

  // Reset form when editingCenter changes
  useEffect(() => {
    if (editingCenter) {
      reset({
        name: editingCenter.name,
        description: editingCenter.description || "",
        color: editingCenter.color || COLORS[0],
      });
    } else {
      reset({
        name: "",
        description: "",
        color: COLORS[0],
      });
    }
  }, [editingCenter, reset]);

  const handleFormSubmit = async (data: FormData) => {
    try {
      await onSubmit({
        name: data.name,
        description: data.description || null,
        color: data.color || null,
      });
      reset();
      onOpenChange(false);
    } catch {
      // Errore gestito dal chiamante
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingCenter ? "Modifica Centro di Ricavo" : "Nuovo Centro di Ricavo"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Es. Siti Web, Marketing, Domini..."
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Questo è un aggregatore per raggruppare gli incassi previsti
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Input
              id="description"
              placeholder="Note aggiuntive..."
              {...register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label>Colore</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color
                      ? "border-gray-900 scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setValue("color", color)}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvataggio..." : editingCenter ? "Salva" : "Crea"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
