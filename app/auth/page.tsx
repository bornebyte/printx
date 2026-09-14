"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { Icon, Logo } from "../components/printx-ui";
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
      } else {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      }
      router.push(destination);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message.replace("Firebase: ", "") : "We could not complete that request. Please check your details and try again.");
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
      await signInWithPopup(firebaseAuth, googleProvider);
      router.push(destination);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message.replace("Firebase: ", "") : "Google sign-in was not completed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story"><div className="auth-story-top"><Link href="/"><Logo dark /></Link><Link href="/" className="back-home"><Icon name="arrow" size={15} /> Back to home</Link></div><div className="auth-story-content"><div className="eyebrow"><span className="eyebrow-line" /> WELCOME TO PRINTX</div><h1>A better way<br />to <em>get it done.</em></h1><p>One account for the prints you send, the locations you trust, and the work you keep moving.</p><div className="auth-story-graphic"><div className="story-sheet story-sheet-back" /><div className="story-sheet story-sheet-mid" /><div className="story-sheet story-sheet-front"><span>PRINTX</span><strong>A7K2</strong><small>READY TO COLLECT</small></div><span className="story-star">✦</span></div></div><div className="auth-story-footer"><span><Icon name="lock" size={14} /> Secure authentication with Firebase</span><span>© 2026 PrintX</span></div></section>
      <section className="auth-form-side"><div className="mobile-auth-logo"><Link href="/"><Logo /></Link></div><div className="auth-form-wrap"><div className="auth-header"><span className="auth-kicker">{mode === "register" ? "CREATE YOUR ACCOUNT" : "WELCOME BACK"}</span><h2>{mode === "register" ? "Start printing simply." : "Good to see you again."}</h2><p>{mode === "register" ? "Choose a workspace and get your first job moving." : "Sign in to continue to your PrintX workspace."}</p></div><div className="account-switcher"><button className={accountType === "personal" ? "selected" : ""} onClick={() => setAccountType("personal")}><span className="account-switch-icon"><Icon name="spark" size={16} /></span><span><strong>Personal</strong><small>Print for yourself</small></span></button><button className={accountType === "business" ? "selected" : ""} onClick={() => setAccountType("business")}><span className="account-switch-icon"><Icon name="printer" size={16} /></span><span><strong>Business</strong><small>Manage a location</small></span></button></div><button className="google-button" onClick={continueWithGoogle} disabled={loading}><span className="google-g">G</span>{loading ? "Connecting..." : "Continue with Google"}</button><div className="auth-divider"><span>or continue with email</span></div><form onSubmit={continueWithEmail}>{mode === "register" && <label className="auth-field"><span>Your name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Rivera" autoComplete="name" /></label>}<label className="auth-field"><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label><label className="auth-field"><span>Password</span><span className="password-wrap"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={6} required /><button type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? "Hide" : "Show"}</button></span></label>{mode === "signin" && <div className="auth-form-meta"><label><input type="checkbox" /> <span>Keep me signed in</span></label><button type="button">Forgot password?</button></div>}{error && <div className="auth-error" role="alert">{error}</div>}<button className="button auth-submit" type="submit" disabled={loading}>{loading ? "Please wait..." : mode === "register" ? "Create account" : "Sign in"}<Icon name="arrow" size={16} /></button></form><p className="auth-switch">{mode === "register" ? "Already have an account?" : "New to PrintX?"} <button onClick={() => { setError(""); setMode((current) => current === "register" ? "signin" : "register"); }}>{mode === "register" ? "Sign in" : "Create an account"}</button></p><p className="auth-legal">By continuing, you agree to our <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.</p>{!firebaseConfigured && <p className="firebase-note"><span /> Demo mode: add Firebase environment variables to activate sign-in.</p>}</div></section>
    </main>
  );
}

export default function AuthPage() {
  return <Suspense fallback={<main className="auth-loading">Loading PrintX...</main>}><AuthForm /></Suspense>;
}
