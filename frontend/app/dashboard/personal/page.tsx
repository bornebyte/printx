"use client";

import Link from "next/link";
import { useState } from "react";
import { DashboardShell } from "../../components/dashboard-shell";
import { Icon } from "../../components/printx-ui";

const recentJobs = [
  { token: "A7K2", document: "project-brief.pdf", location: "Northstar Copy & Print", date: "Today, 10:42 AM", status: "Ready to collect", statusClass: "ready" },
  { token: "L3Q8", document: "event-flyer.pdf", location: "The Local Press", date: "Yesterday, 3:18 PM", status: "Completed", statusClass: "completed" },
  { token: "R9M1", document: "travel-documents.pdf", location: "Northstar Copy & Print", date: "May 18, 9:06 AM", status: "Completed", statusClass: "completed" },
];

export default function PersonalDashboard() {
  const [uploaded, setUploaded] = useState(false);

  return (
    <DashboardShell workspace="personal">
      <div className="dashboard-heading"><div><span className="dashboard-eyebrow">PERSONAL WORKSPACE</span><h1>Good morning, Alex.</h1><p>What would you like to print today?</p></div><Link href="/#how-it-works" className="button dashboard-action"><Icon name="plus" size={17} /> Start a print job</Link></div>

      <section className="personal-hero"><div className="personal-hero-copy"><span className="hero-chip"><Icon name="spark" size={14} /> SIMPLE BY DESIGN</span><h2>Your next print is<br /><em>three steps away.</em></h2><p>Choose a location, add your document, and we will keep you posted until it is ready.</p><Link href="/#how-it-works" className="button button-light-green">Start printing <Icon name="arrow" size={16} /></Link></div><div className="personal-steps"><div className="personal-step active"><span>01</span><div><strong>Choose a location</strong><small>Use a location code or browse nearby</small></div><Icon name="check" size={16} /></div><div className="personal-step"><span>02</span><div><strong>Add your document</strong><small>PDF, DOCX, JPG · up to 25 MB</small></div><Icon name="upload" size={16} /></div><div className="personal-step"><span>03</span><div><strong>Pay &amp; track</strong><small>Get your short tracking code</small></div><Icon name="clock" size={16} /></div></div></section>

      <section className="metric-grid personal-metrics"><div className="metric-card"><span className="metric-icon green"><Icon name="clock" size={18} /></span><span><small>ACTIVE JOBS</small><strong>01</strong></span><em>Ready in ~6 min</em></div><div className="metric-card"><span className="metric-icon blue"><Icon name="check" size={18} /></span><span><small>PRINTS COMPLETED</small><strong>12</strong></span><em>This month</em></div><div className="metric-card"><span className="metric-icon gold"><Icon name="printer" size={18} /></span><span><small>SAVED LOCATIONS</small><strong>04</strong></span><em>Across 2 cities</em></div></section>

      <div className="dashboard-two-column"><section className="dashboard-card jobs-card" id="history"><div className="card-heading"><div><span className="card-kicker">RECENT ACTIVITY</span><h2>Your print history</h2></div><Link href="#history" className="card-link">View all <Icon name="arrow" size={14} /></Link></div><div className="job-list">{recentJobs.map((job) => <div className="job-row" key={job.token}><span className="job-token">{job.token}</span><span className="job-document"><Icon name="file" size={17} /><span><strong>{job.document}</strong><small>{job.location}</small></span></span><span className="job-date">{job.date}</span><span className={`job-status ${job.statusClass}`}><i /> {job.status}</span><button className="row-more" aria-label={`Options for ${job.document}`}>•••</button></div>)}</div></section><section className="dashboard-card locations-card" id="locations"><div className="card-heading"><div><span className="card-kicker">YOUR PLACES</span><h2>Saved locations</h2></div><button className="card-link" onClick={() => setUploaded((current) => !current)}><Icon name="plus" size={14} /> Add</button></div><div className="location-list"><div className="saved-location"><span className="location-mark"><Icon name="printer" size={17} /></span><span><strong>Northstar Copy &amp; Print</strong><small>18 Market Street · N7K4Q2</small></span><span className="location-open"><i /> Open</span></div><div className="saved-location"><span className="location-mark purple"><Icon name="printer" size={17} /></span><span><strong>The Local Press</strong><small>42 King Avenue · F2P8M1</small></span><span className="location-open"><i /> Open</span></div>{uploaded && <div className="location-added"><Icon name="check" size={14} /> Location added to your saved list</div>}</div></section></div>

      <section className="privacy-banner"><span className="privacy-banner-icon"><Icon name="lock" size={17} /></span><span><strong>Your files are handled securely.</strong> Documents are encrypted in transit and automatically removed after 24 hours.</span><Link href="/#security">Learn about security <Icon name="arrow" size={14} /></Link></section>
    </DashboardShell>
  );
}
