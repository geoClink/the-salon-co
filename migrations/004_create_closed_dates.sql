create table closed_dates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  date date not null,
  reason text,
  created_at timestamptz default now(),
  unique (tenant_id, date)
);

grant all on public.closed_dates to service_role;
