"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Calendar, Trash2 } from "lucide-react";

interface TerminateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType: "income" | "expense";
  onDeleteComplete: () => void; // Elimina completamente (soft delete)
  onTerminateFromDate: (date: string) => void; // Termina da una data
}

export function TerminateDialog({
  open,
  onOpenChange,
  itemName,
  itemType,
  onDeleteComplete,
  onTerminateFromDate,
}: TerminateDialogProps) {
  const [mode, setMode] = useState<"choose" | "date">("choose");
  const [terminateDate, setTerminateDate] = useState(() => {
    // Default: primo giorno del mese corrente
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [loading, setLoading] = useState(false);

  const handleDeleteComplete = async () => {
    setLoading(true);
    try {
      await onDeleteComplete();
      onOpenChange(false);
      setMode("choose");
    } finally {
      setLoading(false);
    }
  };

  const handleTerminate = async () => {
    setLoading(true);
    try {
      await onTerminateFromDate(terminateDate);
      onOpenChange(false);
      setMode("choose");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setMode("choose");
  };

  const typeLabel = itemType === "income" ? "incasso" : "spesa";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Elimina {typeLabel}
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-foreground">{itemName}</span>
          </DialogDescription>
        </DialogHeader>

        {mode === "choose" ? (
          <>
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                Come vuoi procedere?
              </p>

              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4 text-left"
                onClick={() => setMode("date")}
              >
                <Calendar className="h-5 w-5 mr-3 text-amber-500 shrink-0" />
                <div>
                  <p className="font-medium">Termina da una data</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mantiene lo storico passato, elimina solo le voci future
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4 text-left border-red-200 hover:border-red-300 hover:bg-red-50 dark:border-red-900 dark:hover:border-red-800 dark:hover:bg-red-950"
                onClick={handleDeleteComplete}
                disabled={loading}
              >
                <Trash2 className="h-5 w-5 mr-3 text-red-500 shrink-0" />
                <div>
                  <p className="font-medium text-red-600 dark:text-red-400">Elimina completamente</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rimuove {typeLabel === "incasso" ? "l'" : "la "}{typeLabel} da tutto il piano, incluso il passato
                  </p>
                </div>
              </Button>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Annulla
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                {typeLabel === "incasso" ? "L'" : "La "}{typeLabel} verrà mantenut{typeLabel === "incasso" ? "o" : "a"} fino alla fine del mese precedente alla data selezionata.
              </p>

              <div className="space-y-2">
                <Label htmlFor="terminateDate">Termina dal mese di</Label>
                <Input
                  id="terminateDate"
                  type="month"
                  value={terminateDate.substring(0, 7)}
                  onChange={(e) => setTerminateDate(`${e.target.value}-01`)}
                />
                <p className="text-xs text-muted-foreground">
                  Esempio: se selezioni Giugno 2026, {typeLabel === "incasso" ? "l'" : "la "}{typeLabel} sarà attiv{typeLabel === "incasso" ? "o" : "a"} fino a Maggio 2026
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setMode("choose")}>
                Indietro
              </Button>
              <Button
                variant="default"
                onClick={handleTerminate}
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {loading ? "Elaborazione..." : "Termina"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
