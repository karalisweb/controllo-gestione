import crypto from "crypto";
import { db } from "@/lib/db";
import { otpCodes, otpRateLimits } from "@/lib/db/schema";
import { eq, and, lt, gt } from "drizzle-orm";
import { sendOtpLoginEmail, sendPasswordResetEmail } from "@/lib/email/emailService";

// Configurazione
const OTP_EXPIRY_MINUTES = 10;
const RATE_LIMIT_MAX_REQUESTS = 3;
const RATE_LIMIT_WINDOW_MINUTES = 15;

type OtpType = "2fa_login" | "password_reset";

/**
 * Genera un codice OTP a 6 cifre crittograficamente sicuro
 */
function generateOtpCode(): string {
  // Genera un numero random tra 0 e 999999
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = randomBytes.readUInt32BE(0) % 1000000;
  // Pad con zeri a sinistra per avere sempre 6 cifre
  return randomNumber.toString().padStart(6, "0");
}

/**
 * Verifica rate limiting per email
 * Max 3 richieste ogni 15 minuti
 */
async function checkRateLimit(email: string): Promise<{ allowed: boolean; retryAfterMinutes?: number }> {
  const emailLower = email.toLowerCase();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

  // Cerca record esistente nella finestra temporale
  const existing = await db.select()
    .from(otpRateLimits)
    .where(
      and(
        eq(otpRateLimits.email, emailLower),
        gt(otpRateLimits.windowStart, windowStart)
      )
    )
    .get();

  if (!existing) {
    // Prima richiesta nella finestra
    await db.insert(otpRateLimits).values({
      email: emailLower,
      requestCount: 1,
      windowStart: new Date(),
    });
    return { allowed: true };
  }

  if (existing.requestCount >= RATE_LIMIT_MAX_REQUESTS) {
    // Calcola tempo rimanente
    const windowEndTime = new Date(existing.windowStart).getTime() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
    const retryAfterMinutes = Math.ceil((windowEndTime - Date.now()) / 60000);
    return { allowed: false, retryAfterMinutes };
  }

  // Incrementa contatore
  await db.update(otpRateLimits)
    .set({ requestCount: existing.requestCount + 1 })
    .where(eq(otpRateLimits.id, existing.id));

  return { allowed: true };
}

/**
 * Pulisce i vecchi OTP scaduti e rate limits vecchi
 */
async function cleanupExpiredOtps(): Promise<void> {
  const now = new Date();
  const oldWindow = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

  // Elimina OTP scaduti
  await db.delete(otpCodes)
    .where(lt(otpCodes.expiresAt, now));

  // Elimina rate limits vecchi
  await db.delete(otpRateLimits)
    .where(lt(otpRateLimits.windowStart, oldWindow));
}

/**
 * Invalida tutti gli OTP precedenti per un'email e tipo
 */
async function invalidatePreviousOtps(email: string, type: OtpType): Promise<void> {
  await db.update(otpCodes)
    .set({ used: true })
    .where(
      and(
        eq(otpCodes.email, email.toLowerCase()),
        eq(otpCodes.type, type),
        eq(otpCodes.used, false)
      )
    );
}

/**
 * Genera e invia un nuovo codice OTP
 */
export async function requestOtp(
  email: string,
  type: OtpType
): Promise<{ success: boolean; error?: string; retryAfterMinutes?: number }> {
  const emailLower = email.toLowerCase();

  // Cleanup periodico
  await cleanupExpiredOtps();

  // Verifica rate limiting
  const rateCheck = await checkRateLimit(emailLower);
  if (!rateCheck.allowed) {
    console.log(`[OTP] Rate limit raggiunto per ${emailLower}`);
    return {
      success: false,
      error: `Troppi tentativi. Riprova tra ${rateCheck.retryAfterMinutes} minuti`,
      retryAfterMinutes: rateCheck.retryAfterMinutes,
    };
  }

  // Invalida OTP precedenti
  await invalidatePreviousOtps(emailLower, type);

  // Genera nuovo codice
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Salva nel database
  await db.insert(otpCodes).values({
    email: emailLower,
    code,
    type,
    expiresAt,
    used: false,
  });

  // Invia email
  let emailSent = false;
  if (type === "2fa_login") {
    emailSent = await sendOtpLoginEmail(emailLower, code);
  } else if (type === "password_reset") {
    emailSent = await sendPasswordResetEmail(emailLower, code);
  }

  if (!emailSent) {
    console.error(`[OTP] Errore invio email a ${emailLower}`);
    return { success: false, error: "Errore invio email. Riprova più tardi." };
  }

  console.log(`[OTP] Codice ${type} inviato a ${emailLower}`);
  return { success: true };
}

/**
 * Verifica un codice OTP
 */
export async function verifyOtp(
  email: string,
  code: string,
  type: OtpType
): Promise<{ valid: boolean; error?: string }> {
  const emailLower = email.toLowerCase();
  const now = new Date();

  // Cerca OTP valido
  const otpRecord = await db.select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.email, emailLower),
        eq(otpCodes.code, code),
        eq(otpCodes.type, type),
        eq(otpCodes.used, false),
        gt(otpCodes.expiresAt, now)
      )
    )
    .get();

  if (!otpRecord) {
    console.log(`[OTP] Codice non valido o scaduto per ${emailLower}`);
    return { valid: false, error: "Codice non valido o scaduto" };
  }

  // Marca come usato
  await db.update(otpCodes)
    .set({ used: true, usedAt: now })
    .where(eq(otpCodes.id, otpRecord.id));

  console.log(`[OTP] Codice verificato con successo per ${emailLower}`);
  return { valid: true };
}

/**
 * Request OTP per login 2FA
 */
export async function requestLoginOtp(email: string) {
  return requestOtp(email, "2fa_login");
}

/**
 * Verify OTP per login 2FA
 */
export async function verifyLoginOtp(email: string, code: string) {
  return verifyOtp(email, code, "2fa_login");
}

/**
 * Request OTP per password reset
 */
export async function requestPasswordResetOtp(email: string) {
  return requestOtp(email, "password_reset");
}

/**
 * Verify OTP per password reset
 */
export async function verifyPasswordResetOtp(email: string, code: string) {
  return verifyOtp(email, code, "password_reset");
}
