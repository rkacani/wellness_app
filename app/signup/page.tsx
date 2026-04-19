"use client";

import React, { useState } from "react";
import Link from "next/link";

type ErrorType = "error" | "success" | "info" | null;

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<ErrorType>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getErrorMessage = (code: string, defaultMsg: string): string => {
    const errorMap: Record<string, string> = {
      EMAIL_ALREADY_EXISTS: 'This email is already registered. Please log in instead.',
      INVALID_EMAIL: 'Please enter a valid email address.',
      WEAK_PASSWORD: 'Password must be at least 6 characters long.',
      PASSWORD_TOO_LONG: 'Password is too long.',
      INVALID_NAME: 'Name must be at least 2 characters.',
      MISSING_FIELDS: 'Please fill in all required fields.',
      SERVER_ERROR: 'Something went wrong. Please try again later.',
      SIGNUP_ERROR: 'Failed to create account. Please try again.',
    };
    return errorMap[code] || defaultMsg;
  };

  const validateForm = (): string | null => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      return 'Please fill in all fields';
    }
    if (name.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    if (!email.includes('@')) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const validationError = validateForm();
    if (validationError) {
      setMessage(validationError);
      setMessageType('error');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = getErrorMessage(data.code, data.error || "Signup failed");
        setMessage(errorMsg);
        setMessageType('error');
      } else {
        setMessage(
          data.message || 'Account created successfully! You can now log in.'
        );
        setMessageType('success');
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        // Optionally redirect after successful signup
        setTimeout(() => {
          // window.location.href = '/login';
        }, 2000);
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
        <h1 className="text-center mb-2">Create Account</h1>
        <p className="text-sm-muted text-center mb-6">Join our wellness community</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              placeholder="John Doe"
              className="form-input"
              required
              disabled={isLoading}
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
            <p className="text-xs text-sm-muted mt-1">At least 6 characters</p>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {isLoading ? 'Creating Account...' : 'Sign Up'}
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
          <p className="text-sm-muted mb-2">Already have an account?</p>
          <Link href="/login" className="link link-underline font-medium">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
