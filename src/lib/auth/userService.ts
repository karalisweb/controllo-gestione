import bcrypt from "bcryptjs";
import crypto from "crypto";
import { TOTP } from "otplib";
import { NobleCryptoPlugin } from "otplib";
import { ScureBase32Plugin } from "otplib";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { users, backupCodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Configura TOTP
const totp = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
});

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const BACKUP_CODES_COUNT = 10;

export class UserService {

  static async createUser(email: string, password: string, name?: string, role: "admin" | "user" | "viewer" = "user") {
    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
    if (existing) {
      throw new Error("Email già registrata");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role,
    }).returning();

    return result[0];
  }

  static async verifyCredentials(email: string, password: string) {
    const user = await db.select().from(users).where(eq(users.email, email.toLowerCase())).get();

    if (!user) {
      return { success: false, error: "Credenziali non valide" };
    }

    if (!user.isActive) {
      return { success: false, error: "Account disattivato" };
    }

    // Verifica lock
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      return { success: false, error: `Account bloccato. Riprova tra ${remainingMinutes} minuti` };
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      let lockedUntil = null;

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60000);
      }

      await db.update(users)
        .set({
          failedLoginAttempts: newAttempts,
          lockedUntil
        })
        .where(eq(users.id, user.id));

      return { success: false, error: "Credenziali non valide" };
    }

    // Reset tentativi falliti
    await db.update(users)
      .set({ failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(users.id, user.id));

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        totpEnabled: !!user.totpEnabled,
      },
      requires2FA: !!user.totpEnabled,
    };
  }

  static async setup2FA(userId: number) {
    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) {
      throw new Error("Utente non trovato");
    }

    if (user.totpEnabled) {
      throw new Error("2FA già attivo");
    }

    const secret = totp.generateSecret();
    await db.update(users).set({ totpSecret: secret }).where(eq(users.id, userId));

    // Genera URI manualmente per QR code
    const otpauth = `otpauth://totp/Karalisweb%20Finance:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Karalisweb%20Finance&algorithm=SHA1&digits=6&period=30`;
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    return {
      secret,
      qrCode: qrCodeDataUrl,
      manualEntry: secret,
    };
  }

  static async verify2FASetup(userId: number, token: string) {
    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!user || !user.totpSecret) {
      throw new Error("Setup 2FA non iniziato");
    }

    if (user.totpEnabled) {
      throw new Error("2FA già attivo");
    }

    const totpInstance = new TOTP({
      crypto: new NobleCryptoPlugin(),
      base32: new ScureBase32Plugin(),
      secret: user.totpSecret,
    });
    const result = await totpInstance.verify(token);
    if (!result.valid) {
      throw new Error("Codice non valido");
    }

    await db.update(users)
      .set({ totpEnabled: true, updatedAt: new Date() })
      .where(eq(users.id, userId));

    const backupCodesGenerated = await this.generateBackupCodes(userId);

    return {
      success: true,
      backupCodes: backupCodesGenerated,
    };
  }

  static async verify2FALogin(userId: number, token: string) {
    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!user || !user.totpEnabled || !user.totpSecret) {
      throw new Error("2FA non attivo");
    }

    // Prova come codice TOTP
    const totpInstance = new TOTP({
      crypto: new NobleCryptoPlugin(),
      base32: new ScureBase32Plugin(),
      secret: user.totpSecret,
    });
    const result = await totpInstance.verify(token);
    if (result.valid) {
      await db.update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, userId));
      return { success: true };
    }

    // Prova come backup code
    const backupCodeUsed = await this.useBackupCode(userId, token);
    if (backupCodeUsed) {
      await db.update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, userId));
      return { success: true, usedBackupCode: true };
    }

    return { success: false, error: "Codice non valido" };
  }

  static async generateBackupCodes(userId: number) {
    // Elimina vecchi backup codes
    await db.delete(backupCodes).where(eq(backupCodes.userId, userId));

    const codes: string[] = [];

    for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      const codeHash = await bcrypt.hash(code, SALT_ROUNDS);

      await db.insert(backupCodes).values({
        userId,
        codeHash,
      });

      codes.push(code);
    }

    return codes;
  }

  static async useBackupCode(userId: number, code: string) {
    const userBackupCodes = await db.select()
      .from(backupCodes)
      .where(eq(backupCodes.userId, userId));

    for (const bc of userBackupCodes) {
      if (!bc.used && await bcrypt.compare(code.toUpperCase(), bc.codeHash)) {
        await db.update(backupCodes)
          .set({ used: true, usedAt: new Date() })
          .where(eq(backupCodes.id, bc.id));
        return true;
      }
    }

    return false;
  }

  static async disable2FA(userId: number, password: string) {
    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) {
      throw new Error("Utente non trovato");
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new Error("Password non valida");
    }

    await db.update(users)
      .set({ totpEnabled: false, totpSecret: null, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await db.delete(backupCodes).where(eq(backupCodes.userId, userId));

    return { success: true };
  }

  static async getUserById(userId: number) {
    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      totpEnabled: !!user.totpEnabled,
      isActive: !!user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  static async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) {
      throw new Error("Utente non trovato");
    }

    const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordValid) {
      throw new Error("Password corrente non valida");
    }

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await db.update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return { success: true };
  }
}
