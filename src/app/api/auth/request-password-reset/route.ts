import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requestPasswordResetOtp } from "@/lib/auth/otpService";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email richiesta" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase();

    // Verifica che l'utente esista (ma non rivelare se non esiste per sicurezza)
    const user = await db.select().from(users).where(eq(users.email, emailLower)).get();

    if (!user) {
      // Non rivelare che l'utente non esiste
      console.log(`[PASSWORD_RESET] Tentativo per email non esistente: ${emailLower}`);
      return NextResponse.json({
        success: true,
        message: "Se l'email esiste, riceverai un codice di recupero",
      });
    }

    if (!user.isActive) {
      console.log(`[PASSWORD_RESET] Tentativo per account disattivato: ${emailLower}`);
      return NextResponse.json({
        success: true,
        message: "Se l'email esiste, riceverai un codice di recupero",
      });
    }

    // Invia OTP
    const otpResult = await requestPasswordResetOtp(emailLower);

    if (!otpResult.success) {
      // Se rate limited, comunica l'errore
      if (otpResult.retryAfterMinutes) {
        return NextResponse.json(
          { success: false, error: otpResult.error, retryAfterMinutes: otpResult.retryAfterMinutes },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { success: false, error: otpResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Se l'email esiste, riceverai un codice di recupero",
    });
  } catch (error) {
    console.error("Errore richiesta reset password:", error);
    return NextResponse.json(
      { success: false, error: "Errore durante la richiesta" },
      { status: 500 }
    );
  }
}
