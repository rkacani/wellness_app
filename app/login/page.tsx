"use client";

import React, { useState } from "react";
import Link from "next/link";

type ErrorType = "error" | "success" | "info" | null;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<ErrorType>(null);
  const [isLoading, setIsLoading] = useState(false);

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
        setMessage(`Welcome back! You're logged in as ${data.email}`);
        setMessageType('success');
        setEmail("");
        setPassword("");
        // Optionally redirect after successful login
        setTimeout(() => {
          // window.location.href = '/dashboard';
        }, 1500);
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
        <h1 className="text-center mb-2">Welcome Back</h1>
        <p className="text-sm-muted text-center mb-6">Sign in to your wellness account</p>

        <form onSubmit={handleSubmit} className="space-y-5">
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
            <label className="form-label">Password</label>
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
