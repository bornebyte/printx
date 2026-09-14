"use client";

import Link from "next/link";
import { useState } from "react";
import { DashboardShell } from "../../components/dashboard-shell";
import { ErrorState, LoadingState } from "../../components/error-state";
import { Icon } from "../../components/printx-ui";
import { useDashboardData } from "../../lib/dashboard-client";
import { firebaseAuth } from "../../lib/firebase";
import { reportClientError, type ErrorPayload } from "../../lib/errors";
import type { BusinessDashboardData } from "../../lib/dashboard-types";

export default function BusinessDashboard() {
  const dashboard = useDashboardData<BusinessDashboardData>("/api/dashboard/business");
  const [queuePausedOverride, setQueuePausedOverride] = useState<boolean>();
  const [actionError, setActionError] = useState<ErrorPayload>();
  const queuePaused = queuePausedOverride ?? dashboard.data?.business.queuePaused ?? false;

  async function toggleQueue(): Promise<void> {
    setActionError(undefined);
    const user = firebaseAuth?.currentUser;
    if (!user) {
      setActionError({ errorCode: "AUTH_REQUIRED", message: "Sign in again before changing queue settings.", requestId: "px-auth-required" });
      return;
    }
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/dashboard/business", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ queuePaused: !queuePaused }) });
      const payload = await response.json() as { queuePaused?: boolean; errorCode?: ErrorPayload["errorCode"]; message?: string; requestId?: string };
      if (!response.ok || typeof payload.queuePaused !== "boolean") throw new Error(`${payload.message ?? "Queue settings could not be updated."} [${payload.errorCode ?? "SUPABASE_WRITE_FAILED"} · ${payload.requestId ?? "no-request-id"}]`);
      setQueuePausedOverride(payload.queuePaused);
    } catch (error) {
      const nextError = { errorCode: "SUPABASE_WRITE_FAILED" as const, message: error instanceof Error ? error.message : "Queue settings could not be updated.", requestId: "px-queue-update" };
      setActionError(nextError);
      void reportClientError(error, { route: "/api/dashboard/business", action: "toggle-queue" });
    }
  }

  return <DashboardShell workspace="business" userName={dashboard.data?.business.name} userSubtitle={dashboard.data?.business.code ? `Business code · ${dashboard.data.business.code}` : "Business account"}>
    <div className="dashboard-heading"><div><span className="dashboard-eyebrow">BUSINESS WORKSPACE{dashboard.data?.business.code ? ` · ${dashboard.data.business.code}` : ""}</span><h1>{dashboard.data?.business.name ? `Good morning, ${dashboard.data.business.name}.` : "Your business workspace."}</h1><p>Monitor your printers, queue, and business performance.</p></div><div className="dashboard-heading-actions"><button className="outline-action" onClick={() => void toggleQueue()}><span className={`queue-toggle-dot ${queuePaused ? "paused" : ""}`} /> {queuePaused ? "Resume queue" : "Queue is live"}</button><Link href="#printers" className="button dashboard-action"><Icon name="plus" size={17} /> Add printer</Link></div></div>
    {actionError && <ErrorState error={actionError} compact onRetry={() => setActionError(undefined)} />}
    {dashboard.loading && <LoadingState label="Loading business data..." />}
    {dashboard.error && <ErrorState error={dashboard.error} onRetry={dashboard.retry} />}
    {dashboard.data && <BusinessContent data={dashboard.data} queuePaused={queuePaused} />}
  </DashboardShell>;
}

function BusinessContent({ data, queuePaused }: { data: BusinessDashboardData; queuePaused: boolean }) {
  return <>
    <section className="metric-grid business-metrics"><div className="metric-card"><span className="metric-icon green"><Icon name="clock" size={18} /></span><span><small>JOBS TODAY</small><strong>{data.metrics.jobsToday}</strong></span><em className="metric-positive">Live from your database</em></div><div className="metric-card"><span className="metric-icon gold"><Icon name="wallet" size={18} /></span><span><small>REVENUE THIS PERIOD</small><strong>${(data.metrics.revenueCents / 100).toFixed(2)}</strong></span><em>From recorded print jobs</em></div><div className="metric-card"><span className="metric-icon blue"><Icon name="clock" size={18} /></span><span><small>AVERAGE WAIT</small><strong>{String(data.metrics.averageWaitMinutes).padStart(2, "0")}<span> min</span></strong></span><em>Based on recent metrics</em></div><div className="metric-card"><span className="metric-icon purple"><Icon name="printer" size={18} /></span><span><small>PRINTER UPTIME</small><strong>{data.metrics.uptimePercent.toFixed(1)}<span>%</span></strong></span><em>{data.printers.filter((printer) => printer.status !== "Offline").length} of {data.printers.length} devices online</em></div></section>
    <div className="business-dashboard-grid"><section className="dashboard-card queue-dashboard-card" id="queue"><div className="card-heading"><div><span className="card-kicker">LIVE OPERATIONS</span><h2>Print queue</h2></div><div className="queue-heading-actions"><span className={`live-badge ${queuePaused ? "paused" : ""}`}><i /> {queuePaused ? "Paused" : "Live now"}</span><a href="#queue" className="card-link">Manage queue <Icon name="arrow" size={14} /></a></div></div><div className="queue-table-head"><span>JOB</span><span>DOCUMENT</span><span>PRINTER</span><span>STATUS</span><span>TIME</span></div><div className="business-queue-list">{data.jobs.length ? data.jobs.map((job) => <div className="business-queue-row" key={job.id}><span className="business-job-token">{job.token}</span><span className="business-document"><Icon name="file" size={17} /><span><strong>{job.document}</strong><small>{job.customer} · {job.pages}</small></span></span><span className="assigned-printer"><Icon name="printer" size={14} /> {job.printer}</span><span className={`queue-status ${job.statusClass}`}><i /> {job.status}</span><span className="queue-time">{job.time}</span></div>) : <div className="empty-panel"><Icon name="clock" size={18} /><span>Jobs will appear here as customers submit documents.</span></div>}</div><div className="queue-footer-action"><a href="#queue" className="card-link">Open full queue <Icon name="arrow" size={14} /></a><span><Icon name="check" size={14} /> Jobs are routed automatically</span></div></section><section className="dashboard-card fleet-card" id="printers"><div className="card-heading"><div><span className="card-kicker">DEVICE HEALTH</span><h2>Printer fleet</h2></div><a href="#printers" className="card-link">View all <Icon name="arrow" size={14} /></a></div><div className="fleet-list">{data.printers.length ? data.printers.map((printer) => <div className="fleet-row" key={printer.id}><span className={`fleet-printer-icon ${printer.tone}`}><Icon name="printer" size={18} /></span><span className="fleet-copy"><strong>{printer.name}</strong><small>{printer.model}</small></span><span className={`fleet-status ${printer.status === "Printing" ? "working" : ""}`}><i /> {printer.status}</span><span className="fleet-meta"><strong>{printer.tonerPercent}%</strong><small>{printer.jobsToday} jobs today</small></span></div>) : <div className="empty-panel"><Icon name="printer" size={18} /><span>Add a printer to start routing jobs.</span></div>}</div><a className="fleet-manage" href="#printers"><Icon name="settings" size={15} /> Configure printers</a></section></div>
    <div className="business-bottom-grid"><section className="dashboard-card earnings-card" id="pricing"><div className="card-heading"><div><span className="card-kicker">PERFORMANCE</span><h2>Revenue overview</h2></div><select className="period-select" defaultValue="7"><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></div><div className="revenue-value"><strong>${(data.metrics.revenueCents / 100).toFixed(2)}</strong><span className="metric-positive">Database total</span></div><RevenueChart series={data.metrics.revenueSeries} /></section><section className="dashboard-card team-card" id="team"><div className="card-heading"><div><span className="card-kicker">TEAM ACCESS</span><h2>Team members</h2></div><a href="#team" className="card-link"><Icon name="plus" size={14} /> Invite</a></div><div className="team-list">{data.team.length ? data.team.map((member) => <div className="team-row" key={member.id}><span className={`team-avatar ${member.tone}`}>{member.initials}</span><span><strong>{member.name}</strong><small>{member.role}</small></span><span className={member.status === "active" ? "team-active" : "team-invited"}>{member.status === "active" && <><i /> </>}{member.status === "active" ? "Active" : member.status}</span></div>) : <div className="empty-panel"><Icon name="users" size={18} /><span>Invite a team member to share this workspace.</span></div>}</div><a className="team-manage" href="#team">Manage team access <Icon name="arrow" size={14} /></a></section></div>
  </>;
}

function RevenueChart({ series }: { series: BusinessDashboardData["metrics"]["revenueSeries"] }) {
  if (!series.length) return <div className="empty-panel chart-empty"><Icon name="wallet" size={18} /><span>Revenue data will appear after the first completed print job.</span></div>;
  const max = Math.max(...series.map((point) => point.revenueCents), 1);
  const path = series.map((point, index) => `${index === 0 ? "M" : "L"}${(index / Math.max(series.length - 1, 1)) * 600} ${133 - (point.revenueCents / max) * 115}`).join(" ");
  return <div className="chart"><div className="chart-y"><span>${Math.ceil(max / 100)}</span><span>${Math.ceil(max / 200)}</span><span>$0</span></div><div className="chart-area"><div className="chart-gridline one" /><div className="chart-gridline two" /><div className="chart-gridline three" /><svg viewBox="0 0 600 150" preserveAspectRatio="none" aria-label="Revenue trend"><path d={`${path} L600 150 L0 150Z`} fill="url(#chartFill)" /><path d={path} fill="none" stroke="#4d9972" strokeWidth="3" /><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8dc7a6" stopOpacity=".3" /><stop offset="1" stopColor="#8dc7a6" stopOpacity="0" /></linearGradient></defs></svg><div className="chart-x">{series.slice(-7).map((point) => <span key={point.date}>{new Date(point.date).toLocaleDateString(undefined, { weekday: "short" })}</span>)}</div></div></div>;
}
