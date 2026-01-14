import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { UserService } from "@/lib/auth/userService";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    const session = await getSession();

    if (!session.pending2FA) {
      return NextResponse.json(
        { success: false, error: "Nessun login in attesa di verifica 2FA" },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Codice 2FA richiesto" },
        { status: 400 }
      );
    }

    const { userId, email } = session.pending2FA;
    const result = await UserService.verify2FALogin(userId, code);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Codice non valido" },
        { status: 401 }
      );
    }

    // Login completato
    const user = await UserService.getUserById(userId);
    session.authenticated = true;
    session.userId = userId;
    session.email = email;
    session.name = user?.name || undefined;
    session.role = user?.role || undefined;
    session.pending2FA = undefined;
    await session.save();

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        name: user?.name,
        role: user?.role,
      },
      usedBackupCode: result.usedBackupCode,
    });
  } catch (error) {
    console.error("Errore verifica 2FA:", error);
    return NextResponse.json(
      { success: false, error: "Errore verifica 2FA" },
      { status: 500 }
    );
  }
}
