import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET - recupera tutte le impostazioni o una specifica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key) {
      const setting = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
      if (setting.length === 0) {
        return NextResponse.json({ error: "Setting not found" }, { status: 404 });
      }
      return NextResponse.json(setting[0]);
    }

    const allSettings = await db.select().from(settings);
    return NextResponse.json(allSettings);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT - aggiorna un'impostazione
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, description } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "Key and value are required" }, { status: 400 });
    }

    const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

    if (existing.length === 0) {
      // Crea nuova impostazione
      const [newSetting] = await db.insert(settings).values({
        key,
        value: String(value),
        type: typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "string",
        description,
      }).returning();

      return NextResponse.json(newSetting);
    }

    // Aggiorna impostazione esistente
    const [updated] = await db.update(settings)
      .set({
        value: String(value),
        description: description || existing[0].description,
      })
      .where(eq(settings.key, key))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
