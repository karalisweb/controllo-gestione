import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { UserService } from "@/lib/auth/userService";

// Questa route crea l'utente admin iniziale
// Può essere chiamata solo se non esistono utenti nel sistema
export async function POST(request: NextRequest) {
  try {
    // Verifica se esistono già utenti
    const existingUsers = await db.select().from(users);

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { success: false, error: "Sistema già inizializzato" },
        { status: 400 }
      );
    }

    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email e password richiesti" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password deve essere di almeno 8 caratteri" },
        { status: 400 }
      );
    }

    // Crea utente admin
    const user = await UserService.createUser(email, password, name, "admin");

    return NextResponse.json({
      success: true,
      message: "Utente admin creato con successo",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Errore init:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Errore durante l'inizializzazione" },
      { status: 500 }
    );
  }
}

// GET per verificare se il sistema è inizializzato
export async function GET() {
  try {
    const existingUsers = await db.select().from(users);

    return NextResponse.json({
      initialized: existingUsers.length > 0,
      usersCount: existingUsers.length,
    });
  } catch {
    return NextResponse.json({
      initialized: false,
      usersCount: 0,
    });
  }
}
