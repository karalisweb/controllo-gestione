"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";

interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  skipped: number;
  errors?: string[];
}

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function ImportModal({
  open,
  onOpenChange,
  onImportComplete,
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      setFile(droppedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/transactions/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore durante l'importazione");
      }

      setResult(data);
      if (data.imported > 0) {
        onImportComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importa Movimenti da Qonto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              file
                ? "border-green-500 bg-green-50"
                : "border-gray-300 hover:border-primary hover:bg-gray-50"
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">
                  Trascina qui il file CSV o clicca per selezionarlo
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Esporta i movimenti da Qonto in formato CSV
                </p>
              </>
            )}
          </div>

          {/* Errore */}
          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 rounded-lg text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Errore</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Risultato */}
          {result && (
            <div
              className={`p-4 rounded-lg ${
                result.imported > 0 ? "bg-green-50" : "bg-yellow-50"
              }`}
            >
              <div className="flex items-start gap-2">
                <CheckCircle
                  className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                    result.imported > 0 ? "text-green-600" : "text-yellow-600"
                  }`}
                />
                <div>
                  <p className="font-medium">Importazione completata</p>
                  <ul className="text-sm mt-2 space-y-1">
                    <li>Totale righe trovate: {result.total}</li>
                    <li className="text-green-700">
                      Importate: {result.imported}
                    </li>
                    {result.skipped > 0 && (
                      <li className="text-yellow-700">
                        Saltate (già presenti): {result.skipped}
                      </li>
                    )}
                  </ul>
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2 text-sm text-red-600">
                      <p className="font-medium">Errori:</p>
                      <ul className="list-disc list-inside">
                        {result.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {result.errors.length > 5 && (
                          <li>...e altri {result.errors.length - 5} errori</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Istruzioni */}
          <div className="text-sm text-muted-foreground bg-gray-50 p-4 rounded-lg">
            <p className="font-medium mb-2">Come esportare da Qonto:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Accedi al tuo account Qonto</li>
              <li>Vai alla sezione Transazioni</li>
              <li>Seleziona il periodo desiderato</li>
              <li>Clicca su &quot;Esporta&quot; e scegli CSV</li>
            </ol>
          </div>

          {/* Azioni */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              {result ? "Chiudi" : "Annulla"}
            </Button>
            {!result && (
              <Button onClick={handleImport} disabled={!file || loading}>
                {loading ? "Importazione..." : "Importa"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
