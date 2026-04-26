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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { centsToEuros, eurosToCents } from "@/lib/utils/currency";
import type { Service, ServiceType, RevenueCenter } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Nome obbligatorio").max(120),
  type: z.enum(["recurring", "installments"]),
  revenueCenterId: z.string().optional(),
  description: z.string().optional(),
  defaultAmountEuros: z.string().optional(), // input come stringa (campo numerico)
  defaultIntervalMonths: z.string().optional(),
  defaultFirstPct: z.string().optional(),
  defaultOffsetDays: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const TYPE_LABELS: Record<ServiceType, string> = {
  recurring: "Ricorrente (intervallo fisso)",
  installments: "Acconto + Saldo",
};

interface ServiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Service>) => Promise<void>;
  editing?: Service | null;
  revenueCenters: RevenueCenter[];
  defaultType?: ServiceType;
}

export function ServiceForm({
  open,
  onOpenChange,
  onSubmit,
  editing,
  revenueCenters,
  defaultType,
}: ServiceFormProps) {
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
      type: defaultType || "recurring",
      revenueCenterId: "",
      description: "",
      defaultAmountEuros: "",
      defaultIntervalMonths: "1",
      defaultFirstPct: "50",
      defaultOffsetDays: "60",
    },
  });

  const watchType = watch("type");
  const watchRevCenterId = watch("revenueCenterId");

  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        type: editing.type,
        revenueCenterId: editing.revenueCenterId ? String(editing.revenueCenterId) : "",
        description: editing.description || "",
        defaultAmountEuros: editing.defaultAmount ? String(centsToEuros(editing.defaultAmount)) : "",
        defaultIntervalMonths: String(editing.defaultIntervalMonths ?? 1),
        defaultFirstPct: String(editing.defaultFirstPct ?? 50),
        defaultOffsetDays: String(editing.defaultOffsetDays ?? 60),
      });
    } else {
      reset({
        name: "",
        type: defaultType || "recurring",
        revenueCenterId: "",
        description: "",
        defaultAmountEuros: "",
        defaultIntervalMonths: "1",
        defaultFirstPct: "50",
        defaultOffsetDays: "60",
      });
    }
  }, [editing, defaultType, reset]);

  const handleFormSubmit = async (data: FormData) => {
    try {
      const payload: Partial<Service> = {
        name: data.name,
        type: data.type,
        revenueCenterId: data.revenueCenterId ? parseInt(data.revenueCenterId, 10) : null,
        description: data.description || null,
        defaultAmount: data.defaultAmountEuros ? eurosToCents(parseFloat(data.defaultAmountEuros) || 0) : 0,
      };
      if (data.type === "recurring") {
        payload.defaultIntervalMonths = data.defaultIntervalMonths ? parseInt(data.defaultIntervalMonths, 10) : 1;
      } else {
        payload.defaultFirstPct = data.defaultFirstPct ? parseFloat(data.defaultFirstPct) : 50;
        payload.defaultOffsetDays = data.defaultOffsetDays ? parseInt(data.defaultOffsetDays, 10) : 60;
      }
      await onSubmit(payload);
      reset();
      onOpenChange(false);
    } catch {
      // toast gestito dal chiamante
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifica servizio" : "Nuovo servizio"}</DialogTitle>
          <DialogDescription>
            {editing ? "Aggiorna il servizio del catalogo." : "Aggiungi un servizio al catalogo (template per le sottoscrizioni)."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Es. Marketing mensile, MSD pacchetto, Sito Web 50/50..."
              {...register("name")}
              autoFocus
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Select value={watchType} onValueChange={(v) => setValue("type", v as ServiceType)}>
              <SelectTrigger id="type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(TYPE_LABELS) as [ServiceType, string][]).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {watchType === "recurring"
                ? "Servizio con cadenza fissa (mensile, trimestrale, annuale)."
                : "Servizio venduto in 2 rate (acconto e saldo)."}
            </p>
          </div>

          {/* Centro di ricavo */}
          <div className="space-y-2">
            <Label htmlFor="revenueCenterId">Centro di ricavo</Label>
            <Select
              value={watchRevCenterId || "none"}
              onValueChange={(v) => setValue("revenueCenterId", v === "none" ? "" : v)}
            >
              <SelectTrigger id="revenueCenterId"><SelectValue placeholder="Nessuno" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessuno</SelectItem>
                {revenueCenters.map((rc) => (
                  <SelectItem key={rc.id} value={String(rc.id)}>{rc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Gli incassi generati da questo servizio finiranno in questo centro.
            </p>
          </div>

          {/* Importo default */}
          <div className="space-y-2">
            <Label htmlFor="defaultAmountEuros">Importo standard (€)</Label>
            <Input
              id="defaultAmountEuros"
              type="number"
              step="0.01"
              min="0"
              placeholder="0 = variabile per cliente"
              {...register("defaultAmountEuros")}
            />
            <p className="text-xs text-muted-foreground">
              {watchType === "installments"
                ? "Importo TOTALE lordo del pacchetto. Lascia 0 se varia per cliente."
                : "Importo per ogni occorrenza. Lascia 0 se varia per cliente."}
            </p>
          </div>

          {/* Campi conditional su type */}
          {watchType === "recurring" ? (
            <div className="space-y-2">
              <Label htmlFor="defaultIntervalMonths">Intervallo (mesi)</Label>
              <Input
                id="defaultIntervalMonths"
                type="number"
                min="1"
                max="120"
                {...register("defaultIntervalMonths")}
              />
              <p className="text-xs text-muted-foreground">
                1 = mensile · 3 = trimestrale · 6 = semestrale · 12 = annuale · custom = qualsiasi numero.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="defaultFirstPct">% Acconto</Label>
                <Input
                  id="defaultFirstPct"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  {...register("defaultFirstPct")}
                />
                <p className="text-xs text-muted-foreground">
                  Percentuale dell&apos;acconto sul totale (es. 50 per 50/50, 30 per 30/70).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultOffsetDays">Offset saldo (giorni)</Label>
                <Input
                  id="defaultOffsetDays"
                  type="number"
                  min="0"
                  max="3650"
                  step="1"
                  {...register("defaultOffsetDays")}
                />
                <p className="text-xs text-muted-foreground">
                  Giorni dal momento della sottoscrizione al saldo (es. 60 per Sito Web, 14 per MSD).
                </p>
              </div>
            </>
          )}

          {/* Descrizione */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Input id="description" placeholder="Note libere..." {...register("description")} />
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
