"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="text-center pb-2">
          {/* Logo Karalisweb */}
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 border border-white/20">
              <span className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">K</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">KW Cashflow</CardTitle>
          <CardDescription className="text-muted-foreground">
            {getDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step: Init - Creazione primo admin */}
          {step === "init" && (
            <form onSubmit={handleInit} className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-400">
                  Primo accesso: crea l&apos;account amministratore per iniziare.
                </p>
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
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
                <label htmlFor="email" className="block text-sm font-medium mb-1">
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
                <label htmlFor="password" className="block text-sm font-medium mb-1">
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
                <div className="text-red-500 text-sm text-center">{error}</div>
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
                <label htmlFor="email" className="block text-sm font-medium mb-1">
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
                <label htmlFor="password" className="block text-sm font-medium mb-1">
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
                <div className="text-red-500 text-sm text-center">{error}</div>
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
                  className="text-sm text-orange-500 hover:text-orange-400 transition-colors"
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
                  <Mail className="h-6 w-6 text-orange-500" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Abbiamo inviato un codice di verifica alla tua email. Il codice scade tra 10 minuti.
              </p>
              <div>
                <label htmlFor="code" className="block text-sm font-medium mb-1">
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
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}
              {resendSuccess && (
                <div className="text-green-500 text-sm text-center">Codice inviato!</div>
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
                  <Mail className="h-6 w-6 text-orange-500" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Inserisci la tua email. Ti invieremo un codice per reimpostare la password.
              </p>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
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
                <div className="text-red-500 text-sm text-center">{error}</div>
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
                  <Mail className="h-6 w-6 text-orange-500" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Inserisci il codice ricevuto via email e la nuova password.
              </p>
              <div>
                <label htmlFor="code" className="block text-sm font-medium mb-1">
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
                <label htmlFor="newPassword" className="block text-sm font-medium mb-1">
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
                <p className="text-xs text-muted-foreground mt-1">Minimo 6 caratteri</p>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
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
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}
              {resendSuccess && (
                <div className="text-green-500 text-sm text-center">Codice inviato!</div>
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
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
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
