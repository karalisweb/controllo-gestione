import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { UserService } from "@/lib/auth/userService";
import { send2FADisabledEmail } from "@/lib/email/emailService";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.authenticated || !session.userId) {
      return NextResponse.json(
        { success: false, error: "Non autenticato" },
        { status: 401 }
      );
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password richiesta per disattivare 2FA" },
        { status: 400 }
      );
    }

    const user = await UserService.getUserById(session.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Utente non trovato" },
        { status: 404 }
      );
    }

    if (!user.totpEnabled) {
      return NextResponse.json(
        { success: false, error: "2FA non attivo" },
        { status: 400 }
      );
    }

    // Verifica password e disattiva 2FA
    try {
      await UserService.disable2FA(session.userId, password);
    } catch (error) {
      if (error instanceof Error && error.message === "Password non valida") {
        return NextResponse.json(
          { success: false, error: "Password non corretta" },
          { status: 401 }
        );
      }
      throw error;
    }

    // Invia email di conferma
    await send2FADisabledEmail(user.email);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Errore disattivazione 2FA:", error);
    return NextResponse.json(
      { success: false, error: "Errore durante la disattivazione" },
      { status: 500 }
    );
  }
}
