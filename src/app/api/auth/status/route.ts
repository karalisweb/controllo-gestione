import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { UserService } from "@/lib/auth/userService";

export async function GET() {
  try {
    const session = await getSession();

    let user = null;
    if (session.authenticated && session.userId) {
      const dbUser = await UserService.getUserById(session.userId);
      if (dbUser) {
        user = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          totpEnabled: dbUser.totpEnabled,
        };
      }
    }

    return NextResponse.json({
      authenticated: !!session.authenticated,
      user,
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
