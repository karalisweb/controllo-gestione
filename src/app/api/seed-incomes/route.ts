import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revenueCenters, expectedIncomes } from "@/lib/db/schema";
import { eurosToCents } from "@/lib/utils/currency";

export async function POST() {
  try {
    // 1. Crea i 4 centri di ricavo aggregatori
    const centers = [
      { name: "Siti Web", description: "Sviluppo e manutenzione siti web", color: "#3b82f6", sortOrder: 1 },
      { name: "Marketing", description: "Servizi marketing e SEO", color: "#22c55e", sortOrder: 2 },
      { name: "Domini", description: "Registrazione e rinnovo domini", color: "#f97316", sortOrder: 3 },
      { name: "Licenze", description: "Licenze software", color: "#8b5cf6", sortOrder: 4 },
    ];

    const insertedCenters: { id: number; name: string }[] = [];
    for (const center of centers) {
      const result = await db
        .insert(revenueCenters)
        .values({ ...center, isActive: true })
        .returning();
      if (result[0]) {
        insertedCenters.push({ id: result[0].id, name: center.name });
      }
    }

    // Trova l'ID del centro "Siti Web" (useremo questo per tutti gli incassi)
    const sitiWebId = insertedCenters.find((c) => c.name === "Siti Web")?.id || null;

    // 2. Inserisci tutti gli incassi previsti dallo screenshot
    // I clienti pagano il 20 del mese
    const incomes = [
      // Massimo Borio: €337,94 - Mar, Giu, Nov (trimestrale partendo da marzo)
      {
        clientName: "Massimo Borio",
        amount: eurosToCents(337.94),
        frequency: "quarterly" as const,
        startDate: "2026-03-01",
        endDate: "2026-11-30",
        notes: "Rinnovo trimestrale - Mar/Giu/Nov",
      },
      // Anime Artigianali: €137,86 - mensile da Feb a Dic
      {
        clientName: "Anime Artigianali",
        amount: eurosToCents(137.86),
        frequency: "monthly" as const,
        startDate: "2026-02-01",
        endDate: null,
      },
      // Biores: €1.738,50 - solo Gen (annuale)
      {
        clientName: "Biores",
        amount: eurosToCents(1738.50),
        frequency: "annual" as const,
        startDate: "2026-01-01",
        endDate: null,
      },
      // Orizzonte: €366,00 - mensile da Gen a Dic
      {
        clientName: "Orizzonte",
        amount: eurosToCents(366.00),
        frequency: "monthly" as const,
        startDate: "2026-01-01",
        endDate: null,
      },
      // 3MT: €1.317,60 - Feb, Mar, Apr, Mag (poi di nuovo da Lug)
      {
        clientName: "3MT",
        amount: eurosToCents(1317.60),
        frequency: "monthly" as const,
        startDate: "2026-02-01",
        endDate: "2026-05-31",
        notes: "Primo periodo Feb-Mag",
      },
      {
        clientName: "3MT",
        amount: eurosToCents(1317.60),
        frequency: "monthly" as const,
        startDate: "2026-07-01",
        endDate: null,
        notes: "Secondo periodo da Lug",
      },
      // Gianfelice Piras: €869,25 - Gen, Mag, Nov (ogni 4 mesi circa)
      {
        clientName: "Gianfelice Piras",
        amount: eurosToCents(869.25),
        frequency: "quarterly" as const,
        startDate: "2026-01-01",
        endDate: null,
        notes: "Gen/Mag/Nov",
      },
      // Arredi 2000: €225,70 - mensile tutto l'anno
      {
        clientName: "Arredi 2000",
        amount: eurosToCents(225.70),
        frequency: "monthly" as const,
        startDate: "2026-01-01",
        endDate: null,
      },
      // CUPF: €250,00 - mensile tutto l'anno
      {
        clientName: "CUPF",
        amount: eurosToCents(250.00),
        frequency: "monthly" as const,
        startDate: "2026-01-01",
        endDate: null,
      },
      // Colombo: €317,20 - mensile tutto l'anno
      {
        clientName: "Colombo",
        amount: eurosToCents(317.20),
        frequency: "monthly" as const,
        startDate: "2026-01-01",
        endDate: null,
      },
      // Cambarau: €521,55 - Apr, Ago (semestrale)
      {
        clientName: "Cambarau",
        amount: eurosToCents(521.55),
        frequency: "semiannual" as const,
        startDate: "2026-04-01",
        endDate: null,
        notes: "Apr/Ago",
      },
      // IDT: €420,00 - solo Feb (una tantum)
      {
        clientName: "IDT",
        amount: eurosToCents(420.00),
        frequency: "one_time" as const,
        startDate: "2026-02-01",
        endDate: "2026-02-28",
      },
      // Sfrido: €1.808,04 - Apr, Ago, Dic (ogni 4 mesi)
      {
        clientName: "Sfrido",
        amount: eurosToCents(1808.04),
        frequency: "quarterly" as const,
        startDate: "2026-04-01",
        endDate: null,
        notes: "Apr/Ago/Dic",
      },
    ];

    for (const income of incomes) {
      await db.insert(expectedIncomes).values({
        clientName: income.clientName,
        revenueCenterId: sitiWebId,
        amount: income.amount,
        frequency: income.frequency,
        expectedDay: 20,
        startDate: income.startDate,
        endDate: income.endDate,
        reliability: "high",
        notes: income.notes || null,
        isActive: true,
      });
    }

    return NextResponse.json({
      message: "Seed completato",
      revenueCenters: insertedCenters.length,
      expectedIncomes: incomes.length,
    });
  } catch (error) {
    console.error("Errore seed:", error);
    return NextResponse.json(
      { error: "Errore durante il seed" },
      { status: 500 }
    );
  }
}
