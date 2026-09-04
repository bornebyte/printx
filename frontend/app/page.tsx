"use client";

import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  Globe2,
  HelpCircle,
  Layers,
  LogOut,
  MapPin,
  Menu,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthLoading, AuthPanel } from "@/components/auth-panel";
import { OwnerDashboard } from "@/components/owner-dashboard";
import {
  clearAuthSession,
  getStoredAuthSession,
  type AuthSession,
} from "@/lib/firebase-auth";
import { notifyPrintJob, requestPrintNotifications } from "@/lib/browser-notifications";
import { addSavedPrinter, createPrintJob, getSavedPrinters, removeSavedPrinter } from "@/lib/printx-api";

type PrinterStatus = "Available" | "Busy";

type PrinterShop = {
  id: string;
  code: string;
  name: string;
  owner: string;
  address: string;
  status: PrinterStatus;
  eta: string;
  price: string;
  currency: string;
  rating: string;
  type: string;
  color: boolean;
  pages: string;
  initials: string;
  accent: string;
};

const statusStyles: Record<PrinterStatus, string> = {
  Available: "bg-[#e9f8ef] text-[#25824d]",
  Busy: "bg-[#fff4df] text-[#a76b00]",
};

export function WorkspaceDashboard() {
  const [activeNav, setActiveNav] = useState("My printers");
  const [linkedPrinters, setLinkedPrinters] = useState<PrinterShop[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState("");
  const [search, setSearch] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [documentData, setDocumentData] = useState<{ base64: string; contentType: string; size: number } | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [copies, setCopies] = useState(1);
  const [doubleSided, setDoubleSided] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobSubmitted, setJobSubmitted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [apiError, setApiError] = useState("");
  const [isAddLoading, setIsAddLoading] = useState(false);

  useEffect(() => {
    const storedSession = getStoredAuthSession();
    const restoreTimer = window.setTimeout(() => {
      setAuthSession(storedSession);
      setAuthReady(true);
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!authSession || authSession.role !== "user") return;
    void getSavedPrinters(authSession)
      .then((printers) => {
        setLinkedPrinters(printers);
        setSelectedPrinterId((current) => current || printers[0]?.id || "");
      })
      .catch((error) => setApiError(error instanceof Error ? error.message : "Could not load your printers."));
  }, [authSession]);

  const selectedPrinter = linkedPrinters.find((printer) => printer.id === selectedPrinterId);
  const visiblePrinters = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return linkedPrinters;
    return linkedPrinters.filter((printer) =>
      [printer.code, printer.name, printer.owner, printer.address].some((value) => value.toLowerCase().includes(query)),
    );
  }, [linkedPrinters, search]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setDocumentData(null);
      setJobSubmitted(false);
      if (file.size > 25 * 1024 * 1024) {
        setApiError("Choose a document smaller than 25 MB.");
        return;
      }
      setDocumentLoading(true);
      try {
        setDocumentData({ base64: await fileToBase64(file), contentType: file.type || "application/octet-stream", size: file.size });
        setApiError("");
      } catch {
        setApiError("This document could not be prepared for secure delivery.");
      } finally {
        setDocumentLoading(false);
      }
    }
  }

  async function addPrinter() {
    const normalizedCode = code.trim().toUpperCase();
    if (linkedPrinters.some((item) => item.code === normalizedCode)) {
      setCodeError("This printer shop is already in your list.");
      return;
    }
    if (!authSession) return;
    setIsAddLoading(true);
    try {
      const savedPrinter = await addSavedPrinter(authSession, normalizedCode);
      setLinkedPrinters((current) => [...current, savedPrinter]);
      setSelectedPrinterId(savedPrinter.id);
      setCode("");
      setCodeError("");
      setIsAddModalOpen(false);
    } catch (error) {
      setCodeError(error instanceof Error ? error.message : "Could not find or add this printer.");
    } finally {
      setIsAddLoading(false);
    }
  }

  async function removePrinter(id: string) {
    if (!authSession) return;
    try {
      await removeSavedPrinter(authSession, id);
      setLinkedPrinters((current) => current.filter((printer) => printer.id !== id));
      if (selectedPrinterId === id) setSelectedPrinterId("");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Could not remove this printer.");
    }
  }

  async function submitJob() {
    if (!authSession || !selectedPrinter || !fileName || !documentData || documentLoading) return;
    void requestPrintNotifications();
    setIsSubmitting(true);
    setApiError("");
    try {
      const job = await createPrintJob(authSession, {
        printerId: selectedPrinter.id,
        fileName,
        copies,
        doubleSided,
        document: documentData,
      });
      setIsSubmitting(false);
      setJobSubmitted(true);
      notifyPrintJob(selectedPrinter.name, selectedPrinter.code);
      if (authSession.email) {
        await fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: authSession.email,
            subject: `PrintX job ${job.id.slice(0, 8)} sent to ${selectedPrinter.name}`,
            text: `${fileName} is queued at ${selectedPrinter.name} (${selectedPrinter.code}).`,
          }),
        }).catch(() => undefined);
      }
    } catch (error) {
      setIsSubmitting(false);
      setApiError(error instanceof Error ? error.message : "Could not send this print job.");
    }
  }

  if (!authReady) return <AuthLoading />;
  if (!authSession) return <AuthPanel onAuthenticated={(session) => { setLinkedPrinters([]); setSelectedPrinterId(""); setAuthSession(session); }} />;
  if (authSession.role === "owner") return <OwnerDashboard session={authSession} onSignOut={() => { setLinkedPrinters([]); setSelectedPrinterId(""); setAuthSession(null); }} />;

  return (
    <main className="min-h-screen bg-[#f8fafb] text-[#16232e]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-[#e5eaee] bg-[#fbfcfd] lg:flex">
        <Brand />
        <div className="px-4 pt-8">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#93a0ab]">Workspace</p>
          <nav className="mt-3 space-y-1" aria-label="Primary navigation">
            {[
              { label: "Overview", icon: Layers },
              { label: "My printers", icon: Printer },
              { label: "My print jobs", icon: FileText, count: "0" },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.label;
              return (
                <button key={item.label} onClick={() => setActiveNav(item.label)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${isActive ? "bg-[#e9f0f5] text-[#18394d]" : "text-[#71808c] hover:bg-[#f0f4f6] hover:text-[#263946]"}`}>
                  <Icon size={17} strokeWidth={isActive ? 2.3 : 1.8} />
                  <span className="flex-1">{item.label}</span>
                  {item.count && <span className="rounded-full bg-[#e9eef1] px-2 py-0.5 text-[10px] text-[#768992]">{item.count}</span>}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="mx-4 mt-auto mb-5 border-t border-[#e5eaee] pt-5">
          <nav className="space-y-1" aria-label="Secondary navigation">
            <SidebarLink icon={Settings2} label="Settings" />
            <SidebarLink icon={HelpCircle} label="Help center" />
          </nav>
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-white p-2.5 ring-1 ring-[#e7ecef]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#cfe5ea] text-[11px] font-bold text-[#28576a]">AR</div>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[#293a45]">Alex Rivera</p><p className="truncate text-[10px] text-[#91a0aa]">Personal workspace</p></div>
            <MoreHorizontal size={16} className="text-[#9aa7b0]" />
          </div>
        </div>
      </aside>

      <div className="lg:pl-[252px]">
        <header className="flex h-[72px] items-center justify-between border-b border-[#e5eaee] bg-[#fbfcfd] px-5 sm:px-8">
          <button className="rounded-lg p-2 text-[#60727e] hover:bg-[#edf2f4] lg:hidden" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
          <div className="hidden items-center gap-2 text-xs text-[#94a1aa] sm:flex"><span>Workspace</span><ChevronRight size={14} /><span className="font-medium text-[#3a4b57]">{activeNav}</span></div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button className="hidden items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-[#667782] hover:bg-[#edf2f4] sm:flex"><Globe2 size={15} /> Global network <ChevronDown size={13} /></button>
            <button className="relative rounded-lg p-2 text-[#6e808b] hover:bg-[#edf2f4]" aria-label="Notifications"><Bell size={18} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#e2815f] ring-2 ring-[#fbfcfd]" /></button>
            <button onClick={() => { clearAuthSession(); setAuthSession(null); setLinkedPrinters([]); setSelectedPrinterId(""); }} className="hidden items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-[#667782] hover:bg-[#edf2f4] sm:flex"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#cfe5ea] text-[10px] font-bold text-[#28576a]">{authSession.email.slice(0, 2).toUpperCase()}</span><span className="max-w-[120px] truncate">{authSession.email}</span><LogOut size={14} /></button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#cfe5ea] text-[11px] font-bold text-[#28576a] sm:hidden">{authSession.email.slice(0, 2).toUpperCase()}</div>
          </div>
        </header>

        <section className="mx-auto max-w-[1220px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#edf4f7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#4a7588]"><Sparkles size={11} /> Private printer list</div>
              <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-[#162a37] sm:text-[32px]">Your printers</h1>
              <p className="mt-2 max-w-[560px] text-[13px] leading-6 text-[#7b8992]">Add a printer shop with its unique code. Your saved printers will appear here whenever you need to print.</p>
            </div>
            <button onClick={() => { setIsAddModalOpen(true); setCodeError(""); }} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-[#1d4d63] px-4 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(29,77,99,0.16)] transition hover:bg-[#153d50] md:self-auto"><Plus size={16} /> Add printer code</button>
          </div>

          <div className="mt-7 rounded-xl border border-[#e0e8eb] bg-white shadow-[0_7px_24px_rgba(33,57,70,0.04)]">
            <div className="flex flex-col justify-between gap-3 border-b border-[#edf1f3] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
              <div><p className="text-sm font-semibold text-[#263b47]">Saved printer shops</p><p className="mt-0.5 text-[11px] text-[#94a1aa]">Only you can see and manage this list.</p></div>
              {linkedPrinters.length > 0 && <label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa9b1]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your printers" className="h-9 w-full rounded-lg border border-[#e3eaed] pl-9 pr-3 text-xs outline-none placeholder:text-[#a5b0b6] focus:border-[#9bbbc4] sm:w-[210px]" /></label>}
            </div>

            {apiError && <div className="mx-5 mt-4 rounded-lg bg-[#fff3f0] px-3 py-2.5 text-[11px] text-[#b35e51] sm:mx-6">{apiError}</div>}
            {linkedPrinters.length === 0 ? <EmptyPrinterState onAdd={() => setIsAddModalOpen(true)} /> : <div className="divide-y divide-[#edf1f3]">{visiblePrinters.map((printer) => <SavedPrinterRow key={printer.id} printer={printer} selected={printer.id === selectedPrinterId} onSelect={() => { setSelectedPrinterId(printer.id); setJobSubmitted(false); }} onRemove={() => removePrinter(printer.id)} />)}{visiblePrinters.length === 0 && <div className="px-6 py-10 text-center text-xs text-[#8999a2]">No saved printer matches “{search}”.</div>}</div>}
          </div>

          <section className="mt-7 rounded-xl border border-[#e0e8eb] bg-white shadow-[0_7px_24px_rgba(33,57,70,0.04)]">
            <div className="flex flex-col justify-between gap-3 border-b border-[#edf1f3] px-5 py-4 sm:flex-row sm:items-center sm:px-6"><div><p className="text-sm font-semibold text-[#263b47]">Send a print job</p><p className="mt-0.5 text-[11px] text-[#94a1aa]">Choose one of your saved printer codes, then upload your document.</p></div><div className="flex items-center gap-1.5 text-[10px] text-[#7e9099]"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e5f1f3] text-[#27657a]">1</span> Select <ChevronRight size={12} /><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e5f1f3] text-[#27657a]">2</span> Upload <ChevronRight size={12} /><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e5f1f3] text-[#27657a]">3</span> Send</div></div>
            {linkedPrinters.length === 0 ? <PrintJobEmptyState onAdd={() => setIsAddModalOpen(true)} /> : <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10"><div><p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.13em] text-[#8a99a2]">Printer code</p><div className="relative"><select value={selectedPrinterId} onChange={(event) => { setSelectedPrinterId(event.target.value); setJobSubmitted(false); }} className="h-12 w-full appearance-none rounded-lg border border-[#dfe7eb] bg-[#fbfcfc] px-3.5 pr-10 text-xs font-semibold text-[#34515e] outline-none focus:border-[#8eb0be]">{linkedPrinters.map((printer) => <option key={printer.id} value={printer.id}>{printer.code} · {printer.name}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8399a2]" /></div>{selectedPrinter && <Card className="mt-3 border-0 bg-[#f3f8f9] shadow-none"><CardContent className="p-3.5"><div className="flex items-start gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold ${accentClass(selectedPrinter.accent)}`}>{selectedPrinter.initials}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-xs font-semibold text-[#36515d]">{selectedPrinter.name}</p><span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${statusStyles[selectedPrinter.status]}`}>{selectedPrinter.status}</span></div><p className="mt-1 text-[10px] text-[#81949d]">{selectedPrinter.owner} · {selectedPrinter.address}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#708790]"><span className="flex items-center gap-1"><MapPin size={11} /> {selectedPrinter.address.split(",")[0]}</span><span className="flex items-center gap-1"><Wifi size={11} /> {selectedPrinter.type}</span><span className="flex items-center gap-1"><span className="text-[#e1a13e]">★</span> {selectedPrinter.rating}</span></div></div></div></CardContent></Card>}</div><div><p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.13em] text-[#8a99a2]">Document & settings</p><label className={`group flex min-h-[105px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed ${fileName ? "border-[#9cc1c9] bg-[#f3fafb]" : "border-[#cfdde2] bg-[#fbfcfc] hover:border-[#99bac5] hover:bg-[#f7fbfc]"} px-5 text-center transition`}><input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="sr-only" onChange={handleFileChange} />{fileName ? <><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9eef0] text-[#2a7180]"><Check size={15} /></div><p className="mt-2 max-w-full truncate text-xs font-semibold text-[#315b68]">{fileName}</p><p className="mt-1 text-[10px] text-[#88a0a8]">Click to replace</p></> : <><UploadCloud size={23} className="text-[#6e9baa]" strokeWidth={1.6} /><p className="mt-2 text-xs font-semibold text-[#4b6672]">Drop your file here, or <span className="text-[#2a7180]">browse</span></p><p className="mt-1 text-[10px] text-[#9ba8af]">PDF, DOCX, JPG or PNG up to 25 MB</p></>}</label><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="text-[10px] text-[#95a2a9]">Copies</span><button onClick={() => setCopies(Math.max(1, copies - 1))} className="flex h-6 w-6 items-center justify-center rounded-md border border-[#e2e9eb] text-sm text-[#5f7b87]">−</button><span className="w-4 text-center text-xs font-semibold text-[#3b515d]">{copies}</span><button onClick={() => setCopies(copies + 1)} className="flex h-6 w-6 items-center justify-center rounded-md border border-[#e2e9eb] text-sm text-[#5f7b87]">+</button><button onClick={() => setDoubleSided(!doubleSided)} className={`ml-1 rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${doubleSided ? "bg-[#e7f3f5] text-[#347080]" : "bg-[#f0f3f4] text-[#809099]"}`}>{doubleSided ? "Double-sided" : "Single-sided"}</button></div><button onClick={submitJob} disabled={!fileName || !selectedPrinter || isSubmitting || jobSubmitted} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#e2815f] px-5 text-xs font-semibold text-white shadow-[0_6px_15px_rgba(226,129,95,0.18)] transition hover:bg-[#d97453] disabled:cursor-not-allowed disabled:bg-[#b9c3c7] disabled:shadow-none">{jobSubmitted ? <><Check size={15} /> Job sent</> : isSubmitting ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Sending…</> : <><Zap size={14} fill="currentColor" /> Send to {selectedPrinter?.code ?? "printer"}</>}</button></div>{selectedPrinter && <p className="mt-3 text-[11px] text-[#84949c]">Estimated total <span className="font-semibold text-[#315667]">{selectedPrinter.price.split(" ")[0]} × {copies}</span> · {selectedPrinter.pages} · {selectedPrinter.color ? "Color available" : "Black & white only"}</p>}</div></div>}
            {jobSubmitted && <div className="flex items-center gap-2 border-t border-[#edf1f3] bg-[#f1faf5] px-5 py-3 text-[11px] text-[#3b7e5a] sm:px-6"><Check size={14} /> Your job is queued at {selectedPrinter?.name}. You can track it in <button onClick={() => setActiveNav("My print jobs")} className="font-semibold underline underline-offset-2">My print jobs</button>.</div>}
          </section>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#d8e6ea] bg-[#eef7f8] p-4"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#2e7182] shadow-sm"><ShieldCheck size={17} /></div><div><p className="text-xs font-semibold text-[#2c5362]">Your printer codes are private to your account</p><p className="mt-1 text-[11px] leading-5 text-[#70909b]">Files are encrypted in transit and automatically removed after your print is complete. Only printers you add can appear in your send flow.</p></div></div>
        </section>
      </div>

      {mobileMenuOpen && <div className="fixed inset-0 z-40 bg-[#18313d]/25 lg:hidden" onClick={() => setMobileMenuOpen(false)}><aside className="h-full w-[260px] bg-[#fbfcfd] p-4 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><Brand /><button className="rounded-lg p-2 text-[#60727e] hover:bg-[#edf2f4]" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu"><X size={18} /></button></div><div className="mt-8 space-y-1">{["Overview", "My printers", "My print jobs"].map((label) => <button key={label} onClick={() => { setActiveNav(label); setMobileMenuOpen(false); }} className={`block w-full rounded-xl px-3 py-3 text-left text-sm font-medium ${activeNav === label ? "bg-[#e9f0f5] text-[#18394d]" : "text-[#71808c]"}`}>{label}</button>)}</div></aside></div>}

      {isAddModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18313d]/35 px-5" onClick={() => setIsAddModalOpen(false)}><div className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-[0_20px_60px_rgba(20,47,60,0.22)]" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f2f4] text-[#2b6b7d]"><Printer size={19} /></div><h2 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-[#203b49]">Add a printer shop</h2><p className="mt-1.5 text-xs leading-5 text-[#84949c]">Enter the unique code shown by the printer owner or shop.</p></div><button className="rounded-lg p-2 text-[#8da0a9] hover:bg-[#f1f5f6]" onClick={() => setIsAddModalOpen(false)} aria-label="Close dialog"><X size={18} /></button></div><label className="mt-6 block"><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#83949d]">Printer code</span><div className="relative mt-2"><input autoFocus value={code} onChange={(event) => { setCode(event.target.value); setCodeError(""); }} onKeyDown={(event) => { if (event.key === "Enter") void addPrinter(); }} placeholder="e.g. PX-4812" className={`h-12 w-full rounded-lg border bg-[#fbfcfc] px-3.5 pr-20 text-sm font-semibold tracking-[0.08em] text-[#315667] outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-[#a8b3b8] ${codeError ? "border-[#d58a7d]" : "border-[#dfe7eb] focus:border-[#8eb0be]"}`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[#a0adb3]">4–8 chars</span></div></label>{codeError ? <p className="mt-2 text-[11px] text-[#b35e51]">{codeError}</p> : <p className="mt-2 text-[11px] text-[#99a7ad]">Ask the printer owner for their code. It starts with PX-.</p>}<Button onClick={() => void addPrinter()} disabled={isAddLoading} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg border-0 bg-[#1d4d63] text-xs font-semibold text-white transition hover:bg-[#153d50]">{isAddLoading ? "Adding printer…" : "Find and add printer"} {!isAddLoading && <ArrowUpRight size={15} />}</Button><div className="mt-4 flex items-center gap-2 rounded-lg bg-[#f5f8f9] px-3 py-2.5 text-[10px] leading-4 text-[#81949d]"><Search size={14} className="shrink-0 text-[#6d96a1]" /> Demo codes: <span className="font-semibold text-[#557582]">PX-4812</span>, <span className="font-semibold text-[#557582]">PX-7390</span>, <span className="font-semibold text-[#557582]">PX-1055</span></div></div></div>}
    </main>
  );
}

function Brand() {
  return <div className="flex items-center gap-2.5 px-3"><div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#1d4d63] text-white shadow-[0_5px_12px_rgba(29,77,99,0.16)]"><Printer size={17} strokeWidth={2.2} /></div><div><p className="text-[15px] font-bold tracking-[-0.035em] text-[#1c3948]">print<span className="text-[#e2815f]">x</span></p><p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#9ba8ae]">Global print network</p></div></div>;
}

function SidebarLink({ icon: Icon, label }: { icon: typeof Settings2; label: string }) {
  return <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#71808c] transition hover:bg-[#f0f4f6] hover:text-[#263946]"><Icon size={17} strokeWidth={1.8} />{label}</button>;
}

function EmptyPrinterState({ onAdd }: { onAdd: () => void }) {
  return <div className="px-6 py-12 text-center sm:py-16"><div className="relative mx-auto flex h-[74px] w-[74px] items-center justify-center rounded-[22px] bg-[#eef6f7] text-[#528594]"><Printer size={31} strokeWidth={1.4} /><span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#e2815f] text-white shadow-sm"><Plus size={14} /></span></div><h2 className="mt-5 text-base font-semibold tracking-[-0.02em] text-[#304a56]">Your printer list is empty</h2><p className="mx-auto mt-2 max-w-[380px] text-xs leading-5 text-[#8b9aa2]">Add a shop code to save its printer details and make it available in your print flow.</p><button onClick={onAdd} className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-[#b6cfd6] bg-white px-3.5 text-xs font-semibold text-[#2e697a] transition hover:bg-[#eef7f8]"><Plus size={14} /> Add your first printer</button></div>;
}

function PrintJobEmptyState({ onAdd }: { onAdd: () => void }) {
  return <div className="grid items-center gap-6 px-5 py-8 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-10 lg:py-10"><div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f6f7] text-[#93a5ac]"><FileText size={20} /></div><h2 className="mt-4 text-base font-semibold text-[#405460]">Add a printer before you upload</h2><p className="mt-2 max-w-[430px] text-xs leading-5 text-[#8b9aa2]">Your printer code unlocks the shop’s location, availability, print capabilities, and pricing for this job.</p><button onClick={onAdd} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-[#1d4d63] px-3.5 text-xs font-semibold text-white transition hover:bg-[#153d50]"><Plus size={14} /> Add printer code</button></div><div className="rounded-xl border border-dashed border-[#d8e5e8] bg-[#f9fbfb] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#9ba8ae]">What you’ll see</p><div className="mt-3 space-y-2.5"><InfoRow icon={MapPin} label="Shop location and owner" /><InfoRow icon={Wifi} label="Availability and printer type" /><InfoRow icon={Zap} label="Pricing and estimated turnaround" /></div></div></div>;
}

function InfoRow({ icon: Icon, label }: { icon: typeof MapPin; label: string }) {
  return <div className="flex items-center gap-2.5 text-xs text-[#70848d]"><Icon size={14} className="text-[#6e9ba6]" />{label}</div>;
}

function SavedPrinterRow({ printer, selected, onSelect, onRemove }: { printer: PrinterShop; selected: boolean; onSelect: () => void; onRemove: () => void }) {
  return <div className={`flex flex-col gap-3 p-4 transition sm:flex-row sm:items-center sm:p-5 ${selected ? "bg-[#fbfdfd]" : "hover:bg-[#fcfdfd]"}`}><button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${accentClass(printer.accent)}`}>{printer.initials}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-[13px] font-semibold text-[#304650]">{printer.name}</p><span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${statusStyles[printer.status]}`}>{printer.status}</span></div><p className="mt-1 truncate text-[11px] text-[#8b9aa2]">{printer.owner} · {printer.address}</p></div></button><div className="flex items-center gap-4 pl-[52px] text-[10px] text-[#758892] sm:pl-0"><span className="rounded-md bg-[#f1f5f6] px-2 py-1 font-semibold tracking-[0.08em] text-[#52717d]">{printer.code}</span><span className="hidden items-center gap-1 md:flex"><Clock3 size={11} /> {printer.eta}</span><span className="hidden items-center gap-1 md:flex"><span className="text-[#e1a13e]">★</span> {printer.rating}</span><span className="font-semibold text-[#365b6b]">{printer.price}</span><button onClick={onRemove} className="rounded-md p-1 text-[#a6b2b7] hover:bg-[#edf2f3] hover:text-[#a25d51]" aria-label={`Remove ${printer.name}`}><MoreHorizontal size={16} /></button><ArrowUpRight size={15} className="text-[#afbdc3]" /></div></div>;
}

function accentClass(accent: string) {
  return accent === "lavender" ? "bg-[#eeeafd] text-[#766bb3]" : accent === "peach" ? "bg-[#fcebe4] text-[#c06f55]" : "bg-[#e2eef7] text-[#4f7ea5]";
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") { reject(new Error("Document encoding failed.")); return; }
      resolve(result.split(",", 2)[1] ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("Document reading failed."));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#f7f8f6] text-[#17313c]">
      <section className="relative bg-[#102f3d] text-white">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at 76% 22%, #6bafbb 0, transparent 24%), linear-gradient(115deg, transparent 0%, rgba(255,255,255,.05) 45%, transparent 46%), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px)", backgroundSize: "auto, auto, 72px 72px, 72px 72px" }} />
        <div className="relative mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
          <nav className="flex h-[78px] items-center justify-between border-b border-white/10"><Link href="/" className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#e2815f] text-white shadow-[0_8px_20px_rgba(226,129,95,.2)]"><Printer size={18} /></span><span><span className="block text-[16px] font-bold tracking-[-.04em]">print<span className="text-[#f4a37f]">x</span></span><span className="block text-[8px] font-semibold uppercase tracking-[.18em] text-[#a3bbc1]">Global print network</span></span></Link><div className="hidden items-center gap-8 text-xs font-medium text-[#c5d7da] md:flex"><a href="#how-it-works" className="transition hover:text-white">How it works</a><a href="#network" className="transition hover:text-white">The network</a><a href="#owners" className="transition hover:text-white">For printer owners</a></div><div className="flex items-center gap-3"><a href="/dashboard" className="hidden text-xs font-semibold text-[#c5d7da] transition hover:text-white sm:block">Sign in</a><a href="/dashboard" className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3.5 text-xs font-semibold text-[#1e4e62] transition hover:bg-[#edf5f5]">Open workspace <ArrowUpRight size={14} /></a></div></nav>
          <div className="grid min-h-[610px] items-center gap-10 pb-20 pt-16 lg:grid-cols-[1.02fr_.98fr] lg:gap-6 lg:pb-24 lg:pt-20">
            <div className="relative z-10 max-w-[610px]"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#5e8892]/50 bg-[#214957]/65 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-[#a7d1d3]"><span className="h-1.5 w-1.5 rounded-full bg-[#67d09a] shadow-[0_0_0_4px_rgba(103,208,154,.12)]" /> 18,420 printers online now</div><h1 className="max-w-[640px] text-[48px] font-semibold leading-[1.02] tracking-[-.065em] sm:text-[64px]">The world&apos;s printers, <span className="text-[#f0a27e]">at your fingertips.</span></h1><p className="mt-7 max-w-[490px] text-[15px] leading-7 text-[#bad0d3]">PrintX connects you to trusted printers everywhere. Add a printer shop by its unique code, send your document, and know exactly when it&apos;s ready.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><a href="/dashboard" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#e2815f] px-5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(226,129,95,.2)] transition hover:bg-[#d97453]">Find your printer <ArrowUpRight size={16} /></a><a href="#how-it-works" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/20 px-5 text-sm font-semibold text-[#dce9ea] transition hover:bg-white/10">See how it works <ChevronRight size={15} /></a></div><div className="mt-10 flex items-center gap-4 text-[11px] text-[#9ebbc0]"><div className="flex -space-x-2"><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#102f3d] bg-[#e8b9a4] text-[9px] font-bold text-[#6b4538]">JM</span><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#102f3d] bg-[#b8d7dd] text-[9px] font-bold text-[#315c68]">MC</span><span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#102f3d] bg-[#e8dfb9] text-[9px] font-bold text-[#786a37]">AR</span></div><span>Built for people who need to print, <span className="text-white">wherever they are.</span></span></div></div>
            <div className="relative mx-auto h-[405px] w-full max-w-[520px] lg:h-[470px]"><div className="absolute left-1/2 top-1/2 h-[330px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#79aeb5]/30 bg-[radial-gradient(circle_at_36%_28%,rgba(124,183,185,.22),transparent_35%),linear-gradient(140deg,rgba(255,255,255,.05),rgba(255,255,255,0))] shadow-[0_0_90px_rgba(96,172,177,.12)] sm:h-[390px] sm:w-[390px]" /><div className="absolute left-1/2 top-1/2 h-[265px] w-[265px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#73a5ad]/35 sm:h-[320px] sm:w-[320px]" /><div className="absolute left-[17%] top-[21%] h-[1px] w-[69%] rotate-[22deg] bg-gradient-to-r from-transparent via-[#8cc0bd] to-transparent opacity-60" /><div className="absolute left-[18%] top-[62%] h-[1px] w-[65%] -rotate-[27deg] bg-gradient-to-r from-transparent via-[#8cc0bd] to-transparent opacity-50" /><div className="absolute left-1/2 top-[12%] h-[76%] w-[1px] rotate-[34deg] bg-gradient-to-b from-transparent via-[#8cc0bd] to-transparent opacity-45" /><div className="absolute left-[44%] top-[37%] flex h-[84px] w-[84px] items-center justify-center rounded-full border border-[#84c4c0]/60 bg-[#1b5261] shadow-[0_0_0_12px_rgba(111,183,181,.08),0_14px_32px_rgba(0,0,0,.22)]"><Globe2 size={39} strokeWidth={1.15} className="text-[#a8d4d0]" /></div><div className="absolute left-[3%] top-[24%] rounded-xl border border-white/10 bg-[#1b4553]/90 p-3 shadow-[0_15px_30px_rgba(0,0,0,.14)] backdrop-blur-sm"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d6e8e1] text-[#3c7e66]"><Printer size={14} /></span><span><span className="block text-[10px] font-semibold text-white">Northstar Studio</span><span className="mt-0.5 block text-[9px] text-[#8fb6ba]">PX-4812 · Brooklyn</span></span></div><div className="mt-2 flex items-center gap-1 text-[9px] font-semibold text-[#71d29b]"><span className="h-1.5 w-1.5 rounded-full bg-[#71d29b]" /> Ready in 5 min</div></div><div className="absolute bottom-[16%] right-[1%] rounded-xl border border-white/10 bg-[#1b4553]/90 p-3 shadow-[0_15px_30px_rgba(0,0,0,.14)] backdrop-blur-sm"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f8d4c4] text-[#b15e48]"><FileText size={14} /></span><span><span className="block text-[10px] font-semibold text-white">Your document</span><span className="mt-0.5 block text-[9px] text-[#8fb6ba]">Encrypted · 8 pages</span></span></div><div className="mt-2 flex items-center gap-1 text-[9px] font-semibold text-[#f2b090]"><Check size={11} /> Securely queued</div></div><div className="absolute right-[18%] top-[10%] h-2.5 w-2.5 rounded-full bg-[#f1a27e] shadow-[0_0_0_6px_rgba(241,162,126,.1)]" /><div className="absolute bottom-[29%] left-[12%] h-2 w-2 rounded-full bg-[#76c4bd] shadow-[0_0_0_5px_rgba(118,196,189,.1)]" /></div>
          </div>
        </div>
      </section>

      <section id="network" className="border-b border-[#e4e9e7] bg-[#f7f8f6] py-8"><div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-6 px-5 sm:grid-cols-4 sm:px-8 lg:px-10"><div><p className="text-2xl font-semibold tracking-[-.04em] text-[#204e60]">18k+</p><p className="mt-1 text-[11px] text-[#84959a]">printers connected</p></div><div><p className="text-2xl font-semibold tracking-[-.04em] text-[#204e60]">96</p><p className="mt-1 text-[11px] text-[#84959a]">countries reached</p></div><div><p className="text-2xl font-semibold tracking-[-.04em] text-[#204e60]">4.9 / 5</p><p className="mt-1 text-[11px] text-[#84959a]">average network rating</p></div><div><p className="text-2xl font-semibold tracking-[-.04em] text-[#204e60]">12 min</p><p className="mt-1 text-[11px] text-[#84959a]">average turnaround</p></div></div></section>

      <section id="how-it-works" className="bg-[#f7f8f6] px-5 py-20 sm:px-8 lg:px-10 lg:py-28"><div className="mx-auto max-w-[1080px]"><div className="max-w-[540px]"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#e2815f]">Simple by design</p><h2 className="mt-4 text-[36px] font-semibold leading-[1.08] tracking-[-.055em] text-[#17313c] sm:text-[46px]">Print from anywhere in three small steps.</h2><p className="mt-5 text-sm leading-7 text-[#7d8e93]">No printer hunting. No complicated setup. A unique code keeps every connection clear, private, and easy to manage.</p></div><div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[#e2e8e6] bg-[#e2e8e6] md:grid-cols-3"><LandingStep number="01" icon={Search} title="Add a printer code" text="Enter the code from a trusted person, shop, or business to add its printer to your private list." /><LandingStep number="02" icon={FileText} title="Upload your document" text="Select your file and see the printer’s location, capabilities, pricing, and turnaround before you send." /><LandingStep number="03" icon={Zap} title="Track it to done" text="Send securely and follow your print job from queued to ready, with notifications along the way." /></div></div></section>

      <section id="owners" className="bg-[#e9f1f0] px-5 py-16 sm:px-8 lg:px-10 lg:py-20"><div className="mx-auto grid max-w-[1080px] items-center gap-10 lg:grid-cols-[.9fr_1.1fr]"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#3d7781]">For printer owners</p><h2 className="mt-4 text-[34px] font-semibold leading-[1.08] tracking-[-.05em] text-[#173b47] sm:text-[42px]">Turn the printer you own into a little more possibility.</h2><p className="mt-5 text-sm leading-7 text-[#69848a]">Share a printer with the people around you, set your own availability, and give every connection a simple code. PrintX keeps control in the owner&apos;s hands.</p><a href="/dashboard" className="mt-7 inline-flex items-center gap-2 text-xs font-semibold text-[#2c6877] hover:text-[#184c5d]">Register a printer <ArrowUpRight size={15} /></a></div><Card className="border-[#d4e2df] bg-[#f7fbfa] shadow-[0_15px_30px_rgba(42,85,91,.06)]"><CardContent className="p-5 sm:p-7"><div className="flex items-center justify-between border-b border-[#dce9e6] pb-5"><div><p className="text-xs font-semibold text-[#2d5c68]">Northstar Studio</p><p className="mt-1 text-[10px] text-[#8aa0a4]">Your printer shop profile</p></div><span className="rounded-full bg-[#e4f5e9] px-2.5 py-1 text-[10px] font-semibold text-[#2c8651]">Online</span></div><div className="grid grid-cols-2 gap-3 py-5 sm:grid-cols-3"><div className="rounded-xl bg-white p-3"><p className="text-[10px] text-[#91a3a5]">Printer code</p><p className="mt-2 font-mono text-sm font-semibold tracking-[.08em] text-[#315e6b]">PX-4812</p></div><div className="rounded-xl bg-white p-3"><p className="text-[10px] text-[#91a3a5]">This month</p><p className="mt-2 text-sm font-semibold text-[#315e6b]">42 jobs</p></div><div className="rounded-xl bg-white p-3"><p className="text-[10px] text-[#91a3a5]">Rating</p><p className="mt-2 text-sm font-semibold text-[#315e6b]">★ 4.9</p></div></div><div className="flex items-center gap-3 rounded-xl bg-[#eaf4f2] p-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#3a8290]"><ShieldCheck size={16} /></span><p className="text-[11px] leading-5 text-[#67858b]">Choose who can print, when you&apos;re available, and what each job costs.</p></div></CardContent></Card></div></section>

      <section className="bg-[#f7f8f6] px-5 py-20 text-center sm:px-8 lg:px-10 lg:py-28"><div className="mx-auto max-w-[700px]"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e9f3f4] text-[#367583]"><Globe2 size={24} strokeWidth={1.5} /></div><h2 className="mt-6 text-[37px] font-semibold leading-[1.08] tracking-[-.06em] text-[#17313c] sm:text-[50px]">There&apos;s a printer out there for you.</h2><p className="mx-auto mt-5 max-w-[480px] text-sm leading-7 text-[#7d8e93]">Start with one code. Build your own trusted network. PrintX grows with every printer that joins.</p><a href="/dashboard" className="mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-[#1d4d63] px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(29,77,99,.14)] transition hover:bg-[#153d50]">Open PrintX <ArrowUpRight size={16} /></a></div></section>

      <footer className="border-t border-[#e2e8e6] bg-[#f7f8f6] px-5 py-7 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-4 sm:flex-row sm:items-center"><Link href="/" className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1d4d63] text-white"><Printer size={14} /></span><span className="text-sm font-bold tracking-[-.03em] text-[#214556]">print<span className="text-[#e2815f]">x</span></span></Link><div className="flex items-center gap-5 text-[10px] text-[#92a0a3]"><span>Private by default</span><span>Built for everywhere</span><span>© 2026 PrintX</span></div></div></footer>
    </main>
  );
}

function LandingStep({ number, icon: Icon, title, text }: { number: string; icon: typeof Search; title: string; text: string }) {
  return <div className="bg-[#f7f8f6] p-6 sm:p-8"><div className="flex items-center justify-between"><span className="text-[10px] font-bold tracking-[.16em] text-[#e2815f]">{number}</span><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eaf2f1] text-[#3a7781]"><Icon size={17} strokeWidth={1.7} /></span></div><h3 className="mt-9 text-sm font-semibold text-[#294754]">{title}</h3><p className="mt-3 text-xs leading-6 text-[#829297]">{text}</p></div>;
}
