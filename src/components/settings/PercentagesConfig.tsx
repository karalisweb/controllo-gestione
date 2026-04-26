"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Receipt, User, Building2, Save, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_SPLIT_CONFIG, type SplitConfig } from "@/lib/utils/splits";
import { invalidateSplitConfig } from "@/lib/hooks/useSplitConfig";

/**
 * UI per configurare le percentuali di split (IVA, Alessio, Daniela).
 *
 * Semantica "da adesso in poi": le percentuali aggiornate si applicano SOLO
 * ai nuovi incassi/calcoli. I record `income_splits` esistenti (con gli
 * importi gia' calcolati) non vengono toccati.
 */
export function PercentagesConfig() {
  const [config, setConfig] = useState<SplitConfig>(DEFAULT_SPLIT_CONFIG);
  const [original, setOriginal] = useState<SplitConfig>(DEFAULT_SPLIT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/settings/percentages")
      .then(async (r) => {
        if (!r.ok) throw new Error("Impossibile caricare le percentuali");
        return (await r.json()) as SplitConfig;
      })
      .then((data) => {
        if (!mounted) return;
        setConfig(data);
        setOriginal(data);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const dirty =
    config.vatPct !== original.vatPct ||
    config.alessioPct !== original.alessioPct ||
    config.danielaPct !== original.danielaPct;

  const agencyPct = Math.max(0, 100 - config.alessioPct - config.danielaPct);
  const sociTotal = config.alessioPct + config.danielaPct;
  const sociExceedsNet = sociTotal > 100;

  const handleChange = (field: keyof SplitConfig, value: string) => {
    const numeric = value === "" ? 0 : parseFloat(value);
    if (Number.isNaN(numeric)) return;
    setConfig((prev) => ({ ...prev, [field]: numeric }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/percentages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const updated = (await res.json()) as SplitConfig;
      setOriginal(updated);
      setConfig(updated);
      invalidateSplitConfig(updated);
      toast.success("Percentuali aggiornate. Si applicano dai prossimi incassi.");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      toast.error(`Errore: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(original);
    setError(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground">Caricamento percentuali...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Spiegazione */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium text-blue-900 dark:text-blue-200">
              Come funzionano le percentuali
            </p>
            <p className="text-blue-800/90 dark:text-blue-300/90">
              Su ogni incasso lordo l&apos;app calcola: <strong>netto</strong> = lordo / (1 + IVA),
              poi assegna alle quote soci e all&apos;agenzia.
              I cambiamenti valgono <strong>da adesso in poi</strong>: gli incassi gia&apos; ripartiti
              non vengono toccati.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form percentuali */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Quote soci e IVA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* IVA */}
          <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
            <div>
              <Label htmlFor="vatPct" className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4 text-orange-500" />
                IVA
              </Label>
              <p className="text-xs text-muted-foreground">
                Aliquota applicata al netto, da accantonare per il versamento
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Input
                id="vatPct"
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={config.vatPct}
                onChange={(e) => handleChange("vatPct", e.target.value)}
                className="w-20 text-right font-mono"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Alessio */}
          <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
            <div>
              <Label htmlFor="alessioPct" className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-blue-500" />
                Quota Alessio
              </Label>
              <p className="text-xs text-muted-foreground">Percentuale del netto destinata ad Alessio</p>
            </div>
            <div className="flex items-center gap-1">
              <Input
                id="alessioPct"
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={config.alessioPct}
                onChange={(e) => handleChange("alessioPct", e.target.value)}
                className="w-20 text-right font-mono"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Daniela */}
          <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
            <div>
              <Label htmlFor="danielaPct" className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-purple-500" />
                Quota Daniela
              </Label>
              <p className="text-xs text-muted-foreground">Percentuale del netto destinata a Daniela</p>
            </div>
            <div className="flex items-center gap-1">
              <Input
                id="danielaPct"
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={config.danielaPct}
                onChange={(e) => handleChange("danielaPct", e.target.value)}
                className="w-20 text-right font-mono"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Riepilogo Agenzia (calcolato) */}
          <div className="grid grid-cols-[1fr_auto] gap-3 items-center pt-3 border-t">
            <div>
              <div className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-green-500" />
                Resta in agenzia
              </div>
              <p className="text-xs text-muted-foreground">
                100% &minus; Alessio &minus; Daniela
              </p>
            </div>
            <div
              className={`font-mono text-base font-bold ${
                sociExceedsNet ? "text-red-500" : "text-green-600"
              }`}
            >
              {agencyPct}%
            </div>
          </div>

          {/* Warning se soci > 100% */}
          {sociExceedsNet && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <span className="text-red-700 dark:text-red-300">
                Le quote soci superano il 100% del netto: non resterebbe nulla per l&apos;agenzia.
                Riduci una delle due percentuali.
              </span>
            </div>
          )}

          {/* Errore generico */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          {/* Azioni */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleReset} disabled={!dirty || saving}>
              Annulla modifiche
            </Button>
            <Button onClick={handleSave} disabled={!dirty || saving || sociExceedsNet}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
