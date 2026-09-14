"use client";

import Link from "next/link";
import { DashboardShell } from "../../components/dashboard-shell";
import { ErrorState, LoadingState } from "../../components/error-state";
import { Icon } from "../../components/printx-ui";
import { useDashboardData } from "../../lib/dashboard-client";
import type { PersonalDashboardData } from "../../lib/dashboard-types";

export default function PersonalDashboard() {
  const dashboard = useDashboardData<PersonalDashboardData>("/api/dashboard/personal");
  const userName = dashboard.data?.profile.displayName;

  return <DashboardShell workspace="personal" userName={userName} userSubtitle={dashboard.data?.profile.email ?? "Personal account"}>
    <div className="dashboard-heading"><div><span className="dashboard-eyebrow">PERSONAL WORKSPACE</span><h1>{userName ? `Good morning, ${userName.split(" ")[0]}.` : "Your personal workspace."}</h1><p>What would you like to print today?</p></div><Link href="/#how-it-works" className="button dashboard-action"><Icon name="plus" size={17} /> Start a print job</Link></div>
    {dashboard.loading && <LoadingState />}
    {dashboard.error && <ErrorState error={dashboard.error} onRetry={dashboard.retry} />}
    {dashboard.data && <PersonalContent data={dashboard.data} />}
  </DashboardShell>;
}

function PersonalContent({ data }: { data: PersonalDashboardData }) {
  return <>
    <section className="personal-hero"><div className="personal-hero-copy"><span className="hero-chip"><Icon name="spark" size={14} /> SIMPLE BY DESIGN</span><h2>Your next print is<br /><em>three steps away.</em></h2><p>Choose a location, add your document, and we will keep you posted until it is ready.</p><Link href="/#how-it-works" className="button button-light-green">Start printing <Icon name="arrow" size={16} /></Link></div><div className="personal-steps"><div className="personal-step active"><span>01</span><div><strong>Choose a location</strong><small>Use a location code or browse nearby</small></div><Icon name="check" size={16} /></div><div className="personal-step"><span>02</span><div><strong>Add your document</strong><small>PDF, DOCX, JPG · up to 25 MB</small></div><Icon name="upload" size={16} /></div><div className="personal-step"><span>03</span><div><strong>Pay &amp; track</strong><small>Get your short tracking code</small></div><Icon name="clock" size={16} /></div></div></section>
    <section className="metric-grid personal-metrics"><div className="metric-card"><span className="metric-icon green"><Icon name="clock" size={18} /></span><span><small>ACTIVE JOBS</small><strong>{String(data.metrics.activeJobs).padStart(2, "0")}</strong></span><em>{data.metrics.activeJobs ? "In the print queue" : "Nothing active"}</em></div><div className="metric-card"><span className="metric-icon blue"><Icon name="check" size={18} /></span><span><small>PRINTS COMPLETED</small><strong>{data.metrics.completedJobs}</strong></span><em>From your recent history</em></div><div className="metric-card"><span className="metric-icon gold"><Icon name="printer" size={18} /></span><span><small>SAVED LOCATIONS</small><strong>{String(data.metrics.savedLocations).padStart(2, "0")}</strong></span><em>Ready for your next print</em></div></section>
    <div className="dashboard-two-column"><section className="dashboard-card jobs-card" id="history"><div className="card-heading"><div><span className="card-kicker">RECENT ACTIVITY</span><h2>Your print history</h2></div><Link href="#history" className="card-link">View all <Icon name="arrow" size={14} /></Link></div><div className="job-list">{data.jobs.length ? data.jobs.map((job) => <div className="job-row" key={job.id}><span className="job-token">{job.token}</span><span className="job-document"><Icon name="file" size={17} /><span><strong>{job.document}</strong><small>{job.location}</small></span></span><span className="job-date">{job.date}</span><span className={`job-status ${job.statusClass}`}><i /> {job.status}</span><button className="row-more" aria-label={`Options for ${job.document}`}>•••</button></div>) : <EmptyPanel message="Your completed and active prints will appear here." />}</div></section><section className="dashboard-card locations-card" id="locations"><div className="card-heading"><div><span className="card-kicker">YOUR PLACES</span><h2>Saved locations</h2></div><Link href="/#how-it-works" className="card-link"><Icon name="plus" size={14} /> Add</Link></div><div className="location-list">{data.locations.length ? data.locations.map((location) => <div className="saved-location" key={location.id}><span className="location-mark"><Icon name="printer" size={17} /></span><span><strong>{location.name}</strong><small>{location.address} · {location.code}</small></span><span className="location-open"><i className={location.isOpen ? "" : "closed"} /> {location.isOpen ? "Open" : "Closed"}</span></div>) : <EmptyPanel message="Save a location after your first print." />}</div></section></div>
    <section className="privacy-banner"><span className="privacy-banner-icon"><Icon name="lock" size={17} /></span><span><strong>Your files are handled securely.</strong> Documents are encrypted in transit and automatically removed after 24 hours.</span><Link href="/#security">Learn about security <Icon name="arrow" size={14} /></Link></section>
  </>;
}

function EmptyPanel({ message }: { message: string }) {
  return <div className="empty-panel"><Icon name="file" size={18} /><span>{message}</span></div>;
}
