import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

async function loadLocalEnv(file) {
  try {
    const source = await readFile(file, "utf8");
    for (const rawLine of source.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^([\"'])(.*)\1$/, "$2");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

await loadLocalEnv(resolve("../frontend/.env.local"));
await loadLocalEnv(resolve(".env"));

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";
const firebaseApiKey = process.env.FIREBASE_API_KEY ?? process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const dataFile = resolve(process.env.PRINTX_DATA_FILE ?? "./data/store.json");
const allowedOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";

const printerDirectory = new Map([
  ["PX-4812", {
    id: "northstar-studio", code: "PX-4812", name: "Northstar Studio", owner: "Design & Co.", address: "23 William St, Brooklyn, NY", status: "Available", eta: "Ready in 5 min", price: "$0.12 / page", currency: "USD", rating: "4.9", type: "Laser", color: true, pages: "Up to 250 pages", initials: "DS", accent: "lavender",
  }],
  ["PX-7390", {
    id: "paper-lane", code: "PX-7390", name: "Paper Lane", owner: "Maya Chen", address: "91 Wythe Ave, Brooklyn, NY", status: "Available", eta: "Ready in 12 min", price: "$0.08 / page", currency: "USD", rating: "4.8", type: "Inkjet", color: true, pages: "Up to 80 pages", initials: "MC", accent: "peach",
  }],
  ["PX-1055", {
    id: "brooklyn-library", code: "PX-1055", name: "Brooklyn Library", owner: "Public Access", address: "10 Grand Army Plaza, Brooklyn, NY", status: "Busy", eta: "Available in 20 min", price: "$0.10 / page", currency: "USD", rating: "4.7", type: "Laser", color: false, pages: "Up to 500 pages", initials: "BL", accent: "blue",
  }],
]);

const currencySymbols = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  AED: "AED ",
  CAD: "CA$",
  AUD: "A$",
  SGD: "S$",
  JPY: "¥",
};

function normalizeCurrency(value) {
  const currency = String(value ?? "").trim().toUpperCase();
  return Object.hasOwn(currencySymbols, currency) ? currency : null;
}

function inferCurrency(price) {
  const value = String(price ?? "");
  if (value.includes("₹")) return "INR";
  if (value.includes("€")) return "EUR";
  if (value.includes("£")) return "GBP";
  if (value.includes("AED")) return "AED";
  return "USD";
}

function formatPagePrice(value, currency) {
  const amount = Number.parseFloat(String(value ?? "0.10").replace(/[^0-9.]/g, ""));
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0.10;
  return `${currencySymbols[currency]}${safeAmount.toFixed(2)} / page`;
}

function normalizePrinter(printer) {
  const currency = normalizeCurrency(printer.currency) ?? inferCurrency(printer.price);
  const rawPrice = String(printer.price ?? "0.10");
  return { ...printer, currency, price: rawPrice.includes("/ page") ? rawPrice : formatPagePrice(rawPrice, currency) };
}

let store = { userPrinters: {}, printJobs: {}, profiles: {}, customPrinters: {}, printerOwners: {} };
let saveQueue = Promise.resolve();

async function loadStore() {
  try {
    store = JSON.parse(await readFile(dataFile, "utf8"));
    store.userPrinters ??= {};
    store.printJobs ??= {};
    store.profiles ??= {};
    store.customPrinters ??= {};
    store.printerOwners ??= {};
    for (const [code, printer] of Object.entries(store.customPrinters)) {
      const normalizedPrinter = normalizePrinter(printer);
      store.customPrinters[code] = normalizedPrinter;
      printerDirectory.set(code, normalizedPrinter);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await persistStore();
  }
}

function persistStore() {
  saveQueue = saveQueue.then(async () => {
    await mkdir(dirname(dataFile), { recursive: true });
    await writeFile(dataFile, JSON.stringify(store, null, 2));
  });
  return saveQueue;
}

function json(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": allowedOrigin, "Access-Control-Allow-Credentials": "true", Vary: "Origin" });
  response.end(JSON.stringify(payload));
}

function noContent(response) {
  response.writeHead(204, { "Access-Control-Allow-Origin": allowedOrigin, "Access-Control-Allow-Credentials": "true", Vary: "Origin" });
  response.end();
}

function readBody(request) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!body) return resolveBody({});
      try { resolveBody(JSON.parse(body)); } catch { reject(new Error("Request body must be valid JSON.")); }
    });
    request.on("error", reject);
  });
}

function tokenFrom(request) {
  const header = request.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function authenticate(request) {
  if (process.env.PRINTX_DEMO_AUTH === "true") return { uid: request.headers["x-printx-user-id"] || "demo-user", email: "demo@printx.local" };
  const idToken = tokenFrom(request);
  if (!idToken || !firebaseApiKey) return null;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) });
  if (!response.ok) return null;
  const data = await response.json();
  const user = data.users?.[0];
  return user?.localId ? { uid: user.localId, email: user.email ?? "" } : null;
}

async function requireUser(request, response) {
  try {
    const user = await authenticate(request);
    if (!user) { json(response, 401, { error: "Authentication required." }); return null; }
    return { ...user, role: store.profiles[user.uid]?.role === "owner" ? "owner" : "user" };
  } catch (error) {
    console.error("Authentication check failed", error);
    json(response, 503, { error: "Authentication service unavailable." });
    return null;
  }
}

function linkedPrintersFor(uid) { return store.userPrinters[uid] ?? []; }

function publicJob(job) {
  return { id: job.id, printerId: job.printerId, printerCode: job.printerCode, printerName: job.printerName, fileName: job.fileName, copies: job.copies, doubleSided: job.doubleSided, status: job.status, createdAt: job.createdAt, updatedAt: job.updatedAt };
}

function updateJobStatus(jobId, status) {
  const job = store.printJobs[jobId];
  if (!job) return;
  job.status = status;
  job.updatedAt = new Date().toISOString();
  void persistStore();
}

function scheduleJob(jobId) {
  setTimeout(() => updateJobStatus(jobId, "processing"), 2_000);
  setTimeout(() => updateJobStatus(jobId, "ready"), 8_000);
}

async function handleRequest(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, { "Access-Control-Allow-Origin": allowedOrigin, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "Authorization, Content-Type, X-PrintX-User-Id", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", Vary: "Origin" });
    response.end();
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
  if (request.method === "GET" && url.pathname === "/health") { json(response, 200, { ok: true, service: "printx-backend", time: new Date().toISOString() }); return; }
  const user = await requireUser(request, response);
  if (!user) return;

  if (request.method === "PUT" && url.pathname === "/api/me/profile") {
    try {
      const body = await readBody(request);
      const role = body.role === "owner" ? "owner" : body.role === "user" ? "user" : "";
      if (!role) { json(response, 422, { error: "A valid account role is required." }); return; }
      store.profiles[user.uid] = { email: user.email, role, updatedAt: new Date().toISOString() };
      await persistStore();
      json(response, 200, { profile: store.profiles[user.uid] });
    } catch (error) { json(response, 400, { error: error.message }); }
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/printers") {
    const code = (url.searchParams.get("code") ?? "").trim().toUpperCase();
    const printer = printerDirectory.get(code);
    if (!printer) { json(response, 404, { error: "Printer code not found." }); return; }
    json(response, 200, { printer });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/owner/printers") {
    if (user.role !== "owner") { json(response, 403, { error: "This area is for printer shopkeepers." }); return; }
    const printers = Object.entries(store.printerOwners).filter(([, ownerId]) => ownerId === user.uid).map(([printerId]) => Object.values(store.customPrinters).find((printer) => printer.id === printerId)).filter(Boolean);
    json(response, 200, { printers });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/owner/printers") {
    if (user.role !== "owner") { json(response, 403, { error: "Choose the printer shopkeeper account type to register a printer." }); return; }
    try {
      const body = await readBody(request);
      const name = String(body.name ?? "").trim();
      const address = String(body.address ?? "").trim();
      if (!name || !address) { json(response, 422, { error: "Printer name and address are required." }); return; }
      let code;
      do code = `PX-${Math.floor(1000 + Math.random() * 9000)}`; while (printerDirectory.has(code));
      const currency = body.currency == null ? "USD" : normalizeCurrency(body.currency);
      if (!currency) { json(response, 422, { error: "Choose a supported currency." }); return; }
      const printer = { id: randomUUID(), code, name: name.slice(0, 120), owner: user.email || "Printer shopkeeper", address: address.slice(0, 240), status: "Available", eta: "Ready in 5 min", price: formatPagePrice(body.price, currency), currency, rating: "New", type: String(body.type || "Laser").slice(0, 40), color: Boolean(body.color), pages: "Up to 250 pages", initials: name.slice(0, 2).toUpperCase(), accent: "blue" };
      printerDirectory.set(code, printer);
      store.customPrinters[code] = printer;
      store.printerOwners[printer.id] = user.uid;
      await persistStore();
      json(response, 201, { printer });
    } catch (error) { json(response, 400, { error: error.message }); }
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/me/printers") {
    if (user.role !== "user") { json(response, 403, { error: "Switch to a print user account to save printers." }); return; }
    json(response, 200, { printers: linkedPrintersFor(user.uid) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/me/printers") {
    if (user.role !== "user") { json(response, 403, { error: "Switch to a print user account to save printers." }); return; }
    try {
      const body = await readBody(request);
      const code = String(body.code ?? "").trim().toUpperCase();
      const printer = printerDirectory.get(code);
      if (!printer) { json(response, 404, { error: "Printer code not found." }); return; }
      const current = linkedPrintersFor(user.uid);
      if (current.some((item) => item.code === code)) { json(response, 409, { error: "This printer is already saved." }); return; }
      store.userPrinters[user.uid] = [...current, printer];
      await persistStore();
      json(response, 201, { printer });
    } catch (error) { json(response, 400, { error: error.message }); }
    return;
  }

  const printerIdMatch = url.pathname.match(/^\/api\/me\/printers\/([^/]+)$/);
  if (request.method === "DELETE" && printerIdMatch) {
    if (user.role !== "user") { json(response, 403, { error: "Switch to a print user account to manage saved printers." }); return; }
    const current = linkedPrintersFor(user.uid);
    store.userPrinters[user.uid] = current.filter((printer) => printer.id !== printerIdMatch[1]);
    await persistStore();
    noContent(response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/print-jobs") {
    if (user.role !== "user") { json(response, 403, { error: "Switch to a print user account to view print jobs." }); return; }
    const jobs = Object.values(store.printJobs).filter((job) => job.uid === user.uid).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    json(response, 200, { jobs: jobs.map(publicJob) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/print-jobs") {
    if (user.role !== "user") { json(response, 403, { error: "Switch to a print user account to send print jobs." }); return; }
    try {
      const body = await readBody(request);
      const printer = linkedPrintersFor(user.uid).find((item) => item.id === body.printerId);
      if (!printer) { json(response, 422, { error: "Choose a saved printer before sending a job." }); return; }
      const fileName = String(body.fileName ?? "").trim();
      if (!fileName) { json(response, 422, { error: "A document is required." }); return; }
      const now = new Date().toISOString();
      const job = { id: randomUUID(), uid: user.uid, printerId: printer.id, printerCode: printer.code, printerName: printer.name, fileName: fileName.slice(0, 240), copies: Math.max(1, Math.min(99, Number(body.copies) || 1)), doubleSided: Boolean(body.doubleSided), status: "queued", createdAt: now, updatedAt: now };
      store.printJobs[job.id] = job;
      await persistStore();
      scheduleJob(job.id);
      json(response, 201, { job: publicJob(job) });
    } catch (error) { json(response, 400, { error: error.message }); }
    return;
  }

  json(response, 404, { error: "Route not found." });
}

await loadStore();
createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error("Unhandled backend error", error);
    if (!response.headersSent) json(response, 500, { error: "Internal server error." });
    else response.destroy();
  });
}).listen(port, host, () => console.log(`PrintX backend listening on http://${host}:${port}`));
