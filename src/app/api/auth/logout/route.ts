import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function POST() {
  try {
    const session = await getSession();
    session.destroy();

    return NextResponse.json({
      success: true,
      message: "Logout effettuato con successo",
    });
  } catch (error) {
    console.error("Errore logout:", error);
    return NextResponse.json(
      { success: false, error: "Errore durante il logout" },
      { status: 500 }
    );
  }
}
