"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import Image from "next/image";

type Step = "loading" | "init" | "credentials" | "2fa" | "forgot-password" | "reset-password" | "reset-success";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Verifica se il sistema è inizializzato
  useEffect(() => {
    const checkInit = async () => {
      try {
        const res = await fetch("/api/auth/init");
        const data = await res.json();
        setStep(data.initialized ? "credentials" : "init");
      } catch {
        setStep("credentials");
      }
    };
    checkInit();
  }, []);

  const handleInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Errore durante la creazione");
        return;
      }

      // Utente creato, ora login automatico
      setStep("credentials");
      setError("");
      // Pulisci il form e fai login
      await handleLoginDirect();
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginDirect = async () => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.success && !data.requires2FA) {
      router.push(redirectUrl);
      router.refresh();
    } else {
      setStep("credentials");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Errore durante il login");
        return;
      }

      if (data.requires2FA) {
        setStep("2fa");
        return;
      }

      // Login completato
      router.push(redirectUrl);
      router.refresh();
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Codice non valido");
        return;
      }

      // Login completato
      router.push(redirectUrl);
      router.refresh();
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    setError("");

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
      });

      const data = await res.json();

      if (data.success) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 3000);
      } else {
        setError(data.error || "Errore durante l'invio");
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setResendLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Errore durante la richiesta");
        return;
      }

      setStep("reset-password");
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Le password non coincidono");
      return;
    }

    if (newPassword.length < 6) {
      setError("La password deve essere di almeno 6 caratteri");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Errore durante il reset");
        return;
      }

      setStep("reset-success");
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const handleResendPasswordOtp = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    setError("");

    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 3000);
      } else {
        setError(data.error || "Errore durante l'invio");
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setResendLoading(false);
    }
  };

  const goBackToLogin = () => {
    setStep("credentials");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1521' }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#71717a]" />
      </div>
    );
  }

  const getDescription = () => {
    switch (step) {
      case "init":
        return "Crea il primo account amministratore";
      case "credentials":
        return "Controllo di Gestione Aziendale";
      case "2fa":
        return "Verifica in due passaggi";
      case "forgot-password":
        return "Recupera la tua password";
      case "reset-password":
        return "Imposta la nuova password";
      case "reset-success":
        return "Password reimpostata";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-8" style={{ background: '#0d1521' }}>
      {/* Login Box - Ref: DESIGN-SYSTEM.md sezione 6.1 */}
      <div
        className="w-full max-w-[400px] rounded-xl p-12"
        style={{
          background: '#132032',
          border: '1px solid #2a2a35',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Logo negativo Karalisweb (giallo su sfondo scuro) */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo-kw-negativo.png"
            alt="Karalisweb"
            width={180}
            height={60}
            className="max-w-[180px] h-auto"
            priority
          />
        </div>

        {/* Titolo app con gradiente oro > teal */}
        <h1
          className="text-center text-[1.75rem] font-semibold mb-1"
          style={{
            background: 'linear-gradient(135deg, #d4a726, #2d7d9a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          KW Cashflow
        </h1>
        <p className="text-center text-[0.9rem] text-[#a1a1aa] mb-8">
          {getDescription()}
        </p>

        {/* Step: Init - Creazione primo admin */}
        {step === "init" && (
          <form onSubmit={handleInit} className="space-y-4">
            <div className="rounded-lg p-3 mb-4" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <p className="text-sm text-[#3b82f6]">
                Primo accesso: crea l&apos;account amministratore per iniziare.
              </p>
            </div>
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1 text-[#a1a1aa]">
                Nome
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Il tuo nome"
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1 text-[#a1a1aa]">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@esempio.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1 text-[#a1a1aa]">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 8 caratteri"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {error && (
              <div className="text-[#ef4444] text-sm text-center">{error}</div>
            )}
            <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
              {loading ? "Creazione in corso..." : "Crea Account Admin"}
            </Button>
          </form>
        )}

        {/* Step: Credentials - Login normale */}
        {step === "credentials" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1 text-[#a1a1aa]">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@esempio.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1 text-[#a1a1aa]">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="text-[#ef4444] text-sm text-center">{error}</div>
            )}
            <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
              {loading ? "Accesso in corso..." : "Accedi"}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep("forgot-password");
                  setError("");
                }}
                className="text-sm text-[#a1a1aa] hover:text-[#d4a726] transition-colors"
              >
                Password dimenticata?
              </button>
            </div>
          </form>
        )}

        {/* Step: 2FA - Verifica OTP email */}
        {step === "2fa" && (
          <form onSubmit={handleVerify2FA} className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(212, 167, 38, 0.2)' }}>
                <Mail className="h-6 w-6 text-[#d4a726]" />
              </div>
            </div>
            <p className="text-sm text-[#a1a1aa] text-center mb-4">
              Abbiamo inviato un codice di verifica alla tua email. Il codice scade tra 10 minuti.
            </p>
            <div>
              <label htmlFor="code" className="block text-sm font-medium mb-1 text-[#a1a1aa]">
                Codice di verifica
              </label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                required
                autoComplete="one-time-code"
                maxLength={6}
                className="text-center text-xl tracking-widest"
              />
            </div>
            {error && (
              <div className="text-[#ef4444] text-sm text-center">{error}</div>
            )}
            {resendSuccess && (
              <div className="text-[#22c55e] text-sm text-center">Codice inviato!</div>
            )}
            <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
              {loading ? "Verifica in corso..." : "Verifica"}
            </Button>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={handleResendOtp}
                disabled={resendLoading}
              >
                {resendLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Reinvia codice
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={goBackToLogin}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna al login
              </Button>
            </div>
          </form>
        )}

        {/* Step: Forgot Password - Richiesta OTP */}
        {step === "forgot-password" && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(212, 167, 38, 0.2)' }}>
                <Mail className="h-6 w-6 text-[#d4a726]" />
              </div>
            </div>
            <p className="text-sm text-[#a1a1aa] text-center mb-4">
              Inserisci la tua email. Ti invieremo un codice per reimpostare la password.
            </p>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1 text-[#a1a1aa]">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@esempio.com"
                required
                autoComplete="email"
              />
            </div>
            {error && (
              <div className="text-[#ef4444] text-sm text-center">{error}</div>
            )}
            <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
              {loading ? "Invio in corso..." : "Invia codice"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={goBackToLogin}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna al login
            </Button>
          </form>
        )}

        {/* Step: Reset Password - Inserimento OTP e nuova password */}
        {step === "reset-password" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(212, 167, 38, 0.2)' }}>
                <Mail className="h-6 w-6 text-[#d4a726]" />
              </div>
            </div>
            <p className="text-sm text-[#a1a1aa] text-center mb-4">
              Inserisci il codice ricevuto via email e la nuova password.
            </p>
            <div>
              <label htmlFor="code" className="block text-sm font-medium mb-1 text-[#a1a1aa]">
                Codice di verifica
              </label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                required
                autoComplete="one-time-code"
                maxLength={6}
                className="text-center text-xl tracking-widest"
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium mb-1 text-[#a1a1aa]">
                Nuova password
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <p className="text-xs text-[#71717a] mt-1">Minimo 6 caratteri</p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1 text-[#a1a1aa]">
                Conferma password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>
            {error && (
              <div className="text-[#ef4444] text-sm text-center">{error}</div>
            )}
            {resendSuccess && (
              <div className="text-[#22c55e] text-sm text-center">Codice inviato!</div>
            )}
            <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
              {loading ? "Reimpostazione..." : "Reimposta password"}
            </Button>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={handleResendPasswordOtp}
                disabled={resendLoading}
              >
                {resendLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Reinvia codice
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={goBackToLogin}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna al login
              </Button>
            </div>
          </form>
        )}

        {/* Step: Reset Success */}
        {step === "reset-success" && (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                <CheckCircle className="h-6 w-6 text-[#22c55e]" />
              </div>
            </div>
            <p className="text-sm text-[#a1a1aa]">
              La tua password è stata reimpostata con successo. Puoi ora accedere con la nuova password.
            </p>
            <Button
              variant="gradient"
              className="w-full"
              onClick={() => {
                setStep("credentials");
                setPassword("");
                setCode("");
                setNewPassword("");
                setConfirmPassword("");
              }}
            >
              Vai al login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1521' }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#71717a]" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
