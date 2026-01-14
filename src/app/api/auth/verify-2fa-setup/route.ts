import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { UserService } from "@/lib/auth/userService";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.authenticated || !session.userId) {
      return NextResponse.json(
        { success: false, error: "Non autorizzato" },
        { status: 401 }
      );
    }

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Codice richiesto" },
        { status: 400 }
      );
    }

    const result = await UserService.verify2FASetup(session.userId, code);

    return NextResponse.json({
      success: true,
      backupCodes: result.backupCodes,
      message: "2FA attivato con successo. Salva i codici di backup!",
    });
  } catch (error) {
    console.error("Errore verifica setup 2FA:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Errore verifica 2FA" },
      { status: 400 }
    );
  }
}
