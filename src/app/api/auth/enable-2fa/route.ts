import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { UserService } from "@/lib/auth/userService";
import { send2FAEnabledEmail } from "@/lib/email/emailService";

export async function POST() {
  try {
    const session = await getSession();

    if (!session.authenticated || !session.userId) {
      return NextResponse.json(
        { success: false, error: "Non autenticato" },
        { status: 401 }
      );
    }

    const user = await UserService.getUserById(session.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Utente non trovato" },
        { status: 404 }
      );
    }

    if (user.totpEnabled) {
      return NextResponse.json(
        { success: false, error: "2FA già attivo" },
        { status: 400 }
      );
    }

    // Attiva 2FA
    await UserService.enable2FA(session.userId);

    // Invia email di conferma
    await send2FAEnabledEmail(user.email);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Errore attivazione 2FA:", error);
    return NextResponse.json(
      { success: false, error: "Errore durante l'attivazione" },
      { status: 500 }
    );
  }
}
