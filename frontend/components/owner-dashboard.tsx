"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bell, LogOut, MapPin, Plus, Printer, Settings2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clearAuthSession, type AuthSession } from "@/lib/firebase-auth";
import { getOwnerPrinters, registerOwnerPrinter } from "@/lib/printx-api";

const currencyOptions = [
  ["USD", "US Dollar"],
  ["INR", "Indian Rupee"],
  ["EUR", "Euro"],
  ["GBP", "Pound Sterling"],
  ["AED", "UAE Dirham"],
  ["CAD", "Canadian Dollar"],
  ["AUD", "Australian Dollar"],
  ["SGD", "Singapore Dollar"],
  ["JPY", "Japanese Yen"],
] as const;

type OwnerDashboardProps = {
  session: AuthSession;
  onSignOut: () => void;
};

export function OwnerDashboard({ session, onSignOut }: OwnerDashboardProps) {
  const [printers, setPrinters] = useState<Awaited<ReturnType<typeof getOwnerPrinters>>>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("Laser");
  const [color, setColor] = useState(true);
  const [price, setPrice] = useState("0.10");
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    void getOwnerPrinters(session)
      .then(setPrinters)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load your printers."))
      .finally(() => setLoadingList(false));
  }, [session]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const printer = await registerOwnerPrinter(session, { name, address, type, color, price, currency });
      setPrinters((current) => [...current, printer]);
      setName("");
      setAddress("");
      setType("Laser");
      setColor(true);
      setPrice("0.10");
      setCurrency("USD");
      setIsModalOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not register this printer.");
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    clearAuthSession();
    onSignOut();
  }

  return (
    <main className="min-h-screen bg-[#f8fafb] text-[#16232e]">
      <header className="flex h-[72px] items-center justify-between border-b border-[#e5eaee] bg-[#fbfcfd] px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#1d4d63] text-white"><Printer size={17} /></span>
          <span><span className="block text-[15px] font-bold tracking-[-.035em] text-[#1c3948]">print<span className="text-[#e2815f]">x</span></span><span className="block text-[8px] font-semibold uppercase tracking-[.16em] text-[#9ba8ae]">Owner workspace</span></span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <button className="rounded-lg p-2 text-[#6e808b] hover:bg-[#edf2f4]" aria-label="Notifications"><Bell size={18} /></button>
          <button onClick={signOut} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-[#667782] hover:bg-[#edf2f4]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#cfe5ea] text-[10px] font-bold text-[#28576a]">{session.email.slice(0, 2).toUpperCase()}</span>
            <span className="hidden max-w-[150px] truncate sm:block">{session.email}</span><LogOut size={14} />
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-[1100px] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#edf4f7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#4a7588]"><Settings2 size={11} /> Printer owner</div><h1 className="text-[30px] font-semibold tracking-[-.05em] text-[#162a37] sm:text-[36px]">Your printer shops</h1><p className="mt-2 max-w-[560px] text-[13px] leading-6 text-[#7b8992]">Register your physical printers, set the details people will see, and share each unique code with trusted users.</p></div>
          <Button onClick={() => { setError(""); setIsModalOpen(true); }} className="inline-flex h-10 items-center gap-2 self-start rounded-lg border-0 bg-[#1d4d63] text-xs font-semibold text-white shadow-[0_6px_16px_rgba(29,77,99,.16)] hover:bg-[#153d50] md:self-auto"><Plus size={16} /> Register a printer</Button>
        </div>
        {error && !isModalOpen && <p className="mt-5 rounded-lg bg-[#fff3f0] px-3 py-2.5 text-[11px] text-[#b35e51]">{error}</p>}
        <div className="mt-7 grid gap-4 sm:grid-cols-3"><Stat label="Printers registered" value={String(printers.length)} /><Stat label="Network status" value="Online" accent /><Stat label="Account type" value="Shopkeeper" /></div>
        <Card className="mt-6 border-[#e0e8eb] bg-white shadow-[0_7px_24px_rgba(33,57,70,.04)]">
          <CardHeader className="border-b border-[#edf1f3] p-5"><CardTitle className="text-sm text-[#263b47]">Registered printers</CardTitle><CardDescription className="text-[11px]">Every printer gets a unique code customers can add to their private list.</CardDescription></CardHeader>
          <CardContent className="p-0">
            {loadingList ? <div className="px-5 py-12 text-center text-xs text-[#8b9aa2]">Loading your printers…</div> : printers.length === 0 ? <div className="px-5 py-14 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef6f7] text-[#528594]"><Printer size={25} strokeWidth={1.4} /></div><p className="mt-4 text-sm font-semibold text-[#405460]">No printers registered yet</p><p className="mx-auto mt-2 max-w-[360px] text-xs leading-5 text-[#8b9aa2]">Register your first physical printer to receive its shareable PrintX code.</p><button onClick={() => setIsModalOpen(true)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-[#b6cfd6] px-3.5 text-xs font-semibold text-[#2e697a] hover:bg-[#eef7f8]"><Plus size={14} /> Register first printer</button></div> : <div className="divide-y divide-[#edf1f3]">{printers.map((printer) => <div key={printer.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e2eef7] text-xs font-bold text-[#4f7ea5]">{printer.initials}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-[13px] font-semibold text-[#304650]">{printer.name}</p><span className="rounded-full bg-[#e9f8ef] px-2 py-0.5 text-[9px] font-semibold text-[#25824d]">Available</span></div><p className="mt-1 flex items-center gap-1 text-[11px] text-[#8b9aa2]"><MapPin size={11} /> {printer.address}</p></div></div><div className="flex items-center gap-3 pl-[52px] sm:pl-0"><span className="font-semibold text-[#365b6b]">{printer.price}</span><span className="rounded-md bg-[#f1f5f6] px-2.5 py-1.5 font-mono text-xs font-semibold tracking-[.08em] text-[#52717d]">{printer.code}</span><span className="hidden text-[10px] text-[#809099] md:block">Share this code</span><ArrowUpRight size={15} className="text-[#afbdc3]" /></div></div>)}</div>}
          </CardContent>
        </Card>
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#d8e6ea] bg-[#eef7f8] p-4"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#2e7182] shadow-sm"><ShieldCheck size={17} /></div><div><p className="text-xs font-semibold text-[#2c5362]">You control every connection</p><p className="mt-1 text-[11px] leading-5 text-[#70909b]">Set your availability and pricing before the code is shared. Customers only see the printer details you publish.</p></div></div>
      </section>

      {isModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18313d]/35 px-5" onClick={() => setIsModalOpen(false)}><Card className="w-full max-w-[460px] bg-white shadow-[0_20px_60px_rgba(20,47,60,.22)]" onClick={(event) => event.stopPropagation()}><CardHeader className="p-6 pb-0"><CardTitle className="text-lg text-[#203b49]">Register a physical printer</CardTitle><CardDescription className="leading-5">PrintX will generate a unique code that you can share with customers.</CardDescription></CardHeader><CardContent className="p-6 pt-5"><form onSubmit={submit}><label className="block"><span className="text-[10px] font-bold uppercase tracking-[.15em] text-[#83949d]">Printer/shop name</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Northstar Studio" className="mt-2 h-11 w-full rounded-lg border border-[#dfe7eb] bg-[#fbfcfc] px-3.5 text-xs outline-none focus:border-[#8eb0be]" /></label><label className="mt-3 block"><span className="text-[10px] font-bold uppercase tracking-[.15em] text-[#83949d]">Address or pickup location</span><input required value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street, city, country" className="mt-2 h-11 w-full rounded-lg border border-[#dfe7eb] bg-[#fbfcfc] px-3.5 text-xs outline-none focus:border-[#8eb0be]" /></label><div className="mt-3 grid grid-cols-2 gap-3"><label className="block"><span className="text-[10px] font-bold uppercase tracking-[.15em] text-[#83949d]">Printer type</span><select value={type} onChange={(event) => setType(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#dfe7eb] bg-[#fbfcfc] px-3 text-xs outline-none"><option>Laser</option><option>Inkjet</option><option>Photo</option></select></label><label className="block"><span className="text-[10px] font-bold uppercase tracking-[.15em] text-[#83949d]">Currency</span><select value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#dfe7eb] bg-[#fbfcfc] px-3 text-xs outline-none">{currencyOptions.map(([code, label]) => <option key={code} value={code}>{code} — {label}</option>)}</select></label></div><label className="mt-3 block"><span className="text-[10px] font-bold uppercase tracking-[.15em] text-[#83949d]">Price per page</span><div className="relative mt-2"><input type="number" min="0" step="0.01" required value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.10" className="h-11 w-full rounded-lg border border-[#dfe7eb] bg-[#fbfcfc] px-3.5 pr-20 text-xs outline-none focus:border-[#8eb0be]" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#94a5ac]">per page</span></div></label><button type="button" onClick={() => setColor(!color)} className={`mt-3 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[11px] font-semibold ${color ? "bg-[#e7f3f5] text-[#347080]" : "bg-[#f0f3f4] text-[#809099]"}`}>Color printing available<span className={`relative h-4 w-7 rounded-full ${color ? "bg-[#2c7180]" : "bg-[#cbd5d9]"}`}><span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white ${color ? "left-3.5" : "left-0.5"}`} /></span></button>{error && <p className="mt-3 rounded-lg bg-[#fff3f0] px-3 py-2.5 text-[11px] text-[#b35e51]">{error}</p>}<Button type="submit" disabled={loading} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg border-0 bg-[#1d4d63] text-xs font-semibold text-white hover:bg-[#153d50]">{loading ? "Registering…" : "Register printer"}<ArrowUpRight size={14} /></Button></form></CardContent></Card></div>}
    </main>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <Card className="border-[#e0e8eb] bg-white shadow-[0_7px_24px_rgba(33,57,70,.04)]"><CardContent className="p-4"><p className="text-[10px] uppercase tracking-[.12em] text-[#95a2a9]">{label}</p><p className={`mt-2 text-lg font-semibold tracking-[-.03em] ${accent ? "text-[#2b8a55]" : "text-[#2f5361]"}`}>{value}</p></CardContent></Card>;
}
