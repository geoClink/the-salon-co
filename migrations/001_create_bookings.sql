-- Create bookings table
  create table if not exists public.bookings (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    stylist text not null,
    date date not null,
    time text not null,
    service text not null,
    customer_name text not null,
    customer_email text not null,
    customer_phone text not null,
    stripe_session_id text,
    created_at timestamptz default now()
  ); 

  -- Grant access to service role
  grant all on public.bookings to service_role;