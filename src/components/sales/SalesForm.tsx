"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { SalesOpportunity, ProjectType, PaymentPlanType, SalesStatus } from "@/types";

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

interface SalesFormProps {
  sale?: SalesOpportunity | null;
  defaultMonth: number;
  year: number;
  onClose: () => void;
  onSuccess: () => void;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

// Calcola la ripartizione con commissioni
function calculateBreakdown(grossCents: number, commissionRate: number) {
  const netAmount = Math.round(grossCents / 1.22);
  const commissionAmount = Math.round(netAmount * (commissionRate / 100));
  const postCommissionAmount = netAmount - commissionAmount;
  const vatAmount = Math.round(netAmount * 0.22);
  const partnersAmount = Math.round(postCommissionAmount * 0.30);
  const availableAmount = postCommissionAmount - partnersAmount;

  return {
    grossAmount: grossCents,
    netAmount,
    commissionAmount,
    postCommissionAmount,
    vatAmount,
    partnersAmount,
    availableAmount,
  };
}

export function SalesForm({
  sale,
  defaultMonth,
  year,
  onClose,
  onSuccess,
}: SalesFormProps) {
  const [clientName, setClientName] = useState(sale?.clientName || "");
  const [projectType, setProjectType] = useState<ProjectType>(
    sale?.projectType || "sito_web"
  );
  const [totalAmountEuros, setTotalAmountEuros] = useState(
    sale ? (sale.totalAmount / 100).toFixed(2) : ""
  );
  const [commissionRate, setCommissionRate] = useState(
    sale ? String(sale.commissionRate ?? 20) : "20"
  );
  const [paymentType, setPaymentType] = useState<PaymentPlanType>(
    sale?.paymentType || "sito_web_50_50"
  );
  const [month, setMonth] = useState(sale?.month || defaultMonth);
  const [status, setStatus] = useState<SalesStatus>(sale?.status || "objective");
  const [closedDate, setClosedDate] = useState(sale?.closedDate || "");
  const [notes, setNotes] = useState(sale?.notes || "");
  const [saving, setSaving] = useState(false);

  // Aggiorna il tipo di pagamento in base al tipo progetto
  useEffect(() => {
    if (!sale) {
      if (projectType === "sito_web") {
        setPaymentType("sito_web_50_50");
      } else if (projectType === "msd") {
        setPaymentType("msd_30_70");
      } else if (projectType === "marketing") {
        setPaymentType("marketing_4_trim");
      }
    }
  }, [projectType, sale]);

  const grossCents = Math.round(parseFloat(totalAmountEuros || "0") * 100);
  const parsedCommission = parseInt(commissionRate);
  const breakdown = calculateBreakdown(grossCents, isNaN(parsedCommission) ? 20 : parsedCommission);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Per opportunità e vendite vinte, il cliente è obbligatorio
    if ((status === "opportunity" || status === "won") && !clientName) {
      alert("Per opportunità e vendite vinte il cliente è obbligatorio");
      return;
    }

    if (!totalAmountEuros || grossCents <= 0) {
      alert("Inserisci un importo valido");
      return;
    }

    setSaving(true);

    try {
      const payloadCommission = parseInt(commissionRate);
      const payload = {
        clientName: clientName || null,
        projectType,
        totalAmount: grossCents,
        commissionRate: isNaN(payloadCommission) ? 20 : payloadCommission,
        paymentType,
        month,
        year,
        status,
        closedDate: status === "won" ? closedDate || new Date().toISOString().split("T")[0] : null,
        notes: notes || null,
      };

      const url = sale ? `/api/sales/${sale.id}` : "/api/sales";
      const method = sale ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Errore nel salvataggio");
      }

      onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {sale ? "Modifica Vendita" : "Nuova Vendita"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="clientName">
              Cliente {(status === "opportunity" || status === "won") ? "*" : "(opzionale per obiettivi)"}
            </Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder={status === "objective" ? "Es. Cliente generico o lascia vuoto" : "Nome cliente"}
            />
          </div>

          {/* Tipo progetto */}
          <div className="space-y-2">
            <Label>Tipo Progetto *</Label>
            <Select
              value={projectType}
              onValueChange={(v) => setProjectType(v as ProjectType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sito_web">Sito Web</SelectItem>
                <SelectItem value="marketing">Piano Marketing</SelectItem>
                <SelectItem value="msd">MSD</SelectItem>
                <SelectItem value="licenza">Licenza</SelectItem>
                <SelectItem value="altro">Altro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Importo */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valore Lordo (IVA inclusa) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={totalAmountEuros}
              onChange={(e) => setTotalAmountEuros(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {/* Commissione */}
          <div className="space-y-2">
            <Label>Commissione Commerciale</Label>
            <Select
              value={commissionRate}
              onValueChange={setCommissionRate}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20%</SelectItem>
                <SelectItem value="30">30%</SelectItem>
                <SelectItem value="0">0% (nessuna)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo pagamento */}
          <div className="space-y-2">
            <Label>Piano Pagamenti</Label>
            <Select
              value={paymentType}
              onValueChange={(v) => setPaymentType(v as PaymentPlanType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sito_web_50_50">50% + 50% a 60gg</SelectItem>
                <SelectItem value="msd_30_70">30% + 70% a 21gg</SelectItem>
                <SelectItem value="marketing_4_trim">4 rate trimestrali</SelectItem>
                <SelectItem value="immediato">100% immediato</SelectItem>
                <SelectItem value="custom">Personalizzato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mese obiettivo */}
          <div className="space-y-2">
            <Label>Mese Obiettivo</Label>
            <Select
              value={month.toString()}
              onValueChange={(v) => setMonth(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((name, idx) => (
                  <SelectItem key={idx} value={(idx + 1).toString()}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Stato</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as SalesStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="objective">Obiettivo</SelectItem>
                <SelectItem value="opportunity">Opportunità</SelectItem>
                <SelectItem value="won">Vinta</SelectItem>
                <SelectItem value="lost">Persa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data chiusura (solo se vinta) */}
          {status === "won" && (
            <div className="space-y-2">
              <Label htmlFor="closedDate">Data Chiusura</Label>
              <Input
                id="closedDate"
                type="date"
                value={closedDate}
                onChange={(e) => setClosedDate(e.target.value)}
              />
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note opzionali"
            />
          </div>

          {/* Calcolo automatico */}
          {grossCents > 0 && (
            <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
              <div className="font-semibold mb-2">Ripartizione Automatica</div>
              <div className="flex justify-between">
                <span>Lordo:</span>
                <span>{formatCurrency(breakdown.grossAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>- IVA 22%:</span>
                <span>-{formatCurrency(breakdown.vatAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>= Netto:</span>
                <span>{formatCurrency(breakdown.netAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>- Commissione {commissionRate}%:</span>
                <span>-{formatCurrency(breakdown.commissionAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>= Post-commissione:</span>
                <span>{formatCurrency(breakdown.postCommissionAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>- Soci 30%:</span>
                <span>-{formatCurrency(breakdown.partnersAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-green-600 border-t pt-1 mt-1">
                <span>= Disponibile:</span>
                <span>{formatCurrency(breakdown.availableAmount)}</span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvataggio..." : sale ? "Salva" : "Crea Vendita"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
