import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { UserService } from "@/lib/auth/userService";
import { requestLoginOtp } from "@/lib/auth/otpService";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email e password richiesti" },
        { status: 400 }
      );
    }

    const result = await UserService.verifyCredentials(email, password);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    const session = await getSession();

    // Se 2FA attivo, invia OTP via email
    if (result.requires2FA && result.user) {
      // Invia codice OTP via email
      const otpResult = await requestLoginOtp(result.user.email);

      if (!otpResult.success) {
        return NextResponse.json(
          { success: false, error: otpResult.error },
          { status: 429 } // Too many requests se rate limited
        );
      }

      session.pending2FA = {
        userId: result.user.id,
        email: result.user.email,
      };
      session.authenticated = false;
      await session.save();

      return NextResponse.json({
        success: true,
        requires2FA: true,
        message: "Codice di verifica inviato via email",
      });
    }

    // Login completato (senza 2FA)
    if (result.user) {
      session.authenticated = true;
      session.userId = result.user.id;
      session.email = result.user.email;
      session.name = result.user.name || undefined;
      session.role = result.user.role || undefined;
      session.pending2FA = undefined;
      await session.save();
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    console.error("Errore login:", error);
    return NextResponse.json(
      { success: false, error: "Errore durante il login" },
      { status: 500 }
    );
  }
}
