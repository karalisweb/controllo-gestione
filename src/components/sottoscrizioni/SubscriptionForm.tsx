"use client";

import { useEffect, useMemo } from "react";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { centsToEuros, eurosToCents, formatCurrency } from "@/lib/utils/currency";
import type { Subscription, Contact, Service } from "@/types";

const schema = z.object({
  contactId: z.string().min(1, "Cliente obbligatorio"),
  serviceId: z.string().min(1, "Servizio obbligatorio"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inizio non valida"),
  endDate: z.string().optional(),
  customAmountEuros: z.string().optional(),
  customIntervalMonths: z.string().optional(),
  customFirstPct: z.string().optional(),
  customOffsetDays: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface SubscriptionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Subscription>) => Promise<void>;
  editing?: Subscription | null;
  contacts: Contact[];
  services: Service[];
  preselectedContactId?: number;
}

export function SubscriptionForm({
  open,
  onOpenChange,
  onSubmit,
  editing,
  contacts,
  services,
  preselectedContactId,
}: SubscriptionFormProps) {
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
      contactId: preselectedContactId ? String(preselectedContactId) : "",
      serviceId: "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      customAmountEuros: "",
      customIntervalMonths: "",
      customFirstPct: "",
      customOffsetDays: "",
      notes: "",
    },
  });

  const watchContactId = watch("contactId");
  const watchServiceId = watch("serviceId");

  const selectedService = useMemo(
    () => services.find((s) => String(s.id) === watchServiceId) || null,
    [services, watchServiceId],
  );

  // Filtra contacts a soli clienti per il select (ma lascia anche supplier nel caso di subscriptions verso fornitori in futuro)
  const clientContacts = useMemo(
    () => contacts.filter((c) => c.type === "client"),
    [contacts],
  );

  useEffect(() => {
    if (editing) {
      reset({
        contactId: String(editing.contactId),
        serviceId: String(editing.serviceId),
        startDate: editing.startDate,
        endDate: editing.endDate || "",
        customAmountEuros: editing.customAmount ? String(centsToEuros(editing.customAmount)) : "",
        customIntervalMonths: editing.customIntervalMonths ? String(editing.customIntervalMonths) : "",
        customFirstPct: editing.customFirstPct !== null && editing.customFirstPct !== undefined ? String(editing.customFirstPct) : "",
        customOffsetDays: editing.customOffsetDays !== null && editing.customOffsetDays !== undefined ? String(editing.customOffsetDays) : "",
        notes: editing.notes || "",
      });
    } else {
      reset({
        contactId: preselectedContactId ? String(preselectedContactId) : "",
        serviceId: "",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: "",
        customAmountEuros: "",
        customIntervalMonths: "",
        customFirstPct: "",
        customOffsetDays: "",
        notes: "",
      });
    }
  }, [editing, preselectedContactId, reset]);

  const handleFormSubmit = async (data: FormData) => {
    try {
      await onSubmit({
        contactId: parseInt(data.contactId, 10),
        serviceId: parseInt(data.serviceId, 10),
        startDate: data.startDate,
        endDate: data.endDate || null,
        customAmount: data.customAmountEuros ? eurosToCents(parseFloat(data.customAmountEuros)) : null,
        customIntervalMonths: data.customIntervalMonths ? parseInt(data.customIntervalMonths, 10) : null,
        customFirstPct: data.customFirstPct ? parseFloat(data.customFirstPct) : null,
        customOffsetDays: data.customOffsetDays ? parseInt(data.customOffsetDays, 10) : null,
        notes: data.notes || null,
      });
      reset();
      onOpenChange(false);
    } catch {
      // toast gestito dal chiamante
    }
  };

  const defaultAmountHint = selectedService?.defaultAmount
    ? `Default servizio: ${formatCurrency(selectedService.defaultAmount)}`
    : "Default servizio: variabile";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifica sottoscrizione" : "Nuova sottoscrizione"}</DialogTitle>
          <DialogDescription>
            Assegna un servizio del catalogo a un cliente. I valori lasciati vuoti useranno i default del servizio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="contactId">Cliente *</Label>
            <Select value={watchContactId} onValueChange={(v) => setValue("contactId", v)}>
              <SelectTrigger id="contactId"><SelectValue placeholder="Scegli cliente..." /></SelectTrigger>
              <SelectContent>
                {clientContacts.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.contactId && <p className="text-sm text-red-500">{errors.contactId.message}</p>}
          </div>

          {/* Servizio */}
          <div className="space-y-2">
            <Label htmlFor="serviceId">Servizio *</Label>
            <Select value={watchServiceId} onValueChange={(v) => setValue("serviceId", v)}>
              <SelectTrigger id="serviceId"><SelectValue placeholder="Scegli servizio..." /></SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name} <span className="text-muted-foreground">({s.type === "recurring" ? "ricorrente" : "acconto+saldo"})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.serviceId && <p className="text-sm text-red-500">{errors.serviceId.message}</p>}
          </div>

          {/* Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data inizio *</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
              {errors.startDate && <p className="text-sm text-red-500">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data fine</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
            </div>
          </div>

          {/* Importo */}
          <div className="space-y-2">
            <Label htmlFor="customAmountEuros">
              Importo (€) <span className="text-xs text-muted-foreground font-normal">— IVA inclusa, lascia vuoto per usare il default servizio</span>
            </Label>
            <Input
              id="customAmountEuros"
              type="number"
              step="0.01"
              min="0"
              placeholder={selectedService?.defaultAmount ? String(centsToEuros(selectedService.defaultAmount)) : "0.00"}
              {...register("customAmountEuros")}
            />
            <p className="text-xs text-muted-foreground">{defaultAmountHint}</p>
          </div>

          {/* Override pattern-specific */}
          {selectedService?.type === "recurring" && (
            <div className="space-y-2">
              <Label htmlFor="customIntervalMonths">Intervallo mesi (override)</Label>
              <Input
                id="customIntervalMonths"
                type="number"
                min="1"
                max="120"
                placeholder={String(selectedService.defaultIntervalMonths || 1)}
                {...register("customIntervalMonths")}
              />
              <p className="text-xs text-muted-foreground">
                Default servizio: ogni {selectedService.defaultIntervalMonths || 1} mesi. Lascia vuoto per usare il default.
              </p>
            </div>
          )}

          {selectedService?.type === "installments" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="customFirstPct">% Acconto (override)</Label>
                <Input
                  id="customFirstPct"
                  type="number"
                  min="0"
                  max="100"
                  placeholder={String(selectedService.defaultFirstPct || 50)}
                  {...register("customFirstPct")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customOffsetDays">Offset gg (override)</Label>
                <Input
                  id="customOffsetDays"
                  type="number"
                  min="0"
                  max="3650"
                  placeholder={String(selectedService.defaultOffsetDays || 60)}
                  {...register("customOffsetDays")}
                />
              </div>
            </div>
          )}

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
