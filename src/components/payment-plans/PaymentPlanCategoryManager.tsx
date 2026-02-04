"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, Tags } from "lucide-react";
import type { PaymentPlanCategory } from "@/types";

interface PaymentPlanCategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentPlanCategoryManager({
  open,
  onOpenChange,
}: PaymentPlanCategoryManagerProps) {
  const [categories, setCategories] = useState<PaymentPlanCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<PaymentPlanCategory | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", color: "#6B7280" });
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/payment-plan-categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const handleOpenForm = (category?: PaymentPlanCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, color: category.color || "#6B7280" });
    } else {
      setEditingCategory(null);
      setFormData({ name: "", color: "#6B7280" });
    }
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      if (editingCategory) {
        await fetch(`/api/payment-plan-categories/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch("/api/payment-plan-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }
      await fetchCategories();
      setFormOpen(false);
      setEditingCategory(null);
      setFormData({ name: "", color: "#6B7280" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Eliminare questa categoria?")) return;
    await fetch(`/api/payment-plan-categories/${id}`, { method: "DELETE" });
    await fetchCategories();
  };

  const presetColors = [
    "#3B82F6", // blue
    "#22C55E", // green
    "#EF4444", // red
    "#F59E0B", // amber
    "#8B5CF6", // violet
    "#EC4899", // pink
    "#6B7280", // gray
    "#14B8A6", // teal
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Gestione Categorie PDR
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Caricamento...</div>
        ) : (
          <div className="space-y-4">
            {/* Lista categorie */}
            <div className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessuna categoria configurata
                </p>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: cat.color || "#6B7280" }}
                      />
                      <span className="font-medium">{cat.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleOpenForm(cat)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500"
                        onClick={() => handleDelete(cat.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pulsante nuova categoria */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOpenForm()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuova Categoria
            </Button>

            {/* Form inline per nuova/modifica categoria */}
            {formOpen && (
              <Card className="border-2 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {editingCategory ? "Modifica Categoria" : "Nuova Categoria"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="catName">Nome</Label>
                    <Input
                      id="catName"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Es. Finanziamento Qonto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Colore</Label>
                    <div className="flex flex-wrap gap-2">
                      {presetColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            formData.color === color
                              ? "border-foreground scale-110"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setFormData({ ...formData, color })}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormOpen(false);
                        setEditingCategory(null);
                      }}
                    >
                      Annulla
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving || !formData.name.trim()}>
                      {saving ? "Salvataggio..." : "Salva"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
