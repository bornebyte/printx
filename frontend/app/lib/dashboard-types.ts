export interface PersonalDashboardData {
  profile: { displayName: string; email: string | null };
  metrics: { activeJobs: number; completedJobs: number; savedLocations: number };
  jobs: Array<{ id: string; token: string; document: string; location: string; date: string; status: string; statusClass: string }>;
  locations: Array<{ id: string; name: string; address: string; code: string; isOpen: boolean }>;
}

export interface BusinessDashboardData {
  profile: { displayName: string; email: string | null };
  business: { id: string; name: string; code: string; address: string; queuePaused: boolean };
  metrics: { jobsToday: number; revenueCents: number; averageWaitMinutes: number; uptimePercent: number; revenueSeries: Array<{ date: string; revenueCents: number }> };
  jobs: Array<{ id: string; token: string; document: string; pages: string; printer: string; customer: string; status: string; statusClass: string; time: string }>;
  printers: Array<{ id: string; name: string; model: string; status: string; jobsToday: number; tonerPercent: number; tone: string }>;
  team: Array<{ id: string; name: string; role: string; status: string; initials: string; tone: string }>;
}
