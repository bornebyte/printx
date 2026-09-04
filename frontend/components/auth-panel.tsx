"use client";

import Script from "next/script";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowUpRight, Check, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  saveAuthSession,
  signInWithFirebase,
  signInWithGoogle,
  signUpWithFirebase,
  type AuthSession,
} from "@/lib/firebase-auth";
import { saveProfile } from "@/lib/printx-api";

type AuthPanelProps = {
  onAuthenticated: (session: AuthSession) => void;
};

export function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<AuthSession["role"]>("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = mode === "signin" ? await signInWithFirebase(email, password, role) : await signUpWithFirebase(email, password, role);
      await saveProfile(session);
      saveAuthSession(session);
      onAuthenticated(session);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function continueWithGoogle() {
    setLoading(true);
    setError("");
    try {
      const session = await signInWithGoogle(role);
      await saveProfile(session);
      saveAuthSession(session);
      onAuthenticated(session);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#102f3d] px-5 py-10">
      <Script src="https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js" strategy="afterInteractive" />
      <Script src="https://www.gstatic.com/firebasejs/12.18.0/firebase-auth-compat.js" strategy="afterInteractive" onLoad={() => setFirebaseReady(true)} />
      <div className="w-full max-w-[440px]">
        <Link href="/" className="mx-auto mb-7 flex w-fit items-center gap-2.5 text-white"><span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#e2815f] shadow-[0_8px_20px_rgba(226,129,95,.2)]"><Printer size={18} /></span><span><span className="block text-[16px] font-bold tracking-[-.04em]">print<span className="text-[#f4a37f]">x</span></span><span className="block text-[8px] font-semibold uppercase tracking-[.18em] text-[#a3bbc1]">Global print network</span></span></Link>
        <Card className="border-white/10 bg-white shadow-[0_25px_70px_rgba(0,0,0,.2)]">
          <CardHeader className="p-6 pb-0"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f2f4] text-[#2b6b7d]"><ShieldCheck size={19} /></div><CardTitle className="mt-4 text-xl text-[#203b49]">{mode === "signin" ? "Welcome back" : "Create your PrintX account"}</CardTitle><CardDescription className="max-w-[340px] leading-5">Choose how you use PrintX, then sign in to manage your private printer list or printer shop.</CardDescription></CardHeader>
          <CardContent className="p-6 pt-5"><div className="grid grid-cols-2 gap-2 rounded-xl bg-[#f3f7f8] p-1"><button type="button" onClick={() => setRole("user")} className={`rounded-lg px-2 py-2.5 text-[11px] font-semibold transition ${role === "user" ? "bg-white text-[#2e6878] shadow-sm" : "text-[#81949c]"}`}>I need to print</button><button type="button" onClick={() => setRole("owner")} className={`rounded-lg px-2 py-2.5 text-[11px] font-semibold transition ${role === "owner" ? "bg-white text-[#2e6878] shadow-sm" : "text-[#81949c]"}`}>I run a printer shop</button></div><p className="mt-2 text-[10px] text-[#98a6ac]">{role === "user" ? "Find and send jobs to printer shops you trust." : "Register printers and manage the jobs sent to your shop."}</p><Button type="button" onClick={() => void continueWithGoogle()} disabled={loading || !firebaseReady} variant="outline" className="mt-5 flex h-11 w-full items-center justify-center gap-2 border-[#d8e2e5] bg-white text-xs font-semibold text-[#3c515c] hover:bg-[#f6f9fa]">{loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#b6c7cd] border-t-[#315b6b]" /> : <span className="text-base font-bold text-[#4285f4]">G</span>}{firebaseReady ? "Continue with Google" : "Loading Google sign-in…"}</Button><div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-[#e8edef]" /><span className="text-[10px] font-medium uppercase tracking-[.14em] text-[#a0acb2]">or with email</span><span className="h-px flex-1 bg-[#e8edef]" /></div><form onSubmit={submit}><label className="block"><span className="text-[10px] font-bold uppercase tracking-[.15em] text-[#83949d]">Email</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-2 h-11 w-full rounded-lg border border-[#dfe7eb] bg-[#fbfcfc] px-3.5 text-xs text-[#315667] outline-none focus:border-[#8eb0be]" /></label><label className="mt-3 block"><span className="text-[10px] font-bold uppercase tracking-[.15em] text-[#83949d]">Password</span><input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" className="mt-2 h-11 w-full rounded-lg border border-[#dfe7eb] bg-[#fbfcfc] px-3.5 text-xs text-[#315667] outline-none focus:border-[#8eb0be]" /></label>{error && <p className="mt-3 rounded-lg bg-[#fff3f0] px-3 py-2.5 text-[11px] leading-4 text-[#b35e51]">{error}</p>}<Button type="submit" disabled={loading || !email || !password} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg border-0 bg-[#1d4d63] text-xs font-semibold text-white transition hover:bg-[#153d50]">{loading ? "Connecting…" : mode === "signin" ? "Sign in" : "Create account"}<ArrowUpRight size={14} /></Button></form><button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }} className="mt-4 w-full text-center text-[11px] font-semibold text-[#3c7180] hover:underline">{mode === "signin" ? "New to PrintX? Create an account" : "Already have an account? Sign in"}</button><p className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-[#9aa9af]"><Check size={12} className="text-[#59a677]" /> Your printer list is private by default.</p></CardContent>
        </Card>
      </div>
    </main>
  );
}

export function AuthLoading() {
  return <main className="flex min-h-screen items-center justify-center bg-[#102f3d] text-white"><div className="flex items-center gap-3 text-sm"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Loading your PrintX workspace…</div></main>;
}
