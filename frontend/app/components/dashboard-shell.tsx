import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, Logo, type IconName } from "./printx-ui";

type Workspace = "personal" | "business";

const navByWorkspace: Record<Workspace, { label: string; href: string; icon: IconName }[]> = {
  personal: [
    { label: "Overview", href: "/dashboard/personal", icon: "home" },
    { label: "New print", href: "/#how-it-works", icon: "plus" },
    { label: "Print history", href: "/dashboard/personal#history", icon: "clock" },
    { label: "Saved locations", href: "/dashboard/personal#locations", icon: "printer" },
  ],
  business: [
    { label: "Overview", href: "/dashboard/business", icon: "home" },
    { label: "Print queue", href: "/dashboard/business#queue", icon: "clock" },
    { label: "Printers", href: "/dashboard/business#printers", icon: "printer" },
    { label: "Pricing", href: "/dashboard/business#pricing", icon: "wallet" },
    { label: "Team access", href: "/dashboard/business#team", icon: "users" },
  ],
};

export function DashboardShell({ workspace, children, userName, userSubtitle }: { workspace: Workspace; children: ReactNode; userName?: string; userSubtitle?: string }) {
  const isPersonal = workspace === "personal";
  const nav = navByWorkspace[workspace];

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar"><div><div className="dashboard-brand"><Link href="/"><Logo /></Link><span className="workspace-pill">{isPersonal ? "PERSONAL" : "BUSINESS"}</span></div><nav className="dashboard-nav" aria-label="Workspace navigation">{nav.map((item, index) => <Link key={item.label} href={item.href} className={`dashboard-nav-item ${index === 0 ? "active" : ""}`}><Icon name={item.icon} size={18} /><span>{item.label}</span>{index === 0 && <i className="nav-current" />}</Link>)}</nav></div><div className="dashboard-sidebar-bottom"><Link href={isPersonal ? "/dashboard/business" : "/dashboard/personal"} className="switch-workspace"><span className="switch-icon"><Icon name={isPersonal ? "printer" : "spark"} size={15} /></span><span><small>SWITCH TO</small><strong>{isPersonal ? "Business workspace" : "Personal workspace"}</strong></span><Icon name="chevron" size={15} /></Link><div className="dashboard-profile"><span className="dashboard-avatar">AR</span><span><strong>{userName ?? "Loading account..."}</strong><small>{userSubtitle ?? (isPersonal ? "Personal account" : "Business account")}</small></span><button aria-label="Account settings"><Icon name="settings" size={17} /></button></div></div></aside>
      <main className="dashboard-main"><header className="dashboard-topbar"><div className="mobile-dashboard-brand"><Link href="/"><Logo /></Link></div><div className="dashboard-breadcrumb"><span>{isPersonal ? "Personal workspace" : "Business workspace"}</span><b>/</b><strong>Overview</strong></div><div className="dashboard-top-actions"><span className="online-status"><i /> All systems operational</span><button className="dashboard-icon-button" aria-label="Notifications"><Icon name="bell" size={19} /><i /></button><span className="dashboard-top-avatar">AR</span></div></header><div className="dashboard-content">{children}</div></main>
    </div>
  );
}
