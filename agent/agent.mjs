import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { printDocument } from "./printer-adapter.mjs";

const agentDir = dirname(fileURLToPath(import.meta.url));

async function loadLocalEnv(file) {
  try {
    const source = await readFile(file, "utf8");
    for (const rawLine of source.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^["'](.*)["']$/, "$1");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

await loadLocalEnv(resolve(agentDir, ".env"));

const backendUrl = new URL(process.env.PRINTX_BACKEND_URL ?? "http://localhost:4000");
const host = process.env.PRINTX_AGENT_HOST ?? "127.0.0.1";
const port = Number(process.env.PRINTX_AGENT_PORT ?? 47821);
const pollInterval = Math.max(2_000, Number(process.env.PRINTX_AGENT_POLL_INTERVAL_MS ?? 5_000));
const printerMode = process.env.PRINTX_AGENT_PRINTER_MODE ?? "mock";
const printerName = process.env.PRINTX_AGENT_PRINTER_NAME ?? "";
const dataFile = resolve(agentDir, process.env.PRINTX_AGENT_DATA_FILE ?? "./data/agent.json");

if (backendUrl.protocol !== "https:" && !["localhost", "127.0.0.1", "::1"].includes(backendUrl.hostname)) {
  throw new Error("PRINTX_BACKEND_URL must use HTTPS outside localhost development.");
}
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PRINTX_AGENT_PORT must be a valid TCP port.");

let state = {
  agentId: process.env.PRINTX_AGENT_ID ?? "",
  agentToken: process.env.PRINTX_AGENT_TOKEN ?? "",
  localKey: randomBytes(32).toString("hex"),
  printer: null,
  paused: false,
  connected: false,
  startedAt: new Date().toISOString(),
  lastPollAt: null,
  lastError: "",
  jobs: {},
  pendingActions: [],
};
let persistQueue = Promise.resolve();
let pollInFlight = false;
let processing = false;
let recovered = false;

async function loadState() {
  try {
    const saved = JSON.parse(await readFile(dataFile, "utf8"));
    state = { ...state, ...saved, jobs: saved.jobs ?? {}, pendingActions: saved.pendingActions ?? [] };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (process.env.PRINTX_AGENT_ID) state.agentId = process.env.PRINTX_AGENT_ID;
  if (process.env.PRINTX_AGENT_TOKEN) state.agentToken = process.env.PRINTX_AGENT_TOKEN;
  await persistState();
}

function persistState() {
  const snapshot = JSON.stringify(state, null, 2);
  persistQueue = persistQueue.then(async () => {
    await mkdir(dirname(dataFile), { recursive: true });
    await writeFile(dataFile, snapshot, { mode: 0o600 });
    try { await chmod(dataFile, 0o600); } catch { /* Windows does not use POSIX file modes. */ }
  });
  return persistQueue;
}

function backendRequest(path, init = {}) {
  const url = new URL(path, backendUrl);
  return fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${state.agentToken}`,
      "User-Agent": "PrintX-Agent/0.1",
      ...(init.headers ?? {}),
    },
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? data.details ?? `PrintX backend returned ${response.status}.`);
    return data;
  });
}

async function downloadDocument(jobId) {
  const response = await fetch(new URL(`/api/agent/jobs/${encodeURIComponent(jobId)}/document`, backendUrl), {
    headers: { Authorization: `Bearer ${state.agentToken}`, "User-Agent": "PrintX-Agent/0.1" },
  });
  if (!response.ok) throw new Error(`PrintX document download failed (${response.status}).`);
  const fileName = state.jobs[jobId]?.fileName ?? "document.bin";
  const extension = fileName.match(/\.[a-z0-9]{1,8}$/i)?.[0].toLowerCase() ?? ".bin";
  const documentPath = resolve(agentDir, "data", "documents", `${jobId}${extension}`);
  await mkdir(dirname(documentPath), { recursive: true });
  await writeFile(documentPath, Buffer.from(await response.arrayBuffer()), { mode: 0o600 });
  return documentPath;
}

function mergeJobs(jobs) {
  const pendingIds = new Set(state.pendingActions.map((action) => action.jobId));
  for (const job of jobs) {
    if (!pendingIds.has(job.id)) state.jobs[job.id] = { ...state.jobs[job.id], ...job };
  }
}

async function flushPendingActions() {
  if (!state.pendingActions.length) return;
  const pending = state.pendingActions;
  state.pendingActions = [];
  for (const action of pending) {
    try {
      const data = await backendRequest(`/api/agent/jobs/${encodeURIComponent(action.jobId)}/${action.action}`, { method: "POST" });
      state.jobs[action.jobId] = { ...state.jobs[action.jobId], ...data.job };
    } catch {
      state.pendingActions.push(action);
    }
  }
  await persistState();
}

async function processNextJob() {
  if (processing || state.paused || !state.agentToken) return;
  const job = Object.values(state.jobs).find((candidate) => candidate.status === "queued");
  if (!job) return;
  processing = true;
  let localDocumentPath = "";
  try {
    const claimed = await backendRequest(`/api/agent/jobs/${encodeURIComponent(job.id)}/claim`, { method: "POST" });
    state.jobs[job.id] = { ...state.jobs[job.id], ...claimed.job, localStatus: "processing" };
    await persistState();
    if (state.jobs[job.id].documentAvailable) {
      localDocumentPath = await downloadDocument(job.id);
      state.jobs[job.id] = { ...state.jobs[job.id], documentPath: localDocumentPath };
    }
    await printDocument(state.jobs[job.id], { mode: printerMode, printerName });
    if (state.jobs[job.id].cancelRequested || state.jobs[job.id].status === "cancelled") {
      const cancelled = await backendRequest(`/api/agent/jobs/${encodeURIComponent(job.id)}/cancel`, { method: "POST" });
      state.jobs[job.id] = { ...state.jobs[job.id], ...cancelled.job, localStatus: "cancelled" };
    } else {
      const completed = await backendRequest(`/api/agent/jobs/${encodeURIComponent(job.id)}/complete`, { method: "POST" });
      state.jobs[job.id] = { ...state.jobs[job.id], ...completed.job, localStatus: "ready" };
    }
    state.lastError = "";
  } catch (error) {
    const message = error instanceof Error ? error.message : "The local printer adapter failed.";
    try {
      const failed = await backendRequest(`/api/agent/jobs/${encodeURIComponent(job.id)}/fail`, { method: "POST" });
      state.jobs[job.id] = { ...state.jobs[job.id], ...failed.job, localStatus: "failed", error: message };
    } catch {
      state.jobs[job.id] = { ...state.jobs[job.id], status: "failed", localStatus: "failed", error: message, updatedAt: new Date().toISOString() };
    }
    state.lastError = message;
  } finally {
    if (localDocumentPath) { try { await unlink(localDocumentPath); } catch { /* The file may already be gone. */ } }
    if (state.jobs[job.id]) delete state.jobs[job.id].documentPath;
    processing = false;
    await persistState();
  }
}

async function poll() {
  if (pollInFlight) return;
  pollInFlight = true;
  state.lastPollAt = new Date().toISOString();
  if (!state.agentToken) {
    state.connected = false;
    state.lastError = "This agent is not paired. Add PRINTX_AGENT_TOKEN to agent/.env.";
    pollInFlight = false;
    await persistState();
    return;
  }
  try {
    const status = await backendRequest("/api/agent/status");
    state.printer = status.printer;
    if (!recovered) {
      await backendRequest("/api/agent/recover", { method: "POST" });
      recovered = true;
    }
    await flushPendingActions();
    const jobs = await backendRequest("/api/agent/jobs?limit=100");
    mergeJobs(jobs.jobs ?? []);
    state.connected = true;
    state.lastError = "";
    await persistState();
    await processNextJob();
  } catch (error) {
    state.connected = false;
    state.lastError = error instanceof Error ? error.message : "Could not reach the PrintX backend.";
    await persistState();
  } finally {
    pollInFlight = false;
  }
}

function isLoopback(request) {
  const address = request.socket.remoteAddress ?? "";
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function localKeyIsValid(request) {
  return request.headers["x-printx-local-key"] === state.localKey;
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(payload));
}

function publicState() {
  return {
    agentId: state.agentId,
    backendUrl: backendUrl.origin,
    printer: state.printer,
    printerMode,
    paused: state.paused,
    connected: state.connected,
    startedAt: state.startedAt,
    lastPollAt: state.lastPollAt,
    lastError: state.lastError,
    processing: processing,
    jobs: Object.values(state.jobs).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
  };
}

function dashboardHtml() {
  const localKey = JSON.stringify(state.localKey);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PrintX Agent</title><style>
:root{color-scheme:light;--ink:#193642;--muted:#718891;--line:#dce8eb;--soft:#f4f8f9;--teal:#1d5365;--green:#2c8a58;--orange:#d77b59}*{box-sizing:border-box}body{margin:0;background:#f7fafb;color:var(--ink);font:14px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1120px;margin:0 auto;padding:34px 20px 54px}.brand{display:flex;align-items:center;gap:11px}.logo{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:var(--teal);color:#fff;font-size:19px}.brand strong{display:block;font-size:17px;letter-spacing:-.05em}.brand small{display:block;margin-top:1px;color:#8499a1;font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}.top{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.eyebrow{color:#4c8290;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.top h1{margin:8px 0 5px;font-size:32px;letter-spacing:-.06em}.top p{margin:0;color:var(--muted)}.status{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:999px;background:#fff;padding:9px 13px;color:var(--muted);font-size:12px;font-weight:700}.dot{width:8px;height:8px;border-radius:50%;background:#b7c5ca}.dot.on{background:#39a366;box-shadow:0 0 0 4px #e5f5eb}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:28px}.card{border:1px solid var(--line);border-radius:16px;background:#fff;box-shadow:0 8px 28px #294c5b08}.metric{padding:18px}.metric label{display:block;color:#8a9da4;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.metric b{display:block;margin-top:7px;font-size:20px;letter-spacing:-.04em}.panel{margin-top:18px;overflow:hidden}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:14px;border-bottom:1px solid var(--line);padding:18px 20px}.panel-head h2{margin:0;font-size:15px;letter-spacing:-.02em}.panel-head p{margin:3px 0 0;color:var(--muted);font-size:11px}.button{border:1px solid var(--line);border-radius:9px;background:#fff;color:var(--teal);cursor:pointer;padding:8px 11px;font-size:11px;font-weight:800}.button.primary{border-color:var(--teal);background:var(--teal);color:#fff}.button.warn{color:#aa614d}.table{width:100%;border-collapse:collapse}.table th,.table td{padding:13px 20px;text-align:left;border-bottom:1px solid #edf2f3;font-size:12px}.table th{color:#91a1a7;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.table tr:last-child td{border-bottom:0}.pill{display:inline-flex;border-radius:999px;background:var(--soft);padding:4px 8px;color:var(--muted);font-size:10px;font-weight:800}.pill.processing{background:#edf4ff;color:#4d72a5}.pill.ready{background:#eaf7ef;color:var(--green)}.pill.failed,.pill.cancelled{background:#fff1ed;color:#b5604e}.empty{padding:38px 20px;text-align:center;color:var(--muted);font-size:12px}.meta{margin-top:18px;border:1px dashed #c8dadd;border-radius:14px;background:#f0f8f8;padding:15px;color:#6e8991;font-size:11px}.meta code{border-radius:5px;background:#fff;padding:2px 5px;color:#396977}#error{color:#b15f50}.actions{display:flex;gap:7px;justify-content:flex-end}@media(max-width:720px){.top{flex-direction:column}.grid{grid-template-columns:1fr}.panel{overflow:auto}.table{min-width:680px}}
</style></head><body><main><div class="top"><div><div class="brand"><span class="logo">⌁</span><div><strong>print<span style="color:#e2815f">x</span></strong><small>Background agent</small></div></div><div class="eyebrow" style="margin-top:35px">Local printer control</div><h1>PrintX Agent</h1><p>This dashboard works locally, even when the website is closed.</p></div><div class="status"><span id="dot" class="dot"></span><span id="connection">Checking connection…</span></div></div><div class="grid"><div class="card metric"><label>Printer</label><b id="printer">Not paired</b></div><div class="card metric"><label>Queue</label><b id="queue">0 jobs</b></div><div class="card metric"><label>Agent mode</label><b id="mode">mock</b></div></div><section class="card panel"><div class="panel-head"><div><h2>Local job queue</h2><p>Controls are available offline and sync when the backend is reachable.</p></div><button id="pause" class="button">Pause agent</button></div><div id="jobs"><div class="empty">Loading local queue…</div></div></section><div class="meta"><b>Agent ID:</b> <code id="agent">Not paired</code><br><b>Backend:</b> <code id="backend"></code><br><span id="error"></span></div></main><script>
const LOCAL_KEY=${localKey};const headers={'X-PrintX-Local-Key':LOCAL_KEY};let latest;
async function api(path,options={}){const response=await fetch(path,{...options,headers:{...headers,...(options.headers||{})}});const data=await response.json();if(!response.ok)throw new Error(data.error||'Local agent request failed.');return data}
function text(id,value){document.getElementById(id).textContent=value??''}
function pill(status){return '<span class="pill '+status+'">'+status+'</span>'}
function render(data){latest=data;text('connection',data.connected?'Connected to PrintX':data.lastError?'Offline · '+data.lastError:'Not paired');document.getElementById('dot').className='dot '+(data.connected?'on':'');text('printer',data.printer?(data.printer.code+' · '+data.printer.name):'Not paired');text('queue',data.jobs.length+' job'+(data.jobs.length===1?'':'s'));text('mode',data.printerMode);text('agent',data.agentId||'Not paired');text('backend',data.backendUrl);text('error',data.lastError?'Last note: '+data.lastError:'');const pause=document.getElementById('pause');pause.textContent=data.paused?'Resume agent':'Pause agent';pause.className='button '+(data.paused?'primary':'');const jobs=document.getElementById('jobs');if(!data.jobs.length){jobs.innerHTML='<div class="empty">No local jobs yet.</div>';return}jobs.innerHTML='<table class="table"><thead><tr><th>Document</th><th>Printer</th><th>Status</th><th>Received</th><th></th></tr></thead><tbody>'+data.jobs.map(job=>'<tr><td><b>'+job.fileName+'</b><br><span style="color:#8a9da4;font-size:10px">'+job.copies+' copies · '+(job.doubleSided?'double-sided':'single-sided')+'</span></td><td>'+job.printerCode+'</td><td>'+pill(job.status||'queued')+'</td><td>'+new Date(job.createdAt).toLocaleString()+'</td><td><div class="actions">'+(job.status==='failed'||job.status==='cancelled'?'<button class="button" data-action="retry" data-id="'+job.id+'">Retry</button>':'')+(job.status==='queued'||job.status==='processing'?'<button class="button warn" data-action="cancel" data-id="'+job.id+'">Cancel</button>':'')+'</div></td></tr>').join('')+'</tbody></table>'}
async function refresh(){try{render(await api('/api/state'))}catch(error){text('connection','Local dashboard error');text('error',error.message)}}document.getElementById('pause').onclick=async()=>{await api(latest&&latest.paused?'/api/resume':'/api/pause',{method:'POST'});await refresh()};document.addEventListener('click',async(event)=>{const button=event.target.closest('[data-action]');if(!button)return;button.disabled=true;try{await api('/api/jobs/'+encodeURIComponent(button.dataset.id)+'/'+button.dataset.action,{method:'POST'});await refresh()}catch(error){text('error',error.message)}finally{button.disabled=false}});void refresh();setInterval(refresh,3000);
</script></body></html>`;
}

async function handleLocalRequest(request, response) {
  if (!isLoopback(request)) { sendJson(response, 403, { error: "The PrintX local dashboard only accepts loopback connections." }); return; }
  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
  if (request.method === "GET" && url.pathname === "/") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end(dashboardHtml());
    return;
  }
  if (request.method === "OPTIONS") { response.writeHead(204); response.end(); return; }
  if (!url.pathname.startsWith("/api/") || !localKeyIsValid(request)) { sendJson(response, 401, { error: "Local agent key required." }); return; }
  if (request.method === "GET" && url.pathname === "/api/state") { sendJson(response, 200, publicState()); return; }
  if (request.method === "POST" && url.pathname === "/api/pause") { state.paused = true; await persistState(); sendJson(response, 200, publicState()); return; }
  if (request.method === "POST" && url.pathname === "/api/resume") { state.paused = false; await persistState(); void processNextJob(); sendJson(response, 200, publicState()); return; }
  const actionMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)\/(cancel|retry)$/);
  if (request.method === "POST" && actionMatch) {
    try {
      const data = await backendRequest(`/api/agent/jobs/${encodeURIComponent(actionMatch[1])}/${actionMatch[2]}`, { method: "POST" });
      state.jobs[actionMatch[1]] = { ...state.jobs[actionMatch[1]], ...data.job };
      await persistState();
      sendJson(response, 200, publicState());
    } catch (error) {
      const job = state.jobs[actionMatch[1]];
      const action = actionMatch[2];
      const canQueue = job && ((action === "cancel" && (job.status === "queued" || job.status === "processing")) || (action === "retry" && (job.status === "failed" || job.status === "cancelled")));
      if (canQueue && !state.pendingActions.some((pending) => pending.jobId === actionMatch[1])) {
        if (action === "cancel") { job.cancelRequested = true; job.status = "cancelled"; }
        if (action === "retry") { delete job.error; job.status = "queued"; }
        job.updatedAt = new Date().toISOString();
        state.pendingActions.push({ jobId: actionMatch[1], action });
        await persistState();
        sendJson(response, 202, { queuedOffline: true, ...publicState() });
      } else {
        sendJson(response, 409, { error: error instanceof Error ? error.message : "Job action failed." });
      }
    }
    return;
  }
  sendJson(response, 404, { error: "Local agent route not found." });
}

await loadState();
const server = createServer((request, response) => {
  handleLocalRequest(request, response).catch((error) => {
    console.error("PrintX local agent error", error);
    if (!response.headersSent) sendJson(response, 500, { error: "Local agent error." });
    else response.destroy();
  });
});

server.listen(port, host, () => {
  console.log(`PrintX Agent local dashboard: http://${host}:${port}`);
  console.log(`Backend: ${backendUrl.origin}`);
  console.log(`Printer mode: ${printerMode}`);
  void poll();
});
const interval = setInterval(() => void poll(), pollInterval);

async function shutdown(signal) {
  clearInterval(interval);
  await persistState();
  server.close(() => { console.log(`PrintX Agent stopped (${signal}).`); process.exit(0); });
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
