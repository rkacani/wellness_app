"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type MessageType = "error" | "success" | null;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [messageType, setMessageType] = React.useState<MessageType>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [sessionReady, setSessionReady] = React.useState(false);

  React.useEffect(() => {
    // Supabase puts the access_token in the URL hash when the user clicks the reset link.
    // Calling getSession() after the client processes the hash sets up the session.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true);
      } else {
        setMessage("This link is invalid or has expired. Please request a new one.");
        setMessageType("error");
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      setMessageType("error");
      return;
    }

    if (password !== confirm) {
      setMessage("Passwords do not match.");
      setMessageType("error");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message || "Failed to update password. Please try again.");
      setMessageType("error");
    } else {
      setMessage("Your password has been updated. Redirecting to login…");
      setMessageType("success");
      setTimeout(() => router.push("/login"), 2000);
    }

    setIsLoading(false);
  };

  return (
    <div className="app-shell">
      <div className="card">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-500">Account recovery</p>
          <h1 className="mt-2 text-lg font-semibold sm:text-2xl">Set a new password</h1>
          <p className="text-xs-muted mt-2">Choose a strong password for your account</p>
        </div>

        {sessionReady ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                className="form-input"
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type="password"
                placeholder="••••••••"
                className="form-input"
                required
                disabled={isLoading}
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn btn-primary">
              {isLoading ? "Updating…" : "Update Password"}
            </button>
          </form>
        ) : null}

        {message && (
          <div className={`alert mt-4 ${messageType === "error" ? "alert-error" : "alert-success"}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
