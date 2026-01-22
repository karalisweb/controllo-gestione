import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { requestLoginOtp } from "@/lib/auth/otpService";

export async function POST() {
  try {
    const session = await getSession();

    if (!session.pending2FA) {
      return NextResponse.json(
        { success: false, error: "Nessun login in attesa di verifica" },
        { status: 400 }
      );
    }

    const { email } = session.pending2FA;

    // Invia nuovo OTP
    const otpResult = await requestLoginOtp(email);

    if (!otpResult.success) {
      return NextResponse.json(
        { success: false, error: otpResult.error, retryAfterMinutes: otpResult.retryAfterMinutes },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Nuovo codice inviato",
    });
  } catch (error) {
    console.error("Errore reinvio OTP:", error);
    return NextResponse.json(
      { success: false, error: "Errore durante l'invio" },
      { status: 500 }
    );
  }
}
