"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandMark, Icon, Logo } from "./components/printx-ui";

const demoSteps = [
  {
    number: "01",
    title: "Choose a location",
    description: "Enter a six-character location code or find a nearby PrintX location.",
    label: "LOCATION CODE",
    value: "N7K4Q2",
    footer: "Northstar Copy & Print · 3 printers online",
  },
  {
    number: "02",
    title: "Set your preferences",
    description: "Upload your document and choose paper, color, copies, and finishing options.",
    label: "PRINT SETTINGS",
    value: "Color · A4 · Double-sided",
    footer: "Your total updates as you make changes",
  },
  {
    number: "03",
    title: "Track every page",
    description: "Pay securely, get a short tracking code, and follow your job until it is ready.",
    label: "TRACKING CODE",
    value: "A7K2",
    footer: "Ready in approximately 6 minutes",
  },
];

export default function Home() {
  const [activeDemo, setActiveDemo] = useState(0);
  const activeStep = demoSteps[activeDemo];

  return (
    <main className="marketing-page">
      <header className="marketing-nav site-container">
        <Link href="/" aria-label="PrintX home"><Logo /></Link>
        <nav className="marketing-links" aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#businesses">For businesses</a>
          <a href="#security">Security</a>
        </nav>
        <div className="nav-actions"><Link href="/auth" className="nav-sign-in">Sign in</Link><Link href="/auth?mode=register" className="button button-small">Get started <Icon name="arrow" size={15} /></Link></div>
      </header>

      <section className="hero-section site-container">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> THE SIMPLE PRINT NETWORK</div>
          <h1>Print it.<br /><em>Pick it up.</em><br />Move on.</h1>
          <p className="hero-description">PrintX connects you to reliable local printers, so you can send a document from anywhere and know exactly when it is ready.</p>
          <div className="hero-actions"><Link href="/auth?mode=register" className="button button-large">Start printing <Icon name="arrow" size={17} /></Link><a href="#how-it-works" className="watch-link"><span className="play-icon">▶</span> See how it works</a></div>
          <div className="hero-trust"><span className="tiny-avatars"><i>J</i><i>M</i><i>A</i></span><span>Trusted by <strong>12,000+</strong> people and teams</span></div>
        </div>
        <div className="hero-visual" aria-label="PrintX product preview">
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          <div className="hero-card hero-main-card"><div className="hero-card-top"><span className="mini-label">PRINT JOB</span><span className="live-label"><i /> LIVE</span></div><div className="hero-document"><div className="document-icon"><Icon name="file" size={22} /></div><div><strong>project-brief.pdf</strong><span>12 pages · 2.4 MB</span></div><Icon name="check" size={18} /></div><div className="progress-label"><span>Printing at Northstar</span><strong>68%</strong></div><div className="progress-track"><span /></div><div className="hero-job-footer"><span><Icon name="printer" size={14} /> Printer 02 · Online</span><span>ETA 4 min</span></div></div>
          <div className="hero-card code-float"><span className="float-icon"><Icon name="check" size={14} /></span><div><strong>Job confirmed</strong><span>Tracking code <b>A7K2</b></span></div></div>
          <div className="hero-card secure-float"><Icon name="lock" size={14} /><span>Encrypted &amp; private</span></div>
          <div className="hero-doodle"><BrandMark /></div>
        </div>
      </section>

      <div className="brand-strip"><div className="site-container brand-strip-inner"><span>MADE FOR THE MOMENTS THAT NEED PAPER</span><div className="brand-wordmarks"><b>Northstar</b><b>studio<span>/</span>form</b><b>COMMONS</b><b>field notes</b></div></div></div>

      <section className="demo-section site-container" id="how-it-works">
        <div className="section-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> HOW IT WORKS</div><h2>From screen to paper,<br /><em>without the runaround.</em></h2></div><p>Whether you are printing one page or a whole presentation, PrintX keeps the handoff simple.</p></div>
        <div className="demo-layout"><div className="demo-tabs">{demoSteps.map((step, index) => <button key={step.number} className={`demo-tab ${index === activeDemo ? "active" : ""}`} onClick={() => setActiveDemo(index)}><span>{step.number}</span><div><strong>{step.title}</strong><small>{step.description}</small></div><Icon name="arrow" size={17} /></button>)}</div><div className="demo-preview"><div className="preview-window"><div className="preview-window-bar"><span><i /><i /><i /></span><span>printx.com / new-print</span><Icon name="lock" size={13} /></div><div className="preview-window-body"><span className="preview-kicker">{activeStep.label}</span><strong className="preview-value">{activeStep.value}</strong><div className="preview-lines"><i /><i /><i /></div><div className="preview-window-footer"><span className="preview-check"><Icon name="check" size={12} /></span><span>{activeStep.footer}</span></div></div></div><div className="preview-caption"><span>PrintX in three easy steps</span><span>{String(activeDemo + 1).padStart(2, "0")} / 03</span></div></div></div>
      </section>

      <section className="feature-section site-container" id="businesses"><div className="section-intro centered"><div><div className="eyebrow centered-eyebrow"><span className="eyebrow-line" /> ONE PLATFORM, TWO WAYS TO WORK</div><h2>Built for wherever<br /><em>work happens.</em></h2></div><p>Give people a simple way to print and give your team the tools to keep every job moving.</p></div><div className="feature-grid"><article className="feature-card personal-card"><div className="feature-card-top"><span className="feature-icon"><Icon name="spark" size={19} /></span><span>PERSONAL</span></div><h3>Your documents,<br />on your time.</h3><p>Save favorite locations, keep track of every job, and get back to what you were doing.</p><Link href="/auth?mode=register" className="feature-link">Create a personal account <Icon name="arrow" size={15} /></Link><div className="feature-graphic personal-graphic"><div className="mini-phone"><div className="mini-phone-top" /><div className="mini-phone-card"><span /><b /><i /></div><div className="mini-phone-card faded"><span /><b /><i /></div></div></div></article><article className="feature-card business-card"><div className="feature-card-top"><span className="feature-icon"><Icon name="printer" size={19} /></span><span>BUSINESS</span></div><h3>More jobs.<br />Less juggling.</h3><p>Manage your printers, pricing, staff access, and queue from one clear workspace.</p><Link href="/auth?mode=register&account=business" className="feature-link">Set up a business account <Icon name="arrow" size={15} /></Link><div className="feature-graphic business-graphic"><div className="mini-dashboard"><div><span /><span /><span /></div><b>48</b><small>jobs today</small><div className="mini-bars"><i /><i /><i /><i /><i /></div></div></div></article></div></section>

      <section className="security-section" id="security"><div className="site-container security-inner"><div className="security-symbol"><Icon name="lock" size={23} /></div><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR FILES, YOUR CONTROL</div><h2>Private by default.<br /><em>Reliable by design.</em></h2><p>Documents are encrypted during transfer, held only as long as needed, and removed automatically after your print job is complete.</p></div><div className="security-points"><div><Icon name="check" size={16} /><span>Encrypted transfers</span></div><div><Icon name="check" size={16} /><span>Verified payments</span></div><div><Icon name="check" size={16} /><span>Automatic cleanup</span></div></div></div></section>

      <section className="cta-section site-container"><div className="cta-card"><div><div className="eyebrow"><span className="eyebrow-line" /> READY WHEN YOU ARE</div><h2>Make your next print<br /><em>the easy part.</em></h2><p>Join PrintX and get your first print moving in minutes.</p></div><div className="cta-actions"><Link href="/auth?mode=register" className="button button-light">Create your account <Icon name="arrow" size={16} /></Link><span>No credit card required</span></div><div className="cta-mark"><BrandMark /></div></div></section>

      <footer className="marketing-footer site-container"><Link href="/" aria-label="PrintX home"><Logo /></Link><span>Simple printing, wherever you are.</span><div><a href="#privacy">Privacy</a><a href="#support">Support</a><a href="#security">Security</a></div><span>© 2026 PrintX</span></footer>
    </main>
  );
}
