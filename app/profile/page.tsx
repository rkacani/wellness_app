"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type MessageType = "error" | "success" | null;

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);

  const [profileMessage, setProfileMessage] = React.useState<string | null>(null);
  const [profileMessageType, setProfileMessageType] = React.useState<MessageType>(null);
  const [profileSaving, setProfileSaving] = React.useState(false);

  const [resetMessage, setResetMessage] = React.useState<string | null>(null);
  const [resetMessageType, setResetMessageType] = React.useState<MessageType>(null);
  const [resetLoading, setResetLoading] = React.useState(false);

  React.useEffect(() => {
    const raw = localStorage.getItem("wellness-auth-user");
    if (!raw) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.id) {
      router.push("/login");
      return;
    }
    setUserId(parsed.id);

    fetch(`/api/profile?userId=${encodeURIComponent(parsed.id)}`)
      .then((r) => r.json())
      .then((data) => {
        setName(data.name ?? "");
        setEmail(data.email ?? "");
      })
      .catch(() => {
        setName(parsed.name ?? "");
        setEmail(parsed.email ?? "");
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);

    if (!name.trim() || name.trim().length < 2) {
      setProfileMessage("Name must be at least 2 characters.");
      setProfileMessageType("error");
      return;
    }

    setProfileSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, name, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setProfileMessage(data.error || "Failed to update profile.");
        setProfileMessageType("error");
      } else {
        // Keep localStorage in sync
        const raw = localStorage.getItem("wellness-auth-user");
        if (raw) {
          const parsed = JSON.parse(raw);
          localStorage.setItem(
            "wellness-auth-user",
            JSON.stringify({ ...parsed, email: data.email, name: data.name })
          );
        }
        setProfileMessage("Profile updated successfully.");
        setProfileMessageType("success");
      }
    } catch {
      setProfileMessage("Network error. Please try again.");
      setProfileMessageType("error");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSendPasswordReset = async () => {
    setResetMessage(null);
    setResetLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResetMessage(data.error || "Failed to send reset email.");
        setResetMessageType("error");
      } else {
        setResetMessage("Check your inbox — we sent you a password reset link.");
        setResetMessageType("success");
      }
    } catch {
      setResetMessage("Network error. Please try again.");
      setResetMessageType("error");
    } finally {
      setResetLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app-shell">
        <div className="card text-center">
          <p>Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="card" style={{ maxWidth: "32rem" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-500">Account</p>
            <h1 className="mt-1 text-lg font-semibold sm:text-2xl">Edit Profile</h1>
          </div>
          <Link href="/dashboard" className="btn btn-secondary text-xs">
            ← Dashboard
          </Link>
        </div>

        {/* Profile section */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              placeholder="Your name"
              className="form-input"
              required
              minLength={2}
              disabled={profileSaving}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              className="form-input"
              required
              disabled={profileSaving}
            />
          </div>

          <button type="submit" disabled={profileSaving} className="btn btn-primary">
            {profileSaving ? "Saving…" : "Save Changes"}
          </button>
        </form>

        {profileMessage && (
          <div className={`alert mt-4 ${profileMessageType === "error" ? "alert-error" : "alert-success"}`}>
            {profileMessage}
          </div>
        )}

        {/* Password section */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold mb-1">Password</h2>
          <p className="text-xs-muted mb-3">
            We&apos;ll send a reset link to <span className="font-medium">{email}</span>.
          </p>
          <button
            type="button"
            onClick={handleSendPasswordReset}
            disabled={resetLoading}
            className="btn btn-secondary w-auto"
          >
            {resetLoading ? "Sending…" : "Send password reset email"}
          </button>

          {resetMessage && (
            <div className={`alert mt-4 ${resetMessageType === "error" ? "alert-error" : "alert-success"}`}>
              {resetMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
