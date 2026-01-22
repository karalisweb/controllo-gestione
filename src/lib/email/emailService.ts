import nodemailer from "nodemailer";

// Configurazione SMTP da variabili ambiente
const smtpConfig = {
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true per 465, false per altri
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASSWORD || "",
  },
};

const fromEmail = process.env.SMTP_FROM || "noreply@karalisweb.net";
const appName = "Karalisweb Finance";

// Crea transporter (singleton)
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(smtpConfig);
  }
  return transporter;
}

// Template base email
function getEmailTemplate(content: string, title: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1e293b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 500px; background-color: #0f172a; border-radius: 16px; overflow: hidden;">
          <!-- Header con logo -->
          <tr>
            <td style="padding: 30px 30px 20px; text-align: center;">
              <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #f97316, #fbbf24); border-radius: 12px; line-height: 60px; font-size: 28px; font-weight: bold; color: white;">
                K
              </div>
              <h1 style="margin: 15px 0 0; font-size: 24px; font-weight: bold; background: linear-gradient(90deg, #f97316, #fbbf24); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                ${appName}
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 0 30px 30px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                Questa email è stata inviata automaticamente da ${appName}.<br>
                Se non hai richiesto questa email, puoi ignorarla.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// Template per codice OTP 2FA login
export function getOtpLoginTemplate(code: string) {
  const content = `
    <h2 style="margin: 0 0 15px; font-size: 20px; color: #f8fafc;">Codice di verifica</h2>
    <p style="margin: 0 0 25px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      Usa questo codice per completare l'accesso al tuo account. Il codice scade tra 10 minuti.
    </p>
    <div style="background: linear-gradient(135deg, #f97316, #fbbf24); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 25px;">
      <span style="font-size: 32px; font-weight: bold; color: white; letter-spacing: 8px; font-family: monospace;">
        ${code}
      </span>
    </div>
    <p style="margin: 0; font-size: 13px; color: #64748b;">
      Se non hai tentato di accedere, ignora questa email e considera di cambiare la tua password.
    </p>
  `;
  return getEmailTemplate(content, "Codice di verifica - " + appName);
}

// Template per reset password
export function getPasswordResetTemplate(code: string) {
  const content = `
    <h2 style="margin: 0 0 15px; font-size: 20px; color: #f8fafc;">Recupero password</h2>
    <p style="margin: 0 0 25px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      Hai richiesto di reimpostare la password del tuo account. Usa questo codice per procedere. Il codice scade tra 10 minuti.
    </p>
    <div style="background: linear-gradient(135deg, #f97316, #fbbf24); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 25px;">
      <span style="font-size: 32px; font-weight: bold; color: white; letter-spacing: 8px; font-family: monospace;">
        ${code}
      </span>
    </div>
    <p style="margin: 0; font-size: 13px; color: #64748b;">
      Se non hai richiesto il reset della password, ignora questa email. La tua password rimarrà invariata.
    </p>
  `;
  return getEmailTemplate(content, "Recupero password - " + appName);
}

// Template per conferma attivazione 2FA
export function get2FAEnabledTemplate() {
  const content = `
    <h2 style="margin: 0 0 15px; font-size: 20px; color: #f8fafc;">2FA Attivato</h2>
    <p style="margin: 0 0 25px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      L'autenticazione a due fattori è stata attivata con successo sul tuo account. D'ora in poi riceverai un codice via email ogni volta che effettuerai l'accesso.
    </p>
    <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 15px; margin-bottom: 25px;">
      <p style="margin: 0; font-size: 14px; color: #22c55e;">
        ✓ Il tuo account è ora più sicuro
      </p>
    </div>
    <p style="margin: 0; font-size: 13px; color: #64748b;">
      Se non hai attivato tu questa funzione, contatta immediatamente l'assistenza.
    </p>
  `;
  return getEmailTemplate(content, "2FA Attivato - " + appName);
}

// Template per conferma disattivazione 2FA
export function get2FADisabledTemplate() {
  const content = `
    <h2 style="margin: 0 0 15px; font-size: 20px; color: #f8fafc;">2FA Disattivato</h2>
    <p style="margin: 0 0 25px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      L'autenticazione a due fattori è stata disattivata sul tuo account.
    </p>
    <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 15px; margin-bottom: 25px;">
      <p style="margin: 0; font-size: 14px; color: #fbbf24;">
        ⚠ Il tuo account è meno protetto
      </p>
    </div>
    <p style="margin: 0; font-size: 13px; color: #64748b;">
      Ti consigliamo di riattivare il 2FA per proteggere meglio il tuo account.
    </p>
  `;
  return getEmailTemplate(content, "2FA Disattivato - " + appName);
}

// Template per conferma cambio password
export function getPasswordChangedTemplate() {
  const content = `
    <h2 style="margin: 0 0 15px; font-size: 20px; color: #f8fafc;">Password modificata</h2>
    <p style="margin: 0 0 25px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      La password del tuo account è stata modificata con successo.
    </p>
    <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 15px; margin-bottom: 25px;">
      <p style="margin: 0; font-size: 14px; color: #22c55e;">
        ✓ Password aggiornata
      </p>
    </div>
    <p style="margin: 0; font-size: 13px; color: #64748b;">
      Se non hai modificato tu la password, contatta immediatamente l'assistenza e reimposta la password.
    </p>
  `;
  return getEmailTemplate(content, "Password modificata - " + appName);
}

// Funzione per inviare email
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const transport = getTransporter();

    await transport.sendMail({
      from: `"${appName}" <${fromEmail}>`,
      to,
      subject,
      html,
    });

    console.log(`[EMAIL] Email inviata a ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL] Errore invio email a ${to}:`, error);
    return false;
  }
}

// Funzioni helper per inviare email specifiche
export async function sendOtpLoginEmail(to: string, code: string): Promise<boolean> {
  const html = getOtpLoginTemplate(code);
  return sendEmail(to, `${code} - Codice di verifica`, html);
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<boolean> {
  const html = getPasswordResetTemplate(code);
  return sendEmail(to, `${code} - Recupero password`, html);
}

export async function send2FAEnabledEmail(to: string): Promise<boolean> {
  const html = get2FAEnabledTemplate();
  return sendEmail(to, "Autenticazione a due fattori attivata", html);
}

export async function send2FADisabledEmail(to: string): Promise<boolean> {
  const html = get2FADisabledTemplate();
  return sendEmail(to, "Autenticazione a due fattori disattivata", html);
}

export async function sendPasswordChangedEmail(to: string): Promise<boolean> {
  const html = getPasswordChangedTemplate();
  return sendEmail(to, "Password modificata", html);
}
