import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { UserService } from "@/lib/auth/userService";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.authenticated || !session.userId) {
      return NextResponse.json(
        { success: false, error: "Non autenticato" },
        { status: 401 }
      );
    }

    const { name } = await request.json();

    if (typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Nome non valido" },
        { status: 400 }
      );
    }

    const result = await UserService.updateProfile(session.userId, name.trim());

    // Aggiorna anche la sessione
    session.name = name.trim();
    await session.save();

    return NextResponse.json({
      success: true,
      name: result.name,
    });
  } catch (error) {
    console.error("Errore update profile:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Errore durante l'aggiornamento" },
      { status: 500 }
    );
  }
}
