import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories, budgetItems } from "@/lib/db/schema";
import { eurosToCents } from "@/lib/utils/currency";

// Endpoint per popolare il database con dati di esempio
export async function POST() {
  // Inserisci categorie di base
  const incomeCategories = [
    { name: "Clienti", type: "income" as const, color: "#22c55e" },
    { name: "Progetti", type: "income" as const, color: "#3b82f6" },
    { name: "Rinnovi", type: "income" as const, color: "#8b5cf6" },
    { name: "Altro", type: "income" as const, color: "#6b7280" },
  ];

  const expenseCategories = [
    { name: "Affitto/Utenze", type: "expense" as const, color: "#ef4444" },
    { name: "Software/Servizi", type: "expense" as const, color: "#f97316" },
    { name: "Stipendi", type: "expense" as const, color: "#eab308" },
    { name: "Marketing", type: "expense" as const, color: "#ec4899" },
    { name: "PDR", type: "expense" as const, color: "#6366f1" },
    { name: "Tasse", type: "expense" as const, color: "#dc2626" },
    { name: "Altro", type: "expense" as const, color: "#6b7280" },
  ];

  const insertedIncomeCategories = await db
    .insert(categories)
    .values(incomeCategories)
    .returning();

  const insertedExpenseCategories = await db
    .insert(categories)
    .values(expenseCategories)
    .returning();

  // Trova gli ID delle categorie
  const clientiCategoryId = insertedIncomeCategories.find(c => c.name === "Clienti")?.id;
  const rinnoviCategoryId = insertedIncomeCategories.find(c => c.name === "Rinnovi")?.id;
  const affittoCategoryId = insertedExpenseCategories.find(c => c.name === "Affitto/Utenze")?.id;
  const softwareCategoryId = insertedExpenseCategories.find(c => c.name === "Software/Servizi")?.id;

  // Inserisci alcune voci previsionali di esempio
  const sampleBudgetItems = [
    // Entrate
    {
      categoryId: clientiCategoryId,
      description: "Sito web cliente A",
      amount: eurosToCents(2500),
      month: 1,
      year: 2026,
      clientName: "Cliente A",
    },
    {
      categoryId: clientiCategoryId,
      description: "E-commerce cliente B",
      amount: eurosToCents(4500),
      month: 2,
      year: 2026,
      clientName: "Cliente B",
    },
    {
      categoryId: rinnoviCategoryId,
      description: "Rinnovi hosting mensili",
      amount: eurosToCents(800),
      month: 1,
      year: 2026,
      isRecurring: true,
    },
    // Uscite
    {
      categoryId: affittoCategoryId,
      description: "Affitto ufficio",
      amount: -eurosToCents(500),
      month: 1,
      year: 2026,
      isRecurring: true,
    },
    {
      categoryId: softwareCategoryId,
      description: "Abbonamenti software",
      amount: -eurosToCents(200),
      month: 1,
      year: 2026,
      isRecurring: true,
    },
  ];

  await db.insert(budgetItems).values(sampleBudgetItems);

  return NextResponse.json({
    success: true,
    message: "Database popolato con dati di esempio",
    categories: {
      income: insertedIncomeCategories.length,
      expense: insertedExpenseCategories.length,
    },
    budgetItems: sampleBudgetItems.length,
  });
}
