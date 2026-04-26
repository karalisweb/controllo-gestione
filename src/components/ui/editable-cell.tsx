"use client";

import { useEffect, useRef, useState } from "react";
import { centsToEuros, eurosToCents, formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  /** Valore visualizzato in centesimi (override se esiste, altrimenti default) */
  value: number;
  /** Valore default del template in centesimi. Se diverso da value → cella in stile "override" */
  defaultValue?: number;
  /** Callback al salvataggio: riceve il nuovo valore in CENTESIMI */
  onSave: (newAmountCents: number) => Promise<void> | void;
  /** Classe colore base (es. "text-red-600" per spese, "text-green-600" per incassi) */
  colorClass?: string;
  /** Disabilita editing (cella read-only) */
  disabled?: boolean;
  /** Allinea testo (default right per importi) */
  align?: "left" | "right";
}

/**
 * Cella stile Excel:
 * - Click → input controllato con focus + select-all
 * - Invio o blur → onSave(newAmount). Esc → annulla.
 * - Override visivo (sfondo amber chiaro) quando value !== defaultValue.
 */
export function EditableCell({
  value,
  defaultValue,
  onSave,
  colorClass,
  disabled = false,
  align = "right",
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState<string>(centsToEuros(value).toFixed(2));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isOverride = defaultValue !== undefined && value !== defaultValue;

  useEffect(() => {
    if (!editing) setLocalValue(centsToEuros(value).toFixed(2));
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = () => {
    if (disabled || saving) return;
    setLocalValue(centsToEuros(value).toFixed(2));
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setLocalValue(centsToEuros(value).toFixed(2));
  };

  const commit = async () => {
    const parsed = parseFloat(localValue.replace(",", "."));
    if (Number.isNaN(parsed) || parsed < 0) {
      cancel();
      return;
    }
    const newCents = eurosToCents(parsed);
    if (newCents === value) {
      // Nessun cambiamento
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(newCents);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  const baseTextClass = colorClass || "text-foreground";
  const alignClass = align === "right" ? "text-right" : "text-left";

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        min="0"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        disabled={saving}
        className={cn(
          "w-full bg-background border border-primary/60 rounded px-1 py-0.5 font-mono text-xs outline-none focus:ring-1 focus:ring-primary",
          alignClass,
          baseTextClass,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      disabled={disabled || saving}
      title={isOverride ? `Importo modificato (default: ${formatCurrency(defaultValue!)})` : "Clicca per modificare"}
      className={cn(
        "w-full font-mono text-xs px-1 py-0.5 rounded transition-colors",
        alignClass,
        baseTextClass,
        isOverride && "bg-amber-500/15 hover:bg-amber-500/25 ring-1 ring-amber-500/40",
        !isOverride && "hover:bg-muted/50",
        disabled && "cursor-not-allowed opacity-60",
        saving && "opacity-50",
      )}
    >
      {formatCurrency(value)}
    </button>
  );
}
