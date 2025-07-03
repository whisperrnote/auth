"use client";

import { useState } from "react";
import {
  User,
  Shield,
  Palette,
  Bell,
  Trash2,
  Download,
  Upload,
  LogOut,
  Key,
  Smartphone,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useTheme, useAuth } from "@/app/providers";
import clsx from "clsx";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dangerLoading, setDangerLoading] = useState(false);

  // Responsive: single column on mobile, two columns on desktop
  // Animate card appearance (fade-in)
  // Animate button presses (ripple/highlight)
  // Animate error/success messages (fade-in-out)

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage("");
    // Simulate save
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setMessage("Profile updated!");
    setTimeout(() => setMessage(""), 1500);
  };

  const handleExportData = () => {
    setMessage("Exporting data...");
    setTimeout(() => setMessage("Data exported!"), 1200);
    setTimeout(() => setMessage(""), 2000);
  };

  const handleDeleteAccount = () => {
    if (
      confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      setDangerLoading(true);
      setTimeout(() => {
        setDangerLoading(false);
        setMessage("Account deleted (simulated).");
      }, 1500);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[rgb(245,239,230)] flex flex-col items-center py-8 px-2 animate-fade-in">
      <div className="w-full max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-[rgb(141,103,72)] drop-shadow-sm">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Settings */}
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  value={profile.name}
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) =>
                    setProfile({ ...profile, email: e.target.value })
                  }
                  autoComplete="email"
                />
              </div>
              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className={clsx(
                  "transition-all duration-200",
                  saving && "opacity-70"
                )}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-primary rounded-full" />
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </Button>
              {message && (
                <div className="text-green-700 text-xs animate-fade-in-out">
                  {message}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="animate-fade-in-up" style={{ animationDelay: "60ms" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Key className="h-4 w-4" />
                Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Shield className="h-4 w-4" />
                Setup Two-Factor Authentication
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Smartphone className="h-4 w-4" />
                Manage Active Sessions
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <AlertTriangle className="h-4 w-4" />
                View Security Log
              </Button>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card className="animate-fade-in-up" style={{ animationDelay: "120ms" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("light")}
                    aria-pressed={theme === "light"}
                  >
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                    aria-pressed={theme === "dark"}
                  >
                    Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("system")}
                    aria-pressed={theme === "system"}
                  >
                    System
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="animate-fade-in-up" style={{ animationDelay: "180ms" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Security Alerts</div>
                  <div className="text-sm text-muted-foreground">
                    Get notified about suspicious activity
                  </div>
                </div>
                <Button variant="outline" size="sm" aria-pressed="true">
                  Enabled
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Login Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Notify me when someone logs into my account
                  </div>
                </div>
                <Button variant="outline" size="sm" aria-pressed="true">
                  Enabled
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card className="animate-fade-in-up" style={{ animationDelay: "240ms" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleExportData}
              >
                <Download className="h-4 w-4" />
                Export All Data
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Upload className="h-4 w-4" />
                Import Data
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card
            className={clsx(
              "border-destructive animate-fade-in-up",
              dangerLoading && "opacity-70"
            )}
            style={{ animationDelay: "300ms" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Delete Account</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={dangerLoading}
                  className="transition-all"
                >
                  {dangerLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-white rounded-full" />
                      Deleting...
                    </span>
                  ) : (
                    "Delete Account"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Logout button for mobile */}
        <div className="mt-8 flex justify-end md:hidden">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
