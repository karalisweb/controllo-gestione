"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MobileHeader } from "@/components/MobileHeader";
import { Settings, User, Lock, Shield, Mail, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserData {
  id: number;
  email: string;
  name: string | null;
  role: string;
  totpEnabled?: boolean;
}

type TabType = "profile" | "password" | "security";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  // Profile form
  const [name, setName] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Security 2FA
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState("");
  const [securityError, setSecurityError] = useState("");
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/status");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setName(data.user.name || "");
          setTwoFAEnabled(data.user.totpEnabled || false);
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();

      if (data.success) {
        setProfileSuccess("Profilo aggiornato con successo");
        setUser(prev => prev ? { ...prev, name } : null);
      } else {
        setProfileError(data.error || "Errore durante l'aggiornamento");
      }
    } catch {
      setProfileError("Errore di connessione");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Le password non coincidono");
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("La password deve essere di almeno 6 caratteri");
      setPasswordLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (data.success) {
        setPasswordSuccess("Password aggiornata con successo");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(data.error || "Errore durante l'aggiornamento");
      }
    } catch {
      setPasswordError("Errore di connessione");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    setSecurityLoading(true);
    setSecurityError("");
    setSecuritySuccess("");

    try {
      const res = await fetch("/api/auth/enable-2fa", {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        setTwoFAEnabled(true);
        setSecuritySuccess("2FA attivato con successo. Riceverai un codice via email ad ogni accesso.");
        setUser(prev => prev ? { ...prev, totpEnabled: true } : null);
      } else {
        setSecurityError(data.error || "Errore durante l'attivazione");
      }
    } catch {
      setSecurityError("Errore di connessione");
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      setSecurityError("Inserisci la password per confermare");
      return;
    }

    setSecurityLoading(true);
    setSecurityError("");
    setSecuritySuccess("");

    try {
      const res = await fetch("/api/auth/disable-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();

      if (data.success) {
        setTwoFAEnabled(false);
        setSecuritySuccess("2FA disattivato.");
        setUser(prev => prev ? { ...prev, totpEnabled: false } : null);
        setShowDisableConfirm(false);
        setDisablePassword("");
      } else {
        setSecurityError(data.error || "Errore durante la disattivazione");
      }
    } catch {
      setSecurityError("Errore di connessione");
    } finally {
      setSecurityLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tabs = [
    { id: "profile" as TabType, label: "Profilo", icon: User },
    { id: "password" as TabType, label: "Password", icon: Lock },
    { id: "security" as TabType, label: "Sicurezza", icon: Shield },
  ];

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <MobileHeader title="Impostazioni" />

      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Impostazioni</h1>
            <p className="text-sm text-muted-foreground">Gestisci il tuo profilo e le preferenze</p>
          </div>
        </div>

        {/* User Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-400/20 border border-orange-500/30">
                <User className="h-7 w-7 text-orange-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{user?.name || "Utente"}</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge className="mt-1 bg-gradient-to-r from-orange-500 to-amber-400 text-white border-0">
                  {user?.role === "admin" ? "Amministratore" : user?.role}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card>
          <CardContent className="p-2">
            <div className="flex gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-lg"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        {activeTab === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle>Modifica profilo</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Il tuo nome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">L&apos;email non può essere modificata</p>
                </div>
                {profileError && <p className="text-red-500 text-sm">{profileError}</p>}
                {profileSuccess && <p className="text-green-500 text-sm">{profileSuccess}</p>}
                <Button type="submit" variant="gradient" disabled={profileLoading}>
                  {profileLoading ? "Salvataggio..." : "Salva modifiche"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "password" && (
          <Card>
            <CardHeader>
              <CardTitle>Cambia password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Password attuale</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nuova password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Minimo 6 caratteri</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Conferma nuova password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
                {passwordSuccess && <p className="text-green-500 text-sm">{passwordSuccess}</p>}
                <Button type="submit" variant="gradient" disabled={passwordLoading}>
                  {passwordLoading ? "Aggiornamento..." : "Aggiorna password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "security" && (
          <Card>
            <CardHeader>
              <CardTitle>Autenticazione a due fattori (2FA)</CardTitle>
              <CardDescription>
                Aggiungi un livello di sicurezza extra al tuo account. Quando attiva, ti verrà richiesto un codice OTP via email ogni volta che effettui il login.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 2FA Status Card */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    twoFAEnabled ? "bg-green-500/20" : "bg-muted"
                  )}>
                    <Shield className={cn("h-5 w-5", twoFAEnabled ? "text-green-500" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <p className="font-medium">2FA {twoFAEnabled ? "Attiva" : "Non attiva"}</p>
                    <p className="text-sm text-muted-foreground">
                      {twoFAEnabled
                        ? `Codici inviati a: ${user?.email}`
                        : "Proteggi il tuo account con la verifica in due passaggi"}
                    </p>
                  </div>
                </div>
                {!twoFAEnabled && (
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={handleEnable2FA}
                    disabled={securityLoading}
                  >
                    {securityLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Attiva"}
                  </Button>
                )}
              </div>

              {/* Come funziona */}
              {!twoFAEnabled && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-500">Come funziona</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ogni volta che effettui il login, riceverai un codice a 6 cifre via email.
                        Il codice è valido per 10 minuti e può essere usato una sola volta.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Disable 2FA */}
              {twoFAEnabled && !showDisableConfirm && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                  <div>
                    <p className="font-medium">Disattiva 2FA</p>
                    <p className="text-sm text-muted-foreground">Rimuovi il secondo fattore di autenticazione</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDisableConfirm(true)}
                  >
                    Disattiva
                  </Button>
                </div>
              )}

              {/* Disable confirmation */}
              {twoFAEnabled && showDisableConfirm && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 space-y-4">
                  <p className="font-medium text-red-500">Conferma disattivazione</p>
                  <p className="text-sm text-muted-foreground">
                    Inserisci la tua password per confermare la disattivazione del 2FA.
                    Il tuo account sarà meno protetto.
                  </p>
                  <Input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Password"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDisable2FA}
                      disabled={securityLoading}
                    >
                      {securityLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conferma disattivazione"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowDisableConfirm(false);
                        setDisablePassword("");
                        setSecurityError("");
                      }}
                    >
                      Annulla
                    </Button>
                  </div>
                </div>
              )}

              {securityError && <p className="text-red-500 text-sm">{securityError}</p>}
              {securitySuccess && <p className="text-green-500 text-sm">{securitySuccess}</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
