import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPasswordResetOtp } from "@/lib/auth/otpService";
import { sendPasswordChangedEmail } from "@/lib/email/emailService";

const SALT_ROUNDS = 12;

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Email, codice e nuova password richiesti" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "La password deve essere di almeno 6 caratteri" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase();

    // Verifica OTP
    const otpResult = await verifyPasswordResetOtp(emailLower, code);

    if (!otpResult.valid) {
      return NextResponse.json(
        { success: false, error: otpResult.error || "Codice non valido o scaduto" },
        { status: 401 }
      );
    }

    // Trova utente
    const user = await db.select().from(users).where(eq(users.email, emailLower)).get();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Utente non trovato" },
        { status: 404 }
      );
    }

    // Aggiorna password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await db.update(users)
      .set({
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Invia email di conferma
    await sendPasswordChangedEmail(emailLower);

    console.log(`[PASSWORD_RESET] Password resettata con successo per ${emailLower}`);

    return NextResponse.json({
      success: true,
      message: "Password reimpostata con successo",
    });
  } catch (error) {
    console.error("Errore reset password:", error);
    return NextResponse.json(
      { success: false, error: "Errore durante il reset" },
      { status: 500 }
    );
  }
}
