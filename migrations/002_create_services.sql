-- Create services table so prices can be updated in Supabase without touching code
create table if not exists public.services (
  id uuid default gen_random_uuid() primary key,
  tenant_id text not null,
  slug text not null,
  name text not null,
  price integer not null,
  created_at timestamptz default now()
);

-- Seed the six services for The Salon Co.
insert into services (tenant_id, slug, name, price) values
  ('e81908cd-b890-404a-9bfb-2ad160e92307', '01', 'Signature Cut & Finish', 14500),
  ('e81908cd-b890-404a-9bfb-2ad160e92307', '02', 'Returning Cut',          11500),
  ('e81908cd-b890-404a-9bfb-2ad160e92307', '03', 'Texture & Curl Cut',     16500),
  ('e81908cd-b890-404a-9bfb-2ad160e92307', '04', 'Single-process Color',   14500),
  ('e81908cd-b890-404a-9bfb-2ad160e92307', '05', 'Hand-painted Balayage',  28000),
  ('e81908cd-b890-404a-9bfb-2ad160e92307', '06', 'The Long Ritual',        32000);

grant all on public.services to service_role;
