"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Upload,
  FileText,
  Check,
  X,
  AlertTriangle,
  ArrowRightLeft,
  Link2,
  CircleDot,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

interface ForecastMatch {
  forecastItemId: number;
  forecastDescription: string;
  forecastAmount: number;
  forecastDate: string;
  confidence: "high" | "medium";
  dateDistance: number;
}

interface CsvRow {
  date: string;
  counterparty: string;
  amount: number;
  isTransfer: boolean;
  isDuplicate: boolean;
  externalId: string;
  rawDate: string;
  match: ForecastMatch | null;
  // UI state
  selected?: boolean;
  acceptMatch?: boolean;
}

interface ImportSummary {
  total: number;
  transfers: number;
  duplicates: number;
  importable: number;
  withMatch: number;
  withoutMatch: number;
}

interface CsvImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function CsvImportWizard({
  open,
  onOpenChange,
  onComplete,
}: CsvImportWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data state
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  // Import results
  const [importResult, setImportResult] = useState<{
    created: number;
    reconciled: number;
    forecastCreated: number;
    transfers: number;
    skipped: number;
    errors?: string[];
  } | null>(null);

  const resetWizard = () => {
    setStep(1);
    setRows([]);
    setSummary(null);
    setParseErrors([]);
    setImportResult(null);
    setError(null);
    setLoading(false);
  };

  // ── STEP 1: Upload CSV ──
  const handleFileSelect = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const csvContent = await file.text();

      const res = await fetch("/api/import/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Errore nel parsing del CSV");
        setParseErrors(data.details || []);
        return;
      }

      // Imposta stato iniziale: seleziona tutto tranne trasferimenti e duplicati
      const processedRows = data.rows.map((row: CsvRow) => ({
        ...row,
        selected: !row.isTransfer && !row.isDuplicate,
        acceptMatch: row.match?.confidence === "high",
      }));

      setRows(processedRows);
      setSummary(data.summary);
      setParseErrors(data.errors || []);
      setStep(2);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Errore durante il caricamento"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
      handleFileSelect(file);
    } else {
      setError("Seleziona un file CSV valido");
    }
  };

  // ── STEP 2: Review rows ──
  const toggleRowSelection = (index: number) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, selected: !row.selected } : row
      )
    );
  };

  const toggleMatchAcceptance = (index: number) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, acceptMatch: !row.acceptMatch } : row
      )
    );
  };

  const selectedRows = rows.filter(
    (r) => r.selected && !r.isTransfer && !r.isDuplicate
  );
  const matchedSelectedRows = selectedRows.filter(
    (r) => r.match && r.acceptMatch
  );

  // ── STEP 3: Confirm import ──
  const handleConfirmImport = async () => {
    setLoading(true);
    setError(null);

    try {
      const items = selectedRows.map((row) => ({
        date: row.date,
        description: row.counterparty,
        amount: row.amount,
        externalId: row.externalId,
        isTransfer: row.isTransfer,
        costCenterId: null,
        revenueCenterId: null,
        matchedForecastItemId:
          row.match && row.acceptMatch ? row.match.forecastItemId : null,
        rawData: JSON.stringify({
          source: "csv-import-qonto",
          rawDate: row.rawDate,
          counterparty: row.counterparty,
          importedAt: new Date().toISOString(),
        }),
      }));

      const res = await fetch("/api/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Errore durante l'import");
        return;
      }

      setImportResult(result);
      setStep(4);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Errore durante l'import"
      );
    } finally {
      setLoading(false);
    }
  };

  // ── RENDER STEPS ──
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <p className="text-muted-foreground">
          Carica il CSV export da Qonto per importare i movimenti
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center p-12 rounded-xl border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
      >
        <Upload className="h-12 w-12 text-muted-foreground mb-3 group-hover:text-primary transition-colors" />
        <span className="text-lg font-semibold text-muted-foreground group-hover:text-primary">
          Trascina qui il CSV
        </span>
        <span className="text-sm text-muted-foreground mt-1">
          oppure clicca per selezionare
        </span>
        <span className="text-xs text-muted-foreground mt-3">
          Formato: Export Qonto (CSV con separatore ;)
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          // Reset input per permettere ri-selezione dello stesso file
          e.target.value = "";
        }}
      />

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">{error}</span>
          </div>
          {parseErrors.length > 0 && (
            <ul className="mt-2 text-sm text-red-600 dark:text-red-500 space-y-1">
              {parseErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => {
    const importableRows = rows.filter(
      (r) => !r.isTransfer && !r.isDuplicate
    );
    const transferRows = rows.filter((r) => r.isTransfer);
    const duplicateRows = rows.filter((r) => r.isDuplicate);

    return (
      <div className="space-y-4">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {importableRows.length} importabili
          </Badge>
          {transferRows.length > 0 && (
            <Badge variant="secondary">
              <ArrowRightLeft className="h-3 w-3 mr-1" />
              {transferRows.length} trasferimenti (esclusi)
            </Badge>
          )}
          {duplicateRows.length > 0 && (
            <Badge variant="secondary">
              {duplicateRows.length} duplicati (esclusi)
            </Badge>
          )}
          {summary && summary.withMatch > 0 && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <Link2 className="h-3 w-3 mr-1" />
              {summary.withMatch} con match forecast
            </Badge>
          )}
        </div>

        {/* Scrollable rows */}
        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
          {importableRows.map((row, globalIndex) => {
            const realIndex = rows.indexOf(row);
            return (
              <div
                key={realIndex}
                className={`p-3 rounded-lg border transition-colors ${
                  row.selected
                    ? "border-primary/50 bg-primary/5"
                    : "border-muted bg-muted/30 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={row.selected || false}
                    onChange={() => toggleRowSelection(realIndex)}
                    className="mt-1 w-4 h-4 rounded border-gray-300"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">
                        {row.counterparty}
                      </span>
                      <span
                        className={`font-semibold text-sm whitespace-nowrap ${
                          row.amount > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {row.amount > 0 ? "+" : ""}
                        {formatCurrency(row.amount)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(row.date).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>

                    {/* Match indicator */}
                    {row.match && row.selected && (
                      <div className="mt-2">
                        <button
                          onClick={() => toggleMatchAcceptance(realIndex)}
                          className={`w-full flex items-center gap-2 p-2 rounded text-xs transition-colors ${
                            row.acceptMatch
                              ? row.match.confidence === "high"
                                ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                                : "bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300"
                              : "bg-muted border border-muted-foreground/20 text-muted-foreground"
                          }`}
                        >
                          {row.acceptMatch ? (
                            <Check className="h-3 w-3 shrink-0" />
                          ) : (
                            <CircleDot className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate">
                            {row.acceptMatch ? "Match:" : "Match proposto:"}{" "}
                            {row.match.forecastDescription}
                          </span>
                          <Badge
                            variant="outline"
                            className={`ml-auto shrink-0 text-[10px] ${
                              row.match.confidence === "high"
                                ? "border-green-400 text-green-600"
                                : "border-yellow-400 text-yellow-600"
                            }`}
                          >
                            {row.match.confidence === "high"
                              ? "certo"
                              : "probabile"}
                          </Badge>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRows((prev) =>
                prev.map((r) =>
                  r.isTransfer || r.isDuplicate
                    ? r
                    : { ...r, selected: true }
                )
              );
            }}
          >
            Seleziona tutti
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRows((prev) => prev.map((r) => ({ ...r, selected: false })));
            }}
          >
            Deseleziona
          </Button>
          <div className="flex-1" />
          <Button
            onClick={() => setStep(3)}
            disabled={selectedRows.length === 0}
          >
            Continua ({selectedRows.length})
          </Button>
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <Check className="h-12 w-12 mx-auto text-primary mb-2" />
        <p className="text-lg font-semibold">Conferma Import</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Movimenti da importare</span>
            <span className="font-semibold">{selectedRows.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Entrate</span>
            <span className="font-semibold text-green-600">
              {selectedRows.filter((r) => r.amount > 0).length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Uscite</span>
            <span className="font-semibold text-red-600">
              {selectedRows.filter((r) => r.amount < 0).length}
            </span>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                <Link2 className="h-4 w-4 inline mr-1" />
                Riconciliati col forecast
              </span>
              <span className="font-semibold text-green-600">
                {matchedSelectedRows.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Aggiunti al forecast
              </span>
              <span className="font-semibold text-blue-500">
                {selectedRows.length - matchedSelectedRows.length}
              </span>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between text-lg">
              <span className="font-semibold">Totale netto</span>
              <span
                className={`font-bold ${
                  selectedRows.reduce((s, r) => s + r.amount, 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(
                  selectedRows.reduce((s, r) => s + r.amount, 0)
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={handleConfirmImport}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Importazione in corso...
          </>
        ) : (
          `Importa ${selectedRows.length} movimenti`
        )}
      </Button>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div className="h-12 w-12 mx-auto rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-3">
          <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <p className="text-lg font-semibold">Import Completato</p>
      </div>

      {importResult && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Movimenti creati</span>
              <span className="font-semibold text-green-600">
                {importResult.created}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                <Link2 className="h-4 w-4 inline mr-1" />
                Riconciliati col forecast
              </span>
              <span className="font-semibold text-green-600">
                {importResult.reconciled}
              </span>
            </div>
            {importResult.forecastCreated > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Aggiunti al forecast
                </span>
                <span className="font-semibold text-blue-500">
                  {importResult.forecastCreated}
                </span>
              </div>
            )}
            {importResult.skipped > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saltati (duplicati)</span>
                <span className="font-semibold text-muted-foreground">
                  {importResult.skipped}
                </span>
              </div>
            )}
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-sm text-red-600 font-medium mb-1">Errori:</p>
                <ul className="text-xs text-red-500 space-y-1">
                  {importResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Button
        className="w-full"
        onClick={() => {
          onComplete();
          onOpenChange(false);
          resetWizard();
        }}
      >
        Chiudi
      </Button>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  const stepTitles: Record<number, string> = {
    1: "Import CSV",
    2: "Anteprima Movimenti",
    3: "Conferma Import",
    4: "Risultato",
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetWizard();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step > 1 && step < 4 && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle>{stepTitles[step]}</DialogTitle>
          </div>

          {/* Progress */}
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="py-4">
          {loading && step === 1 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-muted-foreground">
                Analisi CSV in corso...
              </span>
            </div>
          ) : (
            renderStep()
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
