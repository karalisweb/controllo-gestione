"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { toast } from "sonner";
import { X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const MONTH_LABELS = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

interface CandidateTransaction {
  id: number;
  date: string;
  description: string | null;
  amount: number;
}

interface PendingItem {
  key: string;
  expectedIncomeId: number;
  year: number;
  month: number;
  expectedDate: string;
  expectedAmount: number;
  isOverride: boolean;
  candidateTransactions: CandidateTransaction[];
}

interface ContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: number | null;
  /** Callback quando un'azione modifica i dati (per refresh upstream) */
  onChanged?: () => void;
}

export function ContactSheet({ open, onOpenChange, contactId, onChanged }: ContactSheetProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [contactName, setContactName] = useState("");
  const [actingOn, setActingOn] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/pending-incomes`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setItems(data.items || []);
      setContactName(data.contact?.name || "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    if (open && contactId) fetchData();
  }, [open, contactId, fetchData]);

  const handleSkip = async (item: PendingItem) => {
    if (!confirm(`Conferma saltato: ${MONTH_LABELS[item.month - 1]} ${item.year} per ${formatCurrency(item.expectedAmount)}?\n\nL'incasso non verrà più conteggiato.`)) return;
    setActingOn(item.key);
    try {
      const res = await fetch(`/api/expected-incomes/${item.expectedIncomeId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: item.year,
          month: item.month,
          amount: 0,
          notes: "Saltato dall'utente (non arrivato)",
        }),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      toast.success("Marcato come saltato");
      await fetchData();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setActingOn(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Scheda cliente: {contactName || "..."}
          </DialogTitle>
          <DialogDescription>
            Previsti del passato che non sono stati ancora chiariti.
            Per ognuno indica se è arrivato (e quando), saltato (non arriverà), o spostato.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Caricamento...
            </div>
          )}

          {!loading && items.length === 0 && (
            <Card className="border-green-500/40 bg-green-500/5">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="font-medium">Tutto chiaro</p>
                <p className="text-sm text-muted-foreground">
                  Nessun incasso del passato richiede attenzione per questo cliente.
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && items.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span>
                  <strong>{items.length}</strong> previst{items.length === 1 ? "o" : "i"} da chiarire
                </span>
              </div>

              {items.map((item) => (
                <Card key={item.key} className="border-amber-500/30">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {MONTH_LABELS[item.month - 1]} {item.year}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            atteso il {formatDate(item.expectedDate)}
                          </Badge>
                          {item.isOverride && (
                            <Badge variant="outline" className="text-xs bg-amber-500/15 text-amber-500 border-amber-500/40">
                              ★ override
                            </Badge>
                          )}
                        </div>
                        <p className="font-mono text-base font-bold mt-1">
                          {formatCurrency(item.expectedAmount)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSkip(item)}
                        disabled={actingOn === item.key}
                        className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                      >
                        {actingOn === item.key ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <X className="h-3 w-3 mr-1" />
                        )}
                        Saltato
                      </Button>
                    </div>

                    {/* Candidate transactions per match futuro */}
                    {item.candidateTransactions.length > 0 && (
                      <div className="border-t pt-2 mt-2">
                        <p className="text-xs text-muted-foreground mb-1">
                          {item.candidateTransactions.length} possibile match nel mese:
                        </p>
                        <div className="space-y-1">
                          {item.candidateTransactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between text-xs bg-muted/50 px-2 py-1 rounded">
                              <div className="min-w-0 flex-1 truncate">
                                <span className="text-muted-foreground">{formatDate(tx.date)}</span>
                                {" • "}
                                {tx.description}
                              </div>
                              <span className="font-mono font-medium ml-2">
                                {formatCurrency(tx.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground italic mt-1">
                          (in arrivo: bottoni &quot;Arrivato&quot; per linkare a una di queste, e &quot;Spostato a [mese]&quot;)
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Chiudi</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
