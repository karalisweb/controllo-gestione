import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();

    return NextResponse.json({
      authenticated: !!session.authenticated,
      user: session.authenticated
        ? {
            id: session.userId,
            email: session.email,
            name: session.name,
            role: session.role,
          }
        : null,
      pending2FA: !!session.pending2FA,
    });
  } catch (error) {
    console.error("Errore status:", error);
    return NextResponse.json(
      { authenticated: false, user: null, pending2FA: false },
      { status: 500 }
    );
  }
}
