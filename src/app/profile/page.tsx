"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";

interface User {
  id: number;
  email: string;
  name: string | null;
  role: string;
  totpEnabled?: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 2FA setup
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [manualEntry, setManualEntry] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/status");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const startSetup2FA = async () => {
    setSetupLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/setup-2fa", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setQrCode(data.qrCode);
        setManualEntry(data.manualEntry);
        setShow2FASetup(true);
      } else {
        setError(data.error || "Errore durante il setup 2FA");
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setSetupLoading(false);
    }
  };

  const verifyAndEnable2FA = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      setError("Inserisci un codice a 6 cifre");
      return;
    }
    setSetupLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-2fa-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });
      const data = await res.json();
      if (data.success) {
        setBackupCodes(data.backupCodes);
        setUser(prev => prev ? { ...prev, totpEnabled: true } : null);
        setSuccess("2FA attivato con successo!");
      } else {
        setError(data.error || "Codice non valido");
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setSetupLoading(false);
    }
  };

  const closeSetup = () => {
    setShow2FASetup(false);
    setQrCode("");
    setManualEntry("");
    setVerifyCode("");
    setBackupCodes([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Profilo</h1>

        {/* Info utente */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informazioni Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">Email</label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Nome</label>
              <p className="font-medium">{user?.name || "-"}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Ruolo</label>
              <p className="font-medium capitalize">{user?.role}</p>
            </div>
          </CardContent>
        </Card>

        {/* Sicurezza 2FA */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Autenticazione a Due Fattori (2FA)</CardTitle>
            <CardDescription>
              Proteggi il tuo account con un secondo livello di sicurezza
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user?.totpEnabled ? (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-700 font-medium">2FA Attivo</span>
              </div>
            ) : (
              <>
                {!show2FASetup ? (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-red-700 font-medium">2FA Non Attivo</span>
                    </div>
                    <Button onClick={startSetup2FA} disabled={setupLoading}>
                      {setupLoading ? "Caricamento..." : "Attiva 2FA"}
                    </Button>
                  </div>
                ) : backupCodes.length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 font-medium mb-2">2FA Attivato con successo!</p>
                      <p className="text-sm text-green-700">
                        Salva questi codici di backup in un posto sicuro. Potrai usarli se perdi accesso all&apos;app di autenticazione.
                      </p>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Codici di Backup:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {backupCodes.map((code, i) => (
                          <code key={i} className="bg-white px-2 py-1 rounded text-center font-mono">
                            {code}
                          </code>
                        ))}
                      </div>
                    </div>
                    <Button onClick={closeSetup}>Ho salvato i codici</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-3">
                        1. Scansiona questo QR code con Google Authenticator, Authy o altra app TOTP
                      </p>
                      {qrCode && (
                        <div className="flex justify-center mb-4">
                          <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
                        </div>
                      )}
                      <p className="text-xs text-gray-500 text-center">
                        Oppure inserisci manualmente: <code className="bg-gray-100 px-2 py-1 rounded">{manualEntry}</code>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        2. Inserisci il codice a 6 cifre mostrato dall&apos;app
                      </p>
                      <Input
                        type="text"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="123456"
                        maxLength={6}
                        className="text-center text-xl tracking-widest max-w-xs"
                      />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="flex gap-2">
                      <Button onClick={verifyAndEnable2FA} disabled={setupLoading || verifyCode.length !== 6}>
                        {setupLoading ? "Verifica..." : "Verifica e Attiva"}
                      </Button>
                      <Button variant="ghost" onClick={closeSetup}>
                        Annulla
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
            {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
          </CardContent>
        </Card>

        {/* Logout */}
        <Card>
          <CardContent className="pt-6">
            <Button variant="destructive" onClick={handleLogout}>
              Esci dall&apos;account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
