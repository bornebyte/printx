"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, type User } from "firebase/auth";
import { Icon, Logo } from "../components/printx-ui";
import { AppError, isErrorCode, reportClientError, requestId } from "../lib/errors";
import { firebaseAuth, firebaseConfigured, googleProvider } from "../lib/firebase";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState(searchParams.get("mode") === "register" ? "register" : "signin");
  const [accountType, setAccountType] = useState(searchParams.get("account") === "business" ? "business" : "personal");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const destination = accountType === "business" ? "/dashboard/business" : "/dashboard/personal";

  async function syncProfile(user: User): Promise<void> {
    const token = await user.getIdToken(true);
    const response = await fetch("/api/profile/sync", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ accountType, name: name.trim() || user.displayName || undefined }) });
    const payload = await response.json() as { message?: string; errorCode?: string; requestId?: string };
    if (!response.ok) {
      const code = isErrorCode(payload.errorCode) ? payload.errorCode : "API_REQUEST_FAILED";
      throw new AppError(code, payload.message ?? "Your profile could not be synchronized.", response.status, { requestId: payload.requestId });
    }
  }

  async function continueWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!firebaseAuth) {
      setError("Firebase is not configured yet. Add the NEXT_PUBLIC_FIREBASE values to your environment to enable authentication.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "register") {
        const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
        await syncProfile(credential.user);
      } else {
        const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        await syncProfile(credential.user);
      }
      router.push(destination);
    } catch (authError) {
      if (authError instanceof AppError && authError.code === "AUTH_REQUIRED") await signOut(firebaseAuth);
      setError(formatAuthError(authError, "AUTHENTICATION_FAILED", "We could not complete that request. Please check your details and try again."));
    } finally {
      setLoading(false);
    }
  }

  async function continueWithGoogle() {
    setError("");
    if (!firebaseAuth) {
      setError("Firebase is not configured yet. Add the NEXT_PUBLIC_FIREBASE values to your environment to enable authentication.");
      return;
    }
    setLoading(true);
    try {
      const credential = await signInWithPopup(firebaseAuth, googleProvider);
      await syncProfile(credential.user);
      router.push(destination);
    } catch (authError) {
      if (authError instanceof AppError && authError.code === "AUTH_REQUIRED") await signOut(firebaseAuth);
      setError(formatAuthError(authError, "AUTHENTICATION_FAILED", "Google sign-in was not completed."));
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setError("");
    if (!firebaseAuth) {
      setError("FIREBASE_NOT_CONFIGURED · Add the public Firebase environment variables before resetting a password.");
      return;
    }
    if (!email.trim()) {
      setError("PASSWORD_RESET_FAILED · Enter your email address first.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
      setError("Password reset email sent. Check your inbox to continue.");
    } catch (resetError) {
      setError(formatAuthError(resetError, "PASSWORD_RESET_FAILED", "We could not send a password reset email."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story"><div className="auth-story-top"><Link href="/"><Logo dark /></Link><Link href="/" className="back-home"><Icon name="arrow" size={15} /> Back to home</Link></div><div className="auth-story-content"><div className="eyebrow"><span className="eyebrow-line" /> WELCOME TO PRINTX</div><h1>A better way<br />to <em>get it done.</em></h1><p>One account for the prints you send, the locations you trust, and the work you keep moving.</p><div className="auth-story-graphic"><div className="story-sheet story-sheet-back" /><div className="story-sheet story-sheet-mid" /><div className="story-sheet story-sheet-front"><span>PRINTX</span><strong>A7K2</strong><small>READY TO COLLECT</small></div><span className="story-star">✦</span></div></div><div className="auth-story-footer"><span><Icon name="lock" size={14} /> Secure authentication with Firebase</span><span>© 2026 PrintX</span></div></section>
      <section className="auth-form-side"><div className="mobile-auth-logo"><Link href="/"><Logo /></Link></div><div className="auth-form-wrap"><div className="auth-header"><span className="auth-kicker">{mode === "register" ? "CREATE YOUR ACCOUNT" : "WELCOME BACK"}</span><h2>{mode === "register" ? "Start printing simply." : "Good to see you again."}</h2><p>{mode === "register" ? "Choose a workspace and get your first job moving." : "Sign in to continue to your PrintX workspace."}</p></div><div className="account-switcher"><button className={accountType === "personal" ? "selected" : ""} onClick={() => setAccountType("personal")}><span className="account-switch-icon"><Icon name="spark" size={16} /></span><span><strong>Personal</strong><small>Print for yourself</small></span></button><button className={accountType === "business" ? "selected" : ""} onClick={() => setAccountType("business")}><span className="account-switch-icon"><Icon name="printer" size={16} /></span><span><strong>Business</strong><small>Manage a location</small></span></button></div><button className="google-button" onClick={continueWithGoogle} disabled={loading}><span className="google-g">G</span>{loading ? "Connecting..." : "Continue with Google"}</button><div className="auth-divider"><span>or continue with email</span></div><form onSubmit={continueWithEmail}>{mode === "register" && <label className="auth-field"><span>Your name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Rivera" autoComplete="name" /></label>}<label className="auth-field"><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label><label className="auth-field"><span>Password</span><span className="password-wrap"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 8 : 6} required /><button type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? "Hide" : "Show"}</button></span></label>{mode === "signin" && <div className="auth-form-meta"><label><input type="checkbox" /> <span>Keep me signed in</span></label><button type="button" onClick={() => void resetPassword()}>Forgot password?</button></div>}{error && <div className="auth-error" role="alert">{error}</div>}<button className="button auth-submit" type="submit" disabled={loading}>{loading ? "Please wait..." : mode === "register" ? "Create account" : "Sign in"}<Icon name="arrow" size={16} /></button></form><p className="auth-switch">{mode === "register" ? "Already have an account?" : "New to PrintX?"} <button onClick={() => { setError(""); setMode((current) => current === "register" ? "signin" : "register"); }}>{mode === "register" ? "Sign in" : "Create an account"}</button></p><p className="auth-legal">By continuing, you agree to our <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.</p>{!firebaseConfigured && <p className="firebase-note"><span /> Demo mode: add Firebase environment variables to activate sign-in.</p>}</div></section>
    </main>
  );
}

function formatAuthError(error: unknown, code: "AUTHENTICATION_FAILED" | "PASSWORD_RESET_FAILED", fallback: string): string {
  const message = error instanceof Error ? error.message.replace("Firebase: ", "") : fallback;
  const errorCode = error instanceof AppError ? error.code : code;
  const serverRequestId = error instanceof AppError && typeof error.details?.requestId === "string" ? error.details.requestId : undefined;
  const id = serverRequestId ?? requestId();
  const reportable = error instanceof AppError ? error : new AppError(errorCode, message, 401);
  void reportClientError(reportable, { route: "/auth", provider: "firebase", requestId: id });
  return `${errorCode} · ${id} — ${message}`;
}

export default function AuthPage() {
  return <Suspense fallback={<main className="auth-loading">Loading PrintX...</main>}><AuthForm /></Suspense>;
}
