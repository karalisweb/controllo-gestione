"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Contact, ContactType, CostCenter, RevenueCenter } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Nome obbligatorio").max(120, "Massimo 120 caratteri"),
  type: z.enum(["client", "supplier", "ex_supplier", "other"]),
  email: z.string().email("Email non valida").or(z.literal("")).optional(),
  phone: z.string().optional(),
  costCenterId: z.string().optional(),
  revenueCenterId: z.string().optional(),
  isMovable: z.boolean().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const TYPE_LABELS: Record<ContactType, string> = {
  client: "Cliente",
  supplier: "Fornitore",
  ex_supplier: "Ex Fornitore",
  other: "Altro",
};

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Contact>) => Promise<void>;
  editing?: Contact | null;
  costCenters: CostCenter[];
  revenueCenters: RevenueCenter[];
  defaultType?: ContactType;
}

export function ContactForm({
  open,
  onOpenChange,
  onSubmit,
  editing,
  costCenters,
  revenueCenters,
  defaultType,
}: ContactFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      type: defaultType || "client",
      email: "",
      phone: "",
      costCenterId: "",
      revenueCenterId: "",
      isMovable: true,
      notes: "",
    },
  });

  const watchType = watch("type");
  const watchCostCenterId = watch("costCenterId");
  const watchRevenueCenterId = watch("revenueCenterId");
  const watchIsMovable = watch("isMovable");
  const isSupplierLike = watchType === "supplier" || watchType === "ex_supplier";
  const isClient = watchType === "client";

  // Reset quando cambia editing o si apre per un nuovo
  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        type: editing.type,
        email: editing.email || "",
        phone: editing.phone || "",
        costCenterId: editing.costCenterId ? String(editing.costCenterId) : "",
        revenueCenterId: editing.revenueCenterId ? String(editing.revenueCenterId) : "",
        isMovable: editing.isMovable ?? true,
        notes: editing.notes || "",
      });
    } else {
      reset({
        name: "",
        type: defaultType || "client",
        email: "",
        phone: "",
        costCenterId: "",
        revenueCenterId: "",
        isMovable: true,
        notes: "",
      });
    }
  }, [editing, defaultType, reset]);

  const handleFormSubmit = async (data: FormData) => {
    try {
      await onSubmit({
        name: data.name,
        type: data.type,
        email: data.email || null,
        phone: data.phone || null,
        costCenterId: isSupplierLike && data.costCenterId ? parseInt(data.costCenterId, 10) : null,
        revenueCenterId: isClient && data.revenueCenterId ? parseInt(data.revenueCenterId, 10) : null,
        isMovable: isSupplierLike ? Boolean(data.isMovable) : true,
        notes: data.notes || null,
      });
      reset();
      onOpenChange(false);
    } catch {
      // Errore gestito dal chiamante (toast)
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Modifica contatto" : "Nuovo contatto"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Aggiorna i dati del contatto."
              : "Aggiungi un cliente, fornitore o altro contatto in anagrafica."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Es. Cambarau, Wind, Result Consulting..."
              {...register("name")}
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Select
              value={watchType}
              onValueChange={(v) => setValue("type", v as ContactType)}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(TYPE_LABELS) as [ContactType, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Centro di ricavo (solo per clienti) */}
          {isClient && (
            <div className="space-y-2">
              <Label htmlFor="revenueCenterId">Centro di ricavo</Label>
              <Select
                value={watchRevenueCenterId || "none"}
                onValueChange={(v) => setValue("revenueCenterId", v === "none" ? "" : v)}
              >
                <SelectTrigger id="revenueCenterId">
                  <SelectValue placeholder="Nessuno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  {revenueCenters.map((rc) => (
                    <SelectItem key={rc.id} value={String(rc.id)}>
                      {rc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se impostato, gli incassi da questo cliente vanno in questo centro di default.
              </p>
            </div>
          )}

          {/* Centro di costo (solo per fornitori/ex-fornitori) */}
          {isSupplierLike && (
            <div className="space-y-2">
              <Label htmlFor="costCenterId">Centro di costo</Label>
              <Select
                value={watchCostCenterId || "none"}
                onValueChange={(v) => setValue("costCenterId", v === "none" ? "" : v)}
              >
                <SelectTrigger id="costCenterId">
                  <SelectValue placeholder="Nessuno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc.id} value={String(cc.id)}>
                      {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se impostato, le spese da questo fornitore vanno automaticamente in questo centro.
              </p>
            </div>
          )}

          {/* Spostabile (solo per fornitori) */}
          {isSupplierLike && (
            <div className="flex items-start gap-2">
              <Checkbox
                id="isMovable"
                checked={Boolean(watchIsMovable)}
                onCheckedChange={(checked) => setValue("isMovable", Boolean(checked))}
              />
              <div className="space-y-1 leading-tight">
                <Label htmlFor="isMovable" className="cursor-pointer">
                  Date negoziabili
                </Label>
                <p className="text-xs text-muted-foreground">
                  Spunta se è un creditore con cui puoi spostare le date di pagamento.
                </p>
              </div>
            </div>
          )}

          {/* Email opzionale */}
          <div className="space-y-2">
            <Label htmlFor="email">Email (opzionale)</Label>
            <Input
              id="email"
              type="email"
              placeholder="info@cliente.it"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Telefono opzionale */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefono (opzionale)</Label>
            <Input id="phone" placeholder="+39 ..." {...register("phone")} />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Input id="notes" placeholder="Note libere..." {...register("notes")} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvataggio..." : editing ? "Salva" : "Crea"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
