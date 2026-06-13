"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ErrorType = "error" | "success" | "info" | null;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [messageType, setMessageType] = React.useState<ErrorType>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showForgot, setShowForgot] = React.useState(false);
  const [forgotEmail, setForgotEmail] = React.useState("");
  const [forgotLoading, setForgotLoading] = React.useState(false);

  const getErrorMessage = (code: string, defaultMsg: string): string => {
    const errorMap: Record<string, string> = {
      INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
      EMAIL_NOT_CONFIRMED: 'Your email is not confirmed yet. Please check your email.',
      USER_NOT_FOUND: 'Email is not registered. Please create an account.',
      INVALID_PASSWORD: 'The password you entered is incorrect.',
      INVALID_EMAIL: 'Please enter a valid email address.',
      MISSING_FIELDS: 'Please fill in all required fields.',
      SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
    };
    return errorMap[code] || defaultMsg;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setForgotLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Failed to send reset email.");
        setMessageType("error");
      } else {
        setMessage("Check your inbox — we sent you a password reset link.");
        setMessageType("success");
        setShowForgot(false);
        setForgotEmail("");
      }
    } catch {
      setMessage("Network error. Please check your connection and try again.");
      setMessageType("error");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        setMessage('Please fill in all fields');
        setMessageType('error');
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = getErrorMessage(data.code, data.error || "Login failed");
        setMessage(errorMsg);
        setMessageType('error');
      } else {
        localStorage.setItem(
          "wellness-auth-user",
          JSON.stringify({
            id: data.userId,
            email: data.email || email.toLowerCase(),
          })
        );
        setMessage(`Welcome back! You're logged in as ${data.email}`);
        setMessageType('success');
        setEmail("");
        setPassword("");
        setTimeout(() => {
          router.push('/dashboard');
        }, 300);
      }
    } catch (err) {
      setMessage('Network error. Please check your connection and try again.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="card">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-500">Welcome back</p>
          <h1 className="mt-2 text-lg font-semibold sm:text-2xl">Sign in to your wellness account</h1>
          <p className="text-xs-muted mt-2">Continue your training plan in seconds</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              className="form-input"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <div className="flex items-center justify-between">
              <label className="form-label">Password</label>
              <button
                type="button"
                onClick={() => { setShowForgot(true); setMessage(null); }}
                className="text-xs text-sky-500 hover:underline focus:outline-none"
              >
                Forgot password?
              </button>
            </div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              className="form-input"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        {showForgot && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium mb-3">Reset your password</p>
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  className="form-input"
                  required
                  disabled={forgotLoading}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={forgotLoading} className="btn btn-primary flex-1">
                  {forgotLoading ? 'Sending…' : 'Send reset link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setForgotEmail(""); }}
                  className="btn flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {message && (
          <div className={`alert mt-4 ${
            messageType === 'error' ? 'alert-error' : messageType === 'success' ? 'alert-success' : 'alert-info'
          }`}>
            {message}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
          <p className="text-sm-muted mb-2">Don&apos;t have an account?</p>
          <Link href="/signup" className="link link-underline font-medium">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
