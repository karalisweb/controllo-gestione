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

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Password richieste" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "La nuova password deve essere di almeno 6 caratteri" },
        { status: 400 }
      );
    }

    await UserService.changePassword(session.userId, currentPassword, newPassword);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Errore update password:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Errore durante l'aggiornamento" },
      { status: 500 }
    );
  }
}
