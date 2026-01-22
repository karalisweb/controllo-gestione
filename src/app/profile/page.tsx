"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MobileHeader } from "@/components/MobileHeader";
import { Settings, User, Lock, Shield } from "lucide-react";
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

  // Security (predisposto)
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Caricamento...</div>
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
                  <Shield className={cn("h-5 w-5", twoFAEnabled ? "text-green-500" : "text-muted-foreground")} />
                  <div>
                    <p className="font-medium">2FA {twoFAEnabled ? "Attiva" : "Non attiva"}</p>
                    <p className="text-sm text-muted-foreground">
                      {twoFAEnabled
                        ? `Codici inviati a: ${user?.email}`
                        : "Proteggi il tuo account con la verifica in due passaggi"}
                    </p>
                  </div>
                </div>
                <Button
                  variant={twoFAEnabled ? "outline" : "gradient"}
                  size="sm"
                  disabled
                >
                  {twoFAEnabled ? "Attiva" : "Attiva"}
                </Button>
              </div>

              {/* Disable 2FA Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                <div>
                  <p className="font-medium">Disattiva 2FA</p>
                  <p className="text-sm text-muted-foreground">Rimuovi il secondo fattore di autenticazione</p>
                </div>
                <button
                  disabled
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    twoFAEnabled ? "bg-gradient-to-r from-orange-500 to-amber-400" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      twoFAEnabled ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* OTP Email */}
              <div>
                <label className="block text-sm font-medium mb-2">Email per codici OTP (opzionale)</label>
                <Input
                  type="email"
                  value={otpEmail}
                  onChange={(e) => setOtpEmail(e.target.value)}
                  placeholder={user?.email || ""}
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lascia vuoto per usare la tua email principale ({user?.email})
                </p>
              </div>

              <Button variant="gradient" disabled>
                Attiva 2FA
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Funzionalità in arrivo
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
