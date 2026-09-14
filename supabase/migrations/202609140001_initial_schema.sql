create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text not null unique,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  code varchar(6) not null unique check (code ~ '^[A-Z0-9]{6}$'),
  name text not null,
  address text not null default '',
  queue_paused boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'operator' check (role in ('administrator', 'operator', 'viewer')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  primary key (business_id, profile_id)
);

create table if not exists public.printers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  model text not null default '',
  status text not null default 'online' check (status in ('online', 'busy', 'offline', 'error')),
  jobs_today integer not null default 0 check (jobs_today >= 0),
  toner_percent integer not null default 100 check (toner_percent between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  customer_profile_id uuid references public.profiles(id) on delete set null,
  tracking_token varchar(4) not null unique check (tracking_token ~ '^[A-Z0-9]{4}$'),
  document_name text not null,
  page_count integer not null default 1 check (page_count > 0),
  color_mode text not null default 'color' check (color_mode in ('color', 'black-and-white')),
  status text not null default 'queued' check (status in ('payment_pending', 'queued', 'assigned', 'printing', 'completed', 'failed', 'cancelled')),
  printer_id uuid references public.printers(id) on delete set null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_locations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  address text not null default '',
  business_code varchar(6) not null,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.business_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  metric_date date not null,
  jobs_count integer not null default 0,
  revenue_cents integer not null default 0,
  average_wait_minutes numeric(8, 2) not null default 0,
  uptime_percent numeric(5, 2) not null default 0,
  unique (business_id, metric_date)
);

create table if not exists public.job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.print_jobs(id) on delete cascade,
  status text not null,
  message text,
  worker_id text,
  printer_id uuid references public.printers(id) on delete set null,
  request_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.error_events (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  error_code text not null,
  message text not null,
  stack text,
  route text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists print_jobs_customer_created_idx on public.print_jobs(customer_profile_id, created_at desc);
create index if not exists print_jobs_business_created_idx on public.print_jobs(business_id, created_at desc);
create index if not exists printers_business_idx on public.printers(business_id);
create index if not exists errors_created_idx on public.error_events(created_at desc);
create index if not exists errors_request_idx on public.error_events(request_id);

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.printers enable row level security;
alter table public.print_jobs enable row level security;
alter table public.saved_locations enable row level security;
alter table public.business_daily_metrics enable row level security;
alter table public.job_events enable row level security;
alter table public.error_events enable row level security;

comment on table public.error_events is 'Structured application and worker error records. request_id is the primary cross-system trace key.';
