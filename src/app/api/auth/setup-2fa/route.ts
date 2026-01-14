import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { UserService } from "@/lib/auth/userService";

export async function POST() {
  try {
    const session = await getSession();

    if (!session.authenticated || !session.userId) {
      return NextResponse.json(
        { success: false, error: "Non autorizzato" },
        { status: 401 }
      );
    }

    const result = await UserService.setup2FA(session.userId);

    return NextResponse.json({
      success: true,
      qrCode: result.qrCode,
      manualEntry: result.manualEntry,
    });
  } catch (error) {
    console.error("Errore setup 2FA:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Errore setup 2FA" },
      { status: 400 }
    );
  }
}
